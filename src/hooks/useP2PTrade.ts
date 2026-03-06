// src/hooks/useP2PTrade.ts
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { parseUnits } from 'viem';
import { useKYC } from './useKYC';
import { config } from '@/config/wagmi';

const TRADE_ESCROW_ABI = [
  {
    name: 'createTradeWithKYC',
    type: 'function',
    inputs: [
      { name: '_tokenAmount', type: 'uint256' },
      { name: '_pricePerToken', type: 'uint256' },
      { name: '_expirationTime', type: 'uint256' },
      { name: '_minKYCLevel', type: 'uint8' },
      { name: '_proof', type: 'tuple', components: [
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ]},
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'createTradeAndDepositWithKYC',
    type: 'function',
    inputs: [
      { name: '_tokenAmount', type: 'uint256' },
      { name: '_pricePerToken', type: 'uint256' },
      { name: '_expirationTime', type: 'uint256' },
      { name: '_minKYCLevel', type: 'uint8' },
      { name: '_proof', type: 'tuple', components: [
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ]},
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'acceptAndDepositWithKYC',
    type: 'function',
    inputs: [
      { name: '_tradeId', type: 'uint256' },
      { name: '_proof', type: 'tuple', components: [
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ]},
    ],
    outputs: [],
  },
  {
    name: 'cancelTrade',
    type: 'function',
    inputs: [{ name: '_tradeId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getTrade',
    type: 'function',
    inputs: [{ name: '_tradeId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'tradeId', type: 'uint256' },
        { name: 'seller', type: 'address' },
        { name: 'buyer', type: 'address' },
        { name: 'tokenAmount', type: 'uint256' },
        { name: 'stableAmount', type: 'uint256' },
        { name: 'pricePerToken', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'sellerDeposited', type: 'bool' },
        { name: 'buyerDeposited', type: 'bool' },
        { name: 'minKYCLevel', type: 'uint8' },
        { name: 'sellerCountryCode', type: 'uint16' },
      ],
    }],
  },
  {
    name: 'getOpenTrades',
    type: 'function',
    inputs: [
      { name: '_offset', type: 'uint256' },
      { name: '_limit', type: 'uint256' },
    ],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'tradeId', type: 'uint256' },
        { name: 'seller', type: 'address' },
        { name: 'buyer', type: 'address' },
        { name: 'tokenAmount', type: 'uint256' },
        { name: 'stableAmount', type: 'uint256' },
        { name: 'pricePerToken', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'sellerDeposited', type: 'bool' },
        { name: 'buyerDeposited', type: 'bool' },
        { name: 'minKYCLevel', type: 'uint8' },
        { name: 'sellerCountryCode', type: 'uint16' },
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
] as const;

export interface P2PTrade {
  tradeId: bigint;
  seller: string;
  buyer: string;
  tokenAmount: bigint;
  stableAmount: bigint;
  pricePerToken: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  status: number;
  sellerDeposited: boolean;
  buyerDeposited: boolean;
  minKYCLevel: number;
  sellerCountryCode: number;
}

export function useP2PTrade(escrowAddress: string) {
  const { address } = useAccount();
  const { getProof, isKYCValid, status } = useKYC();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTrade = useCallback(async (
    tokenAddress: string,
    tokenAmount: string,
    pricePerToken: string,
    minKYCLevel: number = 1,
    expirationHours: number = 24,
    depositImmediately: boolean = true
  ): Promise<{ success: boolean; tradeId?: bigint; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isKYCValid) {
      return { success: false, error: 'Valid KYC required' };
    }

    setError(null);
    setIsCreating(true);

    try {
      const proof = await getProof();
      if (!proof) {
        return { success: false, error: 'Failed to get KYC proof' };
      }

      const tokenAmountWei = parseUnits(tokenAmount, 18);
      const priceWei = parseUnits(pricePerToken, 6);
      const expiration = BigInt(Math.floor(Date.now() / 1000) + (expirationHours * 3600));

      // Approve tokens if depositing immediately
      if (depositImmediately) {
        const approveHash = await writeContract(config, {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [escrowAddress as `0x${string}`, tokenAmountWei],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      const functionName = depositImmediately ? 'createTradeAndDepositWithKYC' : 'createTradeWithKYC';

      const hash = await writeContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: TRADE_ESCROW_ABI,
        functionName,
        args: [tokenAmountWei, priceWei, expiration, minKYCLevel, proof],
      });

      await waitForTransactionReceipt(config, { hash });

      return { success: true, tradeId: BigInt(0) }; // Parse from logs
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsCreating(false);
    }
  }, [address, isKYCValid, getProof, escrowAddress]);

  const acceptTrade = useCallback(async (
    tradeId: bigint,
    stablecoinAddress: string,
    stableAmount: bigint
  ): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isKYCValid) {
      return { success: false, error: 'Valid KYC required' };
    }

    setError(null);
    setIsAccepting(true);

    try {
      const proof = await getProof();
      if (!proof) {
        return { success: false, error: 'Failed to get KYC proof' };
      }

      // Approve stablecoin
      const approveHash = await writeContract(config, {
        address: stablecoinAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress as `0x${string}`, stableAmount],
      });
      await waitForTransactionReceipt(config, { hash: approveHash });

      // Accept and deposit
      const hash = await writeContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: TRADE_ESCROW_ABI,
        functionName: 'acceptAndDepositWithKYC',
        args: [tradeId, proof],
      });

      await waitForTransactionReceipt(config, { hash });

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAccepting(false);
    }
  }, [address, isKYCValid, getProof, escrowAddress]);

  const cancelTrade = useCallback(async (
    tradeId: bigint
  ): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setError(null);
    setIsCancelling(true);

    try {
      const hash = await writeContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: TRADE_ESCROW_ABI,
        functionName: 'cancelTrade',
        args: [tradeId],
      });

      await waitForTransactionReceipt(config, { hash });

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsCancelling(false);
    }
  }, [address, escrowAddress]);

  const getOpenTrades = useCallback(async (
    offset: number = 0,
    limit: number = 20
  ): Promise<P2PTrade[]> => {
    try {
      const trades = await readContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: TRADE_ESCROW_ABI,
        functionName: 'getOpenTrades',
        args: [BigInt(offset), BigInt(limit)],
      });

      return trades as P2PTrade[];
    } catch {
      return [];
    }
  }, [escrowAddress]);

  const getTrade = useCallback(async (tradeId: bigint): Promise<P2PTrade | null> => {
    try {
      const trade = await readContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: TRADE_ESCROW_ABI,
        functionName: 'getTrade',
        args: [tradeId],
      });

      return trade as P2PTrade;
    } catch {
      return null;
    }
  }, [escrowAddress]);

  return {
    createTrade,
    acceptTrade,
    cancelTrade,
    getOpenTrades,
    getTrade,
    isCreating,
    isAccepting,
    isCancelling,
    isLoading: isCreating || isAccepting || isCancelling,
    error,
    kycStatus: status,
    isKYCValid,
  };
}
