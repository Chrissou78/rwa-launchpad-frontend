// src/app/api/admin/projects/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Chain, formatUnits } from 'viem';
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
// CONSTANTS
// ============================================================================

const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Pending',
  2: 'Active',
  3: 'Funded',
  4: 'In Progress',
  5: 'Completed',
  6: 'Cancelled',
  7: 'Failed',
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
// POST - Cancel a project
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

    const body = await request.json();
    const { 
      reason = 'Project cancelled by admin', 
      enableRefunds = true,
      chainId: requestedChainId,
    } = body;

    // Get chain ID
    const chainId = requestedChainId || getChainIdFromRequest(request);
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

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.VERIFIER_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({
        success: false,
        error: 'Admin key not configured',
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

    console.log(`[${chainConfig.name}] Cancelling project ${projectId}`);
    console.log(`[${chainConfig.name}] Reason:`, reason);
    console.log(`[${chainConfig.name}] Enable refunds:`, enableRefunds);

    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, adminKey as `0x${string}`);

    // Get project info
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const currentStatus = Number(project.status);

    console.log(`[${chainConfig.name}] Current status:`, STATUS_NAMES[currentStatus] || currentStatus);
    console.log(`[${chainConfig.name}] Total raised:`, project.totalRaised?.toString());
    console.log(`[${chainConfig.name}] Escrow vault:`, project.escrowVault);

    // Status 6 = Cancelled
    if (currentStatus === 6) {
      return NextResponse.json({ 
        success: false, 
        error: `Project ${projectId} already cancelled on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }
    
    // Status 5 = Completed
    if (currentStatus === 5) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot cancel completed project on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    const results: any = {
      projectId,
      previousStatus: STATUS_NAMES[currentStatus] || `Status ${currentStatus}`,
      totalRaised: Number(project.totalRaised) / 1e6,
      totalRaisedFormatted: `$${(Number(project.totalRaised) / 1e6).toLocaleString()}`,
      investorCount: Number(project.investorCount || 0),
      transactions: [],
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      explorerUrl: chainConfig.explorerUrl,
    };

    // Step 1: Cancel the project
    console.log(`[${chainConfig.name}] Calling cancelProject...`);
    
    const cancelHash = await walletClient.writeContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'cancelProject',
      args: [BigInt(projectId), reason],
    });

    console.log(`[${chainConfig.name}] Cancel tx:`, cancelHash);

    const cancelReceipt = await publicClient.waitForTransactionReceipt({ hash: cancelHash });
    
    results.transactions.push({ 
      action: 'cancel', 
      hash: cancelHash,
      txUrl: `${chainConfig.explorerUrl}/tx/${cancelHash}`,
      blockNumber: Number(cancelReceipt.blockNumber),
    });
    results.cancelled = true;

    // Step 2: Enable refunds if requested and there are funds
    if (enableRefunds && project.totalRaised > 0n && project.escrowVault !== ZERO_ADDRESS) {
      try {
        console.log(`[${chainConfig.name}] Calling enableRefunds on ${project.escrowVault}...`);
        
        const refundHash = await walletClient.writeContract({
          address: project.escrowVault as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'enableRefunds',
          args: [BigInt(projectId)],
        });

        console.log(`[${chainConfig.name}] Refund tx:`, refundHash);

        const refundReceipt = await publicClient.waitForTransactionReceipt({ hash: refundHash });
        
        results.transactions.push({ 
          action: 'enableRefunds', 
          hash: refundHash,
          txUrl: `${chainConfig.explorerUrl}/tx/${refundHash}`,
          blockNumber: Number(refundReceipt.blockNumber),
        });
        results.refundsEnabled = true;
        results.escrowVault = project.escrowVault;
        results.escrowVaultUrl = `${chainConfig.explorerUrl}/address/${project.escrowVault}`;
      } catch (refundError: any) {
        console.error(`[${chainConfig.name}] Refund error:`, refundError);
        results.refundsEnabled = false;
        results.refundError = refundError.shortMessage || refundError.message;
      }
    } else {
      results.refundsEnabled = false;
      if (project.totalRaised === 0n) {
        results.refundReason = 'No funds raised';
      } else if (project.escrowVault === ZERO_ADDRESS) {
        results.refundReason = 'No escrow vault';
      } else {
        results.refundReason = 'Refunds not requested';
      }
    }

    results.newStatus = 'Cancelled';
    results.success = true;
    results.message = `Project ${projectId} cancelled successfully on ${chainConfig.name}`;

    console.log(`[${chainConfig.name}] Cancel completed:`, results);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Cancel project error:', error);
    
    let errorMessage = error.message || 'Unknown error';
    
    // Parse common contract errors
    if (errorMessage.includes('NotAuthorized') || errorMessage.includes('NotAdmin') || errorMessage.includes('NotOwner')) {
      errorMessage = 'Not authorized to cancel this project';
    } else if (errorMessage.includes('InvalidStatus') || errorMessage.includes('InvalidState')) {
      errorMessage = 'Project is not in a cancellable state';
    } else if (errorMessage.includes('AlreadyCancelled')) {
      errorMessage = 'Project is already cancelled';
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Admin account has insufficient funds for gas';
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
    }, { status: 500 });
  }
}

// ============================================================================
// GET - Check if project can be cancelled
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

    // Get project info
    const project = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const currentStatus = Number(project.status);
    const totalRaised = Number(project.totalRaised || 0);
    const investorCount = Number(project.investorCount || 0);
    const hasEscrow = project.escrowVault && project.escrowVault !== ZERO_ADDRESS;

    // Determine if cancellable
    const isCancellable = currentStatus !== 5 && currentStatus !== 6; // Not Completed or Cancelled
    const willNeedRefunds = totalRaised > 0 && hasEscrow;

    // Check if already cancelled
    let refundsAlreadyEnabled = false;
    if (currentStatus === 6 && hasEscrow) {
      try {
        refundsAlreadyEnabled = await publicClient.readContract({
          address: project.escrowVault as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'refundsEnabled',
          args: [BigInt(projectId)],
        }) as boolean;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      projectId,
      currentStatus,
      currentStatusName: STATUS_NAMES[currentStatus] || `Status ${currentStatus}`,
      isCancellable,
      cancellableReason: !isCancellable 
        ? (currentStatus === 5 ? 'Project is completed' : 'Project is already cancelled')
        : null,
      totalRaised: totalRaised / 1e6,
      totalRaisedFormatted: `$${(totalRaised / 1e6).toLocaleString()}`,
      investorCount,
      hasEscrow,
      escrowVault: hasEscrow ? project.escrowVault : null,
      willNeedRefunds,
      refundsAlreadyEnabled,
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      projectUrl: `${chainConfig.explorerUrl}/address/${projectNFTAddress}`,
    });
  } catch (error: any) {
    console.error('Error checking project cancel status:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - Batch cancel projects
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectIds, 
      chainId: requestedChainId,
      reason = 'Batch cancellation by admin',
      enableRefunds = true,
    } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'projectIds array is required',
      }, { status: 400 });
    }

    if (projectIds.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 10 projects per batch (cancellations are high-impact operations)',
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

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.VERIFIER_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({
        success: false,
        error: 'Admin key not configured',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Batch cancelling projects:`, projectIds);

    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, adminKey as `0x${string}`);

    const results: Array<{
      projectId: number;
      status: 'cancelled' | 'skipped' | 'failed';
      message: string;
      cancelTxHash?: string;
      refundTxHash?: string;
      refundsEnabled?: boolean;
      totalRaised?: number;
    }> = [];

    for (const projectId of projectIds) {
      try {
        // Get project info
        const project = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(projectId)],
        }) as any;

        const currentStatus = Number(project.status);

        // Skip if already cancelled or completed
        if (currentStatus === 6) {
          results.push({
            projectId,
            status: 'skipped',
            message: 'Already cancelled',
          });
          continue;
        }

        if (currentStatus === 5) {
          results.push({
            projectId,
            status: 'skipped',
            message: 'Cannot cancel completed project',
          });
          continue;
        }

        // Cancel the project
        const cancelHash = await walletClient.writeContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'cancelProject',
          args: [BigInt(projectId), reason],
        });

        await publicClient.waitForTransactionReceipt({ hash: cancelHash });

        const result: any = {
          projectId,
          status: 'cancelled',
          message: 'Project cancelled',
          cancelTxHash: cancelHash,
          totalRaised: Number(project.totalRaised) / 1e6,
        };

        // Enable refunds if applicable
        if (enableRefunds && project.totalRaised > 0n && project.escrowVault !== ZERO_ADDRESS) {
          try {
            const refundHash = await walletClient.writeContract({
              address: project.escrowVault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'enableRefunds',
              args: [BigInt(projectId)],
            });

            await publicClient.waitForTransactionReceipt({ hash: refundHash });
            result.refundTxHash = refundHash;
            result.refundsEnabled = true;
          } catch (refundError: any) {
            result.refundsEnabled = false;
            result.message = 'Cancelled but refund enable failed';
          }
        }

        results.push(result);
      } catch (error: any) {
        results.push({
          projectId,
          status: 'failed',
          message: error.shortMessage || error.message,
        });
      }
    }

    const cancelled = results.filter((r) => r.status === 'cancelled').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const refundsEnabled = results.filter((r) => r.refundsEnabled).length;

    return NextResponse.json({
      success: failed === 0,
      message: `Batch cancel on ${chainConfig.name}: ${cancelled} cancelled, ${skipped} skipped, ${failed} failed`,
      summary: {
        cancelled,
        skipped,
        failed,
        refundsEnabled,
        total: projectIds.length,
      },
      results,
      chainId,
      chainName: chainConfig.name,
      explorerUrl: chainConfig.explorerUrl,
    });
  } catch (error: any) {
    console.error('Batch cancel error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
