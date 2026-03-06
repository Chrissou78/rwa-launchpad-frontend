// scripts/update-kyc-fee-all-chains.ts
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import type { Chain } from 'viem/chains';
import { polygonAmoy, avalancheFuji, bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Define Cronos Testnet chain
const cronosTestnet = {
  id: 338,
  name: 'Cronos Testnet',
  nativeCurrency: { name: 'Cronos', symbol: 'TCRO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-t3.cronos.org'] },
  },
  blockExplorers: {
    default: { name: 'Cronos Explorer', url: 'https://cronos.org/explorer/testnet3' },
  },
  testnet: true,
} as const satisfies Chain;

// ⚠️ Use environment variable in production
const PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || '0x08afeb501bc4de4c2c871f11342b0414fc2ef5dfeb36d70811dd2a1e547597da') as `0x${string}`;

// Network config interface
interface NetworkConfig {
  chain: Chain;
  rpcUrl: string;
  kycVerifier: string;
  nativeCurrency: string;
}

// Network configurations with KYCVerifier addresses
const NETWORKS: Record<string, NetworkConfig> = {
  polygonAmoy: {
    chain: polygonAmoy,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    kycVerifier: '0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f',
    nativeCurrency: 'POL',
  },
  avalancheFuji: {
    chain: avalancheFuji,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    kycVerifier: '0x24F3c59582C8cf5772DB66C38e6375A0C305771B',
    nativeCurrency: 'AVAX',
  },
  bscTestnet: {
    chain: bscTestnet,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    kycVerifier: '0x697430F860eC4eC6506317B0225861860B76c7d8',
    nativeCurrency: 'BNB',
  },
  cronosTestnet: {
    chain: cronosTestnet,
    rpcUrl: 'https://evm-t3.cronos.org',
    kycVerifier: '0x502e3c88828db1b478c38CD251Bfe861429b9482',
    nativeCurrency: 'TCRO',
  },
};

const KYC_VERIFIER_ABI = [
  {
    name: 'setRegistrationFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_fee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'registrationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// New fee amount - 0.05 native tokens
const NEW_FEE = parseEther('0.05');

interface UpdateResult {
  network: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  txHash?: string;
}

async function updateFeeOnNetwork(networkName: string, config: NetworkConfig): Promise<UpdateResult> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔗 ${networkName} (${config.chain.name})`);
  console.log(`${'='.repeat(50)}`);

  try {
    const account = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    console.log(`📋 Contract: ${config.kycVerifier}`);
    console.log(`🔑 Wallet: ${account.address}`);

    // Check owner
    let owner: string;
    try {
      owner = await publicClient.readContract({
        address: config.kycVerifier as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: 'owner',
      });
      console.log(`👤 Owner: ${owner}`);
    } catch (e) {
      console.log('⚠️  Could not read owner - contract may not exist or have different ABI');
      return { network: networkName, status: 'failed', reason: 'Cannot read owner' };
    }

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.log('❌ You are not the owner of this contract');
      return { network: networkName, status: 'failed', reason: 'Not owner' };
    }

    // Get current fee
    const currentFee = await publicClient.readContract({
      address: config.kycVerifier as `0x${string}`,
      abi: KYC_VERIFIER_ABI,
      functionName: 'registrationFee',
    });

    console.log(`💰 Current fee: ${formatEther(currentFee)} ${config.nativeCurrency}`);
    console.log(`💰 New fee: ${formatEther(NEW_FEE)} ${config.nativeCurrency}`);

    if (currentFee === NEW_FEE) {
      console.log('✅ Fee already set to target value');
      return { network: networkName, status: 'skipped', reason: 'Already set' };
    }

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💳 Balance: ${formatEther(balance)} ${config.nativeCurrency}`);

    if (balance < parseEther('0.001')) {
      console.log('❌ Insufficient balance for gas');
      return { network: networkName, status: 'failed', reason: 'Insufficient balance' };
    }

    // Send transaction
    console.log('\n📤 Sending transaction...');
    const hash = await walletClient.writeContract({
      address: config.kycVerifier as `0x${string}`,
      abi: KYC_VERIFIER_ABI,
      functionName: 'setRegistrationFee',
      args: [NEW_FEE],
    });

    console.log(`📝 TX Hash: ${hash}`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      const updatedFee = await publicClient.readContract({
        address: config.kycVerifier as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: 'registrationFee',
      });

      console.log(`✅ Success! New fee: ${formatEther(updatedFee)} ${config.nativeCurrency}`);
      return { network: networkName, status: 'success', txHash: hash };
    } else {
      console.log('❌ Transaction failed');
      return { network: networkName, status: 'failed', reason: 'TX reverted' };
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return { network: networkName, status: 'failed', reason: error.message };
  }
}

async function main() {
  console.log('\n🚀 KYC Verifier Fee Update - All Deployed Networks');
  console.log(`📊 Target fee: ${formatEther(NEW_FEE)} native tokens\n`);

  const results: UpdateResult[] = [];

  for (const [networkName, config] of Object.entries(NETWORKS)) {
    const result = await updateFeeOnNetwork(networkName, config);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));

  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${result.network}: ${result.status}${result.reason ? ` (${result.reason})` : ''}`);
  }
}

main().catch(console.error);
