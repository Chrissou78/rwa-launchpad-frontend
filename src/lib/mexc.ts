// src/lib/mexc.ts
import crypto from 'crypto';
import { MEXC_CONFIG, type MexcPairSymbol } from '@/config/mexc';

const { baseUrl, MARKUP_MULTIPLIER, PLATFORM_FEE_MULTIPLIER } = MEXC_CONFIG;

// ============ TYPES ============

export interface MexcOrderBook {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
}

export interface MexcTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  prevClosePrice: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
}

export interface MexcTrade {
  id: string | null;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface ProcessedOrderBook {
  bids: { price: number; quantity: number; total: number }[];
  asks: { price: number; quantity: number; total: number }[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdateId: number;
}

export interface ProcessedTicker {
  symbol: string;
  displaySymbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

// ============ PUBLIC ENDPOINTS (No Auth) ============

/**
 * Get order book from MEXC with your markup applied
 */
export async function getMexcOrderBook(
  symbol: MexcPairSymbol,
  limit: number = 20,
  applyMarkup: boolean = true
): Promise<ProcessedOrderBook> {
  const response = await fetch(`${baseUrl}/api/v3/depth?symbol=${symbol}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`MEXC API error: ${response.status}`);
  }
  
  const data: MexcOrderBook = await response.json();
  
  // Process bids (buy orders) - apply markup (lower the price users see)
  const bids = data.bids.map(([price, qty]) => {
    const basePrice = parseFloat(price);
    const adjustedPrice = applyMarkup 
      ? basePrice * (1 - MARKUP_MULTIPLIER) 
      : basePrice;
    return {
      price: adjustedPrice,
      quantity: parseFloat(qty),
      total: 0,
    };
  });
  
  // Process asks (sell orders) - apply markup (increase the price users see)
  const asks = data.asks.map(([price, qty]) => {
    const basePrice = parseFloat(price);
    const adjustedPrice = applyMarkup 
      ? basePrice * (1 + MARKUP_MULTIPLIER) 
      : basePrice;
    return {
      price: adjustedPrice,
      quantity: parseFloat(qty),
      total: 0,
    };
  });
  
  // Calculate cumulative totals
  let bidTotal = 0;
  bids.forEach(bid => {
    bidTotal += bid.quantity;
    bid.total = bidTotal;
  });
  
  let askTotal = 0;
  asks.forEach(ask => {
    askTotal += ask.quantity;
    ask.total = askTotal;
  });
  
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
  
  return {
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
    lastUpdateId: data.lastUpdateId,
  };
}

/**
 * Get 24h ticker with markup applied
 */
export async function getMexcTicker(symbol: MexcPairSymbol): Promise<ProcessedTicker> {
  const response = await fetch(`${baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error(`MEXC API error: ${response.status}`);
  }
  
  const data: MexcTicker = await response.json();
  const pairConfig = MEXC_CONFIG.SUPPORTED_PAIRS.find(p => p.symbol === symbol);
  
  return {
    symbol,
    displaySymbol: pairConfig?.displaySymbol || symbol,
    lastPrice: parseFloat(data.lastPrice),
    bidPrice: parseFloat(data.bidPrice) * (1 - MARKUP_MULTIPLIER),
    askPrice: parseFloat(data.askPrice) * (1 + MARKUP_MULTIPLIER),
    priceChange24h: parseFloat(data.priceChange),
    priceChangePercent24h: parseFloat(data.priceChangePercent) * 100,
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    quoteVolume24h: parseFloat(data.quoteVolume || '0'),
  };
}

/**
 * Get all tickers for supported pairs
 */
export async function getAllMexcTickers(): Promise<ProcessedTicker[]> {
  const tickers: ProcessedTicker[] = [];
  
  for (const pair of MEXC_CONFIG.SUPPORTED_PAIRS) {
    try {
      const ticker = await getMexcTicker(pair.symbol as MexcPairSymbol);
      tickers.push(ticker);
    } catch (err) {
      console.error(`Error fetching ticker for ${pair.symbol}:`, err);
    }
  }
  
  return tickers;
}

/**
 * Get recent trades from MEXC
 */
export async function getMexcRecentTrades(
  symbol: MexcPairSymbol,
  limit: number = 50
): Promise<MexcTrade[]> {
  const response = await fetch(`${baseUrl}/api/v3/trades?symbol=${symbol}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`MEXC API error: ${response.status}`);
  }
  
  return response.json();
}

// ============ SIGNED ENDPOINTS (Require API Keys) ============

/**
 * Generate HMAC SHA256 signature for MEXC API
 */
function generateSignature(queryString: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

/**
 * Create signed request headers
 */
function getSignedHeaders(apiKey: string): Record<string, string> {
  return {
    'X-MEXC-APIKEY': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Execute a market order on MEXC
 * This is called after user confirms the trade on your platform
 */
export async function executeMexcMarketOrder(
  symbol: MexcPairSymbol,
  side: 'BUY' | 'SELL',
  quantity: number,
  apiKey: string,
  secretKey: string
): Promise<{
  success: boolean;
  orderId?: string;
  executedQty?: number;
  executedPrice?: number;
  error?: string;
}> {
  const timestamp = Date.now();
  const config = MEXC_CONFIG.PAIR_CONFIG[symbol];
  
  const params = new URLSearchParams({
    symbol,
    side,
    type: 'MARKET',
    quantity: quantity.toFixed(config?.qtyPrecision || 6),
    timestamp: timestamp.toString(),
    recvWindow: '5000',
  });
  
  const signature = generateSignature(params.toString(), secretKey);
  params.append('signature', signature);
  
  try {
    const response = await fetch(`${baseUrl}/api/v3/order`, {
      method: 'POST',
      headers: getSignedHeaders(apiKey),
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.msg || `Order failed: ${response.status}`,
      };
    }
    
    return {
      success: true,
      orderId: data.orderId,
      executedQty: parseFloat(data.executedQty),
      executedPrice: parseFloat(data.price) || parseFloat(data.cummulativeQuoteQty) / parseFloat(data.executedQty),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to execute order',
    };
  }
}

/**
 * Execute a limit order on MEXC
 */
export async function executeMexcLimitOrder(
  symbol: MexcPairSymbol,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  apiKey: string,
  secretKey: string
): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
  const timestamp = Date.now();
  const config = MEXC_CONFIG.PAIR_CONFIG[symbol];
  
  const params = new URLSearchParams({
    symbol,
    side,
    type: 'LIMIT',
    quantity: quantity.toFixed(config?.qtyPrecision || 6),
    price: price.toFixed(config?.pricePrecision || 6),
    timestamp: timestamp.toString(),
    recvWindow: '5000',
  });
  
  const signature = generateSignature(params.toString(), secretKey);
  params.append('signature', signature);
  
  try {
    const response = await fetch(`${baseUrl}/api/v3/order`, {
      method: 'POST',
      headers: getSignedHeaders(apiKey),
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.msg || `Order failed: ${response.status}`,
      };
    }
    
    return {
      success: true,
      orderId: data.orderId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to execute order',
    };
  }
}

/**
 * Get account balances from MEXC
 */
export async function getMexcAccountBalances(
  apiKey: string,
  secretKey: string
): Promise<{ asset: string; free: number; locked: number }[]> {
  const timestamp = Date.now();
  
  const params = new URLSearchParams({
    timestamp: timestamp.toString(),
    recvWindow: '5000',
  });
  
  const signature = generateSignature(params.toString(), secretKey);
  params.append('signature', signature);
  
  const response = await fetch(`${baseUrl}/api/v3/account?${params.toString()}`, {
    headers: getSignedHeaders(apiKey),
  });
  
  if (!response.ok) {
    throw new Error(`MEXC API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.balances
    .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map((b: any) => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
    }));
}

/**
 * Calculate the price with markup for user display
 */
export function applyPlatformMarkup(
  basePrice: number,
  side: 'buy' | 'sell'
): number {
  if (side === 'buy') {
    // User buying = they pay more (ask price + markup)
    return basePrice * (1 + MARKUP_MULTIPLIER + PLATFORM_FEE_MULTIPLIER);
  } else {
    // User selling = they receive less (bid price - markup)
    return basePrice * (1 - MARKUP_MULTIPLIER - PLATFORM_FEE_MULTIPLIER);
  }
}

/**
 * Calculate platform revenue from a trade
 */
export function calculatePlatformRevenue(
  tradeAmount: number,
  executedPrice: number
): {
  markupRevenue: number;
  feeRevenue: number;
  totalRevenue: number;
} {
  const markupRevenue = tradeAmount * executedPrice * MARKUP_MULTIPLIER;
  const feeRevenue = tradeAmount * executedPrice * PLATFORM_FEE_MULTIPLIER;
  
  return {
    markupRevenue,
    feeRevenue,
    totalRevenue: markupRevenue + feeRevenue,
  };
}
