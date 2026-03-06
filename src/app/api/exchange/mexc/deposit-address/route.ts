import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MEXC_API_KEY = process.env.MEXC_API_KEY;
const MEXC_API_SECRET = process.env.MEXC_API_SECRET;

// Network mapping for different chains
const NETWORK_MAP: Record<number, Record<string, string>> = {
  // Polygon
  137: { POL: 'MATIC', USDT: 'MATIC', USDC: 'MATIC' },
  80002: { POL: 'MATIC', USDT: 'MATIC', USDC: 'MATIC' },
  // Avalanche
  43114: { AVAX: 'AVAX_CCHAIN', USDT: 'AVAX_CCHAIN', USDC: 'AVAX_CCHAIN' },
  43113: { AVAX: 'AVAX_CCHAIN', USDT: 'AVAX_CCHAIN', USDC: 'AVAX_CCHAIN' },
  // Ethereum
  1: { ETH: 'ETH', USDT: 'ERC20', USDC: 'ERC20' },
  // BSC
  56: { BNB: 'BSC', USDT: 'BEP20', USDC: 'BEP20' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin')?.toUpperCase();
  const chainId = parseInt(searchParams.get('chainId') || '0');

  if (!coin) {
    return NextResponse.json({ error: 'Missing coin parameter' }, { status: 400 });
  }

  if (!MEXC_API_KEY || !MEXC_API_SECRET) {
    return NextResponse.json({ error: 'MEXC API not configured' }, { status: 500 });
  }

  // Get network for this chain and coin
  const network = NETWORK_MAP[chainId]?.[coin];
  if (!network) {
    return NextResponse.json({ 
      error: `Unsupported coin/chain combination: ${coin} on chain ${chainId}` 
    }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const queryString = `coin=${coin}&network=${network}&timestamp=${timestamp}`;
    
    // Create HMAC SHA256 signature
    const signature = crypto
      .createHmac('sha256', MEXC_API_SECRET)
      .update(queryString)
      .digest('hex');

    const response = await fetch(
      `https://api.mexc.com/api/v3/capital/deposit/address?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MEXC-APIKEY': MEXC_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.code) {
      // MEXC API error
      console.error('MEXC API error:', data);
      return NextResponse.json({ 
        error: data.msg || 'Failed to get deposit address' 
      }, { status: 400 });
    }

    if (data.address) {
      return NextResponse.json({
        address: data.address,
        memo: data.memo || null,
        tag: data.tag || null,
        network: network,
        coin: coin,
      });
    }

    return NextResponse.json({ error: 'No address returned' }, { status: 500 });
  } catch (error) {
    console.error('MEXC deposit address error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}