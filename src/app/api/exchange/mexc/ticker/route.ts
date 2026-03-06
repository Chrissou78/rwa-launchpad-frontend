// src/app/api/exchange/mexc/ticker/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  try {
    if (symbol) {
      // Basic validation - must end with USDT and be reasonable length
      if (!symbol.endsWith('USDT') || symbol.length < 5 || symbol.length > 15) {
        return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 });
      }

      const response = await fetch(
        `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }

      const data = await response.json();

      return NextResponse.json({
        symbol: data.symbol,
        lastPrice: parseFloat(data.lastPrice) || 0,
        priceChange: parseFloat(data.priceChange) || 0,
        priceChangePercent: parseFloat(data.priceChangePercent) * 100 || 0,
        high24h: parseFloat(data.highPrice) || 0,
        low24h: parseFloat(data.lowPrice) || 0,
        volume24h: parseFloat(data.volume) || 0,
        quoteVolume: parseFloat(data.quoteVolume) || 0,
        timestamp: Date.now(),
      });
    }

    // If no symbol provided, return error (or you could return all tickers)
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching MEXC ticker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker' },
      { status: 500 }
    );
  }
}
