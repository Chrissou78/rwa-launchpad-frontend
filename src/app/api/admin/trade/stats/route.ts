// src/app/api/admin/trade/stats/route.ts
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

    // Get total deals count
    const { count: total } = await supabase
      .from('trade_deals')
      .select('*', { count: 'exact', head: true });

    // Get active deals (not completed or cancelled)
    const { count: active } = await supabase
      .from('trade_deals')
      .select('*', { count: 'exact', head: true })
      .not('stage', 'in', '("completed","cancelled")');

    // Get completed deals
    const { count: completed } = await supabase
      .from('trade_deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'completed');

    // Get disputed deals
    const { count: disputed } = await supabase
      .from('trade_deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'disputed');

    // Get volume stats
    const { data: volumeData } = await supabase
      .from('trade_deals')
      .select('product_total_value, stage, escrow_deposited, escrow_released');

    let totalVolume = 0;
    let pendingVolume = 0;
    let disputedVolume = 0;

    if (volumeData) {
      for (const deal of volumeData) {
        totalVolume += deal.product_total_value || 0;
        
        if (!['completed', 'cancelled'].includes(deal.stage)) {
          pendingVolume += (deal.escrow_deposited || 0) - (deal.escrow_released || 0);
        }
        
        if (deal.stage === 'disputed') {
          disputedVolume += deal.product_total_value || 0;
        }
      }
    }

    const averageDealSize = total && total > 0 ? totalVolume / total : 0;

    return NextResponse.json({
      total: total || 0,
      active: active || 0,
      completed: completed || 0,
      disputed: disputed || 0,
      totalVolume,
      pendingVolume,
      disputedVolume,
      averageDealSize,
    });
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
