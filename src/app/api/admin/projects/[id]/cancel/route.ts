import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PROJECT_NFT = '0x4497e4EA43C1A1Cd2B719fF0E4cea376364c1315';

const projectNftAbi = parseAbi([
  'function getProject(uint256) view returns (tuple(uint256 id, address owner, string metadataURI, uint256 fundingGoal, uint256 totalRaised, uint256 minInvestment, uint256 maxInvestment, uint256 deadline, uint8 status, address securityToken, address escrowVault, uint256 createdAt, uint256 completedAt, bool transferable))',
  'function cancelProject(uint256, string)',
  'function getProjectStatus(uint256) view returns (uint8)',
]);

const escrowAbi = parseAbi([
  'function enableRefunds(uint256)',
  'function getProjectFunding(uint256) view returns (tuple(uint256 projectId, uint256 fundingGoal, uint256 totalRaised, uint256 totalReleased, uint256 deadline, address paymentToken, bool fundingComplete, bool refundsEnabled, uint256 currentMilestone, uint256 minInvestment, uint256 maxInvestment, address projectOwner, address securityToken))',
]);

const STATUS_NAMES = ['Pending', 'Active', 'Funded', 'Completed', 'Cancelled', 'Failed'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const body = await request.json();
    const { reason = 'Project cancelled by admin', enableRefunds = true } = body;

    // Validate admin key
    const adminKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminKey) {
      return NextResponse.json({ success: false, error: 'Admin key not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(adminKey as `0x${string}`);
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(rpcUrl),
    });

    // Get project info
    const project = await publicClient.readContract({
      address: PROJECT_NFT,
      abi: projectNftAbi,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const currentStatus = Number(project.status);

    // Check if can be cancelled
    if (currentStatus === 4) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project already cancelled' 
      }, { status: 400 });
    }
    if (currentStatus === 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot cancel completed project' 
      }, { status: 400 });
    }

    const results: any = {
      projectId,
      previousStatus: STATUS_NAMES[currentStatus],
      totalRaised: Number(project.totalRaised) / 1e6,
      transactions: [],
    };

    // Step 1: Cancel the project
    const cancelHash = await walletClient.writeContract({
      address: PROJECT_NFT,
      abi: projectNftAbi,
      functionName: 'cancelProject',
      args: [BigInt(projectId), reason],
    });

    await publicClient.waitForTransactionReceipt({ hash: cancelHash });
    results.transactions.push({ action: 'cancel', hash: cancelHash });
    results.cancelled = true;

    // Step 2: Enable refunds if requested and there are funds
    if (enableRefunds && project.totalRaised > 0n && project.escrowVault !== '0x0000000000000000000000000000000000000000') {
      const refundHash = await walletClient.writeContract({
        address: project.escrowVault,
        abi: escrowAbi,
        functionName: 'enableRefunds',
        args: [BigInt(projectId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: refundHash });
      results.transactions.push({ action: 'enableRefunds', hash: refundHash });
      results.refundsEnabled = true;
      results.escrowVault = project.escrowVault;
    } else {
      results.refundsEnabled = false;
      results.refundReason = project.totalRaised === 0n ? 'No funds raised' : 'Refunds not requested';
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
