// src/app/api/admin/tokenizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  // Get wallet address from header
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  // Check if user is admin
  const adminCheck = await isAdmin(walletAddress);
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('tokenization_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: applications, error, count } = await query;

    if (error) {
      console.error('Error fetching tokenization applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in admin tokenizations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Get wallet address from header
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  // Check if user is admin
  const adminCheck = await isAdmin(walletAddress);
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { applicationId, status, adminNotes, feeAmount } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Build update object
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    if (feeAmount !== undefined) {
      updateData.fee_amount = feeAmount;
    }

    // Update the application
    const { data, error } = await supabase
      .from('tokenization_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tokenization application:', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Add to history
    await supabase.from('tokenization_history').insert({
      application_id: applicationId,
      action: `Status changed to ${status}`,
      performed_by: walletAddress,
      notes: adminNotes || null,
    });

    return NextResponse.json({ application: data });
  } catch (error) {
    console.error('Error in admin tokenizations PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
