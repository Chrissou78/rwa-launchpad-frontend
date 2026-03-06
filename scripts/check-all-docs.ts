// scripts/check-all-docs.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Get ALL documents (no filter)
  const { data: allDocs, error } = await supabase
    .from('kyc_documents')
    .select('*');
    
  console.log('All documents in table:', allDocs?.length || 0);
  if (error) console.log('Error:', error);
  if (allDocs) console.log(JSON.stringify(allDocs, null, 2));
  
  // Get recent applications
  const { data: apps } = await supabase
    .from('kyc_applications')
    .select('id, wallet_hash, documents, status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(3);
    
  console.log('\nRecent applications:');
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error);
