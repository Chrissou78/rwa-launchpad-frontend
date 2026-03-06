import { createClient } from '@supabase/supabase-js';
import { keccak256, toHex, getAddress } from 'viem';
import { signTypedData } from 'viem/accounts';

// HARDCODE YOUR VALUES HERE (from .env.local)
const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co'; // Your NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA'; // Your SUPABASE_SERVICE_ROLE_KEY
const VERIFIER_PRIVATE_KEY = '0x08afeb501bc4de4c2c871f11342b0414fc2ef5dfeb36d70811dd2a1e547597da' as `0x${string}`;
const KYC_WALLET_HASH_SECRET = 'another-secret-for-wallet-hashing'; // Your KYC_WALLET_HASH_SECRET
const KYC_VERIFIER_ADDRESS = '0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f';
const CHAIN_ID = 80002;

const WALLET_ADDRESS = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';
const NEW_LEVEL = 3;
const COUNTRY_CODE = 250;

async function main() {
  console.log('=== Generate Level 3 (Gold) Proof ===\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const walletHash = keccak256(
    toHex(`${WALLET_ADDRESS.toLowerCase()}:${KYC_WALLET_HASH_SECRET}`)
  );
  console.log('Wallet:', WALLET_ADDRESS);
  console.log('Wallet Hash:', walletHash);

  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  console.log('Expiry:', new Date(expiry * 1000).toISOString());

  const DOMAIN = {
    name: 'RWA KYC Verifier',
    version: '1',
    chainId: CHAIN_ID,
    verifyingContract: KYC_VERIFIER_ADDRESS as `0x${string}`,
  };

  const KYC_PROOF_TYPES = {
    KYCProof: [
      { name: 'wallet', type: 'address' },
      { name: 'level', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'expiry', type: 'uint256' },
    ],
  } as const;

  console.log('\n--- Signing Proof ---');
  console.log('Level:', NEW_LEVEL);
  console.log('Country:', COUNTRY_CODE);

  const signature = await signTypedData({
    privateKey: VERIFIER_PRIVATE_KEY,
    domain: DOMAIN,
    types: KYC_PROOF_TYPES,
    primaryType: 'KYCProof',
    message: {
      wallet: getAddress(WALLET_ADDRESS),
      level: NEW_LEVEL,
      countryCode: COUNTRY_CODE,
      expiry: BigInt(expiry),
    },
  });

  console.log('Signature:', signature);

  console.log('\n--- Updating Database ---');

  const { error: proofError } = await supabase
    .from('kyc_proofs')
    .upsert({
      wallet_hash: walletHash,
      wallet_address: WALLET_ADDRESS,
      level: NEW_LEVEL,
      country_code: COUNTRY_CODE,
      expiry,
      signature,
      created_at: new Date().toISOString(),
    }, { onConflict: 'wallet_hash' });

  if (proofError) {
    console.log('❌ Failed to update kyc_proofs:', proofError.message);
    return;
  }
  console.log('✅ kyc_proofs updated');

  const { error: appError } = await supabase
    .from('kyc_applications')
    .update({
      status: 'approved',
      current_level: NEW_LEVEL,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_hash', walletHash);

  if (appError) {
    console.log('⚠️ Could not update application:', appError.message);
  } else {
    console.log('✅ Application updated to approved');
  }

  console.log('\n=== Done! ===');
  console.log('Level 3 (Gold) proof generated. Now run the test script.');
}

main().catch(console.error);
