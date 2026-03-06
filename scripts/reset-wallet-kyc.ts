// scripts/reset-wallet-kyc.ts
import { createClient } from '@supabase/supabase-js';
import { keccak256, toHex } from 'viem';

// Your values
const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA';
const KYC_WALLET_HASH_SECRET = 'another-secret-for-wallet-hashing';
const WALLET_ADDRESS = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';

async function main() {
  console.log('=== Reset KYC Data for Wallet ===\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const walletHash = keccak256(
    toHex(`${WALLET_ADDRESS.toLowerCase()}:${KYC_WALLET_HASH_SECRET}`)
  );
  
  console.log('Wallet:', WALLET_ADDRESS);
  console.log('Hash:', walletHash);

  // Delete from kyc_proofs
  const { error: proofErr } = await supabase
    .from('kyc_proofs')
    .delete()
    .eq('wallet_hash', walletHash);
  console.log('kyc_proofs:', proofErr ? `❌ ${proofErr.message}` : '✅ Deleted');

  // Delete from kyc_applications
  const { error: appErr } = await supabase
    .from('kyc_applications')
    .delete()
    .eq('wallet_hash', walletHash);
  console.log('kyc_applications:', appErr ? `❌ ${appErr.message}` : '✅ Deleted');

  // Delete from kyc_documents
  const { error: docErr } = await supabase
    .from('kyc_documents')
    .delete()
    .eq('wallet_hash', walletHash);
  console.log('kyc_documents:', docErr ? `❌ ${docErr.message}` : '✅ Deleted');

  // Delete from linked_wallets
  const { error: linkErr } = await supabase
    .from('linked_wallets')
    .delete()
    .eq('wallet_address', WALLET_ADDRESS.toLowerCase());
  console.log('linked_wallets:', linkErr ? `❌ ${linkErr.message}` : '✅ Deleted');

  console.log('\n✅ Database reset complete!');
  console.log('\nNote: On-chain isRegistered is still true, but contract now allows re-registration.');
}

main().catch(console.error);
