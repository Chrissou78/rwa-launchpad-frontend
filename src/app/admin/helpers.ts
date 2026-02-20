// src/app/admin/helpers.ts

import { Address, formatUnits } from 'viem';

// ============================================================================
// CONSTANTS
// ============================================================================

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const OFFCHAIN_PAYMENT = '0x0000000000000000000000000000000000000001' as Address;
export const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
export const HALF_MAX_UINT256 = MAX_UINT256 / 2n;

// Default IPFS gateways (in order of preference)
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format a bigint amount as USD currency
 * @param amount - Amount in smallest units (e.g., 6 decimals for USDC)
 * @param decimals - Number of decimals (default: 6 for USDC)
 */
export const formatUSD = (amount: bigint | number | string, decimals: number = 6): string => {
  const value = typeof amount === 'bigint' 
    ? Number(formatUnits(amount, decimals))
    : typeof amount === 'string'
      ? parseFloat(amount)
      : amount;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format USD with smart abbreviation (K, M, B)
 */
export const formatUSDCompact = (amount: bigint | number, decimals: number = 6): string => {
  const value = typeof amount === 'bigint' 
    ? Number(formatUnits(amount, decimals))
    : amount;

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

/**
 * Format native currency amount (ETH, AVAX, POL, etc.)
 * @param amount - Amount in wei (18 decimals)
 * @param symbol - Currency symbol
 * @param decimals - Number of decimals (default: 18)
 */
export const formatNativeCurrency = (
  amount: bigint | number | string,
  symbol: string = 'ETH',
  decimals: number = 18
): string => {
  const value = typeof amount === 'bigint'
    ? formatUnits(amount, decimals)
    : typeof amount === 'string'
      ? amount
      : amount.toString();
  
  const numValue = parseFloat(value);
  
  if (numValue === 0) return `0 ${symbol}`;
  if (numValue < 0.0001) return `< 0.0001 ${symbol}`;
  if (numValue < 1) return `${numValue.toFixed(4)} ${symbol}`;
  if (numValue < 1000) return `${numValue.toFixed(3)} ${symbol}`;
  
  return `${numValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${symbol}`;
};

/**
 * Format a percentage value
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format basis points to percentage
 */
export const formatBasisPoints = (bps: number | bigint): string => {
  const value = typeof bps === 'bigint' ? Number(bps) : bps;
  return `${(value / 100).toFixed(2)}%`;
};

// ============================================================================
// ADDRESS UTILITIES
// ============================================================================

/**
 * Truncate an address to a shorter form
 */
export const truncateAddress = (address: string | undefined | null, startChars: number = 6, endChars: number = 4): string => {
  if (!address || address.length < startChars + endChars + 3) return address || '';
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Check if an address is the zero address
 */
export const isZeroAddress = (address: string | undefined | null): boolean => {
  return !address || address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
};

/**
 * Check if an address is the off-chain payment marker
 */
export const isOffChainPayment = (address: string | undefined | null): boolean => {
  return address?.toLowerCase() === OFFCHAIN_PAYMENT.toLowerCase();
};

// ============================================================================
// EXPLORER URL UTILITIES (Multichain)
// ============================================================================

/**
 * Get explorer URL for an address or transaction
 * @param explorerUrl - Base explorer URL (from chain config)
 * @param value - Address or transaction hash
 * @param type - Type of link ('address' | 'tx' | 'token' | 'block')
 */
export const getExplorerUrl = (
  explorerUrl: string,
  value: string,
  type: 'address' | 'tx' | 'token' | 'block' = 'address'
): string => {
  if (!explorerUrl || !value) return '#';
  
  // Remove trailing slash from explorer URL
  const baseUrl = explorerUrl.replace(/\/$/, '');
  
  return `${baseUrl}/${type}/${value}`;
};

/**
 * Get explorer URL for a contract
 */
export const getContractExplorerUrl = (
  explorerUrl: string,
  address: string
): string => {
  return getExplorerUrl(explorerUrl, address, 'address');
};

/**
 * Get explorer URL for a transaction
 */
export const getTransactionExplorerUrl = (
  explorerUrl: string,
  txHash: string
): string => {
  return getExplorerUrl(explorerUrl, txHash, 'tx');
};

/**
 * Get explorer URL for a token
 */
export const getTokenExplorerUrl = (
  explorerUrl: string,
  tokenAddress: string
): string => {
  return getExplorerUrl(explorerUrl, tokenAddress, 'token');
};

// ============================================================================
// IPFS UTILITIES
// ============================================================================

/**
 * Convert IPFS URL to HTTP gateway URL
 * @param url - IPFS URL (ipfs://... or raw CID)
 * @param gatewayIndex - Index of gateway to use (default: 0 for Pinata)
 */
export const convertIPFSUrl = (url: string | undefined | null, gatewayIndex: number = 0): string => {
  if (!url) return '';
  
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `${gateway}${cid}`;
  }
  
  // Handle raw CID (starts with Qm or bafy)
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `${gateway}${url}`;
  }
  
  // Already HTTP URL
  return url;
};

/**
 * Extract CID from IPFS URL
 */
export const extractIPFSCid = (url: string): string | null => {
  if (!url) return null;
  
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '').split('/')[0];
  }
  
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return url.split('/')[0];
  }
  
  // Try to extract from HTTP gateway URL
  const match = url.match(/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

// ============================================================================
// TOKEN UTILITIES (Multichain)
// ============================================================================

/**
 * Known token addresses by chain ID
 */
export const KNOWN_TOKENS: Record<number, Record<string, { symbol: string; decimals: number; name: string }>> = {
  // Ethereum Mainnet
  1: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  },
  // Polygon Mainnet
  137: {
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  },
  // Polygon Amoy Testnet
  80002: {
    '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582': { symbol: 'USDC', decimals: 6, name: 'USD Coin (Test)' },
  },
  // Avalanche C-Chain
  43114: {
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    '0xd586e7f844cea2f87f50152665bcbc2c279d8d70': { symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  },
  // Avalanche Fuji Testnet
  43113: {
    '0x5425890298aed601595a70ab815c96711a31bc65': { symbol: 'USDC', decimals: 6, name: 'USD Coin (Test)' },
  },
  // Sepolia Testnet
  11155111: {
    '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6, name: 'USD Coin (Test)' },
  },
};

/**
 * Get token info for a given address and chain
 * @param address - Token address
 * @param chainId - Chain ID
 * @param nativeSymbol - Native currency symbol (fallback)
 */
export const getTokenInfo = (
  address: string | undefined | null,
  chainId: number,
  nativeSymbol: string = 'ETH'
): { symbol: string; decimals: number; name: string } => {
  if (!address || isZeroAddress(address)) {
    return { symbol: nativeSymbol, decimals: 18, name: `Native ${nativeSymbol}` };
  }
  
  if (isOffChainPayment(address)) {
    return { symbol: 'OFF-CHAIN', decimals: 0, name: 'Off-Chain Payment' };
  }
  
  const chainTokens = KNOWN_TOKENS[chainId] || {};
  const tokenInfo = chainTokens[address.toLowerCase()];
  
  if (tokenInfo) {
    return tokenInfo;
  }
  
  // Default to unknown token with 18 decimals
  return { symbol: 'TOKEN', decimals: 18, name: 'Unknown Token' };
};

/**
 * Get token symbol for a given address and chain
 */
export const getTokenSymbol = (
  address: string | undefined | null,
  chainId: number,
  nativeSymbol: string = 'ETH'
): string => {
  return getTokenInfo(address, chainId, nativeSymbol).symbol;
};

/**
 * Get token decimals for a given address and chain
 */
export const getTokenDecimals = (
  address: string | undefined | null,
  chainId: number
): number => {
  return getTokenInfo(address, chainId).decimals;
};

/**
 * Format token amount with symbol
 * @param amount - Amount in smallest units
 * @param tokenAddress - Token address
 * @param chainId - Chain ID
 * @param nativeSymbol - Native currency symbol (fallback)
 */
export const formatTokenAmount = (
  amount: bigint | number,
  tokenAddress: string | undefined | null,
  chainId: number,
  nativeSymbol: string = 'ETH'
): string => {
  const { symbol, decimals } = getTokenInfo(tokenAddress, chainId, nativeSymbol);
  
  const value = typeof amount === 'bigint'
    ? Number(formatUnits(amount, decimals))
    : amount / Math.pow(10, decimals);
  
  return `${value.toLocaleString('en-US', { maximumFractionDigits: decimals > 6 ? 4 : 2 })} ${symbol}`;
};

// ============================================================================
// LIMIT/AMOUNT UTILITIES
// ============================================================================

/**
 * Format investment limit (handles unlimited)
 */
export const formatLimitAmount = (limit: bigint, decimals: number = 6): string => {
  if (limit >= HALF_MAX_UINT256) {
    return 'Unlimited';
  }
  return formatUSD(limit, decimals);
};

/**
 * Check if a limit is unlimited
 */
export const isUnlimited = (limit: bigint): boolean => {
  return limit >= HALF_MAX_UINT256;
};

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format a timestamp to locale string
 */
export const formatDate = (timestamp: bigint | number | string): string => {
  const ts = typeof timestamp === 'bigint' 
    ? Number(timestamp) 
    : typeof timestamp === 'string'
      ? parseInt(timestamp)
      : timestamp;
  
  if (ts === 0) return 'N/A';
  
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a timestamp to locale datetime string
 */
export const formatDateTime = (timestamp: bigint | number | string): string => {
  const ts = typeof timestamp === 'bigint' 
    ? Number(timestamp) 
    : typeof timestamp === 'string'
      ? parseInt(timestamp)
      : timestamp;
  
  if (ts === 0) return 'N/A';
  
  return new Date(ts * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: bigint | number | string): string => {
  const ts = typeof timestamp === 'bigint' 
    ? Number(timestamp) 
    : typeof timestamp === 'string'
      ? parseInt(timestamp)
      : timestamp;
  
  if (ts === 0) return 'N/A';
  
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  
  return formatDate(ts);
};

/**
 * Format duration in seconds to human readable
 */
export const formatDuration = (seconds: bigint | number): string => {
  const secs = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  
  if (secs === 0) return 'Unlimited';
  
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  
  if (days > 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return remainingDays > 0 ? `${years}y ${remainingDays}d` : `${years} year${years > 1 ? 's' : ''}`;
  }
  
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days} day${days > 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''}` : `${secs} second${secs > 1 ? 's' : ''}`;
};

/**
 * Check if a deadline has passed
 */
export const isDeadlinePassed = (deadline: bigint | number): boolean => {
  const ts = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  return ts > 0 && ts < Math.floor(Date.now() / 1000);
};

/**
 * Get time remaining until deadline
 */
export const getTimeRemaining = (deadline: bigint | number): string => {
  const ts = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const now = Math.floor(Date.now() / 1000);
  
  if (ts === 0) return 'No deadline';
  if (ts <= now) return 'Ended';
  
  return formatDuration(ts - now);
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string | undefined | null): boolean => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash
 */
export const isValidTxHash = (hash: string | undefined | null): boolean => {
  if (!hash) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

// ============================================================================
// CLIPBOARD UTILITIES
// ============================================================================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Project status names
 */
export const PROJECT_STATUS_NAMES: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Funded',
  3: 'Completed',
  4: 'Cancelled',
  5: 'Refunding',
};

/**
 * Project status colors
 */
export const PROJECT_STATUS_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  1: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  2: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  3: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  4: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  5: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};

/**
 * Get project status name
 */
export const getProjectStatusName = (status: number): string => {
  return PROJECT_STATUS_NAMES[status] || 'Unknown';
};

/**
 * Get project status colors
 */
export const getProjectStatusColors = (status: number): { bg: string; text: string; border: string } => {
  return PROJECT_STATUS_COLORS[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
};

// ============================================================================
// CHAIN UTILITIES
// ============================================================================

/**
 * Native currency symbols by chain ID
 */
export const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  137: 'POL',
  80002: 'POL',
  43114: 'AVAX',
  43113: 'AVAX',
  11155111: 'ETH',
};

/**
 * Get native currency symbol for a chain
 */
export const getNativeSymbol = (chainId: number): string => {
  return NATIVE_SYMBOLS[chainId] || 'ETH';
};

/**
 * Chain names by ID
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  80002: 'Polygon Amoy',
  43114: 'Avalanche',
  43113: 'Avalanche Fuji',
  11155111: 'Sepolia',
};

/**
 * Get chain name
 */
export const getChainName = (chainId: number): string => {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
};

/**
 * Check if chain is testnet
 */
export const isTestnet = (chainId: number): boolean => {
  const testnets = [80002, 43113, 11155111];
  return testnets.includes(chainId);
};
