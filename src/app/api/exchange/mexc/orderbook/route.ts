// src/app/api/exchange/mexc/orderbook/route.ts
import { NextRequest, NextResponse } from 'next/server';

const MEXC_CONFIG = {
  MARKUP_PERCENT: 0.5,
  SUPPORTED_SYMBOLS: [
    'USDCUSDT',
    'POLUSDT',
    'ETHUSDT',
    'BTCUSDT',
    'SOLUSDT',
    'BNBUSDT',
    'AVAXUSDT',
    'DAIUSDT',
    'AAVEUSDT',
  ],
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const limit = request.nextUrl.searchParams.get('limit') || '30';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  if (!MEXC_CONFIG.SUPPORTED_SYMBOLS.includes(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.mexc.com/api/v3/depth?symbol=${symbol}&limit=${limit}`,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`MEXC API error: ${response.status}`);
    }

    const data = await response.json();
    const markupMultiplier = MEXC_CONFIG.MARKUP_PERCENT / 100;

    const bids = (data.bids || []).map(([price, qty]: [string, string]) => ({
      price: parseFloat(price) * (1 - markupMultiplier),
      quantity: parseFloat(qty),
    }));

    const asks = (data.asks || []).map(([price, qty]: [string, string]) => ({
      price: parseFloat(price) * (1 + markupMultiplier),
      quantity: parseFloat(qty),
    }));

    let bidTotal = 0;
    const bidsWithTotal = bids.map((b: { price: number; quantity: number }) => {
      bidTotal += b.quantity;
      return { ...b, total: bidTotal };
    });

    let askTotal = 0;
    const asksWithTotal = asks.map((a: { price: number; quantity: number }) => {
      askTotal += a.quantity;
      return { ...a, total: askTotal };
    });

    const bestBid = bidsWithTotal[0]?.price || 0;
    const bestAsk = asksWithTotal[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    return NextResponse.json({
      bids: bidsWithTotal,
      asks: asksWithTotal,
      spread,
      spreadPercent,
      lastUpdateId: data.lastUpdateId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching MEXC order book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order book' },
      { status: 500 }
    );
  }
}
