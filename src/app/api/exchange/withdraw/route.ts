// src/app/api/exchange/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requestWithdrawal } from '@/lib/exchange-service';
import { EXCHANGE_CONFIG, type TokenSymbol } from '@/config/exchange';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tokenSymbol, amount } = body;
    
    if (!tokenSymbol || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate token
    if (!EXCHANGE_CONFIG.TOKENS[tokenSymbol as TokenSymbol]) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    
    const result = await requestWithdrawal(walletAddress, tokenSymbol, parseFloat(amount));
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Withdrawal initiated', 
      withdrawalId: result.withdrawalId,
      success: true 
    });
  } catch (error: any) {
    console.error('Error requesting withdrawal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
