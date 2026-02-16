// src/app/admin/helpers.ts

import { EXPLORER_URL, CONTRACTS } from '@/config/contracts';
import { ZERO_ADDRESS, OFFCHAIN_PAYMENT } from './constants';

export const formatUSD = (amount: bigint): string => {
  const value = Number(amount) / 1e6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const convertIPFSUrl = (url: string): string => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

export const getExplorerUrl = (address: string, type: 'address' | 'tx' = 'address') => {
  return `${EXPLORER_URL}/${type}/${address}`;
};

export const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getTokenSymbol = (address: string): string => {
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS) return 'POL';
  if (lower === OFFCHAIN_PAYMENT) return 'OFF-CHAIN';
  if (lower === CONTRACTS.USDC.toLowerCase()) return 'USDC';
  if (lower === CONTRACTS.USDT.toLowerCase()) return 'USDT';
  return 'TOKEN';
};

export const getTokenDecimals = (address: string): number => {
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS) return 18;
  return 6;
};

export const formatTokenAmount = (amount: bigint, tokenAddress: string): string => {
  const decimals = getTokenDecimals(tokenAddress);
  const value = Number(amount) / Math.pow(10, decimals);
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${getTokenSymbol(tokenAddress)}`;
};

export const formatLimitAmount = (limit: bigint): string => {
  if (limit >= BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') / 2n) {
    return 'Unlimited';
  }
  return `$${(Number(limit) / 1e6).toLocaleString()}`;
};
