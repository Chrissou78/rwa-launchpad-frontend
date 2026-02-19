// src/app/api/admin/projects/[id]/refund/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS, RPC_URL, CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

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
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || RPC_URL;
    
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    // Get project to find escrow vault
    const project = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    if (!project.escrowVault || project.escrowVault === ZERO_ADDRESS) {
      return NextResponse.json({ success: false, error: 'No escrow vault for this project' }, { status: 400 });
    }

    // Enable refunds on the escrow vault
    const hash = await walletClient.writeContract({
      address: project.escrowVault as `0x${string}`,
      abi: RWAEscrowVaultABI,
      functionName: 'enableRefunds',
      args: [BigInt(projectId)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      message: 'Refunds enabled successfully',
      transaction: hash,
      escrowVault: project.escrowVault,
    });
  } catch (error: any) {
    console.error('Error enabling refunds:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
