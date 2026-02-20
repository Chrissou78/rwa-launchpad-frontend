// src/app/admin/kyc/hooks/useKYCData.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Address, PublicClient } from 'viem';
import { 
  StoredSubmission, 
  PendingSubmission, 
  PendingUpgrade, 
  KYCSettings,
  OnChainKYCData,
  UpgradeRequest,
  SearchResult,
  MAX_UINT256
} from '../types';
import { 
  parsePersonalInfo, 
  parseDocumentUrls, 
  parseValidationScores,
  contractDataToStoredSubmission 
} from '../utils';
import { KYCManagerABI } from '@/config/abis';

interface UseKYCDataProps {
  publicClient: PublicClient | undefined;
  kycManagerAddress: Address | undefined;
  chainId: number | undefined;
  isConnected: boolean;
}

interface UseKYCDataReturn {
  // Data
  storedSubmissions: Map<string, StoredSubmission>;
  pendingSubmissions: PendingSubmission[];
  pendingUpgrades: PendingUpgrade[];
  settings: KYCSettings | null;
  
  // Loading states
  isLoadingSubmissions: boolean;
  isLoadingSettings: boolean;
  isLoadingSearch: boolean;
  
  // Error states
  submissionsError: string | null;
  settingsError: string | null;
  searchError: string | null;
  
  // Actions
  fetchStoredSubmissions: () => Promise<void>;
  fetchPendingSubmissions: () => Promise<void>;
  fetchPendingUpgrades: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  searchAddress: (address: string) => Promise<SearchResult | null>;
  refreshAll: () => Promise<void>;
}

export function useKYCData({
  publicClient,
  kycManagerAddress,
  chainId,
  isConnected
}: UseKYCDataProps): UseKYCDataReturn {
  // State
  const [storedSubmissions, setStoredSubmissions] = useState<Map<string, StoredSubmission>>(new Map());
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [pendingUpgrades, setPendingUpgrades] = useState<PendingUpgrade[]>([]);
  const [settings, setSettings] = useState<KYCSettings | null>(null);
  
  // Loading states
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  
  // Error states
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fetch stored submissions from API
  const fetchStoredSubmissions = useCallback(async () => {
    if (!chainId) return;
    
    setIsLoadingSubmissions(true);
    setSubmissionsError(null);
    
    try {
      const response = await fetch('/api/admin/kyc/submissions', {
        headers: {
          'x-chain-id': chainId.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stored submissions');
      }
      
      const data = await response.json();
      const submissionsMap = new Map<string, StoredSubmission>();
      
      if (data.submissions && Array.isArray(data.submissions)) {
        data.submissions.forEach((sub: StoredSubmission) => {
          submissionsMap.set(sub.address.toLowerCase(), sub);
        });
      }
      
      setStoredSubmissions(submissionsMap);
    } catch (error) {
      console.error('Error fetching stored submissions:', error);
      setSubmissionsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [chainId]);

  // Fetch pending submissions from contract
  const fetchPendingSubmissions = useCallback(async () => {
    if (!publicClient || !kycManagerAddress) return;
    
    setIsLoadingSubmissions(true);
    setSubmissionsError(null);
    
    try {
      // Get pending submission addresses from contract
      const pendingAddresses = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingSubmissions'
      }) as Address[];
      
      const submissions: PendingSubmission[] = [];
      
      for (const address of pendingAddresses) {
        try {
          const kycData = await publicClient.readContract({
            address: kycManagerAddress,
            abi: KYCManagerABI,
            functionName: 'getKYCData',
            args: [address]
          }) as OnChainKYCData;
          
          const storedData = storedSubmissions.get(address.toLowerCase());
          
          submissions.push({
            address,
            tier: kycData.tier,
            status: kycData.status,
            submittedAt: kycData.submittedAt,
            storedData
          });
        } catch (error) {
          console.error(`Error fetching KYC data for ${address}:`, error);
        }
      }
      
      setPendingSubmissions(submissions);
    } catch (error) {
      console.error('Error fetching pending submissions:', error);
      setSubmissionsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [publicClient, kycManagerAddress, storedSubmissions]);

  // Fetch pending upgrades from contract
  const fetchPendingUpgrades = useCallback(async () => {
    if (!publicClient || !kycManagerAddress) return;
    
    try {
      const pendingAddresses = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingUpgrades'
      }) as Address[];
      
      const upgrades: PendingUpgrade[] = [];
      
      for (const address of pendingAddresses) {
        try {
          const upgradeRequest = await publicClient.readContract({
            address: kycManagerAddress,
            abi: KYCManagerABI,
            functionName: 'getUpgradeRequest',
            args: [address]
          }) as UpgradeRequest;
          
          const storedData = storedSubmissions.get(address.toLowerCase());
          
          upgrades.push({
            address,
            currentTier: upgradeRequest.currentTier,
            requestedTier: upgradeRequest.requestedTier,
            status: upgradeRequest.status,
            requestedAt: upgradeRequest.requestedAt,
            reason: upgradeRequest.reason,
            storedData
          });
        } catch (error) {
          console.error(`Error fetching upgrade request for ${address}:`, error);
        }
      }
      
      setPendingUpgrades(upgrades);
    } catch (error) {
      console.error('Error fetching pending upgrades:', error);
    }
  }, [publicClient, kycManagerAddress, storedSubmissions]);

  // Fetch settings from contract
  const fetchSettings = useCallback(async () => {
    if (!publicClient || !kycManagerAddress) return;
    
    setIsLoadingSettings(true);
    setSettingsError(null);
    
    try {
      const [kycFee, feeRecipient, autoVerifyThreshold, isPaused] = await Promise.all([
        publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'kycFee'
        }) as Promise<bigint>,
        publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'feeRecipient'
        }) as Promise<Address>,
        publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'autoVerifyThreshold'
        }) as Promise<bigint>,
        publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'paused'
        }) as Promise<boolean>
      ]);
      
      // Fetch tier limits
      const tierLimits: Record<number, bigint> = {};
      const validityPeriods: Record<number, bigint> = {};
      
      for (let tier = 1; tier <= 4; tier++) {
        try {
          const [limit, period] = await Promise.all([
            publicClient.readContract({
              address: kycManagerAddress,
              abi: KYCManagerABI,
              functionName: 'getTierInvestmentLimit',
              args: [tier]
            }) as Promise<bigint>,
            publicClient.readContract({
              address: kycManagerAddress,
              abi: KYCManagerABI,
              functionName: 'getTierValidityPeriod',
              args: [tier]
            }) as Promise<bigint>
          ]);
          
          tierLimits[tier] = limit;
          validityPeriods[tier] = period;
        } catch (error) {
          console.error(`Error fetching tier ${tier} config:`, error);
          tierLimits[tier] = MAX_UINT256;
          validityPeriods[tier] = BigInt(365 * 24 * 60 * 60);
        }
      }
      
      setSettings({
        kycFee,
        feeRecipient,
        autoVerifyThreshold: Number(autoVerifyThreshold),
        isPaused,
        tierLimits,
        validityPeriods
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettingsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingSettings(false);
    }
  }, [publicClient, kycManagerAddress]);

  // Search for a specific address
  const searchAddress = useCallback(async (address: string): Promise<SearchResult | null> => {
    if (!publicClient || !kycManagerAddress) return null;
    
    setIsLoadingSearch(true);
    setSearchError(null);
    
    try {
      // Get on-chain KYC data
      const kycData = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getKYCData',
        args: [address as Address]
      }) as OnChainKYCData;
      
      // Get total invested
      const totalInvested = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getTotalInvested',
        args: [address as Address]
      }) as bigint;
      
      // Check if valid
      const isValid = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'isKYCValid',
        args: [address as Address]
      }) as boolean;
      
      // Get upgrade request if any
      let upgradeRequest: UpgradeRequest | null = null;
      try {
        upgradeRequest = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'getUpgradeRequest',
          args: [address as Address]
        }) as UpgradeRequest;
        
        // If status is 0 (None), set to null
        if (upgradeRequest.status === 0) {
          upgradeRequest = null;
        }
      } catch {
        // No upgrade request
      }
      
      // Get stored submission from API
      let storedSubmission: StoredSubmission | null = null;
      try {
        const response = await fetch(`/api/admin/kyc/submissions/${address}`, {
          headers: {
            'x-chain-id': chainId?.toString() || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          storedSubmission = data.submission;
        }
      } catch {
        // No stored submission
      }
      
      // Merge data
      const submission = storedSubmission || contractDataToStoredSubmission(
        address,
        kycData
      );
      
      submission.totalInvested = totalInvested.toString();
      submission.isValid = isValid;
      
      if (upgradeRequest) {
        submission.upgradeRequest = upgradeRequest;
      }
      
      return {
        submission,
        onChainData: kycData,
        totalInvested,
        isValid,
        upgradeRequest
      };
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsLoadingSearch(false);
    }
  }, [publicClient, kycManagerAddress, chainId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await fetchStoredSubmissions();
    await Promise.all([
      fetchPendingSubmissions(),
      fetchPendingUpgrades(),
      fetchSettings()
    ]);
  }, [fetchStoredSubmissions, fetchPendingSubmissions, fetchPendingUpgrades, fetchSettings]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (isConnected && publicClient && kycManagerAddress) {
      refreshAll();
    }
  }, [isConnected, publicClient, kycManagerAddress]);

  return {
    storedSubmissions,
    pendingSubmissions,
    pendingUpgrades,
    settings,
    isLoadingSubmissions,
    isLoadingSettings,
    isLoadingSearch,
    submissionsError,
    settingsError,
    searchError,
    fetchStoredSubmissions,
    fetchPendingSubmissions,
    fetchPendingUpgrades,
    fetchSettings,
    searchAddress,
    refreshAll
  };
}
