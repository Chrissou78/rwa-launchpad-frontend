// src/app/api/admin/settings/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Helper to get all unique escrow vaults
async function getAllEscrowVaults(publicClient: ReturnType<typeof createPublicClient>): Promise<string[]> {
  try {
    const total = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'totalProjects',
    });

    console.log('Total projects:', total);

    const escrowVaults = new Set<string>();

    for (let i = 1; i <= Number(total); i++) {
      try {
        const project = await publicClient.readContract({
          address: CONTRACTS.RWAProjectNFT as `0x${string}`,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(i)],
        });

        const escrowVault = (project as any).escrowVault;
        console.log(`Project ${i} escrowVault:`, escrowVault);

        if (escrowVault && escrowVault !== ZERO_ADDRESS) {
          escrowVaults.add(escrowVault);
        }
      } catch (e) {
        console.error(`Error fetching project ${i}:`, e);
      }
    }

    return Array.from(escrowVaults);
  } catch (e) {
    console.error('Error getting escrow vaults:', e);
    return [];
  }
}

// GET - Fetch current fee settings from all escrow vaults
export async function GET() {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
    console.log('Using RPC:', rpcUrl);
    console.log('Project NFT address:', CONTRACTS.RWAProjectNFT);

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const escrowVaults = await getAllEscrowVaults(publicClient);
    console.log('Found escrow vaults:', escrowVaults);

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
              abi: RWAEscrowVaultABI,
              functionName: 'transactionFee',
            }),
            publicClient.readContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'collectedTransactionFees',
            }),
            publicClient.readContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'feeRecipient',
            }),
          ]);

          console.log(`Vault ${vault}:`, { transactionFee, collectedFees, feeRecipient });

          return {
            address: vault,
            transactionFee: formatEther(transactionFee as bigint),
            collectedFees: formatEther(collectedFees as bigint),
            feeRecipient: feeRecipient as string,
            error: null,
          };
        } catch (e: any) {
          console.error(`Error fetching settings for vault ${vault}:`, e);
          return {
            address: vault,
            transactionFee: '0',
            collectedFees: '0',
            feeRecipient: ZERO_ADDRESS,
            error: e.message || 'Failed to read vault',
          };
        }
      })
    );

    // Calculate totals
    let totalCollectedFees = 0;
    for (const v of vaultDetails) {
      totalCollectedFees += parseFloat(v.collectedFees || '0');
    }

    // Use first valid vault's settings as "current"
    const firstValidVault = vaultDetails.find((v) => !v.error) || vaultDetails[0];

    const response = {
      success: true,
      transactionFee: firstValidVault?.transactionFee || '0',
      totalCollectedFees: totalCollectedFees.toString(),
      feeRecipient: firstValidVault?.feeRecipient || ZERO_ADDRESS,
      vaultCount: escrowVaults.length,
      vaultDetails: vaultDetails,
    };

    console.log('API Response:', response);

    return NextResponse.json(response);
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

    console.log('POST request:', { action, value });

    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: 'Server not configured - missing VERIFIER_PRIVATE_KEY' }, { status: 500 });
    }

    const account = privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';

    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(rpcUrl),
    });

    const escrowVaults = await getAllEscrowVaults(publicClient);

    console.log('Found vaults for update:', escrowVaults);

    if (escrowVaults.length === 0) {
      return NextResponse.json({ success: false, error: 'No escrow vaults found' }, { status: 400 });
    }

    const results: string[] = [];

    switch (action) {
      case 'setTransactionFee': {
        const feeInWei = parseEther(value.toString());
        console.log('Setting fee to:', feeInWei.toString(), 'wei');
        
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'setTransactionFee',
              args: [feeInWei],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push(`✓ ${vault.slice(0, 10)}...: tx ${hash.slice(0, 10)}...`);
          } catch (e: any) {
            console.error(`Error setting fee on ${vault}:`, e);
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.shortMessage || e.message}`);
          }
        }
        break;
      }

      case 'setFeeRecipient': {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          return NextResponse.json({ success: false, error: 'Invalid address format' }, { status: 400 });
        }
        
        console.log('Setting recipient to:', value);
        
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'setFeeRecipient',
              args: [value as `0x${string}`],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push(`✓ ${vault.slice(0, 10)}...: tx ${hash.slice(0, 10)}...`);
          } catch (e: any) {
            console.error(`Error setting recipient on ${vault}:`, e);
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.shortMessage || e.message}`);
          }
        }
        break;
      }

      case 'withdrawFees': {
        console.log('Withdrawing fees from all vaults');
        
        for (const vault of escrowVaults) {
          try {
            const collectedFees = await publicClient.readContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'collectedTransactionFees',
            }) as bigint;

            if (collectedFees > 0n) {
              const hash = await walletClient.writeContract({
                address: vault as `0x${string}`,
                abi: RWAEscrowVaultABI,
                functionName: 'withdrawTransactionFees',
              });
              await publicClient.waitForTransactionReceipt({ hash });
              results.push(`✓ ${vault.slice(0, 10)}...: Withdrew ${formatEther(collectedFees)} POL`);
            } else {
              results.push(`- ${vault.slice(0, 10)}...: No fees to withdraw`);
            }
          } catch (e: any) {
            console.error(`Error withdrawing from ${vault}:`, e);
            results.push(`✗ ${vault.slice(0, 10)}...: ${e.shortMessage || e.message}`);
          }
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
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