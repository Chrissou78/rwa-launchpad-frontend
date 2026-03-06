// src/app/api/tokenization/[id]/resubmit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await request.json();

    // Get existing application
    const { data: existing, error: fetchError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.user_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify status is rejected
    if (existing.status !== 'rejected') {
      return NextResponse.json({ error: 'Only rejected applications can be resubmitted' }, { status: 400 });
    }

    // Update application
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update({
        // Contact info
        legal_entity_name: body.companyName || null,
        contact_name: body.contactName,
        contact_email: body.email,
        contact_phone: body.phone || null,
        website: body.website || null,
        
        // Asset info
        asset_name: body.assetName,
        asset_type: body.assetType,
        asset_description: body.assetDescription,
        estimated_value: parseFloat(String(body.estimatedValue).replace(/[^0-9.]/g, '')) || 0,
        use_case: body.useCase || null,
        
        // Options
        needs_escrow: body.needsEscrow || false,
        needs_dividends: body.needsDividends || false,
        
        // Fee
        fee_amount: body.feeAmount,
        
        // Documents
        documents: { files: body.documents },
        
        // Reset status
        status: 'pending',
        admin_notes: null,
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ error: 'Failed to resubmit application' }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err) {
    console.error('Resubmit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}