// src/app/api/admin/projects/[id]/refund/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    RWAProjectNFT?: string;
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
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT || process.env.NEXT_PUBLIC_PROJECT_NFT,
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
      RWAProjectNFT: process.env.POLYGON_AMOY_PROJECT_NFT,
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
      RWAProjectNFT: process.env.SEPOLIA_PROJECT_NFT,
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
      RWAProjectNFT: process.env.AVALANCHE_PROJECT_NFT,
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
      RWAProjectNFT: process.env.POLYGON_PROJECT_NFT,
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
      RWAProjectNFT: process.env.ETHEREUM_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

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

function createChainWalletClient(chainConfig: ChainConfig, privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
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
// POST - Enable refunds for a project
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    // Get chain ID from request body or query/header
    let chainId = getChainIdFromRequest(request);
    
    // Try to get chain ID from body as well
    try {
      const body = await request.json();
      if (body.chainId) {
        chainId = body.chainId;
      }
    } catch {
      // No body or invalid JSON, use query/header chainId
    }

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
    
    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Server not configured - missing VERIFIER_PRIVATE_KEY',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Enabling refunds for project ${projectId}`);
    console.log(`[${chainConfig.name}] Project NFT:`, projectNFTAddress);

    const walletClient = createChainWalletClient(chainConfig, process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
    const publicClient = createChainPublicClient(chainConfig);

    // Get project to find escrow vault
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    console.log(`[${chainConfig.name}] Project data:`, {
      escrowVault: project.escrowVault,
      status: project.status,
      totalRaised: project.totalRaised?.toString(),
    });

    if (!project.escrowVault || project.escrowVault === ZERO_ADDRESS) {
      return NextResponse.json({
        success: false,
        error: `No escrow vault for project ${projectId} on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    // Enable refunds on the escrow vault
    console.log(`[${chainConfig.name}] Calling enableRefunds on ${project.escrowVault}`);
    
    const hash = await walletClient.writeContract({
      address: project.escrowVault as `0x${string}`,
      abi: RWAEscrowVaultABI,
      functionName: 'enableRefunds',
      args: [BigInt(projectId)],
    });

    console.log(`[${chainConfig.name}] Transaction hash:`, hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[${chainConfig.name}] Transaction confirmed, block:`, receipt.blockNumber);

    return NextResponse.json({
      success: true,
      message: `Refunds enabled successfully for project ${projectId} on ${chainConfig.name}`,
      transaction: hash,
      txUrl: `${chainConfig.explorerUrl}/tx/${hash}`,
      blockNumber: Number(receipt.blockNumber),
      escrowVault: project.escrowVault,
      escrowVaultUrl: `${chainConfig.explorerUrl}/address/${project.escrowVault}`,
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
    });
  } catch (error: any) {
    console.error('Error enabling refunds:', error);
    
    let errorMessage = error.message || 'Unknown error';
    
    // Parse common contract errors
    if (errorMessage.includes('NotAuthorized') || errorMessage.includes('NotAdmin')) {
      errorMessage = 'Verifier does not have permission to enable refunds';
    } else if (errorMessage.includes('InvalidStatus') || errorMessage.includes('InvalidState')) {
      errorMessage = 'Project is not in a valid state for refunds';
    } else if (errorMessage.includes('AlreadyEnabled')) {
      errorMessage = 'Refunds are already enabled for this project';
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Verifier has insufficient funds for gas';
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// ============================================================================
// GET - Check refund status for a project
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;
    const publicClient = createChainPublicClient(chainConfig);

    // Get project data
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    if (!project.escrowVault || project.escrowVault === ZERO_ADDRESS) {
      return NextResponse.json({
        success: true,
        projectId,
        hasEscrowVault: false,
        refundsEnabled: false,
        message: `No escrow vault for project ${projectId}`,
        chainId,
        chainName: chainConfig.name,
      });
    }

    // Check if refunds are enabled
    let refundsEnabled = false;
    let refundableAmount = BigInt(0);
    let investorCount = 0;

    try {
      refundsEnabled = await publicClient.readContract({
        address: project.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'refundsEnabled',
        args: [BigInt(projectId)],
      }) as boolean;
    } catch {
      // Function might not exist or have different signature
    }

    try {
      refundableAmount = await publicClient.readContract({
        address: project.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'getRefundableAmount',
        args: [BigInt(projectId)],
      }) as bigint;
    } catch {
      // Function might not exist
    }

    // Get investor count from project
    investorCount = Number(project.investorCount || 0);

    return NextResponse.json({
      success: true,
      projectId,
      hasEscrowVault: true,
      escrowVault: project.escrowVault,
      escrowVaultUrl: `${chainConfig.explorerUrl}/address/${project.escrowVault}`,
      refundsEnabled,
      refundableAmount: refundableAmount.toString(),
      investorCount,
      projectStatus: Number(project.status),
      totalRaised: project.totalRaised?.toString() || '0',
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
    });
  } catch (error: any) {
    console.error('Error checking refund status:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - Batch enable refunds for multiple projects
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds, chainId: requestedChainId } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'projectIds array is required',
      }, { status: 400 });
    }

    if (projectIds.length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 20 projects per batch',
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

    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Server not configured - missing VERIFIER_PRIVATE_KEY',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Batch enabling refunds for projects:`, projectIds);

    const walletClient = createChainWalletClient(chainConfig, process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
    const publicClient = createChainPublicClient(chainConfig);

    const results: Array<{
      projectId: number;
      status: 'success' | 'failed' | 'skipped';
      message: string;
      txHash?: string;
      escrowVault?: string;
    }> = [];

    for (const projectId of projectIds) {
      try {
        // Get project
        const project = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        }) as any;

        if (!project.escrowVault || project.escrowVault === ZERO_ADDRESS) {
          results.push({
            projectId,
            status: 'skipped',
            message: 'No escrow vault',
          });
          continue;
        }

        // Check if refunds already enabled
        try {
          const alreadyEnabled = await publicClient.readContract({
            address: project.escrowVault as `0x${string}`,
            abi: RWAEscrowVaultABI,
            functionName: 'refundsEnabled',
            args: [BigInt(projectId)],
          }) as boolean;

          if (alreadyEnabled) {
            results.push({
              projectId,
              status: 'skipped',
              message: 'Refunds already enabled',
              escrowVault: project.escrowVault,
            });
            continue;
          }
        } catch {
          // Continue if we can't check
        }

        // Enable refunds
        const hash = await walletClient.writeContract({
          address: project.escrowVault as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'enableRefunds',
          args: [BigInt(projectId)],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        results.push({
          projectId,
          status: 'success',
          message: 'Refunds enabled',
          txHash: hash,
          escrowVault: project.escrowVault,
        });
      } catch (error: any) {
        results.push({
          projectId,
          status: 'failed',
          message: error.shortMessage || error.message,
        });
      }
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return NextResponse.json({
      success: failed === 0,
      message: `Batch refund enable on ${chainConfig.name}: ${successful} successful, ${failed} failed, ${skipped} skipped`,
      summary: {
        successful,
        failed,
        skipped,
        total: projectIds.length,
      },
      results,
      chainId,
      chainName: chainConfig.name,
      explorerUrl: chainConfig.explorerUrl,
    });
  } catch (error: any) {
    console.error('Error in batch refund enable:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
