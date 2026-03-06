// scripts/check-docs.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ummmwtvvczvecfslqakp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbW13dHZ2Y3p2ZWNmc2xxYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4ODE5NCwiZXhwIjoyMDg1ODY0MTk0fQ.dvqWNPHlIY40YnV5LnH0Ofh8PCGsKISd0qBUY90xtpA';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data: docs } = await supabase
    .from('kyc_documents')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(10);
    
  console.log('Recent documents:', JSON.stringify(docs, null, 2));
  
  const { data: apps } = await supabase
    .from('kyc_applications')
    .select('id, documents, status')
    .order('submitted_at', { ascending: false })
    .limit(5);
    
  console.log('\nRecent applications:', JSON.stringify(apps, null, 2));
}

main().catch(console.error);
