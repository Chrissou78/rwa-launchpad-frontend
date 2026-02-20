// src/app/admin/kyc/hooks/useKYCActions.ts
'use client';

import { useState, useCallback } from 'react';
import { Address, WalletClient, PublicClient, parseUnits, Hash } from 'viem';
import { ResultMessage } from '../types';
import { KYCManagerABI } from '@/config/abis';

interface UseKYCActionsProps {
  walletClient: WalletClient | undefined;
  publicClient: PublicClient | undefined;
  kycManagerAddress: Address | undefined;
  chainId: number | undefined;
  chainName: string;
  explorerUrl: string;
  onSuccess?: () => void;
}

interface UseKYCActionsReturn {
  // Processing states
  isProcessing: boolean;
  processingAction: string | null;
  
  // Result
  result: ResultMessage | null;
  clearResult: () => void;
  
  // KYC Actions
  approveKYC: (address: Address, tier: number) => Promise<boolean>;
  rejectKYC: (address: Address, reason: string) => Promise<boolean>;
  resetKYC: (address: Address, reason: string) => Promise<boolean>;
  
  // Upgrade Actions
  approveUpgrade: (address: Address) => Promise<boolean>;
  rejectUpgrade: (address: Address, reason: string) => Promise<boolean>;
  
  // Settings Actions
  updateKYCFee: (newFee: string) => Promise<boolean>;
  updateAutoVerifyThreshold: (newThreshold: number) => Promise<boolean>;
  updateFeeRecipient: (newRecipient: Address) => Promise<boolean>;
  updateTierInvestmentLimit: (tier: number, limit: string) => Promise<boolean>;
  updateTierValidityPeriod: (tier: number, periodDays: number) => Promise<boolean>;
  pauseContract: () => Promise<boolean>;
  unpauseContract: () => Promise<boolean>;
}

export function useKYCActions({
  walletClient,
  publicClient,
  kycManagerAddress,
  chainId,
  chainName,
  explorerUrl,
  onSuccess
}: UseKYCActionsProps): UseKYCActionsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [result, setResult] = useState<ResultMessage | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  // Helper to execute a transaction
  const executeTransaction = useCallback(async (
    functionName: string,
    args: any[],
    actionName: string
  ): Promise<boolean> => {
    if (!walletClient || !publicClient || !kycManagerAddress) {
      setResult({
        type: 'error',
        message: 'Wallet not connected or contract not available'
      });
      return false;
    }

    setIsProcessing(true);
    setProcessingAction(actionName);
    setResult(null);

    try {
      const [account] = await walletClient.getAddresses();
      
      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName,
        args,
        account,
        chain: walletClient.chain
      });

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setResult({
          type: 'success',
          message: `${actionName} completed successfully on ${chainName}`,
          txHash: hash
        });
        onSuccess?.();
        return true;
      } else {
        setResult({
          type: 'error',
          message: `${actionName} failed on ${chainName}`
        });
        return false;
      }
    } catch (error) {
      console.error(`Error executing ${actionName}:`, error);
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : `${actionName} failed`
      });
      return false;
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [walletClient, publicClient, kycManagerAddress, chainName, onSuccess]);

  // KYC Actions
  const approveKYC = useCallback(async (address: Address, tier: number): Promise<boolean> => {
    return executeTransaction('approveKYC', [address, tier], 'Approve KYC');
  }, [executeTransaction]);

  const rejectKYC = useCallback(async (address: Address, reason: string): Promise<boolean> => {
    return executeTransaction('rejectKYC', [address, reason], 'Reject KYC');
  }, [executeTransaction]);

  const resetKYC = useCallback(async (address: Address, reason: string): Promise<boolean> => {
    return executeTransaction('resetKYC', [address, reason], 'Reset KYC');
  }, [executeTransaction]);

  // Upgrade Actions
  const approveUpgrade = useCallback(async (address: Address): Promise<boolean> => {
    return executeTransaction('approveUpgrade', [address], 'Approve Upgrade');
  }, [executeTransaction]);

  const rejectUpgrade = useCallback(async (address: Address, reason: string): Promise<boolean> => {
    return executeTransaction('rejectUpgrade', [address, reason], 'Reject Upgrade');
  }, [executeTransaction]);

  // Settings Actions
  const updateKYCFee = useCallback(async (newFee: string): Promise<boolean> => {
    const feeWei = parseUnits(newFee, 18);
    return executeTransaction('setKYCFee', [feeWei], 'Update KYC Fee');
  }, [executeTransaction]);

  const updateAutoVerifyThreshold = useCallback(async (newThreshold: number): Promise<boolean> => {
    return executeTransaction('setAutoVerifyThreshold', [newThreshold], 'Update Auto-Verify Threshold');
  }, [executeTransaction]);

  const updateFeeRecipient = useCallback(async (newRecipient: Address): Promise<boolean> => {
    return executeTransaction('setFeeRecipient', [newRecipient], 'Update Fee Recipient');
  }, [executeTransaction]);

  const updateTierInvestmentLimit = useCallback(async (tier: number, limit: string): Promise<boolean> => {
    const limitUnits = parseUnits(limit, 6); // USDC decimals
    return executeTransaction('setTierInvestmentLimit', [tier, limitUnits], `Update Tier ${tier} Investment Limit`);
  }, [executeTransaction]);

  const updateTierValidityPeriod = useCallback(async (tier: number, periodDays: number): Promise<boolean> => {
    const periodSeconds = periodDays * 24 * 60 * 60;
    return executeTransaction('setTierValidityPeriod', [tier, periodSeconds], `Update Tier ${tier} Validity Period`);
  }, [executeTransaction]);

  const pauseContract = useCallback(async (): Promise<boolean> => {
    return executeTransaction('pause', [], 'Pause Contract');
  }, [executeTransaction]);

  const unpauseContract = useCallback(async (): Promise<boolean> => {
    return executeTransaction('unpause', [], 'Unpause Contract');
  }, [executeTransaction]);

  return {
    isProcessing,
    processingAction,
    result,
    clearResult,
    approveKYC,
    rejectKYC,
    resetKYC,
    approveUpgrade,
    rejectUpgrade,
    updateKYCFee,
    updateAutoVerifyThreshold,
    updateFeeRecipient,
    updateTierInvestmentLimit,
    updateTierValidityPeriod,
    pauseContract,
    unpauseContract
  };
}
