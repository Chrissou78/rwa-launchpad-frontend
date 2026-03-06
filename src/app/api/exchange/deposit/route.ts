// src/app/api/exchange/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { confirmDeposit, getPendingDeposit } from '@/lib/exchange-service';
import { EXCHANGE_CONFIG, type TokenSymbol } from '@/config/exchange';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tokenSymbol, amount, txHash } = body;
    
    if (!tokenSymbol || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate token
    if (!EXCHANGE_CONFIG.TOKENS[tokenSymbol as TokenSymbol]) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    
    const result = await confirmDeposit(walletAddress, tokenSymbol, parseFloat(amount), txHash);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Deposit confirmed', success: true });
  } catch (error: any) {
    console.error('Error confirming deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');
    
    if (!txHash) {
      return NextResponse.json({ error: 'txHash required' }, { status: 400 });
    }
    
    const deposit = await getPendingDeposit(txHash);
    
    return NextResponse.json({ deposit });
  } catch (error: any) {
    console.error('Error fetching deposit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
