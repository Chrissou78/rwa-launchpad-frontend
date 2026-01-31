import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PROJECT_NFT = '0x4497e4EA43C1A1Cd2B719fF0E4cea376364c1315';

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
  {
    name: 'cancelProject',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getProjectStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const escrowAbi = [
  {
    name: 'enableRefunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getProjectFunding',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'projectId', type: 'uint256' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'totalReleased', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'fundingComplete', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'currentMilestone', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'projectOwner', type: 'address' },
          { name: 'securityToken', type: 'address' },
        ],
      },
    ],
  },
] as const;

const STATUS_NAMES = ['Pending', 'Active', 'Funded', 'Completed', 'Cancelled', 'Failed'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const body = await request.json();
    const { reason = 'Project cancelled by admin', enableRefunds = true } = body;

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
    });

    const currentStatus = Number(project.status);

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
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    if (enableRefunds && project.totalRaised > 0n && project.escrowVault !== zeroAddress) {
      const refundHash = await walletClient.writeContract({
        address: project.escrowVault as `0x${string}`,
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
