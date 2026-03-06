import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const limit = searchParams.get('limit') || '20';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.mexc.com/api/v3/depth?symbol=${symbol}&limit=${limit}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[MEXC OrderBook] Error for ${symbol}:`, error);
      return NextResponse.json({ error: 'Failed to fetch orderbook' }, { status: response.status });
    }

    const data = await response.json();
    
    // MEXC returns: { lastUpdateId, bids: [[price, qty], ...], asks: [[price, qty], ...] }
    return NextResponse.json({
      lastUpdateId: data.lastUpdateId,
      bids: data.bids || [],
      asks: data.asks || [],
    });
  } catch (error) {
    console.error('[MEXC OrderBook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
