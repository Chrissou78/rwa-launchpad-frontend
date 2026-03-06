// src/app/api/exchange/mexc/pairs/route.ts
import { NextResponse } from 'next/server';
import { MEXC_CONFIG } from '@/config/mexc';

export async function GET() {
  const pairs = MEXC_CONFIG.SUPPORTED_PAIRS.map(pair => ({
    ...pair,
    config: MEXC_CONFIG.PAIR_CONFIG[pair.symbol],
    markup: MEXC_CONFIG.MARKUP_PERCENT,
    platformFee: MEXC_CONFIG.PLATFORM_FEE_PERCENT,
  }));
  
  return NextResponse.json({ 
    pairs,
    markup: MEXC_CONFIG.MARKUP_PERCENT,
    platformFee: MEXC_CONFIG.PLATFORM_FEE_PERCENT,
    totalFee: MEXC_CONFIG.MARKUP_PERCENT + MEXC_CONFIG.PLATFORM_FEE_PERCENT,
  });
}
