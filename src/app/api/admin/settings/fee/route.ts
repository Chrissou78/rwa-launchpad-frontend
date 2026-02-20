// src/app/api/admin/settings/fee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther, formatEther, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    RWAProjectNFT?: string;
  };
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Avalanche Fuji Testnet
  43113: {
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT || process.env.NEXT_PUBLIC_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io',
  },
  // Polygon Amoy Testnet
  80002: {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_AMOY_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com',
  },
  // Sepolia Testnet
  11155111: {
    chain: sepolia,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      RWAProjectNFT: process.env.SEPOLIA_PROJECT_NFT,
    },
    isTestnet: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  // Avalanche Mainnet
  43114: {
    chain: avalanche,
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
  },
  // Polygon Mainnet
  137: {
    chain: polygon,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
  },
  // Ethereum Mainnet
  1: {
    chain: mainnet,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      RWAProjectNFT: process.env.ETHEREUM_PROJECT_NFT,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

function createChainPublicClient(chainConfig: ChainConfig) {
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function createChainWalletClient(chainConfig: ChainConfig, privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function getChainIdFromRequest(request: NextRequest): number {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get('chainId') || request.headers.get('x-chain-id');
  return chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;
}

// Helper to get all unique escrow vaults for a chain
async function getAllEscrowVaults(
  publicClient: ReturnType<typeof createPublicClient>,
  projectNFTAddress: `0x${string}`,
  chainName: string
): Promise<string[]> {
  try {
    const total = await publicClient.readContract({
      address: projectNFTAddress,
      abi: RWAProjectNFTABI,
      functionName: 'totalProjects',
    });

    console.log(`[${chainName}] Total projects:`, total);

    const escrowVaults = new Set<string>();

    for (let i = 1; i <= Number(total); i++) {
      try {
        const project = await publicClient.readContract({
          address: projectNFTAddress,
          abi: RWAProjectNFTABI,
          functionName: 'getProject',
          args: [BigInt(i)],
        });

        const escrowVault = (project as any).escrowVault;
        console.log(`[${chainName}] Project ${i} escrowVault:`, escrowVault);

        if (escrowVault && escrowVault !== ZERO_ADDRESS) {
          escrowVaults.add(escrowVault);
        }
      } catch (e) {
        console.error(`[${chainName}] Error fetching project ${i}:`, e);
      }
    }

    return Array.from(escrowVaults);
  } catch (e) {
    console.error(`[${chainName}] Error getting escrow vaults:`, e);
    return [];
  }
}

// ============================================================================
// GET - Fetch current fee settings from all escrow vaults
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get chain ID
    const chainId = getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id, 10),
          name: config.name,
          isTestnet: config.isTestnet,
        })),
      }, { status: 400 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

    console.log(`[${chainConfig.name}] Using RPC:`, chainConfig.rpcUrl);
    console.log(`[${chainConfig.name}] Project NFT address:`, projectNFTAddress);

    const publicClient = createChainPublicClient(chainConfig);

    const escrowVaults = await getAllEscrowVaults(publicClient, projectNFTAddress, chainConfig.name);
    console.log(`[${chainConfig.name}] Found escrow vaults:`, escrowVaults);

    if (escrowVaults.length === 0) {
      return NextResponse.json({
        success: true,
        transactionFee: '0',
        totalCollectedFees: '0',
        feeRecipient: ZERO_ADDRESS,
        vaultCount: 0,
        vaultDetails: [],
        chainId,
        chainName: chainConfig.name,
        nativeCurrency: chainConfig.nativeCurrency,
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

          console.log(`[${chainConfig.name}] Vault ${vault}:`, { transactionFee, collectedFees, feeRecipient });

          return {
            address: vault,
            transactionFee: formatEther(transactionFee as bigint),
            collectedFees: formatEther(collectedFees as bigint),
            feeRecipient: feeRecipient as string,
            explorerUrl: `${chainConfig.explorerUrl}/address/${vault}`,
            error: null,
          };
        } catch (e: any) {
          console.error(`[${chainConfig.name}] Error fetching settings for vault ${vault}:`, e);
          return {
            address: vault,
            transactionFee: '0',
            collectedFees: '0',
            feeRecipient: ZERO_ADDRESS,
            explorerUrl: `${chainConfig.explorerUrl}/address/${vault}`,
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
      chainId,
      chainName: chainConfig.name,
      nativeCurrency: chainConfig.nativeCurrency,
      isTestnet: chainConfig.isTestnet,
      projectNFTAddress,
    };

    console.log(`[${chainConfig.name}] API Response:`, response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching fee settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST - Update fee settings on all escrow vaults
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, value, chainId: requestedChainId } = body;

    // Get chain ID
    const chainId = requestedChainId || getChainIdFromRequest(request);
    const chainConfig = getChainConfig(chainId);

    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported chain ID: ${chainId}`,
      }, { status: 400 });
    }

    console.log(`[${chainConfig.name}] POST request:`, { action, value });

    if (!process.env.VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Server not configured - missing VERIFIER_PRIVATE_KEY',
      }, { status: 500 });
    }

    if (!chainConfig.contracts.RWAProjectNFT) {
      return NextResponse.json({
        success: false,
        error: `RWAProjectNFT not configured for ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 500 });
    }

    const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;
    const account = privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);

    const walletClient = createChainWalletClient(chainConfig, process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
    const publicClient = createChainPublicClient(chainConfig);

    const escrowVaults = await getAllEscrowVaults(publicClient, projectNFTAddress, chainConfig.name);

    console.log(`[${chainConfig.name}] Found vaults for update:`, escrowVaults);

    if (escrowVaults.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No escrow vaults found on ${chainConfig.name}`,
        chainId,
        chainName: chainConfig.name,
      }, { status: 400 });
    }

    const results: Array<{
      vault: string;
      status: 'success' | 'failed' | 'skipped';
      message: string;
      txHash?: string;
    }> = [];

    switch (action) {
      case 'setTransactionFee': {
        const feeInWei = parseEther(value.toString());
        console.log(`[${chainConfig.name}] Setting fee to:`, feeInWei.toString(), 'wei');
        
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'setTransactionFee',
              args: [feeInWei],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push({
              vault,
              status: 'success',
              message: `Fee set to ${value} ${chainConfig.nativeCurrency}`,
              txHash: hash,
            });
          } catch (e: any) {
            console.error(`[${chainConfig.name}] Error setting fee on ${vault}:`, e);
            results.push({
              vault,
              status: 'failed',
              message: e.shortMessage || e.message,
            });
          }
        }
        break;
      }

      case 'setFeeRecipient': {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid address format',
            chainId,
            chainName: chainConfig.name,
          }, { status: 400 });
        }
        
        console.log(`[${chainConfig.name}] Setting recipient to:`, value);
        
        for (const vault of escrowVaults) {
          try {
            const hash = await walletClient.writeContract({
              address: vault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'setFeeRecipient',
              args: [value as `0x${string}`],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            results.push({
              vault,
              status: 'success',
              message: `Recipient set to ${value}`,
              txHash: hash,
            });
          } catch (e: any) {
            console.error(`[${chainConfig.name}] Error setting recipient on ${vault}:`, e);
            results.push({
              vault,
              status: 'failed',
              message: e.shortMessage || e.message,
            });
          }
        }
        break;
      }

      case 'withdrawFees': {
        console.log(`[${chainConfig.name}] Withdrawing fees from all vaults`);
        
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
              results.push({
                vault,
                status: 'success',
                message: `Withdrew ${formatEther(collectedFees)} ${chainConfig.nativeCurrency}`,
                txHash: hash,
              });
            } else {
              results.push({
                vault,
                status: 'skipped',
                message: 'No fees to withdraw',
              });
            }
          } catch (e: any) {
            console.error(`[${chainConfig.name}] Error withdrawing from ${vault}:`, e);
            results.push({
              vault,
              status: 'failed',
              message: e.shortMessage || e.message,
            });
          }
        }
        break;
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Invalid action: ${action}`,
          validActions: ['setTransactionFee', 'setFeeRecipient', 'withdrawFees'],
          chainId,
          chainName: chainConfig.name,
        }, { status: 400 });
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return NextResponse.json({
      success: failed === 0,
      message: `${action} completed on ${chainConfig.name}: ${successful} successful, ${failed} failed, ${skipped} skipped`,
      summary: {
        successful,
        failed,
        skipped,
        total: escrowVaults.length,
      },
      results,
      chainId,
      chainName: chainConfig.name,
      nativeCurrency: chainConfig.nativeCurrency,
      explorerUrl: chainConfig.explorerUrl,
    });
  } catch (error: any) {
    console.error('Error updating fee settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT - Get fee settings across all chains
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { chainIds } = body;

    // If specific chains requested, use those; otherwise check all configured chains
    const chainsToCheck = chainIds && Array.isArray(chainIds)
      ? chainIds.filter((id: number) => CHAIN_CONFIGS[id])
      : Object.keys(CHAIN_CONFIGS).map(Number);

    console.log('Fetching fee settings across chains:', chainsToCheck);

    const results: Record<number, any> = {};

    await Promise.all(
      chainsToCheck.map(async (chainId: number) => {
        const chainConfig = CHAIN_CONFIGS[chainId];
        
        if (!chainConfig || !chainConfig.contracts.RWAProjectNFT) {
          results[chainId] = {
            chainId,
            chainName: chainConfig?.name || 'Unknown',
            configured: false,
            error: 'RWAProjectNFT not configured',
          };
          return;
        }

        try {
          const publicClient = createChainPublicClient(chainConfig);
          const projectNFTAddress = chainConfig.contracts.RWAProjectNFT as `0x${string}`;

          const escrowVaults = await getAllEscrowVaults(publicClient, projectNFTAddress, chainConfig.name);

          if (escrowVaults.length === 0) {
            results[chainId] = {
              chainId,
              chainName: chainConfig.name,
              isTestnet: chainConfig.isTestnet,
              nativeCurrency: chainConfig.nativeCurrency,
              configured: true,
              vaultCount: 0,
              totalCollectedFees: '0',
            };
            return;
          }

          // Fetch settings from all vaults
          let totalCollectedFees = 0;
          let firstFee = '0';
          let firstRecipient = ZERO_ADDRESS;

          for (const vault of escrowVaults) {
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

              totalCollectedFees += parseFloat(formatEther(collectedFees as bigint));
              
              if (firstFee === '0') {
                firstFee = formatEther(transactionFee as bigint);
                firstRecipient = feeRecipient as string;
              }
            } catch {}
          }

          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            isTestnet: chainConfig.isTestnet,
            nativeCurrency: chainConfig.nativeCurrency,
            configured: true,
            vaultCount: escrowVaults.length,
            transactionFee: firstFee,
            totalCollectedFees: totalCollectedFees.toFixed(6),
            feeRecipient: firstRecipient,
          };
        } catch (error: any) {
          results[chainId] = {
            chainId,
            chainName: chainConfig.name,
            configured: true,
            error: error.message,
          };
        }
      })
    );

    // Calculate totals
    const totalVaults = Object.values(results)
      .filter((r: any) => r.configured && !r.error)
      .reduce((sum: number, r: any) => sum + (r.vaultCount || 0), 0);
    
    const totalFees = Object.values(results)
      .filter((r: any) => r.configured && !r.error)
      .reduce((sum: number, r: any) => sum + parseFloat(r.totalCollectedFees || '0'), 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalChains: chainsToCheck.length,
        configuredChains: Object.values(results).filter((r: any) => r.configured && !r.error).length,
        totalVaults,
        totalCollectedFees: totalFees.toFixed(6),
      },
      chains: results,
    });
  } catch (error: any) {
    console.error('Error fetching multi-chain fee settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
