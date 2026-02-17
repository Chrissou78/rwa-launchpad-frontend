// src/app/api/exchange/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllUserBalances } from '@/lib/exchange-service';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    const balances = await getAllUserBalances(walletAddress);
    
    return NextResponse.json({ balances });
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
