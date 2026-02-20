// src/config/tokens.ts
// Server-safe token configuration - NO React hooks here

import { Address } from 'viem';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isStablecoin?: boolean;
  isNative?: boolean;
}

export interface ChainTokenConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  tokens: TokenInfo[];
  defaultStablecoin?: Address;
  wrappedNative?: Address;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

// ============================================================================
// TOKEN CONFIGURATIONS BY CHAIN
// ============================================================================

export const TOKEN_CONFIGS: Record<number, ChainTokenConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    chainName: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    tokens: [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0x6B175474E89094C44Da98b954EesdeAC495271d0F' as Address,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
  },

  // Polygon Mainnet
  137: {
    chainId: 137,
    chainName: 'Polygon',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    tokens: [
      {
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address,
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address,
  },

  // Polygon Amoy Testnet
  80002: {
    chainId: 80002,
    chainName: 'Polygon Amoy',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    tokens: [
      {
        address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' as Address,
        symbol: 'USDC',
        name: 'USD Coin (Test)',
        decimals: 6,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' as Address,
  },

  // Avalanche C-Chain
  43114: {
    chainId: 43114,
    chainName: 'Avalanche',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    tokens: [
      {
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' as Address,
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70' as Address,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
    wrappedNative: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' as Address,
  },

  // Avalanche Fuji Testnet
  43113: {
    chainId: 43113,
    chainName: 'Avalanche Fuji',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    tokens: [
      {
        address: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
        symbol: 'USDC',
        name: 'USD Coin (Test)',
        decimals: 6,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    tokens: [
      {
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
        symbol: 'USDC',
        name: 'USD Coin (Test)',
        decimals: 6,
        isStablecoin: true,
      },
    ],
    defaultStablecoin: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  },
};

// ============================================================================
// HELPER FUNCTIONS (Server-safe)
// ============================================================================

/**
 * Get token config for a specific chain
 */
export function getTokenConfig(chainId: number): ChainTokenConfig | undefined {
  return TOKEN_CONFIGS[chainId];
}

/**
 * Get all tokens for a chain
 */
export function getChainTokens(chainId: number): TokenInfo[] {
  return TOKEN_CONFIGS[chainId]?.tokens || [];
}

/**
 * Get token by address for a specific chain
 */
export function getTokenByAddress(chainId: number, address: string): TokenInfo | undefined {
  const config = TOKEN_CONFIGS[chainId];
  if (!config) return undefined;
  
  return config.tokens.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get token by symbol for a specific chain
 */
export function getTokenBySymbol(chainId: number, symbol: string): TokenInfo | undefined {
  const config = TOKEN_CONFIGS[chainId];
  if (!config) return undefined;
  
  return config.tokens.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * Get default stablecoin for a chain
 */
export function getDefaultStablecoin(chainId: number): Address | undefined {
  return TOKEN_CONFIGS[chainId]?.defaultStablecoin;
}

/**
 * Get native currency info for a chain
 */
export function getNativeCurrency(chainId: number): { name: string; symbol: string; decimals: number } | undefined {
  return TOKEN_CONFIGS[chainId]?.nativeCurrency;
}

/**
 * Get token decimals
 */
export function getTokenDecimals(chainId: number, address: string): number {
  const token = getTokenByAddress(chainId, address);
  return token?.decimals ?? 18;
}

/**
 * Get token symbol
 */
export function getTokenSymbol(chainId: number, address: string): string {
  if (!address || address === ZERO_ADDRESS) {
    return TOKEN_CONFIGS[chainId]?.nativeCurrency.symbol || 'ETH';
  }
  
  const token = getTokenByAddress(chainId, address);
  return token?.symbol || 'TOKEN';
}

/**
 * Check if address is a known stablecoin
 */
export function isStablecoin(chainId: number, address: string): boolean {
  const token = getTokenByAddress(chainId, address);
  return token?.isStablecoin ?? false;
}

/**
 * Get all stablecoins for a chain
 */
export function getStablecoins(chainId: number): TokenInfo[] {
  return getChainTokens(chainId).filter((token) => token.isStablecoin);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(TOKEN_CONFIGS).map(Number);
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in TOKEN_CONFIGS;
}
