import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const KYC_VERIFIER_ADDRESS = '0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f';
const PRIVATE_KEY = '0x08afeb501bc4de4c2c871f11342b0414fc2ef5dfeb36d70811dd2a1e547597da' as `0x${string}`;

const KYC_VERIFIER_ABI = [
  {
    name: 'registerWithProof',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'level', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
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

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });

  console.log('=== KYC Upgrade Test ===\n');
  console.log('Wallet:', account.address);

  const contractFee = await publicClient.readContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: KYC_VERIFIER_ABI,
    functionName: 'registrationFee',
  });
  console.log('Contract fee:', formatEther(contractFee), 'MATIC');

  // Fetch proof
  console.log('\n--- Fetching Proof (GET) ---');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `Get KYC Proof\nWallet: ${account.address}\nTimestamp: ${timestamp}`;
  const authSignature = await walletClient.signMessage({ message });

  const url = `http://localhost:3000/api/kyc/proof?wallet=${account.address}&signature=${encodeURIComponent(authSignature)}&timestamp=${timestamp}`;
  const response = await fetch(url, { method: 'GET' });
  const data = await response.json();

  if (!data.proof) {
    console.log('❌ No proof available');
    return;
  }

  const proof = data.proof;
  console.log('✅ Proof retrieved! Level:', proof.level);

  // Execute transaction directly (skip simulation)
  console.log('\n--- Executing Transaction ---');
  
  try {
    const hash = await walletClient.writeContract({
      address: KYC_VERIFIER_ADDRESS,
      abi: KYC_VERIFIER_ABI,
      functionName: 'registerWithProof',
      args: [
        proof.level,
        proof.countryCode,
        BigInt(proof.expiry),
        proof.signature as `0x${string}`
      ],
      value: contractFee,
    });

    console.log('TX Hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Status:', receipt.status === 'success' ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Gas used:', receipt.gasUsed.toString());

  } catch (e: any) {
    console.log('❌ Transaction failed');
    console.log('Error:', e.shortMessage || e.message);
  }
}

main().catch(console.error);
