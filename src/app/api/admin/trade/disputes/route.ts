// src/app/api/admin/trade/disputes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress || !isAdmin(walletAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('trade_disputes')
      .select(`
        *,
        trade_deals (
          reference,
          title,
          buyer_company,
          seller_company
        )
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      if (status === 'resolved') {
        query = query.like('status', 'resolved%');
      } else {
        query = query.eq('status', status);
      }
    }

    if (search) {
      query = query.or(`id.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: disputes, error, count } = await query;

    if (error) throw error;

    // Format response
    const formattedDisputes = disputes?.map(d => ({
      id: d.id,
      deal_id: d.deal_id,
      deal_reference: d.trade_deals?.reference,
      deal_title: d.trade_deals?.title,
      type: d.type,
      status: d.status,
      initiator: d.initiator,
      initiator_company: d.initiator === d.trade_deals?.buyer_wallet 
        ? d.trade_deals?.buyer_company 
        : d.trade_deals?.seller_company,
      respondent: d.respondent,
      respondent_company: d.respondent === d.trade_deals?.buyer_wallet 
        ? d.trade_deals?.buyer_company 
        : d.trade_deals?.seller_company,
      claimed_amount: d.claimed_amount,
      description: d.description,
      arbiter: d.arbiter,
      created_at: d.created_at,
      updated_at: d.updated_at,
      deadline: d.deadline,
    }));

    return NextResponse.json({
      disputes: formattedDisputes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
  }
}
