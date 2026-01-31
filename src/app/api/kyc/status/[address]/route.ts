import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Simplified ABI with just the functions we need
const abi = parseAbi([
  'function getKYCSubmission(address _user) view returns ((address user, uint8 status, uint8 level, uint8 requestedLevel, uint16 countryCode, bytes32 documentHash, bytes32 dataHash, uint256 submittedAt, uint256 verifiedAt, uint256 expiresAt, address verifiedBy, bool autoVerified, uint8 rejectionReason, string rejectionDetails, uint8 verificationScore, uint256 totalInvested))',
  'function getInvestmentLimit(address _user) view returns (uint256)',
  'function getRemainingLimit(address _user) view returns (uint256)',
  'function investmentLimits(uint8) view returns (uint256)'
]);

const STATUS_NAMES = ['None', 'Pending', 'AutoVerifying', 'ManualReview', 'Approved', 'Rejected', 'Expired', 'Revoked'];
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;

    // Validate address format
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ 
        found: false, 
        error: 'Invalid address format' 
      }, { status: 400 });
    }

    // Check if contract address is configured
    if (!KYC_MANAGER_ADDRESS) {
      console.error('KYC_MANAGER_ADDRESS not configured');
      return NextResponse.json({
        found: false,
        error: 'Contract not configured',
        submission: null
      });
    }

    console.log(`Fetching KYC status for ${address} from contract ${KYC_MANAGER_ADDRESS}`);

    const client = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    // Try to read submission from contract
    let submission;
    try {
      submission = await client.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi,
        functionName: 'getKYCSubmission',
        args: [address as `0x${string}`]
      });
    } catch (error) {
      console.error('Error reading submission:', error);
      return NextResponse.json({
        found: false,
        submission: null,
        error: 'Failed to read from contract'
      });
    }

    // Check if user has a submission (status > 0 or submittedAt > 0)
    if (submission.status === 0 && submission.submittedAt === 0n) {
      return NextResponse.json({ 
        found: false, 
        submission: null 
      });
    }

    // Get investment limits
    let investmentLimit = 0;
    let remainingLimit = 0;

    try {
      const [limitResult, remainingResult] = await Promise.all([
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi,
          functionName: 'getInvestmentLimit',
          args: [address as `0x${string}`]
        }),
        client.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi,
          functionName: 'getRemainingLimit',
          args: [address as `0x${string}`]
        })
      ]);

      // Convert from USDC decimals (6) to USD
      // Check for max uint256 (unlimited)
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      if (limitResult >= MAX_UINT256 - 1000n) {
        investmentLimit = Infinity;
      } else {
        investmentLimit = Number(limitResult) / 1e6;
      }

      if (remainingResult >= MAX_UINT256 - 1000n) {
        remainingLimit = Infinity;
      } else {
        remainingLimit = Number(remainingResult) / 1e6;
      }
    } catch (error) {
      console.error('Error reading limits:', error);
      // Continue with default values
    }

    const totalInvested = Number(submission.totalInvested) / 1e6;

    return NextResponse.json({
      found: true,
      submission: {
        wallet: submission.user,
        status: STATUS_NAMES[submission.status] || 'None',
        level: submission.level,
        tier: TIER_NAMES[submission.level] || 'None',
        requestedLevel: submission.requestedLevel,
        countryCode: submission.countryCode,
        submittedAt: Number(submission.submittedAt),
        verifiedAt: Number(submission.verifiedAt),
        expiresAt: Number(submission.expiresAt),
        verifiedBy: submission.verifiedBy,
        autoVerified: submission.autoVerified,
        rejectionReason: submission.rejectionReason,
        rejectionDetails: submission.rejectionDetails,
        verificationScore: submission.verificationScore,
        totalInvested,
        investmentLimit,
        remainingLimit
      }
    });
  } catch (error) {
    console.error('KYC status API error:', error);
    return NextResponse.json({ 
      found: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      submission: null
    }, { status: 500 });
  }
}
