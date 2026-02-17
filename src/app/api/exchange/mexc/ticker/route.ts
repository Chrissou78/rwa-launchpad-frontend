// src/app/api/exchange/mexc/ticker/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_SYMBOLS = [
  'USDCUSDT',
  'POLUSDT',
  'ETHUSDT',
  'BTCUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'AVAXUSDT',
  'DAIUSDT',
  'AAVEUSDT',
];

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  try {
    if (symbol) {
      if (!SUPPORTED_SYMBOLS.includes(symbol)) {
        return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
      }

      const response = await fetch(
        `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`MEXC API error: ${response.status}`);
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

    const tickerPromises = SUPPORTED_SYMBOLS.map(async (sym) => {
      try {
        const response = await fetch(
          `https://api.mexc.com/api/v3/ticker/24hr?symbol=${sym}`,
          { cache: 'no-store' }
        );

        if (response.ok) {
          const data = await response.json();
          return {
            symbol: sym,
            data: {
              symbol: data.symbol,
              lastPrice: parseFloat(data.lastPrice) || 0,
              priceChange: parseFloat(data.priceChange) || 0,
              priceChangePercent: parseFloat(data.priceChangePercent) * 100 || 0,
              high24h: parseFloat(data.highPrice) || 0,
              low24h: parseFloat(data.lowPrice) || 0,
              volume24h: parseFloat(data.volume) || 0,
              quoteVolume: parseFloat(data.quoteVolume) || 0,
            },
          };
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(tickerPromises);
    const tickers: Record<string, any> = {};
    
    results.forEach((result) => {
      if (result) {
        tickers[result.symbol] = result.data;
      }
    });

    return NextResponse.json({
      tickers,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching MEXC ticker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker' },
      { status: 500 }
    );
  }
}
