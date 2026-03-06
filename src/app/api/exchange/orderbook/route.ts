// src/app/api/exchange/orderbook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMexcOrderBook } from '@/lib/exchange-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '15');
    
    if (!symbol) {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 });
    }
    
    const orderBook = await getMexcOrderBook(symbol, limit);
    
    return NextResponse.json(orderBook);
  } catch (error: any) {
    console.error('Error fetching order book:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
