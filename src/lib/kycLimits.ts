// src/lib/kyc-limits.ts
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
type TierName = typeof TIER_NAMES[number];

export interface TierLimits {
  None: number;
  Bronze: number;
  Silver: number;
  Gold: number;
  Diamond: number;
}

let cachedLimits: TierLimits | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getTierLimitsFromContract(): Promise<TierLimits> {
  // Return cached if fresh
  if (cachedLimits && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedLimits;
  }

  if (!CONTRACTS.KYCManager) {
    console.warn('[KYC Limits] KYCManager contract not configured');
    return {
      None: 0,
      Bronze: 10_000,
      Silver: 100_000,
      Gold: 1_000_000,
      Diamond: Infinity
    };
  }

  const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology')
  });

  const KYC_MANAGER_ADDRESS = CONTRACTS.KYCManager as `0x${string}`;

  const limits: TierLimits = {
    None: 0,
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Diamond: Infinity
  };

  try {
    const results = await Promise.all([
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'tierLimits', args: [1] }),
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'tierLimits', args: [2] }),
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'tierLimits', args: [3] }),
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'tierLimits', args: [4] })
    ]);

    limits.Bronze = Number(results[0]) / 1_000_000;
    limits.Silver = Number(results[1]) / 1_000_000;
    limits.Gold = Number(results[2]) / 1_000_000;
    limits.Diamond = results[3] === 0n ? Infinity : Number(results[3]) / 1_000_000;

    cachedLimits = limits;
    cacheTimestamp = Date.now();
    
    console.log('[KYC Limits] Fetched from contract:', limits);
  } catch (error) {
    console.error('[KYC Limits] Failed to fetch from contract:', error);
    // Fallback to defaults if contract call fails
    return {
      None: 0,
      Bronze: 10_000,
      Silver: 100_000,
      Gold: 1_000_000,
      Diamond: Infinity
    };
  }

  return limits;
}

export async function getUserLimits(address: `0x${string}`): Promise<{
  tier: TierName;
  limit: number;
  used: number;
  remaining: number;
}> {
  if (!CONTRACTS.KYCManager) {
    console.warn('[KYC Limits] KYCManager contract not configured');
    return { tier: 'None', limit: 0, used: 0, remaining: 0 };
  }

  const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology')
  });

  const KYC_MANAGER_ADDRESS = CONTRACTS.KYCManager as `0x${string}`;

  try {
    const [submission, remaining, invested] = await Promise.all([
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'getSubmission', args: [address] }),
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'getRemainingLimit', args: [address] }),
      client.readContract({ address: KYC_MANAGER_ADDRESS, abi: KYCManagerABI, functionName: 'getTotalInvested', args: [address] })
    ]);

    const tierIndex = (submission as any).level as number;
    const tier = TIER_NAMES[tierIndex] || 'None';
    const limits = await getTierLimitsFromContract();
    const limit = limits[tier];

    const remainingNum = remaining === BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
      ? Infinity
      : Number(remaining as bigint) / 1_000_000;

    return {
      tier,
      limit,
      used: Number(invested as bigint) / 1_000_000,
      remaining: remainingNum
    };
  } catch (error) {
    console.error('[KYC Limits] Failed to fetch user limits:', error);
    return { tier: 'None', limit: 0, used: 0, remaining: 0 };
  }
}

// For server-side/API use
export function tierNameToNumber(tier: TierName): number {
  return TIER_NAMES.indexOf(tier);
}

export function tierNumberToName(num: number): TierName {
  return TIER_NAMES[num] || 'None';
}
