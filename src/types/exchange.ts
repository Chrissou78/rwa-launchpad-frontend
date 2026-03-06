// src/types/exchange.ts

export interface TradingPair {
  id: string;
  symbol: string;
  base_token: string;
  quote_token: string;
  base_token_address: string;
  quote_token_address: string;
  base_decimals: number;
  quote_decimals: number;
  min_order_size: number;
  price_precision: number;
  quantity_precision: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  pair_id: string;
  wallet_address: string;
  order_type: 'limit' | 'market';
  side: 'buy' | 'sell';
  price: number | null;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  pair_id: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_address: string;
  seller_address: string;
  price: number;
  quantity: number;
  total: number;
  buyer_fee: number;
  seller_fee: number;
  tx_hash?: string;
  created_at: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  orderCount: number;
}

export interface OrderBook {
  bids: OrderBookLevel[]; // Buy orders (highest first)
  asks: OrderBookLevel[]; // Sell orders (lowest first)
  spread: number;
  spreadPercent: number;
}

export interface ExchangeBalance {
  token_symbol: string;
  token_address: string;
  available_balance: number;
  locked_balance: number;
  total_balance: number;
}

export interface TickerData {
  pair: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export interface CreateOrderParams {
  pairId: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price?: number;
  quantity: number;
}

// Token configurations with icons
export const EXCHANGE_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    decimals: 6,
    icon: '💵',
    color: '#2775CA',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x1dBe87Efd97c84d3a73807399EBbfcfF13Ff578e',
    decimals: 6,
    icon: '💲',
    color: '#26A17B',
  },
  POL: {
    symbol: 'POL',
    name: 'Polygon',
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    icon: '🟣',
    color: '#8247E5',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    decimals: 18,
    icon: '💎',
    color: '#627EEA',
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    icon: '🟠',
    color: '#F7931A',
  },
} as const;

export type TokenSymbol = keyof typeof EXCHANGE_TOKENS;

// Trading fee (0.1%)
export const TRADING_FEE_PERCENT = 0.1;
export const TRADING_FEE_MULTIPLIER = TRADING_FEE_PERCENT / 100;
