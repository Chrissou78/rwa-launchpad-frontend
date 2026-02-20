// src/app/api/tokenization/[id]/cancel/route.ts
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
    const supabase = getSupabaseAdmin();

    const { data: application, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('status')
      .eq('id', id)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!['pending', 'approved'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel application in current status' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('tokenization_applications')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Application cancelled' });
  } catch (error) {
    console.error('Error cancelling application:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
