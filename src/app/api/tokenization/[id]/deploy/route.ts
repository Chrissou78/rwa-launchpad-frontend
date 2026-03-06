import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const applicationId = params.id;
    const body = await request.json();
    const { txHash, metadataURI, tokenName, tokenSymbol, tokenSupply } = body;

    // Verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'creation_ready') {
      return NextResponse.json({ error: 'Application not ready for deployment' }, { status: 400 });
    }

    // Update application with deployment info
    const { data: updated, error: updateError } = await supabase
      .from('tokenization_applications')
      .update({
        status: 'completed',
        deployment_tx_hash: txHash,
        metadata_uri: metadataURI,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        token_supply: tokenSupply,
        deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add to status history
    await supabase.from('tokenization_status_history').insert({
      application_id: applicationId,
      status: 'completed',
      notes: `Token deployed. TX: ${txHash}`,
      created_by: walletAddress.toLowerCase(),
    });

    return NextResponse.json({
      success: true,
      application: updated,
    });

  } catch (error) {
    console.error('Deploy recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record deployment' },
      { status: 500 }
    );
  }
}
