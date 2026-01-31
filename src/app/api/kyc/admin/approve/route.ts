import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, keccak256, toBytes } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

const KYC_REVIEWER_ROLE = keccak256(toBytes('KYC_REVIEWER_ROLE'));

export async function POST(request: NextRequest) {
  try {
    const { userAddress, level } = await request.json();

    if (!userAddress || level === undefined) {
      return NextResponse.json({ error: 'Missing userAddress or level' }, { status: 400 });
    }

    const checkedAddress = getAddress(userAddress);
    const contractAddress = getAddress(KYC_MANAGER_ADDRESS);

    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
    
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    // Check role
    const hasRole = await publicClient.readContract({
      address: contractAddress,
      abi: [{
        name: 'hasRole',
        type: 'function',
        inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
      }],
      functionName: 'hasRole',
      args: [KYC_REVIEWER_ROLE, account.address]
    });

    if (!hasRole) {
      return NextResponse.json({ 
        error: 'Account does not have KYC_REVIEWER_ROLE',
        account: account.address
      }, { status: 403 });
    }

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: [{
        name: 'manualApprove',
        type: 'function',
        inputs: [
          { name: '_user', type: 'address' },
          { name: '_level', type: 'uint8' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }],
      functionName: 'manualApprove',
      args: [checkedAddress, level]
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ 
      success: true, 
      message: `KYC approved at level ${level}`,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString()
    });

  } catch (error: any) {
    console.error('Manual approve error:', error);
    return NextResponse.json({ 
      error: error.shortMessage || error.message || 'Failed to approve'
    }, { status: 500 });
  }
}
