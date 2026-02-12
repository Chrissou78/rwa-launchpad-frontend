// src/app/api/admin/settings/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
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
  {
    name: 'totalProjects',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const escrowAbi = [
  {
    name: 'transactionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'collectedTransactionFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setTransactionFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_fee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setFeeRecipient',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_newRecipient', type: 'address' }],
    outputs: [],
  },
  {
    name: 'withdrawTransactionFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Helper to get all unique escrow vaults
async function getAllEscrowVaults(publicClient: any): Promise<string[]> {
  const total = await publicClient.readContract({
    address: CONTRACTS.RWAProjectNFT as `0x${string}`,
    abi: projectNftAbi,
    functionName: 'totalProjects',
  }) as bigint;

  const escrowVaults = new Set<string>();

  for (let i = 1; i <= Number(total); i++) {
    try {
      const project = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as `0x${string}`,
        abi: projectNftAbi,
        functionName: 'getProject',
        args: [BigInt(i)],
      }) as any;

      if (project.escrowVault && project.escrowVault !== ZERO_ADDRESS) {
        escrowVaults.add(project.escrowVault);
      }
    } catch (e) {
      console.error(`Error fetching project ${i}:`, e);
    }
  }

  return Array.from(escrowVaults);
}

// GET - Fetch current fee settings from all escrow vaults
export async function GET() {
  try {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
    });

    const escrowVaults = await getAllEscrowVaults(publicClient);

    if (escrowVaults.length === 0) {
      return NextResponse.json({
        success: true,
        transactionFee: '0',
        totalCollectedFees: '0',
        feeRecipient: ZERO_ADDRESS,
        vaultCount: 0,
        vaultDetails: [],
      });
    }

    // Fetch settings from all vaults
    const vaultDetails = await Promise.all(
      escrowVaults.map(async (vault) => {
        try {
          const [transactionFee, collectedFees, feeRecipient] = await Promise.all([
            publicClient.readContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'transactionFee',
            }),
            publicClient.readContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'collectedTransactionFees',
            }),
            publicClient.readContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'feeRecipient',
            }),
          ]);

          return {
            address: vault,
            transactionFee: transactionFee as bigint,
            collectedFees: collectedFees as bigint,
            feeRecipient: feeRecipient as string,
            error: undefined,
          };
        } catch (e: any) {
          console.error(`Error fetching settings for vault ${vault}:`, e);
          return {
            address: vault,
            transactionFee: 0n,
            collectedFees: 0n,
            feeRecipient: ZERO_ADDRESS,
            error: e.message,
          };
        }
      })
    );

    // Calculate totals
    const totalCollectedFeesWei = vaultDetails.reduce(
      (sum, v) => sum + v.collectedFees,
      0n
    );

    // Use first vault's settings as "current" (they should all be the same)
    const firstValidVault = vaultDetails.find((v) => !v.error) || vaultDetails[0];

    // Format vault details for frontend
    const formattedVaultDetails = vaultDetails.map((v) => ({
      address: v.address,
      transactionFee: v.transactionFee,
      collectedFees: v.collectedFees,
      feeRecipient: v.feeRecipient,
      error: v.error,
    }));

    return NextResponse.json({
      success: true,
      transactionFee: formatEther(firstValidVault?.transactionFee || 0n),
      totalCollectedFees: formatEther(totalCollectedFeesWei),
      feeRecipient: firstValidVault?.feeRecipient || ZERO_ADDRESS,
      vaultCount: escrowVaults.length,
      vaultDetails: formattedVaultDetails,
    });
  } catch (error: any) {
    console.error('Error fetching fee settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Update fee settings on all escrow vaults
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, value } = body;

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

    const escrowVaults = await getAllEscrowVaults(publicClient);

    if (escrowVaults.length === 0) {
      return NextResponse.json({ success: false, error: 'No escrow vaults found' }, { status: 400 });
    }

    const results: string[] = [];

    switch (action) {
      case 'setTransactionFee':
        // Update fee on ALL escrow vaults
        const feeInWei = parseEther(value.toString());
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'setTransactionFee',
              args: [feeInWei],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push(`✓ ${vault.slice(0, 10)}...: ${hash}`);
          } catch (e: any) {
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.message}`);
          }
        }
        break;

      case 'setFeeRecipient':
        // Update recipient on ALL escrow vaults
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          return NextResponse.json({ success: false, error: 'Invalid address format' }, { status: 400 });
        }
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'setFeeRecipient',
              args: [value as `0x${string}`],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push(`✓ ${vault.slice(0, 10)}...: ${hash}`);
          } catch (e: any) {
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.message}`);
          }
        }
        break;

      case 'withdrawFees':
        // Withdraw from ALL escrow vaults that have fees
        for (const vault of escrowVaults) {
          try {
            // Check if this vault has fees to withdraw
            const collectedFees = await publicClient.readContract({
              address: vault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'collectedTransactionFees',
            }) as bigint;

            if (collectedFees > 0n) {
              const hash = await walletClient.writeContract({
                address: vault as `0x${string}`,
                abi: escrowAbi,
                functionName: 'withdrawTransactionFees',
              });
              await publicClient.waitForTransactionReceipt({ hash });
              results.push(`✓ ${vault.slice(0, 10)}...: Withdrew ${formatEther(collectedFees)} POL (${hash})`);
            } else {
              results.push(`- ${vault.slice(0, 10)}...: No fees to withdraw`);
            }
          } catch (e: any) {
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.message}`);
          }
        }
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const successful = results.filter((r) => r.startsWith('✓')).length;
    const failed = results.filter((r) => r.startsWith('✗')).length;

    return NextResponse.json({
      success: failed === 0,
      message: `${action} completed: ${successful} successful, ${failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error('Error updating fee settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
