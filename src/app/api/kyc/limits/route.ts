// src/app/api/kyc/limits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
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
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

const TIER_NAMES: Record<number, string> = {
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
// GET - FETCH KYC LIMITS FOR A CHAIN
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get chain ID from query parameter or header
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id, 10),
          name: config.name,
          isTestnet: config.isTestnet,
        })),
      }, { status: 400 });
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json({ 
        success: false, 
        error: `KYCManager not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const publicClient = createChainPublicClient(chainConfig);
    const contractAddress = chainConfig.contracts.KYCManager as `0x${string}`;

    console.log(`[${chainConfig.name}] Fetching KYC limits from ${contractAddress}`);

    // Fetch all level limits (1-4)
    const limits: Record<number, number> = {};
    const rawLimits: Record<number, string> = {};
    
    for (let level = 1; level <= 4; level++) {
      try {
        const limitRaw = await publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'levelInvestmentLimits',
          args: [level],
        }) as bigint;

        rawLimits[level] = limitRaw.toString();

        // Check if unlimited (max uint256 or very large)
        if (limitRaw >= MAX_UINT256 / BigInt(2)) {
          limits[level] = Infinity;
        } else {
          // Convert from 18 decimals to human-readable
          limits[level] = Number(formatUnits(limitRaw, 18));
        }
      } catch (e) {
        console.error(`[${chainConfig.name}] Error fetching limit for level ${level}:`, e);
        limits[level] = 0;
      }
    }

    // Map to tier names
    const tierLimits = {
      None: 0,
      Bronze: limits[1] || 0,
      Silver: limits[2] || 0,
      Gold: limits[3] || 0,
      Diamond: Infinity,
      // Also include numeric keys for backwards compatibility
      1: limits[1] || 0,
      2: limits[2] || 0,
      3: limits[3] || 0,
      4: Infinity,
    };

    return NextResponse.json({
      success: true,
      limits: tierLimits,
      rawLimits, // Include raw values for debugging
      timestamp: Date.now(),
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      kycManagerAddress: contractAddress,
    });
  } catch (error: any) {
    console.error('Error fetching KYC limits:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================================================
// POST - FETCH KYC LIMITS ACROSS MULTIPLE CHAINS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { chainIds } = body;

    // If specific chains requested, use those; otherwise check all configured chains
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    console.log('Fetching KYC limits across chains:', chainsToCheck);

    const results: Record<number, any> = {};

    await Promise.all(
      chainsToCheck.map(async (chainId: number) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        
        if (!chainConfig || !chainConfig.contracts.KYCManager) {
          results[chainId] = {
            success: false,
            chainId,
            chainName: chainConfig?.name || 'Unknown',
            error: 'KYC Manager not configured',
          };
          return;
        }

        try {
          const publicClient = createChainPublicClient(chainConfig);
          const contractAddress = chainConfig.contracts.KYCManager as `0x${string}`;

          const limits: Record<number, number> = {};

          for (let level = 1; level <= 4; level++) {
            try {
              const limitRaw = await publicClient.readContract({
                address: contractAddress,
                abi: KYCManagerABI,
                functionName: 'levelInvestmentLimits',
                args: [level],
              }) as bigint;

              if (limitRaw >= MAX_UINT256 / BigInt(2)) {
                limits[level] = Infinity;
              } else {
                limits[level] = Number(formatUnits(limitRaw, 18));
              }
            } catch {
              limits[level] = 0;
            }
          }

          results[chainId] = {
            success: true,
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            limits: {
              None: 0,
              Bronze: limits[1] || 0,
              Silver: limits[2] || 0,
              Gold: limits[3] || 0,
              Diamond: Infinity,
              1: limits[1] || 0,
              2: limits[2] || 0,
              3: limits[3] || 0,
              4: Infinity,
            },
          };
        } catch (error: any) {
          results[chainId] = {
            success: false,
            chainId,
            chainName: chainConfig.name,
            error: error.message,
          };
        }
      })
    );

    // Summary
    const successfulChains = Object.values(results).filter((r: any) => r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalChains: chainsToCheck.length,
        successfulChains,
        failedChains: chainsToCheck.length - successfulChains,
      },
      chains: results,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error fetching multi-chain KYC limits:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - UPDATE KYC LIMITS (ADMIN)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId: requestedChainId, level, newLimit } = body;

    // Validate inputs
    if (level === undefined || newLimit === undefined) {
      return NextResponse.json({
        success: false,
        error: 'level and newLimit are required',
      }, { status: 400 });
    }

    if (level < 1 || level > 4) {
      return NextResponse.json({
        success: false,
        error: 'level must be between 1 and 4',
      }, { status: 400 });
    }

    const chainId = requestedChainId || DEFAULT_CHAIN_ID;
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json({
        success: false,
        error: `KYC Manager not configured for ${chainConfig.name}`,
      }, { status: 500 });
    }

    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
    if (!VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Verifier private key not configured',
      }, { status: 500 });
    }

    // Import dynamically to avoid issues
    const { createWalletClient } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const { parseUnits } = await import('viem');

    const publicClient = createChainPublicClient(chainConfig);
    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });

    const contractAddress = chainConfig.contracts.KYCManager as `0x${string}`;

    // Convert limit to 18 decimals
    const limitInWei = parseUnits(newLimit.toString(), 18);

    console.log(`[${chainConfig.name}] Updating level ${level} (${TIER_NAMES[level]}) limit to ${newLimit}`);

    // Execute setLevelInvestmentLimit
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: KYCManagerABI,
      functionName: 'setLevelInvestmentLimit',
      args: [level, limitInWei],
    });

    console.log(`[${chainConfig.name}] Transaction hash:`, hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Verify the new limit
    const updatedLimit = await publicClient.readContract({
      address: contractAddress,
      abi: KYCManagerABI,
      functionName: 'levelInvestmentLimits',
      args: [level],
    }) as bigint;

    return NextResponse.json({
      success: true,
      message: `Updated ${TIER_NAMES[level]} limit on ${chainConfig.name}`,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      level,
      tierName: TIER_NAMES[level],
      newLimit,
      verifiedLimit: Number(formatUnits(updatedLimit, 18)),
      chainId,
      chainName: chainConfig.name,
    });
  } catch (error: any) {
    console.error('Error updating KYC limit:', error);
    
    let errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('NotAdmin') || errorMessage.includes('NotAuthorized')) {
      errorMessage = 'Verifier does not have admin permission to update limits';
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Verifier has insufficient funds for gas';
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}
