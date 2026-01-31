import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

const KYC_MANAGER_ABI = [
  {
    name: 'getSubmissionsPaginated',
    type: 'function',
    inputs: [
      { name: '_offset', type: 'uint256' },
      { name: '_limit', type: 'uint256' }
    ],
    outputs: [{
      name: '',
      type: 'tuple[]',
      components: [
        { name: 'user', type: 'address' },
        { name: 'status', type: 'uint8' },
        { name: 'level', type: 'uint8' },
        { name: 'requestedLevel', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'documentHash', type: 'bytes32' },
        { name: 'dataHash', type: 'bytes32' },
        { name: 'submittedAt', type: 'uint256' },
        { name: 'verifiedAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'verifiedBy', type: 'address' },
        { name: 'autoVerified', type: 'bool' },
        { name: 'rejectionReason', type: 'uint8' },
        { name: 'rejectionDetails', type: 'string' },
        { name: 'verificationScore', type: 'uint8' },
        { name: 'totalInvested', type: 'uint256' }
      ]
    }],
    stateMutability: 'view'
  },
  {
    name: 'getStatistics',
    type: 'function',
    inputs: [],
    outputs: [
      { name: '_totalSubmissions', type: 'uint256' },
      { name: '_totalAutoApproved', type: 'uint256' },
      { name: '_totalManualApproved', type: 'uint256' },
      { name: '_totalRejected', type: 'uint256' },
      { name: '_pendingManualReview', type: 'uint256' },
      { name: '_totalUsers', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'totalSubmissions',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'totalAutoApproved',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'totalManualApproved',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'totalRejected',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'pendingManualReview',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!KYC_MANAGER_ADDRESS) {
      return NextResponse.json({ 
        error: 'KYC_MANAGER_ADDRESS not configured',
        submissions: [],
        total: 0
      }, { status: 500 });
    }

    const contractAddress = getAddress(KYC_MANAGER_ADDRESS);

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    console.log('=== Fetching KYC Admin Data ===');
    console.log('Contract:', contractAddress);
    console.log('Offset:', offset, 'Limit:', limit);

    // Try to get statistics first
    let stats = {
      totalSubmissions: 0,
      totalAutoApproved: 0,
      totalManualApproved: 0,
      totalRejected: 0,
      pendingManualReview: 0,
      totalUsers: 0
    };

    // Try getStatistics() first
    try {
      const statsResult = await publicClient.readContract({
        address: contractAddress,
        abi: KYC_MANAGER_ABI,
        functionName: 'getStatistics',
        args: []
      });

      console.log('getStatistics result:', statsResult);

      stats = {
        totalSubmissions: Number(statsResult[0]),
        totalAutoApproved: Number(statsResult[1]),
        totalManualApproved: Number(statsResult[2]),
        totalRejected: Number(statsResult[3]),
        pendingManualReview: Number(statsResult[4]),
        totalUsers: Number(statsResult[5])
      };
    } catch (statsError: any) {
      console.log('getStatistics failed, trying individual calls:', statsError.message?.slice(0, 100));
      
      // Fallback: read individual state variables
      try {
        const [
          totalSubmissions,
          totalAutoApproved,
          totalManualApproved,
          totalRejected,
          pendingManualReview
        ] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'totalSubmissions',
            args: []
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'totalAutoApproved',
            args: []
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'totalManualApproved',
            args: []
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'totalRejected',
            args: []
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'pendingManualReview',
            args: []
          })
        ]);

        stats = {
          totalSubmissions: Number(totalSubmissions),
          totalAutoApproved: Number(totalAutoApproved),
          totalManualApproved: Number(totalManualApproved),
          totalRejected: Number(totalRejected),
          pendingManualReview: Number(pendingManualReview),
          totalUsers: Number(totalSubmissions) // Approximate
        };

        console.log('Individual stats:', stats);
      } catch (individualError: any) {
        console.log('Individual stats failed:', individualError.message?.slice(0, 100));
      }
    }

    // Fetch submissions
    let formattedSubmissions: any[] = [];
    
    try {
      const submissions = await publicClient.readContract({
        address: contractAddress,
        abi: KYC_MANAGER_ABI,
        functionName: 'getSubmissionsPaginated',
        args: [BigInt(offset), BigInt(limit)]
      });

      console.log('Got submissions:', (submissions as any[]).length);

      formattedSubmissions = (submissions as any[]).map(s => ({
        user: s.user,
        status: Number(s.status),
        level: Number(s.level),
        requestedLevel: Number(s.requestedLevel),
        countryCode: Number(s.countryCode),
        documentHash: s.documentHash,
        dataHash: s.dataHash,
        submittedAt: s.submittedAt.toString(),
        verifiedAt: s.verifiedAt.toString(),
        expiresAt: s.expiresAt.toString(),
        verifiedBy: s.verifiedBy,
        autoVerified: s.autoVerified,
        rejectionReason: Number(s.rejectionReason),
        rejectionDetails: s.rejectionDetails,
        verificationScore: Number(s.verificationScore),
        totalInvested: s.totalInvested.toString()
      }));

      // If we got submissions but no stats.totalUsers, calculate from response
      if (stats.totalUsers === 0 && formattedSubmissions.length > 0) {
        // If we got fewer than limit, we have all users
        if (formattedSubmissions.length < limit) {
          stats.totalUsers = offset + formattedSubmissions.length;
        } else {
          // We need to estimate - there are more users
          stats.totalUsers = offset + formattedSubmissions.length + 1; // At least this many
        }
      }

      // Calculate stats from submissions if contract stats are 0
      if (stats.totalSubmissions === 0 && formattedSubmissions.length > 0) {
        const statusCounts = formattedSubmissions.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        stats = {
          totalSubmissions: formattedSubmissions.length,
          totalAutoApproved: formattedSubmissions.filter(s => s.status === 4 && s.autoVerified).length,
          totalManualApproved: formattedSubmissions.filter(s => s.status === 4 && !s.autoVerified).length,
          totalRejected: statusCounts[5] || 0,
          pendingManualReview: statusCounts[3] || 0,
          totalUsers: formattedSubmissions.length
        };

        console.log('Calculated stats from submissions:', stats);
      }

    } catch (subError: any) {
      console.error('Failed to fetch submissions:', subError.message?.slice(0, 200));
    }

    console.log('Final stats:', stats);
    console.log('Returning', formattedSubmissions.length, 'submissions');

    return NextResponse.json({ 
      success: true,
      submissions: formattedSubmissions,
      total: stats.totalUsers,
      offset,
      limit,
      stats
    });

  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ 
      error: error.shortMessage || error.message || 'Failed to fetch users',
      submissions: [],
      total: 0,
      stats: {
        totalSubmissions: 0,
        totalAutoApproved: 0,
        totalManualApproved: 0,
        totalRejected: 0,
        pendingManualReview: 0,
        totalUsers: 0
      }
    }, { status: 500 });
  }
}
