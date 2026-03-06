// scripts/check-app-status.ts
import { createClient } from '@supabase/supabase-js';
import { keccak256, toHex } from 'viem';

const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA';

const KYC_WALLET_HASH_SECRET = 'another-secret-for-wallet-hashing';
const WALLET = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';

async function main() {
  console.log('=== Checking KYC Applications ===\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const walletHash = keccak256(toHex(`${WALLET.toLowerCase()}:${KYC_WALLET_HASH_SECRET}`));
  
  console.log('Wallet:', WALLET);
  console.log('Wallet Hash:', walletHash);
  
  // Check ALL applications (no filter)
  const { data: allApps, error: allError } = await supabase
    .from('kyc_applications')
    .select('*')
    .limit(10);
  
  console.log('\n--- All Applications (limit 10) ---');
  if (allError) {
    console.log('Error:', allError);
  } else {
    console.log('Count:', allApps?.length || 0);
    if (allApps && allApps.length > 0) {
      allApps.forEach((app, i) => {
        console.log(`\nApp ${i + 1}:`);
        console.log('  ID:', app.id);
        console.log('  Wallet Hash:', app.wallet_hash);
        console.log('  Status:', app.status);
        console.log('  Requested Level:', app.requested_level);
        console.log('  Submitted At:', app.submitted_at);
      });
    }
  }
  
  // Check for this specific wallet
  const { data: walletApps, error: walletError } = await supabase
    .from('kyc_applications')
    .select('*')
    .eq('wallet_hash', walletHash);
  
  console.log('\n--- Applications for this wallet ---');
  if (walletError) {
    console.log('Error:', walletError);
  } else {
    console.log('Count:', walletApps?.length || 0);
    console.log('Data:', JSON.stringify(walletApps, null, 2));
  }
  
  // Check table columns
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'kyc_applications' })
    .select('*');
  
  if (!colError && columns) {
    console.log('\n--- Table Columns ---');
    console.log(columns);
  }
}

main().catch(console.error);