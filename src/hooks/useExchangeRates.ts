'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExchangeRates {
  [currency: string]: number;
}

interface UseExchangeRatesReturn {
  rates: ExchangeRates;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  convertToUSD: (amount: number, fromCurrency: string) => number;
  convertFromUSD: (amount: number, toCurrency: string) => number;
  getRate: (currency: string) => number;
  refresh: () => Promise<void>;
}

export function useExchangeRates(): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates>({ USD: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/currency/rates');
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      setRates(data.rates);
      setLastUpdated(new Date(data.timestamp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exchange rates');
      // Keep existing rates if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // Refresh rates every hour
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const getRate = useCallback((currency: string): number => {
    return rates[currency] || 1;
  }, [rates]);

  const convertToUSD = useCallback((amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'USD') return amount;
    const rate = rates[fromCurrency];
    if (!rate) return amount;
    return amount / rate;
  }, [rates]);

  const convertFromUSD = useCallback((amount: number, toCurrency: string): number => {
    if (toCurrency === 'USD') return amount;
    const rate = rates[toCurrency];
    if (!rate) return amount;
    return amount * rate;
  }, [rates]);

  return {
    rates,
    loading,
    error,
    lastUpdated,
    convertToUSD,
    convertFromUSD,
    getRate,
    refresh: fetchRates,
  };
}