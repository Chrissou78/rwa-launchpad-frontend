// src/config/mexc.ts

export const MEXC_CONFIG = {
  baseUrl: 'https://api.mexc.com',
  wsUrl: 'wss://wbs.mexc.com/ws',
  
  // Your platform markup (0.5% = 0.005)
  MARKUP_PERCENT: 0.5,
  MARKUP_MULTIPLIER: 0.005,
  
  // Platform fee on top of markup
  PLATFORM_FEE_PERCENT: 0.1,
  PLATFORM_FEE_MULTIPLIER: 0.001,
  
  // Supported trading pairs (MEXC symbol format)
  SUPPORTED_PAIRS: [
    { symbol: 'USDTUSDC', base: 'USDT', quote: 'USDC', displaySymbol: 'USDT/USDC' },
    { symbol: 'POLUSDT', base: 'POL', quote: 'USDT', displaySymbol: 'POL/USDT' },
    { symbol: 'POLUSDC', base: 'POL', quote: 'USDC', displaySymbol: 'POL/USDC' },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', displaySymbol: 'ETH/USDT' },
    { symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC', displaySymbol: 'ETH/USDC' },
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', displaySymbol: 'BTC/USDT' },
    { symbol: 'BTCUSDC', base: 'BTC', quote: 'USDC', displaySymbol: 'BTC/USDC' },
    { symbol: 'MATICUSDT', base: 'MATIC', quote: 'USDT', displaySymbol: 'MATIC/USDT' },
  ],
  
  // Precision settings per pair
  PAIR_CONFIG: {
    'USDTUSDC': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'POLUSDT': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'POLUSDC': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    'ETHUSDT': { pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    'ETHUSDC': { pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    'BTCUSDT': { pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
    'BTCUSDC': { pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
    'MATICUSDT': { pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
  } as Record<string, { pricePrecision: number; qtyPrecision: number; minQty: number }>,
};

export type MexcPairSymbol = keyof typeof MEXC_CONFIG.PAIR_CONFIG;
