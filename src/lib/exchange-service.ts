// src/lib/exchange-service.ts
import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { EXCHANGE_CONFIG, type TokenSymbol, type PairSymbol } from '@/config/exchange';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const { 
  MEXC_API_KEY, 
  MEXC_SECRET_KEY, 
  MEXC_BASE_URL, 
  MARKUP_PERCENT, 
  PLATFORM_FEE_PERCENT,
  PLATFORM_WALLET,
  PLATFORM_PRIVATE_KEY,
  TOKENS 
} = EXCHANGE_CONFIG;

// Viem clients
const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'),
});

// Platform wallet for sending withdrawals
const getPlatformWallet = () => {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY;
  if (!privateKey) return null;
  
  try {
    return privateKeyToAccount(privateKey as `0x${string}`);
  } catch {
    return null;
  }
};

const getWalletClient = () => {
  const account = getPlatformWallet();
  if (!account) return null;
  
  return createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'),
  });
};

// ERC20 ABI for transfers
const ERC20_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ MEXC API HELPERS ============

function generateSignature(queryString: string): string {
  return crypto
    .createHmac('sha256', MEXC_SECRET_KEY || '')
    .update(queryString)
    .digest('hex');
}

async function mexcRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {},
  signed: boolean = false
): Promise<any> {
  const url = new URL(`${MEXC_BASE_URL}${endpoint}`);
  
  if (signed) {
    params.timestamp = Date.now().toString();
    params.recvWindow = '5000';
  }
  
  const queryString = new URLSearchParams(params).toString();
  
  if (signed && MEXC_SECRET_KEY) {
    params.signature = generateSignature(queryString);
  }
  
  const finalQuery = new URLSearchParams(params).toString();
  
  if (method === 'GET') {
    url.search = finalQuery;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  if (MEXC_API_KEY) {
    headers['X-MEXC-APIKEY'] = MEXC_API_KEY;
  }
  
  const response = await fetch(url.toString(), {
    method,
    headers,
    body: method !== 'GET' ? finalQuery : undefined,
  });
  
  return response.json();
}

// ============ USER BALANCE MANAGEMENT ============

export async function getUserBalance(walletAddress: string, tokenSymbol: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('user_exchange_balances')
    .select('balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  return data?.balance ? parseFloat(data.balance) : 0;
}

export async function getAllUserBalances(walletAddress: string): Promise<{ token: string; balance: number }[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data } = await supabase
    .from('user_exchange_balances')
    .select('token_symbol, balance')
    .eq('wallet_address', normalized)
    .gt('balance', 0);
  
  return (data || []).map(b => ({
    token: b.token_symbol,
    balance: parseFloat(b.balance),
  }));
}

async function updateUserBalance(
  walletAddress: string,
  tokenSymbol: string,
  delta: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data: existing } = await supabase
    .from('user_exchange_balances')
    .select('balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .single();
  
  const currentBalance = existing?.balance ? parseFloat(existing.balance) : 0;
  const newBalance = Math.max(0, currentBalance + delta);
  
  if (existing) {
    await supabase
      .from('user_exchange_balances')
      .update({ balance: newBalance })
      .eq('wallet_address', normalized)
      .eq('token_symbol', tokenSymbol);
  } else {
    await supabase
      .from('user_exchange_balances')
      .insert({
        wallet_address: normalized,
        token_symbol: tokenSymbol,
        balance: newBalance,
      });
  }
}

// ============ DEPOSIT HANDLING ============

export async function confirmDeposit(
  walletAddress: string,
  tokenSymbol: string,
  amount: number,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  const token = TOKENS[tokenSymbol as TokenSymbol];
  
  if (!token) {
    return { success: false, error: 'Invalid token' };
  }
  
  // Check if already processed
  const { data: existing } = await supabase
    .from('exchange_deposits')
    .select('id, status')
    .eq('tx_hash', txHash)
    .single();
  
  if (existing?.status === 'confirmed') {
    return { success: false, error: 'Deposit already confirmed' };
  }
  
  // Verify transaction on-chain
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    
    if (!receipt || receipt.status !== 'success') {
      return { success: false, error: 'Transaction not confirmed on chain' };
    }
  } catch (err) {
    return { success: false, error: 'Could not verify transaction' };
  }
  
  // Record or update deposit
  if (existing) {
    await supabase
      .from('exchange_deposits')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('exchange_deposits')
      .insert({
        wallet_address: normalized,
        token_symbol: tokenSymbol,
        token_address: token.address,
        amount,
        tx_hash: txHash,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      });
  }
  
  // Credit user balance
  await updateUserBalance(normalized, tokenSymbol, amount);
  
  return { success: true };
}

export async function getPendingDeposit(txHash: string): Promise<any> {
  const supabase = getSupabaseAdmin();
  
  const { data } = await supabase
    .from('exchange_deposits')
    .select('*')
    .eq('tx_hash', txHash)
    .single();
  
  return data;
}

// ============ WITHDRAWAL HANDLING ============

export async function requestWithdrawal(
  walletAddress: string,
  tokenSymbol: string,
  amount: number
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  const token = TOKENS[tokenSymbol as TokenSymbol];
  
  if (!token) {
    return { success: false, error: 'Invalid token' };
  }
  
  // Check minimum
  const minAmount = EXCHANGE_CONFIG.MIN_AMOUNTS[tokenSymbol] || 0;
  if (amount < minAmount) {
    return { success: false, error: `Minimum withdrawal is ${minAmount} ${tokenSymbol}` };
  }
  
  // Check balance
  const balance = await getUserBalance(normalized, tokenSymbol);
  if (balance < amount) {
    return { success: false, error: `Insufficient ${tokenSymbol} balance. Available: ${balance.toFixed(4)}` };
  }
  
  // Deduct from balance immediately
  await updateUserBalance(normalized, tokenSymbol, -amount);
  
  // Create withdrawal request
  const { data: withdrawal, error } = await supabase
    .from('exchange_withdrawals')
    .insert({
      wallet_address: normalized,
      token_symbol: tokenSymbol,
      token_address: token.address,
      amount,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error || !withdrawal) {
    // Refund balance on error
    await updateUserBalance(normalized, tokenSymbol, amount);
    return { success: false, error: 'Failed to create withdrawal request' };
  }
  
  // Process withdrawal async
  processWithdrawal(withdrawal.id).catch(err => {
    console.error('Withdrawal processing error:', err);
  });
  
  return { success: true, withdrawalId: withdrawal.id };
}

async function processWithdrawal(withdrawalId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const { data: withdrawal } = await supabase
    .from('exchange_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();
  
  if (!withdrawal || withdrawal.status !== 'pending') {
    return;
  }
  
  await supabase
    .from('exchange_withdrawals')
    .update({ status: 'processing' })
    .eq('id', withdrawalId);
  
  try {
    const walletClient = getWalletClient();
    const platformAccount = getPlatformWallet();
    
    if (!walletClient || !platformAccount) {
      throw new Error('Platform wallet not configured');
    }
    
    const token = TOKENS[withdrawal.token_symbol as TokenSymbol];
    if (!token) {
      throw new Error('Invalid token');
    }
    
    let txHash: string;
    
    if ('isNative' in token && token.isNative) {
      // Send native token (POL/MATIC)
      txHash = await walletClient.sendTransaction({
        to: withdrawal.wallet_address as `0x${string}`,
        value: parseUnits(withdrawal.amount.toString(), token.decimals),
      });
    } else {
      // Send ERC20 token
      txHash = await walletClient.writeContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          withdrawal.wallet_address as `0x${string}`,
          parseUnits(withdrawal.amount.toString(), token.decimals),
        ],
      });
    }
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
    
    if (receipt.status === 'success') {
      await supabase
        .from('exchange_withdrawals')
        .update({
          status: 'completed',
          tx_hash: txHash,
          completed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);
    } else {
      throw new Error('Transaction failed');
    }
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    
    // Refund user balance
    await updateUserBalance(
      withdrawal.wallet_address, 
      withdrawal.token_symbol, 
      parseFloat(withdrawal.amount)
    );
    
    await supabase
      .from('exchange_withdrawals')
      .update({ status: 'failed' })
      .eq('id', withdrawalId);
  }
}

export async function getWithdrawalStatus(withdrawalId: string): Promise<any> {
  const supabase = getSupabaseAdmin();
  
  const { data } = await supabase
    .from('exchange_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();
  
  return data;
}

// ============ TRADING ============

export async function executeTrade(
  walletAddress: string,
  pairSymbol: string,
  side: 'buy' | 'sell',
  quantity: number
): Promise<{
  success: boolean;
  trade?: any;
  error?: string;
}> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const pair = EXCHANGE_CONFIG.PAIRS.find(p => p.symbol === pairSymbol);
  if (!pair) {
    return { success: false, error: 'Invalid trading pair' };
  }
  
  // Get current price from MEXC
  const ticker = await mexcRequest('/api/v3/ticker/price', 'GET', { symbol: pairSymbol });
  if (!ticker.price) {
    return { success: false, error: 'Could not get current price' };
  }
  
  const mexcPrice = parseFloat(ticker.price);
  const markupMultiplier = MARKUP_PERCENT / 100;
  const feeMultiplier = PLATFORM_FEE_PERCENT / 100;
  
  let userPrice: number;
  let requiredToken: string;
  let requiredAmount: number;
  let receivedToken: string;
  let receivedAmount: number;
  let platformRevenue: number;
  
  if (side === 'buy') {
    userPrice = mexcPrice * (1 + markupMultiplier);
    requiredToken = pair.quote;
    const grossCost = quantity * userPrice;
    const fee = grossCost * feeMultiplier;
    requiredAmount = grossCost + fee;
    receivedToken = pair.base;
    receivedAmount = quantity;
    platformRevenue = (quantity * mexcPrice * markupMultiplier) + fee;
  } else {
    userPrice = mexcPrice * (1 - markupMultiplier);
    requiredToken = pair.base;
    requiredAmount = quantity;
    receivedToken = pair.quote;
    const grossReceived = quantity * userPrice;
    const fee = grossReceived * feeMultiplier;
    receivedAmount = grossReceived - fee;
    platformRevenue = (quantity * mexcPrice * markupMultiplier) + fee;
  }
  
  // Check user balance
  const userBalance = await getUserBalance(normalized, requiredToken);
  if (userBalance < requiredAmount) {
    return { 
      success: false, 
      error: `Insufficient ${requiredToken} balance. Required: ${requiredAmount.toFixed(4)}, Available: ${userBalance.toFixed(4)}` 
    };
  }
  
  // Execute on MEXC (only if API keys are configured)
  let mexcOrderId: string | null = null;
  
  if (MEXC_API_KEY && MEXC_SECRET_KEY) {
    const mexcOrder = await mexcRequest('/api/v3/order', 'POST', {
      symbol: pairSymbol,
      side: side.toUpperCase(),
      type: 'MARKET',
      quantity: quantity.toFixed(pair.qtyPrecision),
    }, true);
    
    if (mexcOrder.code && mexcOrder.code !== 200 && mexcOrder.code !== 0) {
      return { success: false, error: mexcOrder.msg || 'MEXC order failed' };
    }
    
    mexcOrderId = mexcOrder.orderId || null;
  }
  
  // Update user balances
  await updateUserBalance(normalized, requiredToken, -requiredAmount);
  await updateUserBalance(normalized, receivedToken, receivedAmount);
  
  // Record trade
  const { data: trade } = await supabase
    .from('exchange_trades')
    .insert({
      wallet_address: normalized,
      pair_symbol: pairSymbol,
      side,
      base_token: pair.base,
      quote_token: pair.quote,
      quantity,
      price: userPrice,
      total: side === 'buy' ? requiredAmount : receivedAmount,
      fee: platformRevenue,
      mexc_order_id: mexcOrderId,
      status: 'completed',
    })
    .select()
    .single();
  
  // Record platform revenue
  if (trade) {
    await supabase
      .from('platform_revenue')
      .insert({
        trade_id: trade.id,
        revenue_type: 'trade_fee',
        amount: platformRevenue,
        token_symbol: pair.quote,
      });
  }
  
  return {
    success: true,
    trade: {
      id: trade?.id,
      side,
      pair: pair.display,
      quantity,
      price: userPrice,
      total: side === 'buy' ? requiredAmount : receivedAmount,
      received: {
        token: receivedToken,
        amount: receivedAmount,
      },
      fee: platformRevenue,
    },
  };
}

// ============ MEXC DATA (Public) ============

export async function getMexcOrderBook(symbol: string, limit: number = 15): Promise<any> {
  try {
    const data = await mexcRequest('/api/v3/depth', 'GET', { symbol, limit: limit.toString() });
    
    if (!data.bids || !data.asks) {
      return { bids: [], asks: [], spread: 0, spreadPercent: 0 };
    }
    
    const markupMultiplier = MARKUP_PERCENT / 100;
    
    const bids = data.bids.map(([price, qty]: [string, string]) => ({
      price: parseFloat(price) * (1 - markupMultiplier),
      quantity: parseFloat(qty),
    }));
    
    const asks = data.asks.map(([price, qty]: [string, string]) => ({
      price: parseFloat(price) * (1 + markupMultiplier),
      quantity: parseFloat(qty),
    }));
    
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    
    return {
      bids,
      asks,
      spread: bestAsk - bestBid,
      spreadPercent: bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0,
    };
  } catch (err) {
    console.error('Error fetching MEXC order book:', err);
    return { bids: [], asks: [], spread: 0, spreadPercent: 0 };
  }
}

export async function getMexcTicker(symbol: string): Promise<any> {
  try {
    const data = await mexcRequest('/api/v3/ticker/24hr', 'GET', { symbol });
    
    return {
      lastPrice: parseFloat(data.lastPrice) || 0,
      priceChange: parseFloat(data.priceChange) || 0,
      priceChangePercent: parseFloat(data.priceChangePercent) * 100 || 0,
      high24h: parseFloat(data.highPrice) || 0,
      low24h: parseFloat(data.lowPrice) || 0,
      volume24h: parseFloat(data.volume) || 0,
    };
  } catch (err) {
    console.error('Error fetching MEXC ticker:', err);
    return {
      lastPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
    };
  }
}

export async function getAllMexcTickers(): Promise<Record<string, any>> {
  const tickers: Record<string, any> = {};
  
  for (const pair of EXCHANGE_CONFIG.PAIRS) {
    tickers[pair.symbol] = await getMexcTicker(pair.symbol);
  }
  
  return tickers;
}

// ============ USER HISTORY ============

export async function getUserTrades(walletAddress: string, limit: number = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  
  const { data } = await supabase
    .from('exchange_trades')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

export async function getUserTransactions(walletAddress: string, limit: number = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data: deposits } = await supabase
    .from('exchange_deposits')
    .select('*')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  const { data: withdrawals } = await supabase
    .from('exchange_withdrawals')
    .select('*')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  const transactions = [
    ...(deposits || []).map(d => ({ ...d, type: 'deposit' })),
    ...(withdrawals || []).map(w => ({ ...w, type: 'withdrawal' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return transactions.slice(0, limit);
}

// ============ PLATFORM STATS ============

export async function getPlatformStats(): Promise<{
  totalRevenue: number;
  totalTrades: number;
  totalVolume: number;
}> {
  const supabase = getSupabaseAdmin();
  
  const { data: revenue } = await supabase
    .from('platform_revenue')
    .select('amount');
  
  const { data: trades } = await supabase
    .from('exchange_trades')
    .select('total');
  
  return {
    totalRevenue: (revenue || []).reduce((sum, r) => sum + parseFloat(r.amount), 0),
    totalTrades: trades?.length || 0,
    totalVolume: (trades || []).reduce((sum, t) => sum + parseFloat(t.total), 0),
  };
}
