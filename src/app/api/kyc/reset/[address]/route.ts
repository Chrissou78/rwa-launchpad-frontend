// src/app/api/kyc/admin/[address]/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'AutoVerifying',
  3: 'ManualReview',
  4: 'Approved',
  5: 'Rejected',
  6: 'Expired',
  7: 'Revoked'
};

// Role hashes
const ADMIN_ROLE = keccak256(toBytes('ADMIN_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddress } = await params;

    // Parse request body for reason
    let reason = 'Admin reset';
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // No body or invalid JSON, use default reason
    }

    // Validate and checksum the address
    let userAddress: `0x${string}`;
    try {
      userAddress = getAddress(rawAddress) as `0x${string}`;
    } catch {
      return NextResponse.json(
        { error: 'Invalid address format', details: `Address "${rawAddress}" is not valid` },
        { status: 400 }
      );
    }

    if (!CONTRACTS.KYCManager) {
      return NextResponse.json(
        { error: 'KYC Manager address not configured' },
        { status: 500 }
      );
    }

    const KYC_MANAGER_ADDRESS = CONTRACTS.KYCManager as `0x${string}`;
    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

    if (!VERIFIER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Verifier private key not configured' },
        { status: 500 }
      );
    }

    console.log('=== KYC Reset Request ===');
    console.log('User address:', userAddress);
    console.log('KYC Manager:', KYC_MANAGER_ADDRESS);
    console.log('Reason:', reason);

    // Create clients
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
    console.log('Verifier account:', account.address);

    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    // Check current KYC status
    let currentStatus = 0;
    let currentLevel = 0;
    try {
      const submission = await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [userAddress]
      }) as any;

      currentStatus = Number(submission.status);
      currentLevel = Number(submission.level);
      console.log('Current KYC status:', STATUS_NAMES[currentStatus] || currentStatus);
      console.log('Current KYC level:', currentLevel);

      // If status is None (0), nothing to reset
      if (currentStatus === 0) {
        return NextResponse.json({
          success: true,
          message: 'User has no KYC to reset (status is None)',
          status: STATUS_NAMES[0],
          alreadyReset: true
        });
      }

      // If already Revoked (7), nothing to do
      if (currentStatus === 7) {
        return NextResponse.json({
          success: true,
          message: 'User KYC is already revoked',
          status: STATUS_NAMES[7],
          alreadyReset: true
        });
      }
    } catch (err: any) {
      console.error('Error fetching KYC status:', err.message);
    }

    // Check if caller has ADMIN_ROLE
    let hasAdminRole = false;
    try {
      hasAdminRole = await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'hasRole',
        args: [ADMIN_ROLE, account.address]
      }) as boolean;

      if (!hasAdminRole) {
        hasAdminRole = await publicClient.readContract({
          address: KYC_MANAGER_ADDRESS,
          abi: KYCManagerABI,
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE, account.address]
        }) as boolean;
      }

      console.log('Has admin role:', hasAdminRole);
    } catch (err: any) {
      console.error('Error checking admin role:', err.message);
    }

    if (!hasAdminRole) {
      return NextResponse.json({
        error: 'Verifier does not have ADMIN_ROLE',
        details: 'The configured verifier account does not have permission to revoke KYC',
        verifierAddress: account.address,
        hint: 'Grant ADMIN_ROLE to this address or use the contract owner private key'
      }, { status: 403 });
    }

    // Execute revokeKYC
    console.log('Executing revokeKYC...');
    try {
      const hash = await walletClient.writeContract({
        address: KYC_MANAGER_ADDRESS,
        abi: KYCManagerABI,
        functionName: 'revokeKYC',
        args: [userAddress, reason]
      });

      console.log('Transaction hash:', hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed, block:', receipt.blockNumber);

      return NextResponse.json({
        success: true,
        message: 'KYC revoked successfully',
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
        previousStatus: STATUS_NAMES[currentStatus] || currentStatus,
        previousLevel: currentLevel
      });
    } catch (err: any) {
      console.error('revokeKYC failed:', err);
      
      let errorMessage = 'Unknown error';
      let errorCode = '';
      
      if (err.message) {
        errorMessage = err.message;
        const sigMatch = err.message.match(/0x[a-fA-F0-9]{8}/);
        if (sigMatch) {
          errorCode = sigMatch[0];
        }
      }

      const knownErrors: Record<string, string> = {
        '0xc19f17a9': 'NotVerifier - Caller does not have verifier/admin role',
        '0x82b42900': 'NotAdmin - Caller does not have admin role',
        '0x8e4a23d6': 'Unauthorized - Not authorized for this action',
        '0x48f5c3ed': 'InvalidState - KYC is not in a state that can be revoked',
        '0xd92e233d': 'ZeroAddress - Invalid address provided'
      };

      if (errorCode && knownErrors[errorCode]) {
        errorMessage = knownErrors[errorCode];
      }

      if (errorMessage.includes('InvalidStatus') || errorMessage.includes('InvalidState') || errorCode === '0x48f5c3ed') {
        return NextResponse.json({
          error: 'Cannot revoke KYC in current state',
          details: `The contract does not allow revoking KYC with status "${STATUS_NAMES[currentStatus]}". Only Approved (4) status can typically be revoked.`,
          currentStatus: STATUS_NAMES[currentStatus] || currentStatus,
          currentLevel,
          hint: 'The smart contract may only allow revoking Approved KYC submissions'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: 'Failed to revoke KYC',
        details: errorMessage,
        errorCode,
        currentStatus: STATUS_NAMES[currentStatus] || currentStatus,
        currentLevel
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Reset endpoint error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

// Also support GET for checking status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddress } = await params;

    let userAddress: `0x${string}`;
    try {
      userAddress = getAddress(rawAddress) as `0x${string}`;
    } catch {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!CONTRACTS.KYCManager) {
      return NextResponse.json({ error: 'KYC Manager not configured' }, { status: 500 });
    }

    const KYC_MANAGER_ADDRESS = CONTRACTS.KYCManager as `0x${string}`;
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    const submission = await publicClient.readContract({
      address: KYC_MANAGER_ADDRESS,
      abi: KYCManagerABI,
      functionName: 'getSubmission',
      args: [userAddress]
    }) as any;

    const status = Number(submission.status);
    
    return NextResponse.json({
      address: userAddress,
      status,
      statusName: STATUS_NAMES[status] || 'Unknown',
      level: Number(submission.level),
      canReset: status === 4,
      message: status !== 4 && status !== 0 
        ? `Note: Contract may only allow resetting Approved (4) status. Current status is ${STATUS_NAMES[status]}.`
        : undefined
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
