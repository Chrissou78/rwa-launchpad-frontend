// src/hooks/useTokenConfig.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useChainId } from 'wagmi';
import { Address } from 'viem';
import {
  TokenInfo,
  ChainTokenConfig,
  getTokenConfig,
  getChainTokens,
  getTokenByAddress,
  getTokenBySymbol,
  getDefaultStablecoin,
  getNativeCurrency,
  getTokenDecimals,
  getTokenSymbol,
  isStablecoin,
  getStablecoins,
} from '@/config/tokens';

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseTokenConfigReturn {
  // Current chain info
  chainId: number;
  chainName: string;
  config: ChainTokenConfig | undefined;
  
  // Native currency
  nativeCurrency: { name: string; symbol: string; decimals: number } | undefined;
  nativeSymbol: string;
  
  // Tokens
  tokens: TokenInfo[];
  stablecoins: TokenInfo[];
  defaultStablecoin: Address | undefined;
  
  // Helper functions
  getToken: (address: string) => TokenInfo | undefined;
  getTokenBySymbol: (symbol: string) => TokenInfo | undefined;
  getDecimals: (address: string) => number;
  getSymbol: (address: string) => string;
  isStablecoin: (address: string) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * React hook for accessing token config with automatic updates on chain change
 */
export function useTokenConfig(): UseTokenConfigReturn {
  const wagmiChainId = useChainId();
  const [chainId, setChainId] = useState<number>(wagmiChainId || 1);

  // Update chainId when wagmi chainId changes
  useEffect(() => {
    if (wagmiChainId) {
      setChainId(wagmiChainId);
    }
  }, [wagmiChainId]);

  // Memoized config
  const config = useMemo(() => getTokenConfig(chainId), [chainId]);

  // Memoized values
  const tokens = useMemo(() => getChainTokens(chainId), [chainId]);
  const stablecoins = useMemo(() => getStablecoins(chainId), [chainId]);
  const defaultStablecoin = useMemo(() => getDefaultStablecoin(chainId), [chainId]);
  const nativeCurrency = useMemo(() => getNativeCurrency(chainId), [chainId]);

  // Helper functions bound to current chain
  const getToken = useMemo(
    () => (address: string) => getTokenByAddress(chainId, address),
    [chainId]
  );

  const getTokenBySymbolFn = useMemo(
    () => (symbol: string) => getTokenBySymbol(chainId, symbol),
    [chainId]
  );

  const getDecimals = useMemo(
    () => (address: string) => getTokenDecimals(chainId, address),
    [chainId]
  );

  const getSymbol = useMemo(
    () => (address: string) => getTokenSymbol(chainId, address),
    [chainId]
  );

  const isStablecoinFn = useMemo(
    () => (address: string) => isStablecoin(chainId, address),
    [chainId]
  );

  return {
    chainId,
    chainName: config?.chainName || 'Unknown',
    config,
    nativeCurrency,
    nativeSymbol: nativeCurrency?.symbol || 'ETH',
    tokens,
    stablecoins,
    defaultStablecoin,
    getToken,
    getTokenBySymbol: getTokenBySymbolFn,
    getDecimals,
    getSymbol,
    isStablecoin: isStablecoinFn,
  };
}

// Re-export types for convenience
export type { TokenInfo, ChainTokenConfig };
