// src/app/api/admin/projects/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS, RPC_URL, CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Pending',
  2: 'Active',
  3: 'Funded',
  4: 'In Progress',
  5: 'Completed',
  6: 'Cancelled',
  7: 'Failed',
};

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

    const body = await request.json();
    const { reason = 'Project cancelled by admin', enableRefunds = true } = body;

    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.VERIFIER_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({ success: false, error: 'Admin key not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(adminKey as `0x${string}`);
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || RPC_URL;

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    // Get project info
    const project = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const currentStatus = Number(project.status);

    // Status 6 = Cancelled
    if (currentStatus === 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project already cancelled' 
      }, { status: 400 });
    }
    // Status 5 = Completed
    if (currentStatus === 5) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot cancel completed project' 
      }, { status: 400 });
    }

    const results: any = {
      projectId,
      previousStatus: STATUS_NAMES[currentStatus] || `Status ${currentStatus}`,
      totalRaised: Number(project.totalRaised) / 1e6,
      transactions: [],
    };

    // Step 1: Cancel the project
    const cancelHash = await walletClient.writeContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'cancelProject',
      args: [BigInt(projectId), reason],
    });

    await publicClient.waitForTransactionReceipt({ hash: cancelHash });
    results.transactions.push({ action: 'cancel', hash: cancelHash });
    results.cancelled = true;

    // Step 2: Enable refunds if requested and there are funds
    if (enableRefunds && project.totalRaised > 0n && project.escrowVault !== ZERO_ADDRESS) {
      try {
        const refundHash = await walletClient.writeContract({
          address: project.escrowVault as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'enableRefunds',
          args: [BigInt(projectId)],
        });

        await publicClient.waitForTransactionReceipt({ hash: refundHash });
        results.transactions.push({ action: 'enableRefunds', hash: refundHash });
        results.refundsEnabled = true;
        results.escrowVault = project.escrowVault;
      } catch (refundError: any) {
        results.refundsEnabled = false;
        results.refundError = refundError.message;
      }
    } else {
      results.refundsEnabled = false;
      results.refundReason = project.totalRaised === 0n 
        ? 'No funds raised' 
        : project.escrowVault === ZERO_ADDRESS 
          ? 'No escrow vault' 
          : 'Refunds not requested';
    }

    results.newStatus = 'Cancelled';
    results.success = true;

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Cancel project error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
