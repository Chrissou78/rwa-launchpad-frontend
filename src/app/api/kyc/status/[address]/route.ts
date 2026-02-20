// src/app/api/kyc/status/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress, formatUnits, Chain } from 'viem';
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

const LEVEL_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

const STATUS_NAMES: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Expired'
};

const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

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

// Convert from contract value (18 decimals)
const convertFromContract = (value: bigint): number => {
  if (value >= MAX_UINT256 / BigInt(2)) return Infinity;
  return Number(formatUnits(value, 18));
};

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = await params;

    // Get chain ID from query parameter or header
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId') || request.headers.get('x-chain-id');
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;

    // Validate address
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Validate chain
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

    // Check if KYC Manager is configured for this chain
    if (!chainConfig.contracts.KYCManager) {
      return NextResponse.json(
        { 
          error: `KYC Manager not configured for ${chainConfig.name}`,
          found: false, 
          tier: 'None', 
          status: 'None', 
          isValid: false,
          chainId,
          chainName: chainConfig.name,
        },
        { status: 500 }
      );
    }

    const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}`;
    const client = createChainPublicClient(chainConfig);

    console.log(`[${chainConfig.name}] Fetching KYC status for ${address} from contract ${KYC_MANAGER_ADDRESS}`);

    // Get submission data
    let submission: any;
    try {
      submission = await client.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [address as `0x${string}`],
      });
    } catch (error) {
      console.error(`[${chainConfig.name}] Error reading submission:`, error);
      return NextResponse.json({
        found: false,
        address,
        tier: 'None',
        status: 'None',
        isValid: false,
        message: `No KYC submission found on ${chainConfig.name} or contract error`,
        chainId,
        chainName: chainConfig.name,
      });
    }

    console.log(`[${chainConfig.name}] Raw submission:`, submission);

    // Check if this is an empty/default submission
    const investorAddress = submission.investor || submission[0];
    const submittedAt = submission.submittedAt || submission[3];
    
    if (investorAddress === ZERO_ADDRESS || submittedAt === BigInt(0)) {
      return NextResponse.json({
        found: false,
        address,
        tier: 'None',
        status: 'None',
        isValid: false,
        message: `No KYC submission found on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      });
    }

    // Extract data from submission
    const level = Number(submission.level ?? submission[1]);
    const status = Number(submission.status ?? submission[2]);
    const reviewedAt = submission.reviewedAt ?? submission[4];
    const expiresAt = submission.expiresAt ?? submission[5];
    const reviewer = submission.reviewer ?? submission[6];
    const documentHash = submission.documentHash ?? submission[7];
    const countryCode = Number(submission.countryCode ?? submission[8]);

    // Fetch additional data
    let isValid = false;
    let remainingLimit = BigInt(0);
    let totalInvested = BigInt(0);
    let investmentLimit = BigInt(0);

    try {
      const [validResult, remainingResult, investedResult, limitResult] = await Promise.all([
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'isKYCValid',
          args: [address as `0x${string}`],
        }).catch(() => false),
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'getRemainingLimit',
          args: [address as `0x${string}`],
        }).catch(() => BigInt(0)),
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'getTotalInvested',
          args: [address as `0x${string}`],
        }).catch(() => BigInt(0)),
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'getInvestmentLimit',
          args: [address as `0x${string}`],
        }).catch(() => BigInt(0)),
      ]);

      isValid = validResult as boolean;
      remainingLimit = remainingResult as bigint;
      totalInvested = investedResult as bigint;
      investmentLimit = limitResult as bigint;
    } catch (error) {
      console.error(`[${chainConfig.name}] Error fetching additional KYC data:`, error);
    }

    // Log raw values for debugging
    console.log(`[${chainConfig.name}] Raw contract values:`, {
      remainingLimit: remainingLimit.toString(),
      totalInvested: totalInvested.toString(),
      investmentLimit: investmentLimit.toString(),
    });

    return NextResponse.json({
      found: true,
      address,
      tier: LEVEL_NAMES[level] || 'None',
      level,
      status: STATUS_NAMES[status] || 'Unknown',
      statusCode: status,
      countryCode,
      submittedAt: Number(submittedAt),
      reviewedAt: Number(reviewedAt),
      expiresAt: Number(expiresAt),
      reviewer,
      documentHash,
      isValid,
      remainingLimit: convertFromContract(remainingLimit),
      totalInvested: convertFromContract(totalInvested),
      investmentLimit: convertFromContract(investmentLimit),
      // Chain info
      chainId,
      chainName: chainConfig.name,
      isTestnet: chainConfig.isTestnet,
      kycManagerAddress: KYC_MANAGER_ADDRESS,
      // Full submission data
      submission: {
        investor: investorAddress,
        level,
        status,
        submittedAt: Number(submittedAt),
        reviewedAt: Number(reviewedAt),
        expiresAt: Number(expiresAt),
        reviewer,
        documentHash,
        countryCode,
        totalInvested: convertFromContract(totalInvested),
        remainingLimit: convertFromContract(remainingLimit),
      }
    });
  } catch (error) {
    console.error('KYC Status API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch KYC status',
        found: false,
        tier: 'None',
        status: 'None',
        isValid: false
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// MULTI-CHAIN STATUS ENDPOINT
// ============================================================================

// Optional: Get KYC status across all chains
export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = await params;

    // Validate address
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { chainIds } = body;

    // If specific chains requested, use those; otherwise check all configured chains
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    console.log(`Fetching KYC status for ${address} across chains:`, chainsToCheck);

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
          const client = createChainPublicClient(chainConfig);
          const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}`;

          const submission = await client.readContract({
            address: KYC_MANAGER_ADDRESS,
            abi: KYCManagerABI,
            functionName: 'getSubmission',
            args: [address as `0x${string}`],
          }) as any;

          const investorAddress = submission.investor || submission[0];
          const submittedAt = submission.submittedAt || submission[3];

          if (investorAddress === ZERO_ADDRESS || submittedAt === BigInt(0)) {
            results[chainId] = {
              chainId,
              chainName: chainConfig.name,
              isTestnet: chainConfig.isTestnet,
              found: false,
              configured: true,
            };
            return;
          }

          const level = Number(submission.level ?? submission[1]);
          const status = Number(submission.status ?? submission[2]);
          const expiresAt = submission.expiresAt ?? submission[5];

          // Check if valid
          let isValid = false;
          try {
            isValid = await client.readContract({
              address: KYC_MANAGER_ADDRESS,
              abi: KYCManagerABI,
              functionName: 'isKYCValid',
              args: [address as `0x${string}`],
            }) as boolean;
          } catch {}

          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            found: true,
            configured: true,
            tier: LEVEL_NAMES[level] || 'None',
            level,
            status: STATUS_NAMES[status] || 'Unknown',
            statusCode: status,
            isValid,
            expiresAt: Number(expiresAt),
          };
        } catch (error: any) {
          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            found: false,
            configured: true,
            error: error.message,
          };
        }
      })
    );

    // Summary
    const summary = {
      address,
      totalChains: chainsToCheck.length,
      verifiedOn: Object.values(results).filter((r: any) => r.found && r.statusCode === 1).length,
      pendingOn: Object.values(results).filter((r: any) => r.found && r.statusCode === 0).length,
      highestTier: Math.max(
        ...Object.values(results)
          .filter((r: any) => r.found && r.isValid)
          .map((r: any) => r.level || 0),
        0
      ),
    };

    return NextResponse.json({
      address,
      summary,
      chains: results,
    });
  } catch (error) {
    console.error('Multi-chain KYC Status API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch multi-chain KYC status' },
      { status: 500 }
    );
  }
}
