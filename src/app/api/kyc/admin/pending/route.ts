import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

const KYC_MANAGER_ABI = [
  {
    name: 'getPendingManualReviewList',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getKYCSubmission',
    type: 'function',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{
      name: '',
      type: 'tuple',
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
  }
] as const;

export async function GET(request: NextRequest) {
  try {
    const contractAddress = getAddress(KYC_MANAGER_ADDRESS);

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    // Get list of addresses pending manual review
    const pendingAddresses = await publicClient.readContract({
      address: contractAddress,
      abi: KYC_MANAGER_ABI,
      functionName: 'getPendingManualReviewList',
      args: []
    }) as string[];

    // Fetch full submission for each
    const submissions = await Promise.all(
      pendingAddresses.map(async (addr) => {
        const submission = await publicClient.readContract({
          address: contractAddress,
          abi: KYC_MANAGER_ABI,
          functionName: 'getKYCSubmission',
          args: [addr as `0x${string}`]
        });
        return {
          ...submission,
          submittedAt: submission.submittedAt.toString(),
          verifiedAt: submission.verifiedAt.toString(),
          expiresAt: submission.expiresAt.toString(),
          totalInvested: submission.totalInvested.toString()
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      count: submissions.length,
      submissions
    });

  } catch (error: any) {
    console.error('Fetch pending error:', error);
    return NextResponse.json({ 
      error: error.shortMessage || error.message || 'Failed to fetch pending reviews',
      submissions: []
    }, { status: 500 });
  }
}
