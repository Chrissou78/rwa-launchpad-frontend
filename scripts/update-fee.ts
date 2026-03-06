// scripts/update-fee.ts
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const KYC_VERIFIER_ADDRESS = '0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f';
const PRIVATE_KEY = '0x08afeb501bc4de4c2c871f11342b0414fc2ef5dfeb36d70811dd2a1e547597da' as `0x${string}`;

const ABI = [
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

  console.log('=== Update Registration Fee ===\n');

  const oldFee = await publicClient.readContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: ABI,
    functionName: 'registrationFee',
  });
  console.log('Current fee:', Number(oldFee) / 1e18, 'MATIC');

  const newFee = parseEther('0.05');
  console.log('New fee: 0.05 MATIC');

  const hash = await walletClient.writeContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: ABI,
    functionName: 'setRegistrationFee',
    args: [newFee],
  });

  console.log('TX:', hash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status === 'success' ? '✅ SUCCESS' : '❌ FAILED');

  const updatedFee = await publicClient.readContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: ABI,
    functionName: 'registrationFee',
  });
  console.log('Updated fee:', Number(updatedFee) / 1e18, 'MATIC');
}

main().catch(console.error);

