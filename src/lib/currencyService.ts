// src/lib/currencyService.ts

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

let cachedRates: ExchangeRates | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && now < cacheExpiry) {
    return cachedRates;
  }
  
  try {
    // Using exchangerate-api.com (free tier: 1500 requests/month)
    // Alternative: frankfurter.dev (completely free, open source)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/USD`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    
    cachedRates = {
      base: 'USD',
      rates: data.rates,
      timestamp: now,
    };
    cacheExpiry = now + CACHE_DURATION;
    
    return cachedRates;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // Return cached rates even if expired, as fallback
    if (cachedRates) {
      return cachedRates;
    }
    
    // Fallback to hardcoded rates (update periodically)
    return {
      base: 'USD',
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        CHF: 0.88,
        JPY: 149.50,
        CNY: 7.24,
        INR: 83.12,
        NGN: 1550,
        ZAR: 18.50,
        BRL: 4.97,
        // ... add more as needed
      },
      timestamp: now,
    };
  }
}

export async function convertToUSD(amount: number, fromCurrency: string): Promise<{
  usdAmount: number;
  rate: number;
  timestamp: number;
}> {
  if (fromCurrency === 'USD') {
    return { usdAmount: amount, rate: 1, timestamp: Date.now() };
  }
  
  const rates = await getExchangeRates();
  const rate = rates.rates[fromCurrency];
  
  if (!rate) {
    throw new Error(`Unsupported currency: ${fromCurrency}`);
  }
  
  // Convert from local currency to USD
  const usdAmount = amount / rate;
  
  return {
    usdAmount: Math.round(usdAmount * 100) / 100, // Round to 2 decimals
    rate,
    timestamp: rates.timestamp,
  };
}

export async function convertFromUSD(usdAmount: number, toCurrency: string): Promise<{
  localAmount: number;
  rate: number;
  timestamp: number;
}> {
  if (toCurrency === 'USD') {
    return { localAmount: usdAmount, rate: 1, timestamp: Date.now() };
  }
  
  const rates = await getExchangeRates();
  const rate = rates.rates[toCurrency];
  
  if (!rate) {
    throw new Error(`Unsupported currency: ${toCurrency}`);
  }
  
  const localAmount = usdAmount * rate;
  
  return {
    localAmount: Math.round(localAmount * 100) / 100,
    rate,
    timestamp: rates.timestamp,
  };
}

export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currencyCode}`;
  }
}
