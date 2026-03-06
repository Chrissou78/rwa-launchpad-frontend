import { createPublicClient, http, formatEther, decodeErrorResult } from 'viem';
import { polygonAmoy } from 'viem/chains';

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const KYC_VERIFIER_ADDRESS = '0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f';
const WALLET = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';

// Common custom errors - add your contract's errors here
const ERROR_ABI = [
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  { type: 'error', name: 'AlreadyRegistered', inputs: [] },
  { type: 'error', name: 'InvalidLevel', inputs: [] },
  { type: 'error', name: 'ExpiredProof', inputs: [] },
  { type: 'error', name: 'InsufficientFee', inputs: [] },
  { type: 'error', name: 'Unauthorized', inputs: [] },
] as const;

const KYC_VERIFIER_ABI = [
  {
    name: 'kycRecords',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'level', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
    ],
  },
  {
    name: 'trustedSigner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
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
  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });

  console.log('=== Contract Debug ===\n');

  // Decode error
  console.log('--- Error Decoding ---');
  console.log('Error signature: 0x3a81d6fc');
  
  try {
    const decoded = decodeErrorResult({
      abi: ERROR_ABI,
      data: '0x3a81d6fc',
    });
    console.log('Decoded error:', decoded);
  } catch {
    console.log('Could not decode with known errors');
    console.log('Keccak256 hash matches:');
    console.log('  InvalidSignature: 0x8baa579f');
    console.log('  Check your contract source for error 0x3a81d6fc');
  }

  // Check contract state
  console.log('\n--- Contract State ---');
  
  const fee = await publicClient.readContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: KYC_VERIFIER_ABI,
    functionName: 'registrationFee',
  });
  console.log('Registration fee:', formatEther(fee), 'MATIC');

  const signer = await publicClient.readContract({
    address: KYC_VERIFIER_ADDRESS,
    abi: KYC_VERIFIER_ABI,
    functionName: 'trustedSigner',
  });
  console.log('Trusted signer:', signer);

  try {
    const record = await publicClient.readContract({
      address: KYC_VERIFIER_ADDRESS,
      abi: KYC_VERIFIER_ABI,
      functionName: 'kycRecords',
      args: [WALLET],
    });
    console.log('Current KYC record:');
    console.log('  Level:', record[0]);
    console.log('  Country:', record[1]);
    console.log('  Expiry:', new Date(Number(record[2]) * 1000).toISOString());
  } catch (e: any) {
    console.log('Could not read kycRecords');
  }

  console.log('\n--- Analysis ---');
  console.log('Wallet:', WALLET);
  console.log('Trusted signer should match VERIFIER_PRIVATE_KEY address');
}

main().catch(console.error);
