// src/app/api/kyc/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, isAddress } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';

// Contract status: PENDING=0, APPROVED=1, REJECTED=2, EXPIRED=3
// Admin UI status: None=0, Pending=1, AutoVerifying=2, ManualReview=3, Approved=4, Rejected=5, Expired=6
const CONTRACT_STATUS_TO_ADMIN: Record<number, number> = {
  0: 1,  // PENDING -> Pending
  1: 4,  // APPROVED -> Approved
  2: 5,  // REJECTED -> Rejected
  3: 6,  // EXPIRED -> Expired
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchAddress = searchParams.get('address');

    if (!CONTRACTS.KYCManager) {
      return NextResponse.json({ 
        error: 'KYC_MANAGER_ADDRESS not configured',
        submissions: [],
        stats: null
      }, { status: 500 });
    }

    const contractAddress = getAddress(CONTRACTS.KYCManager);

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(RPC_URL)
    });

    // Get basic stats (pending count only - GDPR compliant)
    let pendingCount = 0;
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingCount',
        args: []
      });
      pendingCount = Number(result);
    } catch (e) {
      console.log('getPendingCount failed');
    }

    const stats = {
      totalSubmissions: 0,
      totalAutoApproved: 0,
      totalManualApproved: 0,
      totalRejected: 0,
      pendingManualReview: pendingCount,
      totalUsers: 0
    };

    // If no search address, just return stats
    if (!searchAddress) {
      return NextResponse.json({ 
        success: true,
        submissions: [],
        stats,
        message: 'Enter a wallet address to search'
      });
    }

    // Validate address
    if (!isAddress(searchAddress)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid wallet address',
        submissions: [],
        stats
      });
    }

    // Fetch single submission
    try {
      const submission = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [searchAddress as `0x${string}`]
      }) as any;

      // Check if empty submission
      if (submission.investor === '0x0000000000000000000000000000000000000000' || 
          Number(submission.submittedAt) === 0) {
        return NextResponse.json({ 
          success: true,
          submissions: [],
          stats,
          message: 'No KYC submission found for this address'
        });
      }

      // Get additional data
      let totalInvested = BigInt(0);
      let isValid = false;
      try {
        [totalInvested, isValid] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'getTotalInvested',
            args: [searchAddress as `0x${string}`]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'isKYCValid',
            args: [searchAddress as `0x${string}`]
          }) as Promise<boolean>
        ]);
      } catch {}

      const contractStatus = Number(submission.status);
      const mappedStatus = CONTRACT_STATUS_TO_ADMIN[contractStatus] ?? 0;

      const formattedSubmission = {
        user: submission.investor,
        status: mappedStatus,
        level: Number(submission.level),
        requestedLevel: Number(submission.level),
        countryCode: Number(submission.countryCode),
        documentHash: submission.documentHash,
        dataHash: '0x',
        submittedAt: Number(submission.submittedAt),
        verifiedAt: Number(submission.reviewedAt),
        expiresAt: Number(submission.expiresAt),
        verifiedBy: submission.reviewer,
        autoVerified: submission.reviewer?.toLowerCase() === contractAddress.toLowerCase(),
        rejectionReason: contractStatus === 2 ? 10 : 0,
        rejectionDetails: '',
        verificationScore: contractStatus === 1 ? 100 : 0,
        totalInvested: totalInvested.toString(),
        isValid
      };

      return NextResponse.json({ 
        success: true,
        submissions: [formattedSubmission],
        stats,
        total: 1
      });

    } catch (e: any) {
      console.error('Failed to fetch submission:', e.message);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch submission data',
        submissions: [],
        stats
      });
    }

  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      submissions: [],
      stats: null
    }, { status: 500 });
  }
}
