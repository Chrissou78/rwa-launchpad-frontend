// src/app/api/exchange/ticker/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMexcTicker, getAllMexcTickers } from '@/lib/exchange-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (symbol) {
      const ticker = await getMexcTicker(symbol);
      return NextResponse.json(ticker);
    }
    
    const tickers = await getAllMexcTickers();
    return NextResponse.json({ tickers });
  } catch (error: any) {
    console.error('Error fetching ticker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
