// src/app/api/kyc/admin/[address]/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, keccak256, toBytes, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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

const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'AutoVerifying',
  3: 'ManualReview',
  4: 'Approved',
  5: 'Rejected',
  6: 'Expired',
  7: 'Revoked'
};

// Role hashes
const ADMIN_ROLE = keccak256(toBytes('ADMIN_ROLE'));
const DEFAULT_ADMIN_ROLE = ZERO_ADDRESS as `0x${string}`;

// Known error signatures
const KNOWN_ERRORS: Record<string, string> = {
  '0xc19f17a9': 'NotVerifier - Caller does not have verifier/admin role',
  '0x82b42900': 'NotAdmin - Caller does not have admin role',
  '0x8e4a23d6': 'Unauthorized - Not authorized for this action',
  '0x48f5c3ed': 'InvalidState - KYC is not in a state that can be revoked',
  '0xd92e233d': 'ZeroAddress - Invalid address provided'
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
// POST - RESET/REVOKE KYC
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddress } = await params;

    // Get chain ID
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json(
        { 
          error: `Unsupported chain ID: ${chainId}`,
          supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
            chainId: parseInt(id, 10),
            name: config.name,
            isTestnet: config.isTestnet,
          })),
        },
        { status: 400 }
      );
    }

    // Parse request body for reason
    let reason = 'Admin reset';
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // No body or invalid JSON, use default reason
    }

    // Validate and checksum the address
    let userAddress: `0x${string}`;
    try {
      userAddress = getAddress(rawAddress) as `0x${string}`;
    } catch {
      return NextResponse.json(
        { error: 'Invalid address format', details: `Address "${rawAddress}" is not valid` },
        { status: 400 }
      );
    }

    // Check if KYC Manager is configured for this chain
    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json(
        { 
          error: `KYC Manager not configured for ${chainConfig.name}`,
          chainId,
          chainName: chainConfig.name,
        },
        { status: 500 }
      );
    }

    const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}`;
    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

    if (!VERIFIER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Verifier private key not configured' },
        { status: 500 }
      );
    }

    console.log(`=== KYC Reset Request - ${chainConfig.name} ===`);
    console.log('Chain:', chainConfig.name, `(${chainId})`);
    console.log('User address:', userAddress);
    console.log('KYC Manager:', KYC_MANAGER_ADDRESS);
    console.log('Reason:', reason);

    // Create clients
    const publicClient = createChainPublicClient(chainConfig);
    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
    console.log('Verifier account:', account.address);

    const walletClient = createChainWalletClient(chainConfig, VERIFIER_PRIVATE_KEY);

    // Check current KYC status
    let currentStatus = 0;
    let currentLevel = 0;
    try {
      const submission = await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [userAddress]
      }) as any;

      currentStatus = Number(submission.status);
      currentLevel = Number(submission.level);
      console.log(`[${chainConfig.name}] Current KYC status:`, STATUS_NAMES[currentStatus] || currentStatus);
      console.log(`[${chainConfig.name}] Current KYC level:`, currentLevel);

      // If status is None (0), nothing to reset
      if (currentStatus === 0) {
        return NextResponse.json({
          success: true,
          message: `User has no KYC to reset on ${chainConfig.name} (status is None)`,
          status: STATUS_NAMES[0],
          alreadyReset: true,
          chainId,
          chainName: chainConfig.name,
        });
      }

      // If already Revoked (7), nothing to do
      if (currentStatus === 7) {
        return NextResponse.json({
          success: true,
          message: `User KYC is already revoked on ${chainConfig.name}`,
          status: STATUS_NAMES[7],
          alreadyReset: true,
          chainId,
          chainName: chainConfig.name,
        });
      }
    } catch (err: any) {
      console.error(`[${chainConfig.name}] Error fetching KYC status:`, err.message);
    }

    // Check if caller has ADMIN_ROLE
    let hasAdminRole = false;
    try {
      hasAdminRole = await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'hasRole',
        args: [ADMIN_ROLE, account.address]
      }) as boolean;

      if (!hasAdminRole) {
        hasAdminRole = await publicClient.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE, account.address]
        }) as boolean;
      }

      console.log(`[${chainConfig.name}] Has admin role:`, hasAdminRole);
    } catch (err: any) {
      console.error(`[${chainConfig.name}] Error checking admin role:`, err.message);
    }

    if (!hasAdminRole) {
      return NextResponse.json({
        error: `Verifier does not have ADMIN_ROLE on ${chainConfig.name}`,
        details: 'The configured verifier account does not have permission to revoke KYC',
        verifierAddress: account.address,
        hint: 'Grant ADMIN_ROLE to this address or use the contract owner private key',
        chainId,
        chainName: chainConfig.name,
      }, { status: 403 });
    }

    // Execute revokeKYC
    console.log(`[${chainConfig.name}] Executing revokeKYC...`);
    try {
      const hash = await walletClient.writeContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'revokeKYC',
        args: [userAddress, reason]
      });

      console.log(`[${chainConfig.name}] Transaction hash:`, hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`[${chainConfig.name}] Transaction confirmed, block:`, receipt.blockNumber);

      return NextResponse.json({
        success: true,
        message: `KYC revoked successfully on ${chainConfig.name}`,
        txHash: hash,
        txUrl: `${chainConfig.explorerUrl}/tx/${hash}`,
        blockNumber: Number(receipt.blockNumber),
        previousStatus: STATUS_NAMES[currentStatus] || currentStatus,
        previousLevel: currentLevel,
        chainId,
        chainName: chainConfig.name,
      });
    } catch (err: any) {
      console.error(`[${chainConfig.name}] revokeKYC failed:`, err);
      
      let errorMessage = 'Unknown error';
      let errorCode = '';
      
      if (err.message) {
        errorMessage = err.message;
        const sigMatch = err.message.match(/0x[a-fA-F0-9]{8}/);
        if (sigMatch) {
          errorCode = sigMatch[0];
        }
      }

      if (errorCode && KNOWN_ERRORS[errorCode]) {
        errorMessage = KNOWN_ERRORS[errorCode];
      }

      if (errorMessage.includes('InvalidStatus') || errorMessage.includes('InvalidState') || errorCode === '0x48f5c3ed') {
        return NextResponse.json({
          error: `Cannot revoke KYC in current state on ${chainConfig.name}`,
          details: `The contract does not allow revoking KYC with status "${STATUS_NAMES[currentStatus]}". Only Approved (4) status can typically be revoked.`,
          currentStatus: STATUS_NAMES[currentStatus] || currentStatus,
          currentLevel,
          hint: 'The smart contract may only allow revoking Approved KYC submissions',
          chainId,
          chainName: chainConfig.name,
        }, { status: 400 });
      }

      // Check for insufficient gas
      if (errorMessage.includes('insufficient funds')) {
        return NextResponse.json({
          error: `Insufficient ${chainConfig.nativeCurrency} for gas on ${chainConfig.name}`,
          details: `The verifier account needs more ${chainConfig.nativeCurrency} to pay for transaction gas`,
          verifierAddress: account.address,
          chainId,
          chainName: chainConfig.name,
        }, { status: 500 });
      }

      return NextResponse.json({
        error: `Failed to revoke KYC on ${chainConfig.name}`,
        details: errorMessage,
        errorCode,
        currentStatus: STATUS_NAMES[currentStatus] || currentStatus,
        currentLevel,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Reset endpoint error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - CHECK STATUS BEFORE RESET
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddress } = await params;

    // Get chain ID
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json(
        { 
          error: `Unsupported chain ID: ${chainId}`,
          supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
            chainId: parseInt(id, 10),
            name: config.name,
            isTestnet: config.isTestnet,
          })),
        },
        { status: 400 }
      );
    }

    let userAddress: `0x${string}`;
    try {
      userAddress = getAddress(rawAddress) as `0x${string}`;
    } catch {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json({ 
        error: `KYC Manager not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}`;
    const publicClient = createChainPublicClient(chainConfig);

    const submission = await publicClient.readContract({
      address: KYC_MANAGER_ADDRESS,
      abi: KYCManagerABI,
      functionName: 'getSubmission',
      args: [userAddress]
    }) as any;

    const status = Number(submission.status);
    const level = Number(submission.level);
    
    // Check verifier permissions
    let verifierHasPermission = false;
    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
    
    if (VERIFIER_PRIVATE_KEY) {
      const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY as `0x${string}`);
      try {
        verifierHasPermission = await publicClient.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'hasRole',
          args: [ADMIN_ROLE, account.address]
        }) as boolean;

        if (!verifierHasPermission) {
          verifierHasPermission = await publicClient.readContract({
            address: KYC_MANAGER_ADDRESS,
            abi: KYCManagerABI,
            functionName: 'hasRole',
            args: [DEFAULT_ADMIN_ROLE, account.address]
          }) as boolean;
        }
      } catch {}
    }
    
    return NextResponse.json({
      address: userAddress,
      status,
      statusName: STATUS_NAMES[status] || 'Unknown',
      level,
      canReset: status === 4,
      verifierConfigured: !!VERIFIER_PRIVATE_KEY,
      verifierHasPermission,
      message: status !== 4 && status !== 0 
        ? `Note: Contract may only allow resetting Approved (4) status. Current status is ${STATUS_NAMES[status]}.`
        : undefined,
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      kycManagerAddress: KYC_MANAGER_ADDRESS,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================================
// BATCH RESET ENDPOINT (Optional)
// ============================================================================

export async function PUT(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { addresses, chainId: requestedChainId, reason = 'Batch admin reset' } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'addresses array is required' },
        { status: 400 }
      );
    }

    if (addresses.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 addresses per batch' },
        { status: 400 }
      );
    }

    const chainId = requestedChainId || DEFAULT_CHAIN_ID;
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json(
        { error: `KYC Manager not configured for ${chainConfig.name}` },
        { status: 500 }
      );
    }

    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    if (!VERIFIER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Verifier private key not configured' },
        { status: 500 }
      );
    }

    const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}`;
    const publicClient = createChainPublicClient(chainConfig);
    const walletClient = createChainWalletClient(chainConfig, VERIFIER_PRIVATE_KEY);

    console.log(`=== Batch KYC Reset - ${chainConfig.name} ===`);
    console.log('Addresses count:', addresses.length);

    const results: Record<string, any> = {};

    for (const rawAddress of addresses) {
      let userAddress: `0x${string}`;
      try {
        userAddress = getAddress(rawAddress) as `0x${string}`;
      } catch {
        results[rawAddress] = { success: false, error: 'Invalid address format' };
        continue;
      }

      try {
        // Check current status
        const submission = await publicClient.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [userAddress]
        }) as any;

        const currentStatus = Number(submission.status);

        if (currentStatus === 0 || currentStatus === 7) {
          results[userAddress] = { 
            success: true, 
            skipped: true, 
            reason: currentStatus === 0 ? 'No KYC found' : 'Already revoked' 
          };
          continue;
        }

        if (currentStatus !== 4) {
          results[userAddress] = { 
            success: false, 
            error: `Cannot revoke status ${STATUS_NAMES[currentStatus]}` 
          };
          continue;
        }

        // Execute revoke
        const hash = await walletClient.writeContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'revokeKYC',
          args: [userAddress, reason]
        });

        await publicClient.waitForTransactionReceipt({ hash });

        results[userAddress] = { 
          success: true, 
          txHash: hash,
          previousStatus: STATUS_NAMES[currentStatus],
        };
      } catch (err: any) {
        results[userAddress] = { 
          success: false, 
          error: err.message || 'Unknown error' 
        };
      }
    }

    // Summary
    const successful = Object.values(results).filter((r: any) => r.success && !r.skipped).length;
    const skipped = Object.values(results).filter((r: any) => r.skipped).length;
    const failed = Object.values(results).filter((r: any) => !r.success).length;

    return NextResponse.json({
      summary: {
        total: addresses.length,
        successful,
        skipped,
        failed,
      },
      results,
      chainId,
      chainName: chainConfig.name,
    });
  } catch (err: any) {
    console.error('Batch reset error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
