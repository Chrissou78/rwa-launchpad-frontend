// scripts/manual-confirm-payment.ts
import { createClient } from '@supabase/supabase-js';

// FILL THESE FROM YOUR .env.local
const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { error } = await supabase
    .from('kyc_applications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      tx_hash: '0xf4b4d677fc221d301079a83c5221d41e97e3e726a7e9c7710a40a32d224bdc0c'
    })
    .eq('id', '24328f60-5417-4b5c-bfb1-d3084442bcf5');

  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Application approved!');
  }
  
  // Verify
  const { data } = await supabase
    .from('kyc_applications')
    .select('id, status, approved_at, tx_hash')
    .eq('id', '24328f60-5417-4b5c-bfb1-d3084442bcf5')
    .single();
    
  console.log('Updated record:', data);
}

main().catch(console.error);
