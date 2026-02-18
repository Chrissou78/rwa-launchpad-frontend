// src/app/api/admin/trade/deals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
    const kycLevel = searchParams.get('kycLevel');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('trade_deals')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('stage', status);
    }

    if (search) {
      query = query.or(`reference.ilike.%${search}%,title.ilike.%${search}%,buyer_company.ilike.%${search}%,seller_company.ilike.%${search}%`);
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: deals, error, count } = await query;

    if (error) throw error;

    // Get KYC levels for all parties
    const wallets = new Set<string>();
    deals?.forEach(d => {
      wallets.add(d.buyer_wallet);
      wallets.add(d.seller_wallet);
    });

    const { data: kycData } = await supabase
      .from('trade_kyc')
      .select('wallet_address, verification_level, status')
      .in('wallet_address', Array.from(wallets));

    const kycMap = new Map();
    kycData?.forEach(k => {
      let level = 'none';
      if (k.status === 'verified') {
        const levels = ['none', 'bronze', 'silver', 'gold', 'diamond'];
        level = levels[k.verification_level] || 'bronze';
      }
      kycMap.set(k.wallet_address, level);
    });

    // Enrich deals with KYC levels
    const enrichedDeals = deals?.map(d => ({
      ...d,
      buyer_kyc_level: kycMap.get(d.buyer_wallet) || 'none',
      seller_kyc_level: kycMap.get(d.seller_wallet) || 'none',
    }));

    // Filter by KYC level if specified
    let filteredDeals = enrichedDeals;
    if (kycLevel && kycLevel !== 'all') {
      filteredDeals = enrichedDeals?.filter(d => 
        d.buyer_kyc_level === kycLevel || d.seller_kyc_level === kycLevel
      );
    }

    return NextResponse.json({
      deals: filteredDeals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}
