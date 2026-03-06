// src/lib/kyc-limits.ts
import { createPublicClient, http, type Chain } from 'viem';
import { 
  avalanche, 
  avalancheFuji, 
  polygon, 
  polygonAmoy,
  mainnet as ethereum,
  sepolia,
  arbitrum,
  base,
  optimism,
  bsc
} from 'viem/chains';
import { CHAINS, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
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

// =============================================================================
// CHAIN CONFIGURATION
// =============================================================================

// Map chain IDs to viem chain objects
const VIEM_CHAINS: Record<SupportedChainId, Chain> = {
  43113: avalancheFuji,
  43114: avalanche,
  137: polygon,
  80002: polygonAmoy,
  1: ethereum,
  11155111: sepolia,
  42161: arbitrum,
  8453: base,
  10: optimism,
  56: bsc,
  31337: {
    id: 31337,
    name: 'Hardhat',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  } as Chain,
};

// Get RPC URL for a chain
function getRpcUrl(chainId: SupportedChainId): string {
  const chainInfo = CHAINS[chainId];
  return chainInfo?.rpcUrl || 'http://127.0.0.1:8545';
}

// Get viem chain object
function getViemChain(chainId: SupportedChainId): Chain {
  return VIEM_CHAINS[chainId] || avalancheFuji;
}

// Get KYC Manager address for a chain
function getKYCManagerAddress(chainId: SupportedChainId): `0x${string}` | null {
  const deployment = DEPLOYMENTS[chainId];
  if (!deployment?.contracts?.KYCManager) return null;
  if (deployment.contracts.KYCManager === '0x0000000000000000000000000000000000000000') return null;
  return deployment.contracts.KYCManager as `0x${string}`;
}

// =============================================================================
// PUBLIC CLIENT CACHE
// =============================================================================

const clientCache: Map<SupportedChainId, ReturnType<typeof createPublicClient>> = new Map();

function getPublicClient(chainId: SupportedChainId) {
  if (!clientCache.has(chainId)) {
    const chain = getViemChain(chainId);
    const rpcUrl = getRpcUrl(chainId);
    
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    
    clientCache.set(chainId, client);
  }
  
  return clientCache.get(chainId)!;
}

// =============================================================================
// LIMITS CACHE - PER CHAIN
// =============================================================================

interface CacheEntry {
  limits: TierLimits;
  timestamp: number;
}

const limitsCache: Map<SupportedChainId, CacheEntry> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Default limits (fallback)
const DEFAULT_LIMITS: TierLimits = {
  None: 0,
  Bronze: 10_000,
  Silver: 100_000,
  Gold: 1_000_000,
  Diamond: Infinity
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get tier limits from contract for a specific chain
 */
export async function getTierLimitsFromContract(
  chainId: SupportedChainId = 43113
): Promise<TierLimits> {
  // Check cache
  const cached = limitsCache.get(chainId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.limits;
  }

  const kycManagerAddress = getKYCManagerAddress(chainId);
  
  if (!kycManagerAddress) {
    console.warn(`[KYC Limits] KYCManager not deployed on chain ${chainId}`);
    return DEFAULT_LIMITS;
  }

  const client = getPublicClient(chainId);

  const limits: TierLimits = {
    None: 0,
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Diamond: Infinity
  };

  try {
    const results = await Promise.all([
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'tierLimits', 
        args: [1] 
      }),
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'tierLimits', 
        args: [2] 
      }),
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'tierLimits', 
        args: [3] 
      }),
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'tierLimits', 
        args: [4] 
      })
    ]);

    limits.Bronze = Number(results[0]) / 1_000_000;
    limits.Silver = Number(results[1]) / 1_000_000;
    limits.Gold = Number(results[2]) / 1_000_000;
    limits.Diamond = results[3] === 0n ? Infinity : Number(results[3]) / 1_000_000;

    // Update cache
    limitsCache.set(chainId, { limits, timestamp: Date.now() });
    
    console.log(`[KYC Limits] Fetched from contract on chain ${chainId}:`, limits);
  } catch (error) {
    console.error(`[KYC Limits] Failed to fetch from contract on chain ${chainId}:`, error);
    return DEFAULT_LIMITS;
  }

  return limits;
}

/**
 * Get user's KYC limits for a specific chain
 */
export async function getUserLimits(
  address: `0x${string}`,
  chainId: SupportedChainId = 43113
): Promise<{
  tier: TierName;
  limit: number;
  used: number;
  remaining: number;
  chainId: SupportedChainId;
}> {
  const kycManagerAddress = getKYCManagerAddress(chainId);
  
  if (!kycManagerAddress) {
    console.warn(`[KYC Limits] KYCManager not deployed on chain ${chainId}`);
    return { tier: 'None', limit: 0, used: 0, remaining: 0, chainId };
  }

  const client = getPublicClient(chainId);

  try {
    const [submission, remaining, invested] = await Promise.all([
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'getSubmission', 
        args: [address] 
      }),
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'getRemainingLimit', 
        args: [address] 
      }),
      client.readContract({ 
        address: kycManagerAddress, 
        abi: KYCManagerABI, 
        functionName: 'getTotalInvested', 
        args: [address] 
      })
    ]);

    const tierIndex = (submission as any).level as number;
    const tier = TIER_NAMES[tierIndex] || 'None';
    const limits = await getTierLimitsFromContract(chainId);
    const limit = limits[tier];

    // Check for max uint256 (unlimited)
    const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
    const remainingNum = remaining === MAX_UINT256
      ? Infinity
      : Number(remaining as bigint) / 1_000_000;

    return {
      tier,
      limit,
      used: Number(invested as bigint) / 1_000_000,
      remaining: remainingNum,
      chainId
    };
  } catch (error) {
    console.error(`[KYC Limits] Failed to fetch user limits on chain ${chainId}:`, error);
    return { tier: 'None', limit: 0, used: 0, remaining: 0, chainId };
  }
}

/**
 * Get user limits across all deployed chains
 */
export async function getUserLimitsAllChains(
  address: `0x${string}`
): Promise<Map<SupportedChainId, {
  tier: TierName;
  limit: number;
  used: number;
  remaining: number;
}>> {
  const results = new Map();
  
  // Get all chains with KYC Manager deployed
  const deployedChains = (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[])
    .filter(chainId => getKYCManagerAddress(Number(chainId) as SupportedChainId));

  // Fetch limits in parallel
  const promises = deployedChains.map(async (chainId) => {
    const numericChainId = Number(chainId) as SupportedChainId;
    const limits = await getUserLimits(address, numericChainId);
    return { chainId: numericChainId, limits };
  });

  const allResults = await Promise.all(promises);
  
  for (const { chainId, limits } of allResults) {
    results.set(chainId, limits);
  }

  return results;
}

/**
 * Get tier limits for all deployed chains
 */
export async function getTierLimitsAllChains(): Promise<Map<SupportedChainId, TierLimits>> {
  const results = new Map();
  
  const deployedChains = (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[])
    .filter(chainId => getKYCManagerAddress(Number(chainId) as SupportedChainId));

  const promises = deployedChains.map(async (chainId) => {
    const numericChainId = Number(chainId) as SupportedChainId;
    const limits = await getTierLimitsFromContract(numericChainId);
    return { chainId: numericChainId, limits };
  });

  const allResults = await Promise.all(promises);
  
  for (const { chainId, limits } of allResults) {
    results.set(chainId, limits);
  }

  return results;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert tier name to number
 */
export function tierNameToNumber(tier: TierName): number {
  return TIER_NAMES.indexOf(tier);
}

/**
 * Convert tier number to name
 */
export function tierNumberToName(num: number): TierName {
  return TIER_NAMES[num] || 'None';
}

/**
 * Check if KYC is available on a chain
 */
export function isKYCAvailableOnChain(chainId: SupportedChainId): boolean {
  return getKYCManagerAddress(chainId) !== null;
}

/**
 * Get all chains where KYC is available
 */
export function getKYCEnabledChains(): SupportedChainId[] {
  return (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[])
    .map(id => Number(id) as SupportedChainId)
    .filter(chainId => getKYCManagerAddress(chainId));
}

/**
 * Get chain name for display
 */
export function getChainName(chainId: SupportedChainId): string {
  return CHAINS[chainId]?.name || `Chain ${chainId}`;
}

/**
 * Clear the limits cache (useful for testing or forced refresh)
 */
export function clearLimitsCache(chainId?: SupportedChainId): void {
  if (chainId) {
    limitsCache.delete(chainId);
  } else {
    limitsCache.clear();
  }
}

/**
 * Invalidate cache for a specific chain (e.g., after a limit change)
 */
export function invalidateLimitsCache(chainId: SupportedChainId): void {
  limitsCache.delete(chainId);
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type { TierName, SupportedChainId };
export { TIER_NAMES, DEFAULT_LIMITS };
