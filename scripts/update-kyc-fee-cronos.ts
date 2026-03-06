// scripts/update-kyc-fee-cronos.ts
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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
} as const;

const PRIVATE_KEY = '0x08afeb501bc4de4c2c871f11342b0414fc2ef5dfeb36d70811dd2a1e547597da' as `0x${string}`;
const KYC_VERIFIER = '0x502e3c88828db1b478c38CD251Bfe861429b9482' as `0x${string}`;

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
] as const;

const NEW_FEE = parseEther('0.05');

async function main() {
  console.log('\n🔗 Cronos Testnet - KYC Fee Update\n');

  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: cronosTestnet,
    transport: http('https://evm-t3.cronos.org'),
  });

  const walletClient = createWalletClient({
    account,
    chain: cronosTestnet,
    transport: http('https://evm-t3.cronos.org'),
  });

  // Get current fee
  const currentFee = await publicClient.readContract({
    address: KYC_VERIFIER,
    abi: KYC_VERIFIER_ABI,
    functionName: 'registrationFee',
  });

  console.log(`Current fee: ${formatEther(currentFee)} TCRO`);
  console.log(`New fee: ${formatEther(NEW_FEE)} TCRO`);

  if (currentFee === NEW_FEE) {
    console.log('✅ Already set!');
    return;
  }

  // Send with explicit higher gas limit
  console.log('\n📤 Sending transaction with manual gas...');
  
  const hash = await walletClient.writeContract({
    address: KYC_VERIFIER,
    abi: KYC_VERIFIER_ABI,
    functionName: 'setRegistrationFee',
    args: [NEW_FEE],
    gas: BigInt(50000),
  });

  console.log(`📝 TX Hash: ${hash}`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'success') {
    const updatedFee = await publicClient.readContract({
      address: KYC_VERIFIER,
      abi: KYC_VERIFIER_ABI,
      functionName: 'registrationFee',
    });
    console.log(`✅ Success! New fee: ${formatEther(updatedFee)} TCRO`);
  } else {
    console.log('❌ Transaction failed');
  }
}

main().catch(console.error);
