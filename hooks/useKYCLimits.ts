'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getTierLimitsFromContract, getUserLimits, TierLimits } from '@/lib/kycLimits';

export function useKYCLimits() {
  const { address } = useAccount();
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null);
  const [userLimits, setUserLimits] = useState<{
    tier: string;
    limit: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLimits() {
      setLoading(true);
      try {
        const limits = await getTierLimitsFromContract();
        setTierLimits(limits);

        if (address) {
          const user = await getUserLimits(address as `0x${string}`);
          setUserLimits(user);
        }
      } catch (error) {
        console.error('Failed to fetch KYC limits:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLimits();
  }, [address]);

  const refetch = async () => {
    if (address) {
      const user = await getUserLimits(address as `0x${string}`);
      setUserLimits(user);
    }
  };

  return { tierLimits, userLimits, loading, refetch };
}
