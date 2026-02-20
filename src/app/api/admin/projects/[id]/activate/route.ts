// src/app/api/admin/projects/[id]/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, formatUnits, type Chain } from 'viem';
import { avalancheFuji, polygonAmoy, sepolia, avalanche, polygon, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { RWAProjectNFTABI } from '@/config/abis';

// ============================================
// CHAIN CONFIGURATION
// ============================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    RWAProjectNFT: string | undefined;
  };
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  43113: {
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io',
  },
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

const DEFAULT_CHAIN_ID = 43113;

// Status mapping
const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Pending',
  2: 'Active',
  3: 'Funded',
  4: 'Completed',
  5: 'Cancelled',
  6: 'Failed',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

function createChainPublicClient(config: ChainConfig) {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

function createChainWalletClient(config: ChainConfig, privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

function getChainIdFromRequest(request: NextRequest, body?: any): number {
  // Check query parameter first
  const urlChainId = request.nextUrl.searchParams.get('chainId');
  if (urlChainId) {
    const parsed = parseInt(urlChainId);
    if (!isNaN(parsed)) return parsed;
  }
  
  // Check header
  const headerChainId = request.headers.get('x-chain-id');
  if (headerChainId) {
    const parsed = parseInt(headerChainId);
    if (!isNaN(parsed)) return parsed;
  }
  
  // Check body
  if (body?.chainId) {
    const parsed = parseInt(body.chainId);
    if (!isNaN(parsed)) return parsed;
  }
  
  return DEFAULT_CHAIN_ID;
}

// ============================================
// POST - Activate a project
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    // Await params in Next.js 15+
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId) || projectId < 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid project ID',
        details: 'Project ID must be a non-negative integer'
      }, { status: 400 });
    }

    // Parse body for optional chainId
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, use defaults
    }

    // Get chain configuration
    const chainId = getChainIdFromRequest(request, body);
    const chainConfig = getChainConfig(chainId);
    
    if (!chainConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported chain',
        chainId,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id),
          name: config.name,
          isTestnet: config.isTestnet,
        })),
      }, { status: 400 });
    }

    // Validate configuration
    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server not configured',
        details: 'Admin private key not set'
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({ 
        success: false, 
        error: 'Contract not configured',
        details: `RWAProjectNFT contract not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;
    
    // Create clients
    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, process.env.VERIFIER_PRIVATE_KEY);

    // Read current project data
    let currentProject: any;
    try {
      currentProject = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
        details: `Project ${projectId} does not exist on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 404 });
    }

    const currentStatus = Number(currentProject.status);
    const currentStatusName = STATUS_NAMES[currentStatus] || 'Unknown';
    
    // Validate status - can only activate from Pending (1) status
    if (currentStatus === 2) {
      return NextResponse.json({
        success: false,
        error: 'Project already active',
        projectId,
        currentStatus: currentStatusName,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    if (currentStatus !== 1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid project status',
        details: `Project must be in Pending status to activate. Current status: ${currentStatusName}`,
        projectId,
        currentStatus: currentStatusName,
        expectedStatus: 'Pending',
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    // Activate the project (status 2 = Active)
    console.log(`[${chainConfig.name}] Activating project ${projectId}...`);
    
    const hash = await walletClient.writeContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'updateProjectStatus',
      args: [BigInt(projectId), 2], // 2 = Active
    });

    console.log(`[${chainConfig.name}] Transaction submitted: ${hash}`);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    const processingTime = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      message: 'Project activated successfully',
      projectId,
      previousStatus: currentStatusName,
      newStatus: 'Active',
      transaction: {
        hash,
        url: `${chainConfig.explorerUrl}/tx/${hash}`,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
      },
      project: {
        name: currentProject.name,
        targetAmount: formatUnits(currentProject.targetAmount || BigInt(0), 6),
        owner: currentProject.owner,
      },
      chain: {
        chainId,
        chainName: chainConfig.name,
        isTestnet: chainConfig.isTestnet,
        nativeCurrency: chainConfig.nativeCurrency,
        explorerUrl: chainConfig.explorerUrl,
      },
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error activating project:', error);
    
    // Parse common contract errors
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    if (error.message?.includes('NotAuthorized') || error.message?.includes('AccessControl')) {
      errorMessage = 'Not authorized to activate projects';
      statusCode = 403;
    } else if (error.message?.includes('InvalidStatus')) {
      errorMessage = 'Project is not in a valid status for activation';
      statusCode = 400;
    } else if (error.message?.includes('ProjectNotFound')) {
      errorMessage = 'Project not found';
      statusCode = 404;
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient gas funds in admin wallet';
      statusCode = 500;
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });
  }
}

// ============================================
// GET - Check project activation status
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId) || projectId < 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid project ID' 
      }, { status: 400 });
    }

    // Get chain configuration
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);
    
    if (!chainConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported chain',
        chainId,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({ 
        success: false, 
        error: 'Contract not configured',
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const publicClient = createChainPublicClient(chainConfig);
    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    // Read project data
    let project: any;
    try {
      project = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
        projectId,
        chainId,
        chainName: chainConfig.name,
      }, { status: 404 });
    }

    const status = Number(project.status);
    const statusName = STATUS_NAMES[status] || 'Unknown';
    
    return NextResponse.json({
      success: true,
      projectId,
      project: {
        name: project.name,
        status: statusName,
        statusCode: status,
        isActive: status === 2,
        canActivate: status === 1, // Can only activate from Pending
        owner: project.owner,
        targetAmount: formatUnits(project.targetAmount || BigInt(0), 6),
        securityToken: project.securityToken,
        escrowVault: project.escrowVault,
      },
      chain: {
        chainId,
        chainName: chainConfig.name,
        isTestnet: chainConfig.isTestnet,
        explorerUrl: chainConfig.explorerUrl,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error checking project status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// PUT - Batch activate multiple projects
// ============================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { projectIds, chainId: bodyChainId } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Project IDs required',
        details: 'Provide an array of project IDs to activate',
      }, { status: 400 });
    }

    if (projectIds.length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Too many projects',
        details: 'Maximum 20 projects can be activated at once',
      }, { status: 400 });
    }

    // Get chain configuration
    const chainId = getChainIdFromRequest(request, body);
    const chainConfig = getChainConfig(chainId);
    
    if (!chainConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported chain',
        chainId,
      }, { status: 400 });
    }

    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server not configured' 
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({ 
        success: false, 
        error: 'Contract not configured',
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, process.env.VERIFIER_PRIVATE_KEY);
    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    // Process each project
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const projectId of projectIds) {
      const id = parseInt(projectId);
      
      if (isNaN(id) || id < 0) {
        results.push({
          projectId: projectId,
          status: 'failed',
          error: 'Invalid project ID',
        });
        failedCount++;
        continue;
      }

      try {
        // Read current project data
        const project = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(id)],
        }) as any;

        const currentStatus = Number(project.status);
        
        // Check if already active
        if (currentStatus === 2) {
          results.push({
            projectId: id,
            status: 'skipped',
            reason: 'Already active',
          });
          skippedCount++;
          continue;
        }

        // Check if can be activated
        if (currentStatus !== 1) {
          results.push({
            projectId: id,
            status: 'skipped',
            reason: `Invalid status: ${STATUS_NAMES[currentStatus] || 'Unknown'}`,
            currentStatus: STATUS_NAMES[currentStatus],
          });
          skippedCount++;
          continue;
        }

        // Activate the project
        const hash = await walletClient.writeContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'updateProjectStatus',
          args: [BigInt(id), 2],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        results.push({
          projectId: id,
          status: 'success',
          previousStatus: 'Pending',
          newStatus: 'Active',
          txHash: hash,
          txUrl: `${chainConfig.explorerUrl}/tx/${hash}`,
          blockNumber: Number(receipt.blockNumber),
        });
        successCount++;

      } catch (error: any) {
        results.push({
          projectId: id,
          status: 'failed',
          error: error.message,
        });
        failedCount++;
      }
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: failedCount === 0,
      message: `Batch activation completed: ${successCount} activated, ${skippedCount} skipped, ${failedCount} failed`,
      summary: {
        total: projectIds.length,
        successful: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results,
      chain: {
        chainId,
        chainName: chainConfig.name,
        isTestnet: chainConfig.isTestnet,
        explorerUrl: chainConfig.explorerUrl,
      },
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error in batch activation:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
