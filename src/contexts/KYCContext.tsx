'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAccount } from 'wagmi';

export type KYCTier = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
export type KYCStatus = 'None' | 'Pending' | 'AutoVerifying' | 'ManualReview' | 'Approved' | 'Rejected' | 'Expired' | 'Revoked';

export const CONTRACT_LEVEL_TO_TIER: Record<number, KYCTier> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond'
};

export const TIER_TO_CONTRACT_LEVEL: Record<KYCTier, number> = {
  'None': 0,
  'Bronze': 1,
  'Silver': 2,
  'Gold': 3,
  'Diamond': 4
};

export interface KYCData {
  tier: KYCTier;
  status: KYCStatus;
  investmentLimit: number;
  usedLimit: number;
  remainingLimit: number;
  expiresAt?: number;
  countryCode?: number;
  requestedLevel?: number;
  rejectionReason?: number;
  isLoading: boolean;
  error: string | null;
}

export interface TierInfo {
  name: KYCTier;
  contractLevel: number;
  label: string;
  limit: string;
  limitValue: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  requirements: string[];
  description: string;
}

// ============================================
// GLOBAL CACHE (shared across all instances)
// ============================================
const globalCache = {
  tierLimits: null as Record<KYCTier, number> | null,
  tierLimitsTimestamp: 0,
  isFetchingLimits: false,
  statusCache: new Map<string, { data: any; timestamp: number }>(),
  isFetchingStatus: new Set<string>()
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_FETCH_INTERVAL = 3000; // 3 seconds minimum

// Default tier limits
const DEFAULT_TIER_LIMITS: Record<KYCTier, number> = {
  None: 0,
  Bronze: 10000,
  Silver: 100000,
  Gold: 1000000,
  Diamond: Infinity
};

function formatLimitDisplay(value: number): string {
  if (!isFinite(value)) return 'Unlimited';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const createTierInfo = (limits: Record<KYCTier, number>): TierInfo[] => [
  {
    name: 'None',
    contractLevel: 0,
    label: 'Unverified',
    limit: '$0',
    limitValue: 0,
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
    borderColor: 'border-gray-600',
    icon: '🚫',
    requirements: [],
    description: 'No verification'
  },
  {
    name: 'Bronze',
    contractLevel: 1,
    label: 'Bronze',
    limit: formatLimitDisplay(limits.Bronze),
    limitValue: limits.Bronze,
    color: 'text-amber-600',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-600',
    icon: '🥉',
    requirements: ['Personal Information', 'Government ID'],
    description: 'Basic verification'
  },
  {
    name: 'Silver',
    contractLevel: 2,
    label: 'Silver',
    limit: formatLimitDisplay(limits.Silver),
    limitValue: limits.Silver,
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/30',
    borderColor: 'border-gray-400',
    icon: '🥈',
    requirements: ['Selfie verification'],
    description: 'Standard verification'
  },
  {
    name: 'Gold',
    contractLevel: 3,
    label: 'Gold',
    limit: formatLimitDisplay(limits.Gold),
    limitValue: limits.Gold,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-500',
    icon: '🥇',
    requirements: ['Liveness check', 'Proof of address'],
    description: 'Enhanced verification'
  },
  {
    name: 'Diamond',
    contractLevel: 4,
    label: 'Diamond',
    limit: 'Unlimited',
    limitValue: Infinity,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900/20',
    borderColor: 'border-cyan-400',
    icon: '💎',
    requirements: ['Accredited investor proof'],
    description: 'Accredited investor'
  }
];

export const meetsMinimumTier = (currentTier: KYCTier, requiredTier: KYCTier): boolean => {
  const tierOrder: KYCTier[] = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  return tierOrder.indexOf(currentTier) >= tierOrder.indexOf(requiredTier);
};

interface KYCContextValue {
  kycData: KYCData;
  tierInfo: TierInfo;
  allTiers: TierInfo[];
  tierLimits: Record<KYCTier, number>;
  refreshKYC: () => Promise<void>;
  canInvest: (amount: number) => { allowed: boolean; reason?: string };
  canCreateProject: () => { allowed: boolean; reason?: string };
  formatLimit: (value: number) => string;
  getTierInfo: (tier: KYCTier) => TierInfo;
  getTierByContractLevel: (level: number) => TierInfo;
}

const defaultKycData: KYCData = {
  tier: 'None',
  status: 'None',
  investmentLimit: 0,
  usedLimit: 0,
  remainingLimit: 0,
  isLoading: false,
  error: null
};

const KYCContext = createContext<KYCContextValue>({
  kycData: defaultKycData,
  tierInfo: createTierInfo(DEFAULT_TIER_LIMITS)[0],
  allTiers: createTierInfo(DEFAULT_TIER_LIMITS),
  tierLimits: DEFAULT_TIER_LIMITS,
  refreshKYC: async () => {},
  canInvest: () => ({ allowed: false, reason: 'Not initialized' }),
  canCreateProject: () => ({ allowed: false, reason: 'Not initialized' }),
  formatLimit: () => '$0',
  getTierInfo: () => createTierInfo(DEFAULT_TIER_LIMITS)[0],
  getTierByContractLevel: () => createTierInfo(DEFAULT_TIER_LIMITS)[0]
});

// ============================================
// Global fetch functions (singleton pattern)
// ============================================
async function fetchTierLimitsGlobal(force = false): Promise<Record<KYCTier, number>> {
  const now = Date.now();
  
  // Return cached if fresh
  if (!force && globalCache.tierLimits && (now - globalCache.tierLimitsTimestamp) < CACHE_DURATION) {
    return globalCache.tierLimits;
  }
  
  // Skip if already fetching
  if (globalCache.isFetchingLimits) {
    // Wait for existing fetch
    await new Promise(resolve => setTimeout(resolve, 100));
    if (globalCache.tierLimits) return globalCache.tierLimits;
    return DEFAULT_TIER_LIMITS;
  }
  
  globalCache.isFetchingLimits = true;
  
  try {
    const response = await fetch('/api/kyc/limits');
    const data = await response.json();
    
    if (data.success && data.limits) {
      const newLimits: Record<KYCTier, number> = {
        None: 0,
        Bronze: data.limits.Bronze ?? data.limits[1] ?? DEFAULT_TIER_LIMITS.Bronze,
        Silver: data.limits.Silver ?? data.limits[2] ?? DEFAULT_TIER_LIMITS.Silver,
        Gold: data.limits.Gold ?? data.limits[3] ?? DEFAULT_TIER_LIMITS.Gold,
        Diamond: data.limits.Diamond ?? data.limits[4] ?? Infinity
      };
      
      globalCache.tierLimits = newLimits;
      globalCache.tierLimitsTimestamp = now;
      console.log('[KYCContext] Tier limits loaded (global):', newLimits);
      return newLimits;
    }
  } catch (error) {
    console.error('[KYCContext] Failed to fetch tier limits:', error);
  } finally {
    globalCache.isFetchingLimits = false;
  }
  
  return globalCache.tierLimits || DEFAULT_TIER_LIMITS;
}

async function fetchKYCStatusGlobal(address: string, force = false): Promise<any> {
  const now = Date.now();
  const cached = globalCache.statusCache.get(address);
  
  // Return cached if fresh
  if (!force && cached && (now - cached.timestamp) < MIN_FETCH_INTERVAL) {
    return cached.data;
  }
  
  // Skip if already fetching this address
  if (globalCache.isFetchingStatus.has(address)) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return globalCache.statusCache.get(address)?.data || null;
  }
  
  globalCache.isFetchingStatus.add(address);
  
  try {
    const response = await fetch(`/api/kyc/status/${address}`);
    const data = await response.json();
    
    globalCache.statusCache.set(address, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error('[KYCContext] Failed to fetch KYC status:', error);
    return null;
  } finally {
    globalCache.isFetchingStatus.delete(address);
  }
}

export function KYCProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [kycData, setKycData] = useState<KYCData>(defaultKycData);
  const [tierLimits, setTierLimits] = useState<Record<KYCTier, number>>(
    globalCache.tierLimits || DEFAULT_TIER_LIMITS
  );
  const [allTiers, setAllTiers] = useState<TierInfo[]>(
    createTierInfo(globalCache.tierLimits || DEFAULT_TIER_LIMITS)
  );
  
  const mountedRef = useRef(true);
  const lastAddressRef = useRef<string | null>(null);

  // Load tier limits
  useEffect(() => {
    let cancelled = false;
    
    const loadLimits = async () => {
      const limits = await fetchTierLimitsGlobal();
      if (!cancelled && mountedRef.current) {
        setTierLimits(limits);
        setAllTiers(createTierInfo(limits));
      }
    };
    
    loadLimits();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Load KYC status when address changes
  useEffect(() => {
    if (!address || !isConnected) {
      setKycData(defaultKycData);
      lastAddressRef.current = null;
      return;
    }

    // Skip if same address AND we already have non-loading data
    if (lastAddressRef.current === address && !kycData.isLoading && kycData.tier !== 'None') {
      return;
    }
    lastAddressRef.current = address;
    
    let cancelled = false;
    
    const loadStatus = async () => {
      setKycData(prev => ({ ...prev, isLoading: true }));
      
      const data = await fetchKYCStatusGlobal(address);
      
      if (cancelled || !mountedRef.current) return;
      
      if (data?.found && data.submission) {
        const submission = data.submission;
        const tier = CONTRACT_LEVEL_TO_TIER[submission.level] || 'None';
        const investmentLimit = tier === 'Diamond' ? Infinity : (tierLimits[tier] || 0);
        const usedLimit = submission.totalInvested || 0;
        
        let remainingLimit: number;
        if (tier === 'Diamond') {
          remainingLimit = Infinity;
        } else if (submission.remainingLimit !== undefined) {
          remainingLimit = submission.remainingLimit;
        } else {
          remainingLimit = Math.max(0, investmentLimit - usedLimit);
        }
        
        setKycData({
          tier,
          status: submission.status as KYCStatus,
          investmentLimit,
          usedLimit,
          remainingLimit,
          expiresAt: submission.expiresAt,
          countryCode: submission.countryCode,
          requestedLevel: submission.requestedLevel,
          rejectionReason: submission.rejectionReason,
          isLoading: false,
          error: null
        });
      } else {
        setKycData({ ...defaultKycData, isLoading: false });
      }
    };
    
    loadStatus();
    
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, tierLimits]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isConnected || !address) return;
    
    const interval = setInterval(async () => {
      const data = await fetchKYCStatusGlobal(address, true);
      if (data?.found && data.submission && mountedRef.current) {
        const submission = data.submission;
        const tier = CONTRACT_LEVEL_TO_TIER[submission.level] || 'None';
        const investmentLimit = tier === 'Diamond' ? Infinity : (tierLimits[tier] || 0);
        const usedLimit = submission.totalInvested || 0;
        const remainingLimit = tier === 'Diamond' ? Infinity : Math.max(0, investmentLimit - usedLimit);
        
        setKycData(prev => ({
          ...prev,
          tier,
          status: submission.status as KYCStatus,
          usedLimit,
          remainingLimit
        }));
      }
    }, 300000);
    
    return () => clearInterval(interval);
  }, [isConnected, address, tierLimits]);

  const refreshKYC = useCallback(async () => {
    const limits = await fetchTierLimitsGlobal(true);
    setTierLimits(limits);
    setAllTiers(createTierInfo(limits));
    
    if (address) {
      const data = await fetchKYCStatusGlobal(address, true);
      if (data?.found && data.submission) {
        const submission = data.submission;
        const tier = CONTRACT_LEVEL_TO_TIER[submission.level] || 'None';
        const investmentLimit = tier === 'Diamond' ? Infinity : (limits[tier] || 0);
        const usedLimit = submission.totalInvested || 0;
        const remainingLimit = tier === 'Diamond' ? Infinity : Math.max(0, investmentLimit - usedLimit);
        
        setKycData({
          tier,
          status: submission.status as KYCStatus,
          investmentLimit,
          usedLimit,
          remainingLimit,
          expiresAt: submission.expiresAt,
          countryCode: submission.countryCode,
          requestedLevel: submission.requestedLevel,
          rejectionReason: submission.rejectionReason,
          isLoading: false,
          error: null
        });
      }
    }
  }, [address]);

  const currentTierInfo = allTiers.find(t => t.name === kycData.tier) || allTiers[0];

  const getTierInfoByName = useCallback((tier: KYCTier): TierInfo => {
    return allTiers.find(t => t.name === tier) || allTiers[0];
  }, [allTiers]);

  const getTierByContractLevel = useCallback((level: number): TierInfo => {
    return allTiers.find(t => t.contractLevel === level) || allTiers[0];
  }, [allTiers]);

  const canInvest = useCallback((amount: number): { allowed: boolean; reason?: string } => {
    if (kycData.status !== 'Approved') {
      return { allowed: false, reason: 'KYC verification required' };
    }
    if (kycData.tier === 'None') {
      return { allowed: false, reason: 'Please complete KYC verification' };
    }
    if (kycData.tier === 'Diamond') {
      return { allowed: true };
    }
    if (amount > kycData.remainingLimit) {
      return { allowed: false, reason: `Amount exceeds your remaining limit of ${formatLimitDisplay(kycData.remainingLimit)}` };
    }
    return { allowed: true };
  }, [kycData]);

  const canCreateProject = useCallback((): { allowed: boolean; reason?: string } => {
    if (kycData.status !== 'Approved') {
      return { allowed: false, reason: 'KYC verification required' };
    }
    if (!meetsMinimumTier(kycData.tier, 'Gold')) {
      return { allowed: false, reason: 'Gold tier or higher required to create projects' };
    }
    return { allowed: true };
  }, [kycData]);

  const formatLimit = useCallback((value: number): string => {
    return formatLimitDisplay(value);
  }, []);

  const contextValue: KYCContextValue = {
    kycData,
    tierInfo: currentTierInfo,
    allTiers,
    tierLimits,
    refreshKYC,
    canInvest,
    canCreateProject,
    formatLimit,
    getTierInfo: getTierInfoByName,
    getTierByContractLevel
  };

  return (
    <KYCContext.Provider value={contextValue}>
      {children}
    </KYCContext.Provider>
  );
}

export function useKYC(): KYCContextValue {
  return useContext(KYCContext);
}

export { formatLimitDisplay };
export const KYC_TIERS = createTierInfo(DEFAULT_TIER_LIMITS);
export const getTierInfo = (tier: KYCTier): TierInfo => KYC_TIERS.find(t => t.name === tier) || KYC_TIERS[0];
export const getTierByContractLevel = (level: number): TierInfo => KYC_TIERS.find(t => t.contractLevel === level) || KYC_TIERS[0];
