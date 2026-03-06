// src/hooks/useKYC.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient, useBalance, useChainId } from 'wagmi';
import { formatEther, parseEther, type Address, type Hash, type WalletClient } from 'viem';
import { useChainConfig } from './useChainConfig';

// ============================================================================
// INTERFACES
// ============================================================================

export interface KYCProof {
  wallet: Address;
  level: number;
  countryCode: number;
  expiry: number;
  signature: `0x${string}`;
}

export interface KYCStatus {
  hasApplication: boolean;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycLevel: number;
  isExpired: boolean;
  expiryDate: string | null;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  canResubmit: boolean;
}

export interface KYCSubmission {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  countryCode: number;
  documentType?: 'passport' | 'id_card';
  documentNumber?: string;
  documentExpiry?: string;
  requestedLevel?: number;
  verificationScore?: number; // Add this
  documents?: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
    accreditedProof?: string;
  };
}

export interface LinkedWallet {
  address: string;
  linkedAt: string;
  isPrimary: boolean;
  label?: string;
}

export interface WalletLinkCode {
  code: string;
  expiresAt: number;
}

export interface DocumentUploadResult {
  documentId: string;
  uploadUrl: string;
}

export interface UseKYCReturn {
  // State
  status: KYCStatus | null;
  proof: KYCProof | null;
  linkedWallets: LinkedWallet[];
  isLoading: boolean;
  isSubmitting: boolean;
  isRegistering: boolean;
  error: string | null;

  // Computed
  isKYCValid: boolean;
  canInvest: boolean;
  canInvestAccredited: boolean;
  kycLevel: number;
  registrationFee: string;
  hasEnoughBalance: boolean;

  // Actions
  refreshStatus: () => Promise<void>;
  submitKYC: (submission: KYCSubmission) => Promise<boolean>;
  getProof: () => Promise<KYCProof | null>;
  registerOnChain: () => Promise<Hash | null>;
  uploadDocument: (file: File, documentType: string) => Promise<DocumentUploadResult | null>;
  generateLinkCode: () => Promise<WalletLinkCode | null>;
  useLinkCode: (code: string) => Promise<boolean>;
  getLinkedWallets: () => Promise<LinkedWallet[]>;
  exportData: () => Promise<Blob | null>;
  requestDeletion: () => Promise<boolean>;
  clearError: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  STANDARD: 2,
  ACCREDITED: 3,
  INSTITUTIONAL: 4,
} as const;

export const LEVEL_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Basic',
  2: 'Standard',
  3: 'Accredited',
  4: 'Institutional',
};

export const REGISTRATION_FEE = '0.05'; // Default fee in ETH

export const KYC_VERIFIER_ABI = [
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'registerWithProof',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'level', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getVerificationLevel',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createSignedMessage(
  walletClient: NonNullable<ReturnType<typeof useWalletClient>['data']>,
  address: Address,
  action: string
): Promise<{ message: string; signature: `0x${string}`; timestamp: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${action}\nWallet: ${address}\nTimestamp: ${timestamp}`;
  
  const signature = await (walletClient as any).signMessage({
    account: address,
    message,
  });
  
  return { message, signature, timestamp };
}

/**
 * Safe fetch wrapper that handles errors and undefined responses
 */
async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ response: Response | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,  // This allows custom headers to be passed
      },
    });
    return { response, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network request failed';
    console.error('Fetch error:', errorMessage);
    return { response: null, error: errorMessage };
  }
}

/**
 * Parse API response safely
 */
async function parseApiResponse<T>(
  response: Response | null,
  errorPrefix: string
): Promise<{ data: T | null; error: string | null }> {
  if (!response) {
    return { data: null, error: `${errorPrefix}: No response from server` };
  }

  try {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `${errorPrefix}: ${response.status}`;
      return { data: null, error: errorMessage };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse response';
    return { data: null, error: `${errorPrefix}: ${errorMessage}` };
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useKYC(): UseKYCReturn {
  // Call hooks unconditionally at the top level
  const accountResult = useAccount();
  const publicClient = usePublicClient();
  const walletClientResult = useWalletClient();
  const chainId = useChainId();
  const chainConfig = useChainConfig();
  const balanceResult = useBalance({
    address: accountResult?.address,
    query: {
      enabled: !!accountResult?.address,
    },
  });

  // Extract values with proper defaults
  const address = accountResult?.address;
  const isConnected = accountResult?.isConnected ?? false;
  const walletClient = walletClientResult?.data;
  const balanceData = balanceResult?.data;
  const config = chainConfig;

  // ============================================================================
  // STATE
  // ============================================================================

  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [proof, setProof] = useState<KYCProof | null>(null);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationFeeValue, setRegistrationFeeValue] = useState<string>(REGISTRATION_FEE);

  // ============================================================================
  // FETCH REGISTRATION FEE
  // ============================================================================

  const fetchFee = useCallback(async () => {
    // Use the fee from config - no contract call needed
    const fallbackFee = chainConfig?.fees?.KYC_FEE;
    
    console.log('[useKYC] Setting fee from config', {
      chainId,
      fee: fallbackFee
    });
    
    if (fallbackFee) {
      setRegistrationFeeValue(formatEther(BigInt(fallbackFee)));
    } else {
      setRegistrationFeeValue(REGISTRATION_FEE);
    }
  }, [chainConfig?.fees?.KYC_FEE, chainId]);
  // ============================================================================
  // REFRESH STATUS
  // ============================================================================

  const refreshStatus = useCallback(async () => {
    if (!address || !isConnected) {
      setStatus(null);
      setProof(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the correct endpoint with address in path
      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/status/${address}`
      );
      
      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<{
        success: boolean;
        found: boolean;
        kycStatus: string;
        kycLevel: number;
        isVerified: boolean;
        submission?: {
          level: number;
          status: number;
          countryCode: number;
          expiresAt: number | null;
        };
      }>(response, 'Failed to fetch status');

      if (parseError) {
        throw new Error(parseError);
      }

      if (data) {
        // Map API response to KYCStatus interface
        const mappedStatus: KYCStatus = {
          hasApplication: data.found,
          applicationStatus: data.kycStatus === 'approved' ? 'approved' 
            : data.kycStatus === 'pending' ? 'pending'
            : data.kycStatus === 'rejected' ? 'rejected'
            : 'none',
          kycLevel: data.kycLevel || 0,
          isExpired: data.kycStatus === 'expired',
          expiryDate: data.submission?.expiresAt 
            ? new Date(data.submission.expiresAt * 1000).toISOString() 
            : null,
          canResubmit: data.kycStatus === 'rejected' || data.kycStatus === 'none',
        };
        
        setStatus(mappedStatus);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh KYC status';
      console.error('Failed to refresh KYC status:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);


  // ============================================================================
  // SUBMIT KYC
  // ============================================================================

  const submitKYC = useCallback(async (submission: KYCSubmission): Promise<boolean> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const requestedLevel = submission.requestedLevel || 1;
      
      const message = `Submit KYC Application\nWallet: ${address}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`;
      
      // Cast walletClient to any to avoid type issues
      const signature = await (walletClient as any).signMessage({
        account: address,
        message,
      });

      const { response, error: fetchError } = await safeFetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'x-chain-id': chainId?.toString() || '',
        },
        body: JSON.stringify({
          ...submission,
          walletAddress: address,
          signature,
          timestamp,
          requestedLevel,
        }),
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<{
        success: boolean;
        proof?: KYCProof;
        status?: string;
        message?: string;
      }>(response, 'Failed to submit KYC');

      if (parseError) {
        throw new Error(parseError);
      }

      if (data?.proof) {
        setProof(data.proof);
      }

      await refreshStatus();
      return data?.success ?? false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit KYC';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [address, walletClient, chainId, refreshStatus]);

  // ============================================================================
  // GET PROOF
  // ============================================================================

  const getProof = useCallback(async (): Promise<KYCProof | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Get KYC Proof'
      );

      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/proof?wallet=${address}&timestamp=${timestamp}&signature=${signature}`
      );

      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<{
        proof: KYCProof;
      }>(response, 'Failed to get proof');

      if (parseError) {
        throw new Error(parseError);
      }

      if (data?.proof) {
        setProof(data.proof);
        return data.proof;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get proof';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // REGISTER ON CHAIN
  // ============================================================================

  const registerOnChain = useCallback(async (): Promise<Hash | null> => {
    if (!address || !walletClient || !publicClient) {
      setError('Wallet not connected');
      return null;
    }

    if (!chainConfig?.contracts?.KYCVerifier) {
      setError('KYC Verifier contract not configured');
      return null;
    }

    let currentProof = proof;
    if (!currentProof) {
      currentProof = await getProof();
      if (!currentProof) {
        setError('No valid KYC proof available');
        return null;
      }
    }

    setIsRegistering(true);
    setError(null);

    try {
      const feeInWei = parseEther(registrationFeeValue);

      const hash = await walletClient.writeContract({
        address: chainConfig.contracts.KYCVerifier as Address,
        abi: KYC_VERIFIER_ABI,
        functionName: 'registerWithProof',
        args: [
          currentProof.level,
          currentProof.countryCode,
          BigInt(currentProof.expiry),
          currentProof.signature,
        ],
        value: feeInWei,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await refreshStatus();
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register on chain';
      setError(errorMessage);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, [address, walletClient, publicClient, chainConfig?.contracts?.KYCVerifier, proof, getProof, registrationFeeValue, refreshStatus]);

  // ============================================================================
  // UPLOAD DOCUMENT
  // ============================================================================

  const uploadDocument = useCallback(async (
    file: File,
    documentType: string
  ): Promise<DocumentUploadResult | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Upload Document'
      );

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('wallet', address);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());

      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        body: formData,
      });

      const { data, error: parseError } = await parseApiResponse<DocumentUploadResult>(
        response,
        'Failed to upload document'
      );

      if (parseError) {
        throw new Error(parseError);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // GENERATE LINK CODE
  // ============================================================================

  const generateLinkCode = useCallback(async (): Promise<WalletLinkCode | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Generate Link Code'
      );

      const { response, error: fetchError } = await safeFetch('/api/kyc/link/generate', {
        method: 'POST',
        body: JSON.stringify({
          wallet: address,
          signature,
          timestamp,
        }),
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<WalletLinkCode>(
        response,
        'Failed to generate link code'
      );

      if (parseError) {
        throw new Error(parseError);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate link code';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // USE LINK CODE
  // ============================================================================

  const useLinkCode = useCallback(async (code: string): Promise<boolean> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return false;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Use Link Code'
      );

      const { response, error: fetchError } = await safeFetch('/api/kyc/link/use', {
        method: 'POST',
        body: JSON.stringify({
          code,
          wallet: address,
          signature,
          timestamp,
        }),
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<{ success: boolean }>(
        response,
        'Failed to use link code'
      );

      if (parseError) {
        throw new Error(parseError);
      }

      await refreshStatus();
      return data?.success ?? false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to use link code';
      setError(errorMessage);
      return false;
    }
  }, [address, walletClient, refreshStatus]);

  // ============================================================================
  // GET LINKED WALLETS
  // ============================================================================

  const getLinkedWallets = useCallback(async (): Promise<LinkedWallet[]> => {
    if (!address || !walletClient) {
      return [];
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Get Linked Wallets'
      );

      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/link/list?wallet=${address}&timestamp=${timestamp}&signature=${signature}`
      );

      if (fetchError) {
        console.error(fetchError);
        return [];
      }

      const { data, error: parseError } = await parseApiResponse<{ wallets: LinkedWallet[] }>(
        response,
        'Failed to get linked wallets'
      );

      if (parseError) {
        console.error(parseError);
        return [];
      }

      const wallets = data?.wallets || [];
      setLinkedWallets(wallets);
      return wallets;
    } catch (err) {
      console.error('Failed to get linked wallets:', err);
      return [];
    }
  }, [address, walletClient]);

  // ============================================================================
  // EXPORT DATA (GDPR)
  // ============================================================================

  const exportData = useCallback(async (): Promise<Blob | null> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Export KYC Data'
      );

      const { response, error: fetchError } = await safeFetch(
        `/api/kyc/gdpr/export?wallet=${address}&timestamp=${timestamp}&signature=${signature}`
      );

      if (fetchError) {
        throw new Error(fetchError);
      }

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        throw new Error(errorData.error || 'Failed to export data');
      }

      return await response.blob();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      return null;
    }
  }, [address, walletClient]);

  // ============================================================================
  // REQUEST DELETION (GDPR)
  // ============================================================================

  const requestDeletion = useCallback(async (): Promise<boolean> => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return false;
    }

    try {
      const { signature, timestamp } = await createSignedMessage(
        walletClient,
        address,
        'Delete KYC Data'
      );

      const { response, error: fetchError } = await safeFetch('/api/kyc/gdpr/delete', {
        method: 'POST',
        body: JSON.stringify({
          wallet: address,
          signature,
          timestamp,
        }),
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      const { data, error: parseError } = await parseApiResponse<{ success: boolean }>(
        response,
        'Failed to delete data'
      );

      if (parseError) {
        throw new Error(parseError);
      }

      // Reset local state
      setStatus(null);
      setProof(null);
      setLinkedWallets([]);

      return data?.success ?? false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
      setError(errorMessage);
      return false;
    }
  }, [address, walletClient]);

  // ============================================================================
  // CLEAR ERROR
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isKYCValid = useMemo(() => {
    if (!status) return false;
    return status.applicationStatus === 'approved' && !status.isExpired;
  }, [status]);

  const canInvest = useMemo(() => {
    return isKYCValid && (status?.kycLevel ?? 0) >= KYC_LEVELS.BASIC;
  }, [isKYCValid, status?.kycLevel]);

  const canInvestAccredited = useMemo(() => {
    return isKYCValid && (status?.kycLevel ?? 0) >= KYC_LEVELS.ACCREDITED;
  }, [isKYCValid, status?.kycLevel]);

  const kycLevel = useMemo(() => {
    return status?.kycLevel ?? KYC_LEVELS.NONE;
  }, [status?.kycLevel]);

  const hasEnoughBalance = useMemo(() => {
    if (!balanceData?.value) return false;
    try {
      const feeInWei = parseEther(registrationFeeValue);
      return balanceData.value >= feeInWei;
    } catch {
      return false;
    }
  }, [balanceData?.value, registrationFeeValue]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (chainId) {
      fetchFee();
    }
  }, [fetchFee, chainId]);

  useEffect(() => {
    if (address && isConnected) {
      refreshStatus();
    } else {
      setStatus(null);
      setProof(null);
      setLinkedWallets([]);
    }
  }, [address, isConnected, refreshStatus]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    status,
    proof,
    linkedWallets,
    isLoading,
    isSubmitting,
    isRegistering,
    error,
    isKYCValid,
    canInvest,
    canInvestAccredited,
    kycLevel,
    registrationFee: registrationFeeValue,
    hasEnoughBalance,
    refreshStatus,
    submitKYC,
    getProof,
    registerOnChain,
    uploadDocument,
    generateLinkCode,
    useLinkCode,
    getLinkedWallets,
    exportData,
    requestDeletion,
    clearError,
  };
}

export default useKYC;
