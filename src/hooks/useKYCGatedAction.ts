// src/hooks/useKYCGatedAction.ts
"use client";

import { useCallback, useState } from "react";
import { useKYC, KYCProof } from "./useKYC";

interface KYCGatedActionOptions {
  requiredLevel?: number;
  cacheProofOnChain?: boolean;
  contractAddress?: string;
  contractType?: "token" | "escrow" | "exchange" | "compliance";
}

interface KYCGatedActionResult<T> {
  execute: (action: () => Promise<T>) => Promise<T | null>;
  isProcessing: boolean;
  kycStep: "idle" | "checking" | "fetching_proof" | "caching" | "executing";
  error: string | null;
}

export function useKYCGatedAction<T = any>(
  options: KYCGatedActionOptions = {}
): KYCGatedActionResult<T> {
  const {
    requiredLevel = 1,
    cacheProofOnChain = false,
  } = options;

  const {
    status,
    proof,
    getProof,
    isKYCValid,
    kycLevel,
  } = useKYC();

  const [isProcessing, setIsProcessing] = useState(false);
  const [kycStep, setKycStep] = useState<KYCGatedActionResult<T>["kycStep"]>("idle");
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (action: () => Promise<T>): Promise<T | null> => {
    setIsProcessing(true);
    setError(null);
    setKycStep("checking");

    try {
      // Check KYC status
      if (!isKYCValid) {
        throw new Error("KYC verification required");
      }

      if (kycLevel < requiredLevel) {
        throw new Error(`KYC level ${requiredLevel} required. Your level: ${kycLevel}`);
      }

      // Get proof if needed
      let currentProof = proof;
      if (!currentProof) {
        setKycStep("fetching_proof");
        currentProof = await getProof();
        
        if (!currentProof) {
          throw new Error("Failed to retrieve KYC proof");
        }
      }

      // Check proof expiry
      const now = Math.floor(Date.now() / 1000);
      if (currentProof.expiry < now) {
        throw new Error("KYC proof has expired. Please renew your verification.");
      }

      // Execute the action
      setKycStep("executing");
      const result = await action();

      setKycStep("idle");
      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Action failed";
      setError(errorMsg);
      setKycStep("idle");
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isKYCValid, kycLevel, requiredLevel, proof, getProof, cacheProofOnChain]);

  return {
    execute,
    isProcessing,
    kycStep,
    error,
  };
}

export default useKYCGatedAction;
