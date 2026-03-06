// src/app/api/exchange/mexc/trade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeMexcMarketOrder, calculatePlatformRevenue, getMexcTicker } from '@/lib/mexc';
import { MEXC_CONFIG, type MexcPairSymbol } from '@/config/mexc';
import { getSupabaseAdmin } from '@/lib/supabase';

// Platform MEXC API credentials (store in env)
const PLATFORM_API_KEY = process.env.MEXC_API_KEY!;
const PLATFORM_SECRET_KEY = process.env.MEXC_SECRET_KEY!;

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { symbol, side, quantity } = body;
    
    // Validate inputs
    if (!symbol || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const validPair = MEXC_CONFIG.SUPPORTED_PAIRS.find(p => p.symbol === symbol);
    if (!validPair) {
      return NextResponse.json({ error: 'Invalid trading pair' }, { status: 400 });
    }
    
    const config = MEXC_CONFIG.PAIR_CONFIG[symbol as MexcPairSymbol];
    if (quantity < config.minQty) {
      return NextResponse.json({ 
        error: `Minimum quantity is ${config.minQty} ${validPair.base}` 
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const normalized = walletAddress.toLowerCase();
    
    // Check user balance
    const requiredToken = side === 'buy' ? validPair.quote : validPair.base;
    const { data: balance } = await supabase
      .from('exchange_balances')
      .select('available_balance')
      .eq('wallet_address', normalized)
      .eq('token_symbol', requiredToken)
      .single();
    
    // Get current price for balance check
    const ticker = await getMexcTicker(symbol as MexcPairSymbol);
    const estimatedCost = side === 'buy' 
      ? quantity * ticker.askPrice * 1.01 // Add 1% buffer for slippage
      : quantity;
    
    if (!balance || balance.available_balance < estimatedCost) {
      return NextResponse.json({ 
        error: `Insufficient ${requiredToken} balance. Required: ~${estimatedCost.toFixed(4)}` 
      }, { status: 400 });
    }
    
    // Lock user's balance
    await supabase
      .from('exchange_balances')
      .update({
        available_balance: balance.available_balance - estimatedCost,
        locked_balance: estimatedCost,
      })
      .eq('wallet_address', normalized)
      .eq('token_symbol', requiredToken);
    
    // Execute order on MEXC
    const result = await executeMexcMarketOrder(
      symbol as MexcPairSymbol,
      side.toUpperCase() as 'BUY' | 'SELL',
      quantity,
      PLATFORM_API_KEY,
      PLATFORM_SECRET_KEY
    );
    
    if (!result.success) {
      // Unlock balance on failure
      await supabase
        .from('exchange_balances')
        .update({
          available_balance: balance.available_balance,
          locked_balance: 0,
        })
        .eq('wallet_address', normalized)
        .eq('token_symbol', requiredToken);
      
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // Calculate platform revenue
    const revenue = calculatePlatformRevenue(result.executedQty!, result.executedPrice!);
    
    // Update user balances
    const receivedToken = side === 'buy' ? validPair.base : validPair.quote;
    const receivedAmount = side === 'buy' 
      ? result.executedQty! 
      : result.executedQty! * result.executedPrice! - revenue.totalRevenue;
    
    // Deduct from locked balance
    await supabase
      .from('exchange_balances')
      .update({ locked_balance: 0 })
      .eq('wallet_address', normalized)
      .eq('token_symbol', requiredToken);
    
    // Add received tokens
    const { data: existingReceived } = await supabase
      .from('exchange_balances')
      .select('available_balance')
      .eq('wallet_address', normalized)
      .eq('token_symbol', receivedToken)
      .single();
    
    if (existingReceived) {
      await supabase
        .from('exchange_balances')
        .update({ 
          available_balance: existingReceived.available_balance + receivedAmount 
        })
        .eq('wallet_address', normalized)
        .eq('token_symbol', receivedToken);
    } else {
      await supabase
        .from('exchange_balances')
        .insert({
          wallet_address: normalized,
          token_symbol: receivedToken,
          token_address: '', // Will be filled based on token
          available_balance: receivedAmount,
          locked_balance: 0,
        });
    }
    
    // Record trade in database
    await supabase
      .from('mexc_trades')
      .insert({
        wallet_address: normalized,
        symbol,
        side,
        quantity: result.executedQty,
        price: result.executedPrice,
        total: result.executedQty! * result.executedPrice!,
        mexc_order_id: result.orderId,
        platform_revenue: revenue.totalRevenue,
        markup_revenue: revenue.markupRevenue,
        fee_revenue: revenue.feeRevenue,
      });
    
    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      executedQty: result.executedQty,
      executedPrice: result.executedPrice,
      total: result.executedQty! * result.executedPrice!,
      received: {
        token: receivedToken,
        amount: receivedAmount,
      },
      fees: {
        markup: revenue.markupRevenue,
        platformFee: revenue.feeRevenue,
        total: revenue.totalRevenue,
      },
    });
  } catch (error: any) {
    console.error('Error executing MEXC trade:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute trade' },
      { status: 500 }
    );
  }
}
