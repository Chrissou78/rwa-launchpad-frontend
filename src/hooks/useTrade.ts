// src/hooks/useTrade.ts
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { parseUnits, formatUnits } from 'viem';
import { useKYC, KYCProof } from './useKYC';
import { config } from '@/config/wagmi';
import { CONTRACTS, TOKENS } from '@/config/contracts';

const EXCHANGE_ABI = [
  {
    name: 'createOrderWithKYC',
    type: 'function',
    inputs: [
      { name: '_securityToken', type: 'address' },
      { name: '_paymentToken', type: 'address' },
      { name: '_side', type: 'uint8' },
      { name: '_price', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
      { name: '_kycProof', type: 'tuple', components: [
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ]},
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'cancelOrder',
    type: 'function',
    inputs: [{ name: '_orderId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getOrder',
    type: 'function',
    inputs: [{ name: '_orderId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'trader', type: 'address' },
        { name: 'securityToken', type: 'address' },
        { name: 'paymentToken', type: 'address' },
        { name: 'side', type: 'uint8' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'filled', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
      ],
    }],
  },
] as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

type OrderSide = 'BUY' | 'SELL';

export function useTrade() {
  const { address } = useAccount();
  const { getProof, isKYCValid, status } = useKYC();
  
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (
    securityToken: string,
    side: OrderSide,
    price: string,
    amount: string,
    paymentToken: 'USDC' | 'USDT' = 'USDC'
  ): Promise<{ success: boolean; orderId?: bigint; txHash?: string; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isKYCValid) {
      return { success: false, error: 'Valid KYC required to trade' };
    }

    setError(null);
    setIsCreatingOrder(true);

    try {
      // Get KYC proof
      const proof = await getProof();
      if (!proof) {
        return { success: false, error: 'Failed to get KYC proof' };
      }

      const exchangeAddress = CONTRACTS.RWASecurityExchange as `0x${string}`;
      const paymentTokenAddress = TOKENS[paymentToken] as `0x${string}`;
      
      const priceInWei = parseUnits(price, 6); // Stablecoin decimals
      const amountInWei = parseUnits(amount, 18); // Token decimals

      // For buy orders, approve payment token
      // For sell orders, approve security token
      const tokenToApprove = side === 'BUY' 
        ? paymentTokenAddress 
        : securityToken as `0x${string}`;
      
      const approvalAmount = side === 'BUY'
        ? (priceInWei * amountInWei) / BigInt(1e18)
        : amountInWei;

      const currentAllowance = await readContract(config, {
        address: tokenToApprove,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, exchangeAddress],
      });

      if (currentAllowance < approvalAmount) {
        const approveHash = await writeContract(config, {
          address: tokenToApprove,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [exchangeAddress, approvalAmount],
        });
        
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      // Create order
      const orderHash = await writeContract(config, {
        address: exchangeAddress,
        abi: EXCHANGE_ABI,
        functionName: 'createOrderWithKYC',
        args: [
          securityToken as `0x${string}`,
          paymentTokenAddress,
          side === 'BUY' ? 0 : 1,
          priceInWei,
          amountInWei,
          proof,
        ],
      });

      const receipt = await waitForTransactionReceipt(config, { hash: orderHash });

      // Extract order ID from events (simplified)
      const orderId = BigInt(0); // Would parse from receipt logs

      return { success: true, orderId, txHash: orderHash };
    } catch (err: any) {
      const errorMessage = err.message?.includes('KYC')
        ? 'KYC verification failed'
        : err.message?.includes('Country')
        ? 'Your country is restricted from trading'
        : err.message || 'Order creation failed';
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreatingOrder(false);
    }
  }, [address, isKYCValid, getProof]);

  const cancelOrder = useCallback(async (
    orderId: bigint
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setError(null);
    setIsCancelling(true);

    try {
      const exchangeAddress = CONTRACTS.RWASecurityExchange as `0x${string}`;

      const cancelHash = await writeContract(config, {
        address: exchangeAddress,
        abi: EXCHANGE_ABI,
        functionName: 'cancelOrder',
        args: [orderId],
      });

      await waitForTransactionReceipt(config, { hash: cancelHash });

      return { success: true, txHash: cancelHash };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsCancelling(false);
    }
  }, [address]);

  return {
    createOrder,
    cancelOrder,
    isCreatingOrder,
    isCancelling,
    isLoading: isCreatingOrder || isCancelling,
    error,
    kycStatus: status,
    isKYCValid,
  };
}
