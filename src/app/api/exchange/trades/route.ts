// src/app/api/exchange/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRecentTrades, getUserTrades } from '@/lib/exchange';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId');
    const walletAddress = request.headers.get('x-wallet-address');
    const userOnly = searchParams.get('userOnly') === 'true';
    
    if (userOnly && walletAddress) {
      const trades = await getUserTrades(walletAddress);
      return NextResponse.json({ trades });
    }
    
    if (!pairId) {
      return NextResponse.json({ error: 'pairId is required' }, { status: 400 });
    }
    
    const trades = await getRecentTrades(pairId);
    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
