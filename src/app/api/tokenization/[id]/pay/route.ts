import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { txHash, paymentToken } = await request.json();

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify application exists and belongs to user
    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('status')
      .eq('id', id)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'approved') {
      return NextResponse.json({ error: 'Application is not awaiting payment' }, { status: 400 });
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('tokenization_applications')
      .update({
        status: 'creation_ready',
        payment_tx_hash: txHash,
        payment_token: paymentToken || 'USDC',
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Payment confirmed' });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
