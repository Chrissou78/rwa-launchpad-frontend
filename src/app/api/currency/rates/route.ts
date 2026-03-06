// src/app/api/currency/rates/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

let cachedRates: CachedRates | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const now = Date.now();
  
  // Return cached if valid
  if (cachedRates && now - cachedRates.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      rates: cachedRates.rates,
      timestamp: cachedRates.timestamp,
      cached: true,
    });
  }
  
  try {
    // Primary API: exchangerate-api.com (free tier)
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) throw new Error('Primary API failed');
    
    const data = await response.json();
    
    cachedRates = {
      rates: data.rates,
      timestamp: now,
    };
    
    return NextResponse.json({
      success: true,
      rates: data.rates,
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    // Fallback API: frankfurter.dev (completely free)
    try {
      const fallbackResponse = await fetch(
        'https://api.frankfurter.dev/v1/latest?base=USD'
      );
      
      if (!fallbackResponse.ok) throw new Error('Fallback failed');
      
      const fallbackData = await fallbackResponse.json();
      
      cachedRates = {
        rates: { USD: 1, ...fallbackData.rates },
        timestamp: now,
      };
      
      return NextResponse.json({
        success: true,
        rates: cachedRates.rates,
        timestamp: now,
        cached: false,
        source: 'fallback',
      });
    } catch {
      // Return stale cache if available
      if (cachedRates) {
        return NextResponse.json({
          success: true,
          rates: cachedRates.rates,
          timestamp: cachedRates.timestamp,
          cached: true,
          stale: true,
        });
      }
      
      // Last resort: hardcoded rates (update periodically)
      return NextResponse.json({
        success: true,
        rates: {
          USD: 1, EUR: 0.92, GBP: 0.79, CHF: 0.88, JPY: 149, CNY: 7.2,
          INR: 83, AED: 3.67, SAR: 3.75, SGD: 1.34, HKD: 7.82, AUD: 1.53,
          CAD: 1.36, BRL: 5.0, MXN: 17.2, ZAR: 18.5, NGN: 1550, KES: 153,
          GHS: 15.5, EGP: 50, MAD: 10, TZS: 2700, UGX: 3800, XOF: 605,
          XAF: 605, TRY: 32, PLN: 4.0, THB: 35, IDR: 15800, MYR: 4.7,
          PHP: 56, VND: 24500, KRW: 1340, PKR: 280, BDT: 118, RUB: 92,
          COP: 4000, ARS: 870, CLP: 950, PEN: 3.7,
        },
        timestamp: now,
        hardcoded: true,
      });
    }
  }
}
