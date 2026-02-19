// src/app/api/admin/projects/[id]/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { RPC_URL, CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI } from '@/config/abis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
    });

    // Update status to Active (2)
    const hash = await walletClient.writeContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'updateProjectStatus',
      args: [BigInt(projectId), 2], // 2 = Active
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      message: 'Project activated successfully',
      transaction: hash,
    });
  } catch (error: any) {
    console.error('Error activating project:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
