// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    KYCManager?: string;
    RWAProjectNFT?: string;
    IdentityRegistry?: string;
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
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT,
      IdentityRegistry: process.env.AVALANCHE_FUJI_IDENTITY_REGISTRY,
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
      RWAProjectNFT: process.env.POLYGON_AMOY_PROJECT_NFT,
      IdentityRegistry: process.env.POLYGON_AMOY_IDENTITY_REGISTRY,
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
      RWAProjectNFT: process.env.SEPOLIA_PROJECT_NFT,
      IdentityRegistry: process.env.SEPOLIA_IDENTITY_REGISTRY,
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
      RWAProjectNFT: process.env.AVALANCHE_PROJECT_NFT,
      IdentityRegistry: process.env.AVALANCHE_IDENTITY_REGISTRY,
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
      RWAProjectNFT: process.env.POLYGON_PROJECT_NFT,
      IdentityRegistry: process.env.POLYGON_IDENTITY_REGISTRY,
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
      RWAProjectNFT: process.env.ETHEREUM_PROJECT_NFT,
      IdentityRegistry: process.env.ETHEREUM_IDENTITY_REGISTRY,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// App version
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

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

async function checkChainHealth(chainConfig: ChainConfig): Promise<{
  connected: boolean;
  blockNumber: number;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const client = createChainPublicClient(chainConfig);
    const block = await client.getBlockNumber();
    const latency = Date.now() - startTime;
    
    return {
      connected: true,
      blockNumber: Number(block),
      latency,
    };
  } catch (error: any) {
    return {
      connected: false,
      blockNumber: 0,
      latency: Date.now() - startTime,
      error: error.message || 'Connection failed',
    };
  }
}

function isValidAddress(address: string | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================================================
// GET - HEALTH CHECK
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId');
  const checkAll = searchParams.get('all') === 'true';
  const detailed = searchParams.get('detailed') === 'true';

  // If checking all chains
  if (checkAll) {
    const chainIds = Object.keys(CHAIN_CONFIGS).map(Number);
    const results: Record<number, any> = {};
    
    await Promise.all(
      chainIds.map(async (chainId) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        const health = await checkChainHealth(chainConfig);
        
        results[chainId] = {
          chainId,
          name: chainConfig.name,
          isTestnet: chainConfig.isTestnet,
          ...health,
          contracts: detailed ? {
            KYCManager: {
              address: chainConfig.contracts.KYCManager || null,
              configured: isValidAddress(chainConfig.contracts.KYCManager),
            },
            RWAProjectNFT: {
              address: chainConfig.contracts.RWAProjectNFT || null,
              configured: isValidAddress(chainConfig.contracts.RWAProjectNFT),
            },
            IdentityRegistry: {
              address: chainConfig.contracts.IdentityRegistry || null,
              configured: isValidAddress(chainConfig.contracts.IdentityRegistry),
            },
          } : undefined,
        };
      })
    );

    // Calculate summary
    const connectedChains = Object.values(results).filter((r: any) => r.connected).length;
    const totalChains = chainIds.length;
    const avgLatency = Math.round(
      Object.values(results)
        .filter((r: any) => r.connected)
        .reduce((sum: number, r: any) => sum + r.latency, 0) / (connectedChains || 1)
    );

    return NextResponse.json({
      success: true,
      status: connectedChains === totalChains ? 'healthy' : connectedChains > 0 ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      summary: {
        totalChains,
        connectedChains,
        avgLatency,
        testnets: Object.values(results).filter((r: any) => r.isTestnet && r.connected).length,
        mainnets: Object.values(results).filter((r: any) => !r.isTestnet && r.connected).length,
      },
      chains: results,
      configuration: {
        verifierConfigured: !!process.env.VERIFIER_PRIVATE_KEY,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      },
    });
  }

  // Single chain health check
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;
  const chainConfig = getChainConfig(chainId);

  if (!chainConfig) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: `Unsupported chain ID: ${chainId}`,
      supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
        chainId: parseInt(id, 10),
        name: config.name,
        isTestnet: config.isTestnet,
      })),
    }, { status: 400 });
  }

  const health = await checkChainHealth(chainConfig);

  // Contract configuration status
  const contractsConfigured = {
    KYCManager: isValidAddress(chainConfig.contracts.KYCManager),
    RWAProjectNFT: isValidAddress(chainConfig.contracts.RWAProjectNFT),
    IdentityRegistry: isValidAddress(chainConfig.contracts.IdentityRegistry),
  };

  const allContractsConfigured = Object.values(contractsConfigured).every(Boolean);

  // Determine overall status
  let status = 'healthy';
  if (!health.connected) {
    status = 'unhealthy';
  } else if (!allContractsConfigured) {
    status = 'degraded';
  }

  const response: any = {
    success: health.connected,
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    chain: {
      chainId,
      name: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      nativeCurrency: chainConfig.nativeCurrency,
      explorerUrl: chainConfig.explorerUrl,
    },
    services: {
      blockchain: {
        connected: health.connected,
        blockNumber: health.blockNumber,
        latency: health.latency,
        error: health.error,
      },
    },
    contracts: {
      configured: contractsConfigured,
      allConfigured: allContractsConfigured,
    },
  };

  // Add detailed contract addresses if requested
  if (detailed) {
    response.contracts.addresses = {
      KYCManager: chainConfig.contracts.KYCManager || null,
      RWAProjectNFT: chainConfig.contracts.RWAProjectNFT || null,
      IdentityRegistry: chainConfig.contracts.IdentityRegistry || null,
    };
  }

  // Add global configuration status
  response.configuration = {
    verifierConfigured: !!process.env.VERIFIER_PRIVATE_KEY,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
  };

  return NextResponse.json(response);
}

// ============================================================================
// POST - DETAILED HEALTH CHECK WITH CUSTOM CHAINS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIds, detailed = false, includeContracts = false } = body;

    // Validate chainIds
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    if (chainsToCheck.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid chain IDs provided',
        supportedChains: Object.keys(CHAIN_CONFIGS).map(Number),
      }, { status: 400 });
    }

    const startTime = Date.now();
    const results: Record<number, any> = {};

    await Promise.all(
      chainsToCheck.map(async (chainId: number) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        const health = await checkChainHealth(chainConfig);

        const contractsConfigured = {
          KYCManager: isValidAddress(chainConfig.contracts.KYCManager),
          RWAProjectNFT: isValidAddress(chainConfig.contracts.RWAProjectNFT),
          IdentityRegistry: isValidAddress(chainConfig.contracts.IdentityRegistry),
        };

        results[chainId] = {
          chainId,
          name: chainConfig.name,
          isTestnet: chainConfig.isTestnet,
          nativeCurrency: chainConfig.nativeCurrency,
          status: health.connected 
            ? (Object.values(contractsConfigured).every(Boolean) ? 'healthy' : 'degraded')
            : 'unhealthy',
          blockchain: {
            connected: health.connected,
            blockNumber: health.blockNumber,
            latency: health.latency,
            error: health.error,
          },
          contracts: {
            configured: contractsConfigured,
            allConfigured: Object.values(contractsConfigured).every(Boolean),
            addresses: includeContracts ? {
              KYCManager: chainConfig.contracts.KYCManager || null,
              RWAProjectNFT: chainConfig.contracts.RWAProjectNFT || null,
              IdentityRegistry: chainConfig.contracts.IdentityRegistry || null,
            } : undefined,
          },
          explorerUrl: detailed ? chainConfig.explorerUrl : undefined,
          rpcUrl: detailed ? chainConfig.rpcUrl : undefined,
        };
      })
    );

    const totalTime = Date.now() - startTime;

    // Calculate summary
    const healthyChains = Object.values(results).filter((r: any) => r.status === 'healthy').length;
    const degradedChains = Object.values(results).filter((r: any) => r.status === 'degraded').length;
    const unhealthyChains = Object.values(results).filter((r: any) => r.status === 'unhealthy').length;

    let overallStatus = 'healthy';
    if (unhealthyChains === chainsToCheck.length) {
      overallStatus = 'unhealthy';
    } else if (unhealthyChains > 0 || degradedChains > 0) {
      overallStatus = 'degraded';
    }

    return NextResponse.json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      checkDuration: totalTime,
      summary: {
        totalChecked: chainsToCheck.length,
        healthy: healthyChains,
        degraded: degradedChains,
        unhealthy: unhealthyChains,
        testnets: Object.values(results).filter((r: any) => r.isTestnet).length,
        mainnets: Object.values(results).filter((r: any) => !r.isTestnet).length,
      },
      chains: results,
      configuration: {
        verifierConfigured: !!process.env.VERIFIER_PRIVATE_KEY,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error.message || 'Health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ============================================================================
// HEAD - SIMPLE HEALTH CHECK (FOR LOAD BALANCERS)
// ============================================================================

export async function HEAD() {
  // Quick check on default chain
  const chainConfig = CHAIN_CONFIGS[DEFAULT_CHAIN_ID];
  
  try {
    const client = createChainPublicClient(chainConfig);
    await client.getBlockNumber();
    
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
