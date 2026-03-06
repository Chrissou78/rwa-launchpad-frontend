// src/app/api/admin/trade/disputes/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress || !isAdmin(walletAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total disputes count
    const { count: total } = await supabase
      .from('trade_disputes')
      .select('*', { count: 'exact', head: true });

    // Get pending disputes (submitted, under_review, evidence_requested)
    const { count: pending } = await supabase
      .from('trade_disputes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review', 'evidence_requested']);

    // Get disputes in mediation
    const { count: inMediation } = await supabase
      .from('trade_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'mediation');

    // Get disputes in arbitration
    const { count: inArbitration } = await supabase
      .from('trade_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'arbitration');

    // Get resolved disputes
    const { count: resolved } = await supabase
      .from('trade_disputes')
      .select('*', { count: 'exact', head: true })
      .like('status', 'resolved%');

    // Get total value at risk
    const { data: valueData } = await supabase
      .from('trade_disputes')
      .select('claimed_amount, status')
      .not('status', 'like', 'resolved%')
      .not('status', 'eq', 'withdrawn');

    let totalValue = 0;
    valueData?.forEach(d => {
      totalValue += d.claimed_amount || 0;
    });

    return NextResponse.json({
      total: total || 0,
      pending: pending || 0,
      inMediation: inMediation || 0,
      inArbitration: inArbitration || 0,
      resolved: resolved || 0,
      totalValue,
    });
  } catch (error) {
    console.error('Error fetching dispute stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
