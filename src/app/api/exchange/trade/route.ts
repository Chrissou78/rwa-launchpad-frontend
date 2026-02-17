// src/app/api/exchange/trade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeTrade } from '@/lib/exchange-service';
import { EXCHANGE_CONFIG, type PairSymbol } from '@/config/exchange';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { pairSymbol, side, quantity } = body;
    
    if (!pairSymbol || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate pair
    const pair = EXCHANGE_CONFIG.PAIRS.find(p => p.symbol === pairSymbol);
    if (!pair) {
      return NextResponse.json({ error: 'Invalid trading pair' }, { status: 400 });
    }
    
    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
    }
    
    // Validate quantity
    if (quantity < pair.minQty) {
      return NextResponse.json({ 
        error: `Minimum quantity is ${pair.minQty} ${pair.base}` 
      }, { status: 400 });
    }
    
    const result = await executeTrade(walletAddress, pairSymbol as PairSymbol, side, parseFloat(quantity));
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Trade executed successfully',
      trade: result.trade,
      success: true 
    });
  } catch (error: any) {
    console.error('Error executing trade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
