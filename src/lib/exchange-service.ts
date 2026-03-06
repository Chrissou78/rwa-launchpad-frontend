// src/lib/exchange-service.ts
import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { EXCHANGE_CONFIG, type TokenSymbol, type PairSymbol } from '@/config/exchange';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAINS, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { TOKEN_CONFIGS } from '@/config/tokens';

// Import chain definitions from viem
import { 
  avalanche, 
  avalancheFuji, 
  polygon, 
  polygonAmoy,
  mainnet as ethereum,
  sepolia,
  arbitrum,
  base,
  optimism,
  bsc
} from 'viem/chains';

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

// =============================================================================
// CHAIN CONFIGURATION
// =============================================================================

// Map chain IDs to viem chain objects
const VIEM_CHAINS: Record<SupportedChainId, Chain> = {
  43113: avalancheFuji,
  43114: avalanche,
  137: polygon,
  80002: polygonAmoy,
  1: ethereum,
  11155111: sepolia,
  42161: arbitrum,
  8453: base,
  10: optimism,
  56: bsc,
  31337: {
    id: 31337,
    name: 'Hardhat',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  } as Chain,
};

// Get RPC URL for a chain
function getRpcUrl(chainId: SupportedChainId): string {
  const chainInfo = CHAINS[chainId];
  return chainInfo?.rpcUrl || 'http://127.0.0.1:8545';
}

// Get viem chain object
function getViemChain(chainId: SupportedChainId): Chain {
  return VIEM_CHAINS[chainId] || avalancheFuji;
}

// =============================================================================
// VIEM CLIENTS - MULTICHAIN
// =============================================================================

// Cache for public clients per chain
const publicClients: Map<SupportedChainId, ReturnType<typeof createPublicClient>> = new Map();

// Get or create public client for a chain
function getPublicClient(chainId: SupportedChainId) {
  if (!publicClients.has(chainId)) {
    const chain = getViemChain(chainId);
    const rpcUrl = getRpcUrl(chainId);
    
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    
    publicClients.set(chainId, client);
  }
  
  return publicClients.get(chainId)!;
}

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

// Get wallet client for a specific chain
const getWalletClient = (chainId: SupportedChainId) => {
  const account = getPlatformWallet();
  if (!account) return null;
  
  const chain = getViemChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
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

// =============================================================================
// TOKEN HELPERS - MULTICHAIN
// =============================================================================

// Get token info for a specific chain
function getTokenForChain(chainId: SupportedChainId, tokenSymbol: string) {
  const tokenConfig = TOKEN_CONFIGS[chainId];
  if (!tokenConfig) return null;
  
  return tokenConfig.TOKENS[tokenSymbol] || null;
}

// Get token address for a specific chain
function getTokenAddress(chainId: SupportedChainId, tokenSymbol: string): string | null {
  const token = getTokenForChain(chainId, tokenSymbol);
  return token?.address || null;
}

// Get token decimals for a specific chain
function getTokenDecimals(chainId: SupportedChainId, tokenSymbol: string): number {
  const token = getTokenForChain(chainId, tokenSymbol);
  return token?.decimals || 18;
}

// Check if token is native
function isNativeToken(chainId: SupportedChainId, tokenSymbol: string): boolean {
  const token = getTokenForChain(chainId, tokenSymbol);
  return token?.isNative || false;
}

// =============================================================================
// MEXC API HELPERS
// =============================================================================

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

// =============================================================================
// USER BALANCE MANAGEMENT - MULTICHAIN
// =============================================================================

export async function getUserBalance(
  walletAddress: string, 
  tokenSymbol: string,
  chainId?: SupportedChainId
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  let query = supabase
    .from('user_exchange_balances')
    .select('balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol);
  
  // If chainId provided, filter by chain
  if (chainId) {
    query = query.eq('chain_id', chainId);
  }
  
  const { data } = await query.single();
  
  return data?.balance ? parseFloat(data.balance) : 0;
}

export async function getAllUserBalances(
  walletAddress: string,
  chainId?: SupportedChainId
): Promise<{ token: string; balance: number; chainId?: number }[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  let query = supabase
    .from('user_exchange_balances')
    .select('token_symbol, balance, chain_id')
    .eq('wallet_address', normalized)
    .gt('balance', 0);
  
  if (chainId) {
    query = query.eq('chain_id', chainId);
  }
  
  const { data } = await query;
  
  return (data || []).map(b => ({
    token: b.token_symbol,
    balance: parseFloat(b.balance),
    chainId: b.chain_id,
  }));
}

async function updateUserBalance(
  walletAddress: string,
  tokenSymbol: string,
  delta: number,
  chainId: SupportedChainId
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  const { data: existing } = await supabase
    .from('user_exchange_balances')
    .select('balance')
    .eq('wallet_address', normalized)
    .eq('token_symbol', tokenSymbol)
    .eq('chain_id', chainId)
    .single();
  
  const currentBalance = existing?.balance ? parseFloat(existing.balance) : 0;
  const newBalance = Math.max(0, currentBalance + delta);
  
  if (existing) {
    await supabase
      .from('user_exchange_balances')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('wallet_address', normalized)
      .eq('token_symbol', tokenSymbol)
      .eq('chain_id', chainId);
  } else {
    await supabase
      .from('user_exchange_balances')
      .insert({
        wallet_address: normalized,
        token_symbol: tokenSymbol,
        chain_id: chainId,
        balance: newBalance,
      });
  }
}

// =============================================================================
// DEPOSIT HANDLING - MULTICHAIN
// =============================================================================

export async function confirmDeposit(
  walletAddress: string,
  tokenSymbol: string,
  amount: number,
  txHash: string,
  chainId: SupportedChainId
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get token info for this chain
  const token = getTokenForChain(chainId, tokenSymbol);
  if (!token) {
    return { success: false, error: `Token ${tokenSymbol} not supported on chain ${chainId}` };
  }
  
  // Check if already processed
  const { data: existing } = await supabase
    .from('exchange_deposits')
    .select('id, status')
    .eq('tx_hash', txHash)
    .eq('chain_id', chainId)
    .single();
  
  if (existing?.status === 'confirmed') {
    return { success: false, error: 'Deposit already confirmed' };
  }
  
  // Verify transaction on-chain
  try {
    const publicClient = getPublicClient(chainId);
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
        chain_id: chainId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      });
  }
  
  // Credit user balance
  await updateUserBalance(normalized, tokenSymbol, amount, chainId);
  
  return { success: true };
}

export async function getPendingDeposit(txHash: string, chainId?: SupportedChainId): Promise<any> {
  const supabase = getSupabaseAdmin();
  
  let query = supabase
    .from('exchange_deposits')
    .select('*')
    .eq('tx_hash', txHash);
  
  if (chainId) {
    query = query.eq('chain_id', chainId);
  }
  
  const { data } = await query.single();
  
  return data;
}

// =============================================================================
// WITHDRAWAL HANDLING - MULTICHAIN
// =============================================================================

export async function requestWithdrawal(
  walletAddress: string,
  tokenSymbol: string,
  amount: number,
  chainId: SupportedChainId
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  // Get token info for this chain
  const token = getTokenForChain(chainId, tokenSymbol);
  if (!token) {
    return { success: false, error: `Token ${tokenSymbol} not supported on chain ${chainId}` };
  }
  
  // Check minimum
  const minAmount = EXCHANGE_CONFIG.MIN_AMOUNTS[tokenSymbol] || 0;
  if (amount < minAmount) {
    return { success: false, error: `Minimum withdrawal is ${minAmount} ${tokenSymbol}` };
  }
  
  // Check balance
  const balance = await getUserBalance(normalized, tokenSymbol, chainId);
  if (balance < amount) {
    return { success: false, error: `Insufficient ${tokenSymbol} balance. Available: ${balance.toFixed(4)}` };
  }
  
  // Deduct from balance immediately
  await updateUserBalance(normalized, tokenSymbol, -amount, chainId);
  
  // Create withdrawal request
  const { data: withdrawal, error } = await supabase
    .from('exchange_withdrawals')
    .insert({
      wallet_address: normalized,
      token_symbol: tokenSymbol,
      token_address: token.address,
      amount,
      chain_id: chainId,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error || !withdrawal) {
    // Refund balance on error
    await updateUserBalance(normalized, tokenSymbol, amount, chainId);
    return { success: false, error: 'Failed to create withdrawal request' };
  }
  
  // Process withdrawal async
  processWithdrawal(withdrawal.id, chainId).catch(err => {
    console.error('Withdrawal processing error:', err);
  });
  
  return { success: true, withdrawalId: withdrawal.id };
}

async function processWithdrawal(withdrawalId: string, chainId: SupportedChainId): Promise<void> {
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
    const walletClient = getWalletClient(chainId);
    const platformAccount = getPlatformWallet();
    
    if (!walletClient || !platformAccount) {
      throw new Error('Platform wallet not configured');
    }
    
    const tokenSymbol = withdrawal.token_symbol;
    const token = getTokenForChain(chainId, tokenSymbol);
    
    if (!token) {
      throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
    }
    
    let txHash: string;
    
    if (token.isNative) {
      // Send native token
      txHash = await walletClient.sendTransaction({
        to: withdrawal.wallet_address as `0x${string}`,
        value: parseUnits(withdrawal.amount.toString(), token.decimals),
      });
    } else {
      // Send ERC20 token
      txHash = await walletClient.writeContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          withdrawal.wallet_address as `0x${string}`,
          parseUnits(withdrawal.amount.toString(), token.decimals),
        ],
      });
    }
    
    // Wait for confirmation
    const publicClient = getPublicClient(chainId);
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
      parseFloat(withdrawal.amount),
      chainId
    );
    
    await supabase
      .from('exchange_withdrawals')
      .update({ status: 'failed', error_message: err.message })
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

// =============================================================================
// TRADING - MULTICHAIN
// =============================================================================

export async function executeTrade(
  walletAddress: string,
  pairSymbol: string,
  side: 'buy' | 'sell',
  quantity: number,
  chainId: SupportedChainId
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
  
  // Check if tokens are supported on this chain
  const baseToken = getTokenForChain(chainId, pair.base);
  const quoteToken = getTokenForChain(chainId, pair.quote);
  
  if (!baseToken || !quoteToken) {
    return { success: false, error: `Trading pair ${pair.display} not supported on this chain` };
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
  const userBalance = await getUserBalance(normalized, requiredToken, chainId);
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
  await updateUserBalance(normalized, requiredToken, -requiredAmount, chainId);
  await updateUserBalance(normalized, receivedToken, receivedAmount, chainId);
  
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
      chain_id: chainId,
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
        chain_id: chainId,
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
      chainId,
    },
  };
}

// =============================================================================
// MEXC DATA (Public)
// =============================================================================

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

// =============================================================================
// USER HISTORY - MULTICHAIN
// =============================================================================

export async function getUserTrades(
  walletAddress: string, 
  limit: number = 50,
  chainId?: SupportedChainId
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  
  let query = supabase
    .from('exchange_trades')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (chainId) {
    query = query.eq('chain_id', chainId);
  }
  
  const { data } = await query;
  
  return data || [];
}

export async function getUserTransactions(
  walletAddress: string, 
  limit: number = 50,
  chainId?: SupportedChainId
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const normalized = walletAddress.toLowerCase();
  
  let depositsQuery = supabase
    .from('exchange_deposits')
    .select('*')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  let withdrawalsQuery = supabase
    .from('exchange_withdrawals')
    .select('*')
    .eq('wallet_address', normalized)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (chainId) {
    depositsQuery = depositsQuery.eq('chain_id', chainId);
    withdrawalsQuery = withdrawalsQuery.eq('chain_id', chainId);
  }
  
  const { data: deposits } = await depositsQuery;
  const { data: withdrawals } = await withdrawalsQuery;
  
  const transactions = [
    ...(deposits || []).map(d => ({ ...d, type: 'deposit' })),
    ...(withdrawals || []).map(w => ({ ...w, type: 'withdrawal' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return transactions.slice(0, limit);
}

// =============================================================================
// PLATFORM STATS - MULTICHAIN
// =============================================================================

export async function getPlatformStats(chainId?: SupportedChainId): Promise<{
  totalRevenue: number;
  totalTrades: number;
  totalVolume: number;
  byChain?: Record<number, { revenue: number; trades: number; volume: number }>;
}> {
  const supabase = getSupabaseAdmin();
  
  let revenueQuery = supabase.from('platform_revenue').select('amount, chain_id');
  let tradesQuery = supabase.from('exchange_trades').select('total, chain_id');
  
  if (chainId) {
    revenueQuery = revenueQuery.eq('chain_id', chainId);
    tradesQuery = tradesQuery.eq('chain_id', chainId);
  }
  
  const { data: revenue } = await revenueQuery;
  const { data: trades } = await tradesQuery;
  
  // Calculate totals
  const totalRevenue = (revenue || []).reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const totalTrades = trades?.length || 0;
  const totalVolume = (trades || []).reduce((sum, t) => sum + parseFloat(t.total), 0);
  
  // Calculate by chain if not filtering
  let byChain: Record<number, { revenue: number; trades: number; volume: number }> | undefined;
  
  if (!chainId) {
    byChain = {};
    
    for (const r of revenue || []) {
      if (!byChain[r.chain_id]) {
        byChain[r.chain_id] = { revenue: 0, trades: 0, volume: 0 };
      }
      byChain[r.chain_id].revenue += parseFloat(r.amount);
    }
    
    for (const t of trades || []) {
      if (!byChain[t.chain_id]) {
        byChain[t.chain_id] = { revenue: 0, trades: 0, volume: 0 };
      }
      byChain[t.chain_id].trades += 1;
      byChain[t.chain_id].volume += parseFloat(t.total);
    }
  }
  
  return {
    totalRevenue,
    totalTrades,
    totalVolume,
    byChain,
  };
}

// =============================================================================
// CHAIN-SPECIFIC HELPERS
// =============================================================================

// Get supported tokens for a chain's exchange
export function getExchangeTokensForChain(chainId: SupportedChainId): string[] {
  const tokenConfig = TOKEN_CONFIGS[chainId];
  if (!tokenConfig) return [];
  
  // Return tokens that are commonly traded
  const commonTokens = ['USDC', 'USDT', 'WETH', 'WBTC', 'DAI'];
  return Object.keys(tokenConfig.TOKENS).filter(symbol => 
    commonTokens.includes(symbol) || tokenConfig.TOKENS[symbol].isNative
  );
}

// Check if exchange is supported on a chain
export function isExchangeSupportedOnChain(chainId: SupportedChainId): boolean {
  const deployment = DEPLOYMENTS[chainId];
  return deployment?.contracts?.RWASecurityExchange !== undefined && 
         deployment.contracts.RWASecurityExchange !== '0x0000000000000000000000000000000000000000';
}

// Get chain name for display
export function getChainDisplayName(chainId: SupportedChainId): string {
  return CHAINS[chainId]?.name || `Chain ${chainId}`;
}
