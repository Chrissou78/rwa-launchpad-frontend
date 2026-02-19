// src/app/api/kyc/status/[address]/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http, isAddress, formatUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { RPC_URL, CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

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

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

// ✅ Fixed: Use 18 decimals
const convertFromContract = (value: bigint): number => {
  if (value >= MAX_UINT256 / BigInt(2)) return Infinity;
  return Number(formatUnits(value, 18));
};

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = await params;

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    if (!CONTRACTS.KYCManager) {
      return NextResponse.json(
        { error: 'KYC Manager not configured', found: false, tier: 'None', status: 'None', isValid: false },
        { status: 500 }
      );
    }

    const KYC_MANAGER_ADDRESS = CONTRACTS.KYCManager as `0x${string}`;

    console.log(`Fetching KYC status for ${address} from contract ${KYC_MANAGER_ADDRESS}`);

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
      console.error('Error reading submission:', error);
      return NextResponse.json({
        found: false,
        address,
        tier: 'None',
        status: 'None',
        isValid: false,
        message: 'No KYC submission found or contract error'
      });
    }

    console.log('Raw submission:', submission);

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
        message: 'No KYC submission found'
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
      console.error('Error fetching additional KYC data:', error);
    }

    // Log raw values for debugging
    console.log('Raw contract values:', {
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
