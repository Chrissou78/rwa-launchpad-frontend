// src/app/api/kyc/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Server-side chain configurations
const CHAIN_CONFIGS: Record<number, {
  name: string;
  rpcUrl: string;
  contracts: {
    KYCManager?: string;
    IdentityRegistry?: string;
  };
  isTestnet: boolean;
}> = {
  // Avalanche Fuji Testnet
  43113: {
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_FUJI_KYC_MANAGER || process.env.NEXT_PUBLIC_KYC_MANAGER,
      IdentityRegistry: process.env.AVALANCHE_FUJI_IDENTITY_REGISTRY,
    },
    isTestnet: true,
  },
  // Polygon Amoy Testnet
  80002: {
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      KYCManager: process.env.POLYGON_AMOY_KYC_MANAGER,
      IdentityRegistry: process.env.POLYGON_AMOY_IDENTITY_REGISTRY,
    },
    isTestnet: true,
  },
  // Sepolia Testnet
  11155111: {
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      KYCManager: process.env.SEPOLIA_KYC_MANAGER,
      IdentityRegistry: process.env.SEPOLIA_IDENTITY_REGISTRY,
    },
    isTestnet: true,
  },
  // Avalanche Mainnet
  43114: {
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_KYC_MANAGER,
      IdentityRegistry: process.env.AVALANCHE_IDENTITY_REGISTRY,
    },
    isTestnet: false,
  },
  // Polygon Mainnet
  137: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      KYCManager: process.env.POLYGON_KYC_MANAGER,
      IdentityRegistry: process.env.POLYGON_IDENTITY_REGISTRY,
    },
    isTestnet: false,
  },
  // Ethereum Mainnet
  1: {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      KYCManager: process.env.ETHEREUM_KYC_MANAGER,
      IdentityRegistry: process.env.ETHEREUM_IDENTITY_REGISTRY,
    },
    isTestnet: false,
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// Helper to mask sensitive values
function maskValue(value: string | undefined, visibleChars: number = 10): string {
  if (!value) return '(not set)';
  if (value.length <= visibleChars) return value;
  return value.substring(0, visibleChars) + '...';
}

// Helper to check if address is valid
function isValidAddress(address: string | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function GET(request: NextRequest) {
  // Get chain ID from query parameter
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId');
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;

  console.log('=== KYC Test Endpoint ===');
  console.log('Requested Chain ID:', chainId);

  // Check if chain is supported
  const chainConfig = CHAIN_CONFIGS[chainId];
  
  if (!chainConfig) {
    console.log('Unsupported chain ID:', chainId);
    return NextResponse.json({
      error: 'Unsupported chain',
      requestedChainId: chainId,
      supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
        chainId: parseInt(id, 10),
        name: config.name,
        isTestnet: config.isTestnet,
      })),
    }, { status: 400 });
  }

  console.log('Chain:', chainConfig.name);
  console.log('KYC_MANAGER_ADDRESS:', chainConfig.contracts.KYCManager);
  console.log('IDENTITY_REGISTRY:', chainConfig.contracts.IdentityRegistry);
  console.log('RPC_URL:', maskValue(chainConfig.rpcUrl, 30));
  console.log('VERIFIER_PRIVATE_KEY set:', !!process.env.VERIFIER_PRIVATE_KEY);

  // Build response for the specific chain
  const chainStatus = {
    chainId,
    name: chainConfig.name,
    isTestnet: chainConfig.isTestnet,
    configured: {
      kycManager: isValidAddress(chainConfig.contracts.KYCManager),
      identityRegistry: isValidAddress(chainConfig.contracts.IdentityRegistry),
      rpcUrl: !!chainConfig.rpcUrl,
      verifierKey: !!process.env.VERIFIER_PRIVATE_KEY,
    },
    values: {
      kycManager: chainConfig.contracts.KYCManager || '(not set)',
      identityRegistry: chainConfig.contracts.IdentityRegistry || '(not set)',
      rpcUrl: maskValue(chainConfig.rpcUrl, 30),
    },
  };

  // Build summary of all chains
  const allChains = Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
    chainId: parseInt(id, 10),
    name: config.name,
    isTestnet: config.isTestnet,
    kycManagerConfigured: isValidAddress(config.contracts.KYCManager),
    identityRegistryConfigured: isValidAddress(config.contracts.IdentityRegistry),
    rpcConfigured: !!config.rpcUrl,
  }));

  // Calculate overall readiness
  const isReady = chainStatus.configured.kycManager && 
                  chainStatus.configured.rpcUrl && 
                  chainStatus.configured.verifierKey;

  return NextResponse.json({
    status: isReady ? 'ready' : 'incomplete',
    currentChain: chainStatus,
    globalConfig: {
      verifierKeySet: !!process.env.VERIFIER_PRIVATE_KEY,
      defaultChainId: DEFAULT_CHAIN_ID,
    },
    allChains,
    instructions: !isReady ? {
      message: 'Some configuration is missing. Please set the following environment variables:',
      missing: [
        ...(!chainStatus.configured.kycManager ? [`KYC Manager address for ${chainConfig.name}`] : []),
        ...(!chainStatus.configured.rpcUrl ? [`RPC URL for ${chainConfig.name}`] : []),
        ...(!chainStatus.configured.verifierKey ? ['VERIFIER_PRIVATE_KEY'] : []),
      ],
    } : undefined,
  });
}

// POST endpoint to test a specific chain's KYC contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId = DEFAULT_CHAIN_ID, testAddress } = body;

    const chainConfig = CHAIN_CONFIGS[chainId];
    
    if (!chainConfig) {
      return NextResponse.json({
        error: 'Unsupported chain',
        chainId,
      }, { status: 400 });
    }

    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json({
        error: 'KYC Manager not configured for this chain',
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    // Import viem dynamically to avoid issues if not needed
    const { createPublicClient, http } = await import('viem');
    
    const publicClient = createPublicClient({
      transport: http(chainConfig.rpcUrl),
    });

    // Test basic contract interaction
    const KYCManagerABI = [
      {
        name: 'kycFee',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'paused',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'bool' }],
      },
    ] as const;

    const results: Record<string, any> = {
      chainId,
      chainName: chainConfig.name,
      kycManager: chainConfig.contracts.KYCManager,
      tests: {},
    };

    // Test 1: Read KYC fee
    try {
      const fee = await publicClient.readContract({
        address: chainConfig.contracts.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'kycFee',
      });
      results.tests.kycFee = {
        success: true,
        value: fee.toString(),
        formatted: `${Number(fee) / 1e18} native tokens`,
      };
    } catch (error: any) {
      results.tests.kycFee = {
        success: false,
        error: error.message,
      };
    }

    // Test 2: Check if paused
    try {
      const paused = await publicClient.readContract({
        address: chainConfig.contracts.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'paused',
      });
      results.tests.paused = {
        success: true,
        value: paused,
      };
    } catch (error: any) {
      results.tests.paused = {
        success: false,
        error: error.message,
      };
    }

    // Test 3: Check specific address if provided
    if (testAddress && /^0x[a-fA-F0-9]{40}$/.test(testAddress)) {
      const GetSubmissionABI = [
        {
          name: 'getSubmission',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'investor', type: 'address' }],
          outputs: [{
            type: 'tuple',
            components: [
              { name: 'investor', type: 'address' },
              { name: 'level', type: 'uint8' },
              { name: 'status', type: 'uint8' },
              { name: 'countryCode', type: 'uint16' },
              { name: 'documentHash', type: 'bytes32' },
              { name: 'submittedAt', type: 'uint256' },
              { name: 'reviewedAt', type: 'uint256' },
              { name: 'expiresAt', type: 'uint256' },
            ],
          }],
        },
      ] as const;

      try {
        const submission = await publicClient.readContract({
          address: chainConfig.contracts.KYCManager as `0x${string}`,
          abi: GetSubmissionABI,
          functionName: 'getSubmission',
          args: [testAddress as `0x${string}`],
        });
        
        const statusNames = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
        const levelNames = ['NONE', 'BASIC', 'STANDARD', 'ACCREDITED', 'INSTITUTIONAL'];
        
        results.tests.addressCheck = {
          success: true,
          address: testAddress,
          submission: {
            status: statusNames[submission.status] || submission.status,
            level: levelNames[submission.level] || submission.level,
            countryCode: submission.countryCode,
            submittedAt: submission.submittedAt > 0n 
              ? new Date(Number(submission.submittedAt) * 1000).toISOString() 
              : null,
            expiresAt: submission.expiresAt > 0n 
              ? new Date(Number(submission.expiresAt) * 1000).toISOString() 
              : null,
          },
        };
      } catch (error: any) {
        results.tests.addressCheck = {
          success: false,
          address: testAddress,
          error: error.message,
        };
      }
    }

    // Overall success
    results.allTestsPassed = Object.values(results.tests).every(
      (test: any) => test.success
    );

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
    }, { status: 500 });
  }
}
