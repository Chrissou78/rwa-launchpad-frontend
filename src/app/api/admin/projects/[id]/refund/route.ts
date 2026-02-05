import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/config/contracts';

const projectNftAbi = [
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'securityToken', type: 'address' },
          { name: 'escrowVault', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
          { name: 'transferable', type: 'bool' },
        ],
      },
    ],
  },
] as const;

const escrowAbi = [
  {
    name: 'enableRefunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    
    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
    });

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
    });

    // Get project to find escrow vault
    const project = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: projectNftAbi,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    if (!project.escrowVault || project.escrowVault === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ success: false, error: 'No escrow vault for this project' }, { status: 400 });
    }

    // Enable refunds
    const hash = await walletClient.writeContract({
      address: project.escrowVault as `0x${string}`,
      abi: escrowAbi,
      functionName: 'enableRefunds',
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      message: 'Refunds enabled successfully',
      transaction: hash,
    });
  } catch (error: any) {
    console.error('Error enabling refunds:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
