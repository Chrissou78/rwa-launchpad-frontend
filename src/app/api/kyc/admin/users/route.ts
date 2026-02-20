// src/app/api/kyc/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, isAddress, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { ZERO_ADDRESS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    KYCManager?: string;
  };
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Avalanche Fuji Testnet
  43113: {
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_FUJI_KYC_MANAGER || process.env.NEXT_PUBLIC_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io',
  },
  // Polygon Amoy Testnet
  80002: {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      KYCManager: process.env.POLYGON_AMOY_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com',
  },
  // Sepolia Testnet
  11155111: {
    chain: sepolia,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      KYCManager: process.env.SEPOLIA_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  // Avalanche Mainnet
  43114: {
    chain: avalanche,
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
  },
  // Polygon Mainnet
  137: {
    chain: polygon,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      KYCManager: process.env.POLYGON_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
  },
  // Ethereum Mainnet
  1: {
    chain: mainnet,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      KYCManager: process.env.ETHEREUM_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// ============================================================================
// CONSTANTS
// ============================================================================

// Contract status: PENDING=0, APPROVED=1, REJECTED=2, EXPIRED=3
// Admin UI status: None=0, Pending=1, AutoVerifying=2, ManualReview=3, Approved=4, Rejected=5, Expired=6
const CONTRACT_STATUS_TO_ADMIN: Record<number, number> = {
  0: 1,  // PENDING -> Pending
  1: 4,  // APPROVED -> Approved
  2: 5,  // REJECTED -> Rejected
  3: 6,  // EXPIRED -> Expired
};

const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'AutoVerifying',
  3: 'ManualReview',
  4: 'Approved',
  5: 'Rejected',
  6: 'Expired',
};

const LEVEL_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

function createChainPublicClient(chainConfig: ChainConfig) {
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function getChainIdFromRequest(request: NextRequest): number {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId') || request.headers.get('x-chain-id');
  return chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;
}

// ============================================================================
// GET - SEARCH KYC USERS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchAddress = searchParams.get('address');
    
    // Get chain ID
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        error: `Unsupported chain ID: ${chainId}`,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id, 10),
          name: config.name,
          isTestnet: config.isTestnet,
        })),
        submissions: [],
        stats: null,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json({ 
        error: `KYC Manager not configured for ${chainConfig.name}`,
        submissions: [],
        stats: null,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const contractAddress = getAddress(chainConfig.contracts.KYCManager);
    const publicClient = createChainPublicClient(chainConfig);

    console.log(`[${chainConfig.name}] Admin users endpoint - KYC Manager: ${contractAddress}`);

    // Get basic stats (pending count only - GDPR compliant)
    let pendingCount = 0;
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingCount',
        args: []
      });
      pendingCount = Number(result);
    } catch (e) {
      console.log(`[${chainConfig.name}] getPendingCount failed`);
    }

    const stats = {
      totalSubmissions: 0,
      totalAutoApproved: 0,
      totalManualApproved: 0,
      totalRejected: 0,
      pendingManualReview: pendingCount,
      totalUsers: 0
    };

    // If no search address, just return stats
    if (!searchAddress) {
      return NextResponse.json({ 
        success: true,
        submissions: [],
        stats,
        message: `Enter a wallet address to search on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
        isTestnet: chainConfig.isTestnet,
        kycManagerAddress: contractAddress,
      });
    }

    // Validate address
    if (!isAddress(searchAddress)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid wallet address',
        submissions: [],
        stats,
        chainId,
        chainName: chainConfig.name,
      });
    }

    // Fetch single submission
    try {
      const submission = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [searchAddress as `0x${string}`]
      }) as any;

      // Check if empty submission
      if (submission.investor === ZERO_ADDRESS || 
          Number(submission.submittedAt) === 0) {
        return NextResponse.json({ 
          success: true,
          submissions: [],
          stats,
          message: `No KYC submission found for this address on ${chainConfig.name}`,
          chainId,
          chainName: chainConfig.name,
        });
      }

      // Get additional data
      let totalInvested = BigInt(0);
      let isValid = false;
      let remainingLimit = BigInt(0);
      
      try {
        [totalInvested, isValid, remainingLimit] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'getTotalInvested',
            args: [searchAddress as `0x${string}`]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'isKYCValid',
            args: [searchAddress as `0x${string}`]
          }) as Promise<boolean>,
          publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'getRemainingLimit',
            args: [searchAddress as `0x${string}`]
          }) as Promise<bigint>,
        ]);
      } catch {}

      const contractStatus = Number(submission.status);
      const mappedStatus = CONTRACT_STATUS_TO_ADMIN[contractStatus] ?? 0;
      const level = Number(submission.level);

      const formattedSubmission = {
        user: submission.investor,
        status: mappedStatus,
        statusName: STATUS_NAMES[mappedStatus] || 'Unknown',
        level,
        levelName: LEVEL_NAMES[level] || 'Unknown',
        requestedLevel: level,
        countryCode: Number(submission.countryCode),
        documentHash: submission.documentHash,
        dataHash: '0x',
        submittedAt: Number(submission.submittedAt),
        verifiedAt: Number(submission.reviewedAt),
        expiresAt: Number(submission.expiresAt),
        verifiedBy: submission.reviewer,
        autoVerified: submission.reviewer?.toLowerCase() === contractAddress.toLowerCase(),
        rejectionReason: contractStatus === 2 ? 10 : 0,
        rejectionDetails: '',
        verificationScore: contractStatus === 1 ? 100 : 0,
        totalInvested: totalInvested.toString(),
        remainingLimit: remainingLimit.toString(),
        isValid,
        // Chain info
        chainId,
        chainName: chainConfig.name,
        explorerUrl: `${chainConfig.explorerUrl}/address/${submission.investor}`,
      };

      return NextResponse.json({ 
        success: true,
        submissions: [formattedSubmission],
        stats,
        total: 1,
        chainId,
        chainName: chainConfig.name,
        isTestnet: chainConfig.isTestnet,
        kycManagerAddress: contractAddress,
      });

    } catch (e: any) {
      console.error(`[${chainConfig.name}] Failed to fetch submission:`, e.message);
      return NextResponse.json({ 
        success: false,
        error: `Failed to fetch submission data on ${chainConfig.name}`,
        submissions: [],
        stats,
        chainId,
        chainName: chainConfig.name,
      });
    }

  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      submissions: [],
      stats: null
    }, { status: 500 });
  }
}

// ============================================================================
// POST - SEARCH USER ACROSS MULTIPLE CHAINS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address: searchAddress, chainIds } = body;

    if (!searchAddress) {
      return NextResponse.json({
        error: 'address is required',
        submissions: [],
      }, { status: 400 });
    }

    if (!isAddress(searchAddress)) {
      return NextResponse.json({
        error: 'Invalid wallet address',
        submissions: [],
      }, { status: 400 });
    }

    // If specific chains requested, use those; otherwise check all configured chains
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    console.log(`Searching KYC for ${searchAddress} across chains:`, chainsToCheck);

    const results: Record<number, any> = {};

    await Promise.all(
      chainsToCheck.map(async (chainId: number) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        
        if (!chainConfig || !chainConfig.contracts.KYCManager) {
          results[chainId] = {
            chainId,
            chainName: chainConfig?.name || 'Unknown',
            found: false,
            configured: false,
            error: 'KYC Manager not configured',
          };
          return;
        }

        try {
          const publicClient = createChainPublicClient(chainConfig);
          const contractAddress = getAddress(chainConfig.contracts.KYCManager);

          const submission = await publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'getSubmission',
            args: [searchAddress as `0x${string}`]
          }) as any;

          // Check if empty submission
          if (submission.investor === ZERO_ADDRESS || 
              Number(submission.submittedAt) === 0) {
            results[chainId] = {
              chainId,
              chainName: chainConfig.name,
              isTestnet: chainConfig.isTestnet,
              found: false,
              configured: true,
            };
            return;
          }

          // Get additional data
          let totalInvested = BigInt(0);
          let isValid = false;
          
          try {
            [totalInvested, isValid] = await Promise.all([
              publicClient.readContract({
                address: contractAddress,
                abi: KYCManagerABI,
                functionName: 'getTotalInvested',
                args: [searchAddress as `0x${string}`]
              }) as Promise<bigint>,
              publicClient.readContract({
                address: contractAddress,
                abi: KYCManagerABI,
                functionName: 'isKYCValid',
                args: [searchAddress as `0x${string}`]
              }) as Promise<boolean>,
            ]);
          } catch {}

          const contractStatus = Number(submission.status);
          const mappedStatus = CONTRACT_STATUS_TO_ADMIN[contractStatus] ?? 0;
          const level = Number(submission.level);

          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            found: true,
            configured: true,
            submission: {
              user: submission.investor,
              status: mappedStatus,
              statusName: STATUS_NAMES[mappedStatus] || 'Unknown',
              level,
              levelName: LEVEL_NAMES[level] || 'Unknown',
              countryCode: Number(submission.countryCode),
              submittedAt: Number(submission.submittedAt),
              verifiedAt: Number(submission.reviewedAt),
              expiresAt: Number(submission.expiresAt),
              isValid,
              totalInvested: totalInvested.toString(),
              explorerUrl: `${chainConfig.explorerUrl}/address/${submission.investor}`,
            },
          };
        } catch (error: any) {
          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            found: false,
            configured: true,
            error: error.message,
          };
        }
      })
    );

    // Summary
    const foundOn = Object.values(results).filter((r: any) => r.found).length;
    const approvedOn = Object.values(results).filter(
      (r: any) => r.found && r.submission?.status === 4
    ).length;
    const pendingOn = Object.values(results).filter(
      (r: any) => r.found && r.submission?.status === 1
    ).length;

    // Find highest tier across all chains
    const highestTier = Math.max(
      ...Object.values(results)
        .filter((r: any) => r.found && r.submission?.isValid)
        .map((r: any) => r.submission?.level || 0),
      0
    );

    return NextResponse.json({
      success: true,
      address: searchAddress,
      summary: {
        totalChains: chainsToCheck.length,
        foundOn,
        approvedOn,
        pendingOn,
        highestTier,
        highestTierName: LEVEL_NAMES[highestTier] || 'None',
      },
      chains: results,
    });
  } catch (error: any) {
    console.error('Multi-chain user search error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process request',
      submissions: [],
    }, { status: 500 });
  }
}

// ============================================================================
// GET STATS FOR ALL CHAINS
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { chainIds } = body;

    // If specific chains requested, use those; otherwise check all configured chains
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    console.log('Fetching KYC stats across chains:', chainsToCheck);

    const results: Record<number, any> = {};

    await Promise.all(
      chainsToCheck.map(async (chainId: number) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        
        if (!chainConfig || !chainConfig.contracts.KYCManager) {
          results[chainId] = {
            chainId,
            chainName: chainConfig?.name || 'Unknown',
            configured: false,
          };
          return;
        }

        try {
          const publicClient = createChainPublicClient(chainConfig);
          const contractAddress = getAddress(chainConfig.contracts.KYCManager);

          // Get pending count
          let pendingCount = 0;
          try {
            const result = await publicClient.readContract({
              address: contractAddress,
              abi: KYCManagerABI,
              functionName: 'getPendingCount',
              args: []
            });
            pendingCount = Number(result);
          } catch {}

          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            configured: true,
            stats: {
              pendingCount,
            },
            kycManagerAddress: contractAddress,
          };
        } catch (error: any) {
          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            configured: true,
            error: error.message,
          };
        }
      })
    );

    // Aggregate stats
    const totalPending = Object.values(results)
      .filter((r: any) => r.stats)
      .reduce((sum: number, r: any) => sum + (r.stats?.pendingCount || 0), 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalChains: chainsToCheck.length,
        configuredChains: Object.values(results).filter((r: any) => r.configured).length,
        totalPending,
      },
      chains: results,
    });
  } catch (error: any) {
    console.error('Multi-chain stats error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process request',
    }, { status: 500 });
  }
}
