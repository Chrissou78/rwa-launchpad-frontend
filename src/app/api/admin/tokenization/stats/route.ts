// src/app/api/admin/tokenization/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  const adminCheck = await isAdmin(walletAddress);
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get counts by status
    const { data: statusCounts, error } = await supabase
      .from('tokenization_applications')
      .select('status');

    if (error) {
      throw error;
    }

    const stats = {
      total: statusCounts?.length || 0,
      pending: statusCounts?.filter(s => s.status === 'pending' || s.status === 'under_review').length || 0,
      approved: statusCounts?.filter(s => s.status === 'approved' || s.status === 'payment_pending' || s.status === 'payment_confirmed' || s.status === 'creation_ready').length || 0,
      completed: statusCounts?.filter(s => s.status === 'completed').length || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching tokenization stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}