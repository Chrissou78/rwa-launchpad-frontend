// src/config/exchange.ts

export const EXCHANGE_CONFIG = {
  // Platform wallet (uses existing env vars)
  PLATFORM_WALLET: process.env.NEXT_PUBLIC_ADMIN_ADDRESS as `0x${string}`,
  PLATFORM_PRIVATE_KEY: process.env.VERIFIER_PRIVATE_KEY as `0x${string}`,
  
  // MEXC API
  MEXC_API_KEY: process.env.MEXC_API_KEY!,
  MEXC_SECRET_KEY: process.env.MEXC_SECRET_KEY!,
  MEXC_BASE_URL: 'https://api.mexc.com',
  
  // Fees (updated to 1% platform fee)
  MARKUP_PERCENT: 0.5,       // Spread markup (your profit from spread)
  PLATFORM_FEE_PERCENT: 1.0, // Platform fee (1%)
  
  // Total fee displayed to users
  get TOTAL_FEE_PERCENT() {
    return this.MARKUP_PERCENT + this.PLATFORM_FEE_PERCENT;
  },
  
  // Supported tokens with addresses (Polygon Amoy testnet)
  TOKENS: {
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x1dBe87Efd97c84d3a73807399EBbfcfF13Ff578e' as `0x${string}`,
      decimals: 6,
      icon: '💲',
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' as `0x${string}`,
      decimals: 6,
      icon: '💵',
    },
    POL: {
      symbol: 'POL',
      name: 'Polygon',
      address: '0x0000000000000000000000000000000000001010' as `0x${string}`,
      decimals: 18,
      icon: '🟣',
      isNative: true,
    },
    MATIC: {
      symbol: 'MATIC',
      name: 'Polygon (Legacy)',
      address: '0x0000000000000000000000000000000000001010' as `0x${string}`,
      decimals: 18,
      icon: '🟣',
      isNative: true,
    },
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0' as `0x${string}`,
      decimals: 18,
      icon: '💎',
    },
    BTC: {
      symbol: 'BTC',
      name: 'Bitcoin',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as `0x${string}`,
      decimals: 8,
      icon: '🟠',
    },
  } as const,
  
  // Trading pairs (MEXC format)
  PAIRS: [
    { symbol: 'USDCUSDT', base: 'USDC', quote: 'USDT', display: 'USDC/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'POLUSDT', base: 'POL', quote: 'USDT', display: 'POL/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'MATICUSDT', base: 'MATIC', quote: 'USDT', display: 'MATIC/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', display: 'ETH/USDT', pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', display: 'BTC/USDT', pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
  ],
  
  // Minimum deposit/withdrawal amounts
  MIN_AMOUNTS: {
    USDT: 1,
    USDC: 1,
    POL: 1,
    MATIC: 1,
    ETH: 0.001,
    BTC: 0.0001,
  } as Record<string, number>,
};

export type TokenSymbol = keyof typeof EXCHANGE_CONFIG.TOKENS;
export type PairSymbol = typeof EXCHANGE_CONFIG.PAIRS[number]['symbol'];
