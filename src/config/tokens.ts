// config/tokens.ts
// 
import {RPC_URL, NATIVE_CURRENCY, EXPLORER_URL, CHAIN_ID_TESTNET, CHAIN_ID_MAINNET, FAUCET_URL } from './contracts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const TESTNET_CONFIG = {
  chainId: CHAIN_ID_TESTNET,
  name: 'Avalanche Fuji',
  rpcUrl: RPC_URL,
  explorer: EXPLORER_URL,
  nativeCurrency: {
    name: 'Avalanche',
    symbol: NATIVE_CURRENCY,
    decimals: 18,
  },
  TOKENS: {
    AVAX: { address: ZERO_ADDRESS, decimals: 18, isNative: true },
    USDC: { address: '0x5425890298aed601595a70AB815c96711a31Bc65', decimals: 6 },
    USDT: { address: '0x134Dc38AE8C853D1aa2103d5047591acDAA16682', decimals: 6 },
    WAVAX: { address: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', decimals: 18 },
    WETH: { address: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA', decimals: 18 },
    LINK: { address: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', decimals: 18 },
  } as Record<string, { address: string; decimals: number; isNative?: boolean }>,
  REFRESH_INTERVAL: 2000,
  faucet: FAUCET_URL,
};

export const MAINNET_CONFIG = {
  chainId: CHAIN_ID_MAINNET,
  name: 'Avalanche',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  explorer: 'https://snowtrace.io',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: NATIVE_CURRENCY,
    decimals: 18,
  },
  TOKENS: {
    AVAX: { address: ZERO_ADDRESS, decimals: 18, isNative: true },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    USDT: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    WAVAX: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18 },
    WETHe: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
    WBTCe: { address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8 },
    DAIe: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18 },
    LINK: { address: '0x5947BB275c521040051D82396192181b413227A3', decimals: 18 },
  } as Record<string, { address: string; decimals: number; isNative?: boolean }>,
  REFRESH_INTERVAL: 2000,
};

// Active config
export const ACTIVE_CONFIG = TESTNET_CONFIG;
