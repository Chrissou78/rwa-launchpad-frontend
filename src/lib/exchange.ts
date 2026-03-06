// src/lib/exchange.ts
import { getSupabaseAdmin } from './supabase';
import type { 
  TradingPair, 
  Order, 
  Trade, 
  OrderBook, 
  OrderBookLevel,
  ExchangeBalance,
  CreateOrderParams,
  TickerData 
} from '@/types/exchange';
import { TRADING_FEE_MULTIPLIER } from '@/types/exchange';

// ============ TRADING PAIRS ============

export async function getTradingPairs(): Promise<TradingPair[]> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('trading_pairs')
    .select('*')
    .eq('is_active', true)
    .order('symbol');
  
  if (error) {
    console.error('Error fetching trading pairs:', error);
    return [];
  }
  
  return data || [];
}

export async function getTradingPair(pairId: string): Promise<TradingPair | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('trading_pairs')
    .select('*')
    .eq('id', pairId)
    .single();
  
  if (error) {
    console.error('Error fetching trading pair:', error);
    return null;
  }
  
  return data;
}

export async function getTradingPairBySymbol(symbol: string): Promise<TradingPair | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('trading_pairs')
    .select('*')
    .eq('symbol', symbol)
    .single();
  
  if (error) {
    console.error('Error fetching trading pair by symbol:', error);
    return null;
  }
  
  return data;
}

// ============ ORDER BOOK ============

export async function getOrderBook(pairId: string, depth: number = 20): Promise<OrderBook> {
  const supabase = getSupabaseAdmin();
  
  // Get buy orders (bids) - highest price first
  const { data: buyOrders } = await supabase
    .from('exchange_orders')
    .select('price, remaining_quantity')
    .eq('pair_id', pairId)
    .eq('side', 'buy')
    .in('status', ['open', 'partial'])
    .not('price', 'is', null)
    .order('price', { ascending: false });
  
  // Get sell orders (asks) - lowest price first
  const { data: sellOrders } = await supabase
    .from('exchange_orders')
    .select('price, remaining_quantity')
    .eq('pair_id', pairId)
    .eq('side', 'sell')
    .in('status', ['open', 'partial'])
    .not('price', 'is', null)
    .order('price', { ascending: true });
  
  // Aggregate orders at each price level
  const bids = aggregateOrders(buyOrders || [], depth);
  const asks = aggregateOrders(sellOrders || [], depth);
  
  // Calculate spread
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
  
  return { bids, asks, spread, spreadPercent };
}

function aggregateOrders(
  orders: { price: number; remaining_quantity: number }[], 
  depth: number
): OrderBookLevel[] {
  const levels = new Map<number, { quantity: number; count: number }>();
  
  for (const order of orders) {
    const price = Number(order.price);
    const existing = levels.get(price) || { quantity: 0, count: 0 };
    existing.quantity += Number(order.remaining_quantity);
    existing.count += 1;
    levels.set(price, existing);
  }
  
  const result: OrderBookLevel[] = [];
  let cumulativeTotal = 0;
  
  for (const [price, { quantity, count }] of levels) {
    cumulativeTotal += quantity;
    result.push({
      price,
      quantity,
      total: cumulativeTotal,
      orderCount: count,
    });
    
    if (result.length >= depth) break;
  }
  
  return result;
}

// ============ ORDERS ============

export async function createOrder(
  walletAddress: string,
  params: CreateOrderParams
): Promise<{ success: boolean; order?: Order; trades?: Trade[]; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get trading pair
  const pair = await getTradingPair(params.pairId);
  if (!pair) {
    return { success: false, error: 'Trading pair not found' };
  }
  
  // Validate order
  if (params.quantity < pair.min_order_size) {
    return { success: false, error: `Minimum order size is ${pair.min_order_size} ${pair.base_token}` };
  }
  
  if (params.orderType === 'limit' && !params.price) {
    return { success: false, error: 'Price is required for limit orders' };
  }
  
  if (params.orderType === 'limit' && params.price && params.price <= 0) {
    return { success: false, error: 'Price must be greater than 0' };
  }
  
  // Check balance
  const requiredToken = params.side === 'buy' ? pair.quote_token : pair.base_token;
  const requiredAmount = params.side === 'buy' 
    ? params.quantity * (params.price || 0) * (1 + TRADING_FEE_MULTIPLIER)
    : params.quantity;
  
  const balance = await getBalance(normalized, requiredToken);
  if (balance.available_balance < requiredAmount) {
    return { success: false, error: `Insufficient ${requiredToken} balance. Required: ${requiredAmount.toFixed(6)}, Available: ${balance.available_balance.toFixed(6)}` };
  }
  
  // Lock the required balance
  await lockBalance(normalized, requiredToken, requiredAmount);
  
  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('exchange_orders')
    .insert({
      pair_id: params.pairId,
      wallet_address: normalized,
      order_type: params.orderType,
      side: params.side,
      price: params.price || null,
      quantity: params.quantity,
      remaining_quantity: params.quantity,
    })
    .select()
    .single();
  
  if (orderError || !order) {
    // Unlock balance on failure
    await unlockBalance(normalized, requiredToken, requiredAmount);
    console.error('Error creating order:', orderError);
    return { success: false, error: 'Failed to create order' };
  }
  
  // Try to match the order
  const trades = await matchOrder(order, pair);
  
  // Refresh order status
  const { data: updatedOrder } = await supabase
    .from('exchange_orders')
    .select('*')
    .eq('id', order.id)
    .single();
  
  return { success: true, order: updatedOrder, trades };
}

async function matchOrder(order: Order, pair: TradingPair): Promise<Trade[]> {
  const supabase = getSupabaseAdmin();
  const trades: Trade[] = [];
  
  // Get matching orders (opposite side)
  const matchSide = order.side === 'buy' ? 'sell' : 'buy';
  
  let query = supabase
    .from('exchange_orders')
    .select('*')
    .eq('pair_id', order.pair_id)
    .eq('side', matchSide)
    .in('status', ['open', 'partial'])
    .neq('wallet_address', order.wallet_address)
    .not('price', 'is', null);
  
  // Price matching logic
  if (order.order_type === 'limit' && order.price) {
    if (order.side === 'buy') {
      // Buy order matches sell orders at or below the buy price
      query = query.lte('price', order.price);
    } else {
      // Sell order matches buy orders at or above the sell price
      query = query.gte('price', order.price);
    }
  }
  
  // Sort: best price first for the taker
  if (order.side === 'buy') {
    query = query.order('price', { ascending: true }); // Lowest sell price first
  } else {
    query = query.order('price', { ascending: false }); // Highest buy price first
  }
  query = query.order('created_at', { ascending: true }); // FIFO for same price
  
  const { data: matchingOrders } = await query;
  
  if (!matchingOrders || matchingOrders.length === 0) {
    return trades;
  }
  
  let remainingQuantity = Number(order.remaining_quantity);
  
  for (const matchOrder of matchingOrders) {
    if (remainingQuantity <= 0) break;
    
    const matchRemaining = Number(matchOrder.remaining_quantity);
    const tradeQuantity = Math.min(remainingQuantity, matchRemaining);
    const tradePrice = Number(matchOrder.price); // Maker price (price improvement for taker)
    const tradeTotal = tradeQuantity * tradePrice;
    
    // Calculate fees (0.1% each side)
    const buyerFee = tradeTotal * TRADING_FEE_MULTIPLIER;
    const sellerFee = tradeQuantity * TRADING_FEE_MULTIPLIER;
    
    // Determine buyer/seller
    const isBuyer = order.side === 'buy';
    const buyerAddress = isBuyer ? order.wallet_address : matchOrder.wallet_address;
    const sellerAddress = isBuyer ? matchOrder.wallet_address : order.wallet_address;
    const buyOrderId = isBuyer ? order.id : matchOrder.id;
    const sellOrderId = isBuyer ? matchOrder.id : order.id;
    
    // Create trade record
    const { data: trade, error: tradeError } = await supabase
      .from('exchange_trades')
      .insert({
        pair_id: order.pair_id,
        buy_order_id: buyOrderId,
        sell_order_id: sellOrderId,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
        price: tradePrice,
        quantity: tradeQuantity,
        total: tradeTotal,
        buyer_fee: buyerFee,
        seller_fee: sellerFee,
      })
      .select()
      .single();
    
    if (tradeError) {
      console.error('Error creating trade:', tradeError);
      continue;
    }
    
    if (trade) {
      trades.push(trade);
    }
    
    // Update order quantities
    const newOrderRemaining = remainingQuantity - tradeQuantity;
    const newMatchRemaining = matchRemaining - tradeQuantity;
    
    // Update taker order (current order)
    await supabase
      .from('exchange_orders')
      .update({
        filled_quantity: Number(order.quantity) - newOrderRemaining,
        remaining_quantity: newOrderRemaining,
        status: newOrderRemaining <= 0 ? 'filled' : 'partial',
      })
      .eq('id', order.id);
    
    // Update maker order (matched order)
    await supabase
      .from('exchange_orders')
      .update({
        filled_quantity: Number(matchOrder.quantity) - newMatchRemaining,
        remaining_quantity: newMatchRemaining,
        status: newMatchRemaining <= 0 ? 'filled' : 'partial',
      })
      .eq('id', matchOrder.id);
    
    // Settle balances
    await settleTradeBalances(
      buyerAddress,
      sellerAddress,
      pair,
      tradeQuantity,
      tradeTotal,
      buyerFee,
      sellerFee
    );
    
    remainingQuantity = newOrderRemaining;
  }
  
  return trades;
}

async function settleTradeBalances(
  buyerAddress: string,
  sellerAddress: string,
  pair: TradingPair,
  quantity: number,
  total: number,
  buyerFee: number,
  sellerFee: number
): Promise<void> {
  // Buyer: unlock quote token, deduct total + fee, receive base token
  await unlockBalance(buyerAddress, pair.quote_token, total * (1 + TRADING_FEE_MULTIPLIER));
  await deductBalance(buyerAddress, pair.quote_token, total + buyerFee);
  await addBalance(buyerAddress, pair.base_token, pair.base_token_address, quantity);
  
  // Seller: unlock base token, deduct quantity, receive quote token minus fee
  await unlockBalance(sellerAddress, pair.base_token, quantity);
  await deductBalance(sellerAddress, pair.base_token, quantity);
  await addBalance(sellerAddress, pair.quote_token, pair.quote_token_address, total - sellerFee);
}

export async function cancelOrder(
  walletAddress: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get the order with pair info
  const { data: order } = await supabase
    .from('exchange_orders')
    .select('*, trading_pairs(*)')
    .eq('id', orderId)
    .eq('wallet_address', normalized)
    .single();
  
  if (!order) {
    return { success: false, error: 'Order not found' };
  }
  
  if (order.status === 'filled' || order.status === 'cancelled') {
    return { success: false, error: 'Order cannot be cancelled' };
  }
  
  // Calculate locked amount to unlock
  const pair = order.trading_pairs as TradingPair;
  const unlockedToken = order.side === 'buy' ? pair.quote_token : pair.base_token;
  const unlockedAmount = order.side === 'buy'
    ? Number(order.remaining_quantity) * Number(order.price) * (1 + TRADING_FEE_MULTIPLIER)
    : Number(order.remaining_quantity);
  
  // Update order status
  const { error } = await supabase
    .from('exchange_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);
  
  if (error) {
    console.error('Error cancelling order:', error);
    return { success: false, error: 'Failed to cancel order' };
  }
  
  // Unlock balance
  await unlockBalance(normalized, unlockedToken, unlockedAmount);
  
  return { success: true };
}

export async function getUserOrders(
  walletAddress: string,
  pairId?: string,
  status?: 'open' | 'history'
): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  let query = supabase
    .from('exchange_orders')
    .select('*, trading_pairs(symbol)')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false });
  
  if (pairId) {
    query = query.eq('pair_id', pairId);
  }
  
  if (status === 'open') {
    query = query.in('status', ['open', 'partial']);
  } else if (status === 'history') {
    query = query.in('status', ['filled', 'cancelled']);
  }
  
  const { data } = await query.limit(100);
  
  return data || [];
}

// ============ TRADES ============

export async function getRecentTrades(pairId: string, limit: number = 50): Promise<Trade[]> {
  const supabase = getSupabaseAdmin();
  
  const { data } = await supabase
    .from('exchange_trades')
    .select('*')
    .eq('pair_id', pairId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

export async function getUserTrades(walletAddress: string, limit: number = 100): Promise<Trade[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('exchange_trades')
    .select('*, trading_pairs(symbol)')
    .or(`buyer_address.eq.${normalized},seller_address.eq.${normalized}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

// ============ TICKER / STATS ============

export async function getTicker(pairId: string): Promise<TickerData | null> {
  const supabase = getSupabaseAdmin();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Get pair info
  const pair = await getTradingPair(pairId);
  if (!pair) return null;
  
  // Get 24h trades
  const { data: trades } = await supabase
    .from('exchange_trades')
    .select('price, quantity, total, created_at')
    .eq('pair_id', pairId)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: true });
  
  if (!trades || trades.length === 0) {
    // Get last trade ever for last price
    const { data: lastTrade } = await supabase
      .from('exchange_trades')
      .select('price')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return {
      pair: pair.symbol,
      lastPrice: lastTrade ? Number(lastTrade.price) : 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      quoteVolume24h: 0,
    };
  }
  
  const prices = trades.map(t => Number(t.price));
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange24h = lastPrice - firstPrice;
  const priceChangePercent24h = firstPrice > 0 ? (priceChange24h / firstPrice) * 100 : 0;
  
  return {
    pair: pair.symbol,
    lastPrice,
    priceChange24h,
    priceChangePercent24h,
    high24h: Math.max(...prices),
    low24h: Math.min(...prices),
    volume24h: trades.reduce((sum, t) => sum + Number(t.quantity), 0),
    quoteVolume24h: trades.reduce((sum, t) => sum + Number(t.total), 0),
  };
}

export async function getAllTickers(): Promise<TickerData[]> {
  const pairs = await getTradingPairs();
  const tickers: TickerData[] = [];
  
  for (const pair of pairs) {
    const ticker = await getTicker(pair.id);
    if (ticker) {
      tickers.push(ticker);
    }
  }
  
  return tickers;
}

// ============ BALANCES ============

export async function getBalance(walletAddress: string, tokenSymbol: string): Promise<ExchangeBalance> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('exchange_balances')
    .select('*')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  if (!data) {
    return {
      token_symbol: tokenSymbol,
      token_address: '',
      available_balance: 0,
      locked_balance: 0,
      total_balance: 0,
    };
  }
  
  return {
    ...data,
    available_balance: Number(data.available_balance),
    locked_balance: Number(data.locked_balance),
    total_balance: Number(data.available_balance) + Number(data.locked_balance),
  };
}

export async function getAllBalances(walletAddress: string): Promise<ExchangeBalance[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('exchange_balances')
    .select('*')
    .eq('wallet_address', normalized)
    .gt('available_balance', 0)
    .or('locked_balance.gt.0');
  
  return (data || []).map(b => ({
    ...b,
    available_balance: Number(b.available_balance),
    locked_balance: Number(b.locked_balance),
    total_balance: Number(b.available_balance) + Number(b.locked_balance),
  }));
}

async function lockBalance(walletAddress: string, tokenSymbol: string, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get current balance
  const { data: current } = await supabase
    .from('exchange_balances')
    .select('available_balance, locked_balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  if (!current) return;
  
  const newAvailable = Number(current.available_balance) - amount;
  const newLocked = Number(current.locked_balance) + amount;
  
  await supabase
    .from('exchange_balances')
    .update({
      available_balance: newAvailable,
      locked_balance: newLocked,
    })
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol);
}

async function unlockBalance(walletAddress: string, tokenSymbol: string, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get current balance
  const { data: current } = await supabase
    .from('exchange_balances')
    .select('available_balance, locked_balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  if (!current) return;
  
  const newAvailable = Number(current.available_balance) + amount;
  const newLocked = Math.max(0, Number(current.locked_balance) - amount);
  
  await supabase
    .from('exchange_balances')
    .update({
      available_balance: newAvailable,
      locked_balance: newLocked,
    })
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol);
}

async function addBalance(
  walletAddress: string, 
  tokenSymbol: string, 
  tokenAddress: string,
  amount: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Upsert balance
  const { data: existing } = await supabase
    .from('exchange_balances')
    .select('available_balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  if (existing) {
    await supabase
      .from('exchange_balances')
      .update({
        available_balance: Number(existing.available_balance) + amount,
      })
      .eq('wallet_address', normalized)
      .eq('token_symbol', tokenSymbol);
  } else {
    await supabase
      .from('exchange_balances')
      .insert({
        wallet_address: normalized,
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        available_balance: amount,
        locked_balance: 0,
      });
  }
}

async function deductBalance(walletAddress: string, tokenSymbol: string, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data: current } = await supabase
    .from('exchange_balances')
    .select('available_balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  if (!current) return;
  
  const newBalance = Math.max(0, Number(current.available_balance) - amount);
  
  await supabase
    .from('exchange_balances')
    .update({ available_balance: newBalance })
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol);
}

// ============ DEPOSITS & WITHDRAWALS ============

export async function recordDeposit(
  walletAddress: string,
  tokenSymbol: string,
  tokenAddress: string,
  amount: number,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Check if deposit already recorded
  const { data: existing } = await supabase
    .from('exchange_transactions')
    .select('id')
    .eq('tx_hash', txHash)
    .single();
  
  if (existing) {
    return { success: false, error: 'Deposit already recorded' };
  }
  
  // Record the transaction
  const { error: txError } = await supabase
    .from('exchange_transactions')
    .insert({
      wallet_address: normalized,
      token_symbol: tokenSymbol,
      token_address: tokenAddress,
      tx_type: 'deposit',
      amount,
      tx_hash: txHash,
      status: 'confirmed',
    });
  
  if (txError) {
    console.error('Error recording deposit:', txError);
    return { success: false, error: 'Failed to record deposit' };
  }
  
  // Add to available balance
  await addBalance(normalized, tokenSymbol, tokenAddress, amount);
  
  return { success: true };
}

export async function requestWithdrawal(
  walletAddress: string,
  tokenSymbol: string,
  tokenAddress: string,
  amount: number
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Check available balance
  const balance = await getBalance(normalized, tokenSymbol);
  if (balance.available_balance < amount) {
    return { success: false, error: `Insufficient ${tokenSymbol} balance` };
  }
  
  // Lock the withdrawal amount
  await lockBalance(normalized, tokenSymbol, amount);
  
  // Create withdrawal request
  const { data: withdrawal, error } = await supabase
    .from('exchange_transactions')
    .insert({
      wallet_address: normalized,
      token_symbol: tokenSymbol,
      token_address: tokenAddress,
      tx_type: 'withdrawal',
      amount,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error || !withdrawal) {
    // Unlock on failure
    await unlockBalance(normalized, tokenSymbol, amount);
    console.error('Error creating withdrawal:', error);
    return { success: false, error: 'Failed to create withdrawal request' };
  }
  
  return { success: true, withdrawalId: withdrawal.id };
}

export async function confirmWithdrawal(
  withdrawalId: string,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  
  // Get withdrawal
  const { data: withdrawal } = await supabase
    .from('exchange_transactions')
    .select('*')
    .eq('id', withdrawalId)
    .eq('tx_type', 'withdrawal')
    .eq('status', 'pending')
    .single();
  
  if (!withdrawal) {
    return { success: false, error: 'Withdrawal not found' };
  }
  
  // Update status
  const { error } = await supabase
    .from('exchange_transactions')
    .update({
      status: 'confirmed',
      tx_hash: txHash,
    })
    .eq('id', withdrawalId);
  
  if (error) {
    return { success: false, error: 'Failed to confirm withdrawal' };
  }
  
  // Deduct from locked balance
  await supabase
    .from('exchange_balances')
    .update({
      locked_balance: 0, // Will be properly calculated
    })
    .eq('wallet_address', withdrawal.wallet_address)
    .eq('token_symbol', withdrawal.token_symbol);
  
  // Actually deduct the balance
  const { data: current } = await supabase
    .from('exchange_balances')
    .select('locked_balance')
    .eq('wallet_address', withdrawal.wallet_address)
    .eq('token_symbol', withdrawal.token_symbol)
    .single();
  
  if (current) {
    await supabase
      .from('exchange_balances')
      .update({
        locked_balance: Math.max(0, Number(current.locked_balance) - Number(withdrawal.amount)),
      })
      .eq('wallet_address', withdrawal.wallet_address)
      .eq('token_symbol', withdrawal.token_symbol);
  }
  
  return { success: true };
}

export async function getTransactionHistory(
  walletAddress: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('exchange_transactions')
    .select('*')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}
