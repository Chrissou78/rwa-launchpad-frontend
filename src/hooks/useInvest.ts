// src/hooks/useInvest.ts
import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { parseUnits } from 'viem';
import { useKYC, KYCProof } from './useKYC';
import { config } from '@/config/wagmi';
import { CONTRACTS, TOKENS } from '@/config/contracts';

// ABI fragments
const FACTORY_ABI = [
  {
    name: 'investWithKYC',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
      { name: '_proof', type: 'tuple', components: [
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ]},
    ],
    outputs: [],
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

export function useInvest() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { status, getProof, isKYCValid } = useKYC();
  
  const [isApproving, setIsApproving] = useState(false);
  const [isInvesting, setIsInvesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invest = useCallback(async (
    projectId: bigint,
    amount: string,
    paymentToken: 'USDC' | 'USDT' = 'USDC'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isKYCValid) {
      return { success: false, error: 'Valid KYC required to invest' };
    }

    setError(null);

    try {
      // Get KYC proof
      const proof = await getProof();
      if (!proof) {
        return { success: false, error: 'Failed to get KYC proof' };
      }

      const tokenAddress = TOKENS[paymentToken] as `0x${string}`;
      const factoryAddress = CONTRACTS.RWALaunchpadFactory as `0x${string}`;
      const amountInWei = parseUnits(amount, paymentToken === 'USDC' ? 6 : 6);

      // Check and approve token allowance
      setIsApproving(true);
      
      const { readContract } = await import('wagmi/actions');
      const currentAllowance = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, factoryAddress],
      });

      if (currentAllowance < amountInWei) {
        const approveHash = await writeContract(config, {
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [factoryAddress, amountInWei],
        });
        
        await waitForTransactionReceipt(config, { hash: approveHash });
      }
      
      setIsApproving(false);
      setIsInvesting(true);

      // Execute investment with KYC proof
      const investHash = await writeContract(config, {
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'investWithKYC',
        args: [projectId, amountInWei, proof],
      });

      await waitForTransactionReceipt(config, { hash: investHash });

      return { success: true, txHash: investHash };
    } catch (err: any) {
      const errorMessage = err.message?.includes('KYC')
        ? 'KYC verification failed on-chain'
        : err.message?.includes('Country')
        ? 'Your country is restricted from this investment'
        : err.message || 'Investment failed';
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsApproving(false);
      setIsInvesting(false);
    }
  }, [address, isKYCValid, getProof]);

  return {
    invest,
    isApproving,
    isInvesting,
    isLoading: isApproving || isInvesting,
    error,
    kycStatus: status,
    isKYCValid,
  };
}
