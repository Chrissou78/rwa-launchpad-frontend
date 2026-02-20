// src/app/admin/kyc/utils.ts
import { formatUnits, parseUnits, Address, isAddress } from 'viem';
import { 
  DocumentUrls, 
  PersonalInfo, 
  ValidationScores, 
  StoredSubmission,
  OnChainKYCData,
  TIER_NAMES,
  STATUS_NAMES,
  DOCUMENT_TYPE_NAMES
} from './types';

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export function formatUSD(amount: bigint | string | number, decimals: number = 6): string {
  const value = typeof amount === 'bigint' 
    ? Number(formatUnits(amount, decimals))
    : typeof amount === 'string' 
      ? parseFloat(amount) 
      : amount;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNativeCurrency(
  amount: bigint | string | number, 
  symbol: string = 'ETH',
  decimals: number = 18
): string {
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
}

export function formatDate(timestamp: bigint | number | string): string {
  const ts = typeof timestamp === 'bigint' 
    ? Number(timestamp) 
    : typeof timestamp === 'string'
      ? parseInt(timestamp)
      : timestamp;
  
  if (ts === 0) return 'N/A';
  
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateShort(timestamp: bigint | number | string): string {
  const ts = typeof timestamp === 'bigint' 
    ? Number(timestamp) 
    : typeof timestamp === 'string'
      ? parseInt(timestamp)
      : timestamp;
  
  if (ts === 0) return 'N/A';
  
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatAddress(address: string | Address): string {
  if (!address || address.length < 10) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAddressLong(address: string | Address): string {
  if (!address || address.length < 10) return 'N/A';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDuration(seconds: bigint | number): string {
  const secs = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  
  if (secs === 0) return 'Unlimited';
  
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  
  if (days > 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return remainingDays > 0 ? `${years}y ${remainingDays}d` : `${years} year${years > 1 ? 's' : ''}`;
  }
  
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days} day${days > 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    const mins = Math.floor((secs % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  const mins = Math.floor(secs / 60);
  return mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''}` : `${secs} second${secs > 1 ? 's' : ''}`;
}

export function formatInvestmentLimit(amount: bigint, decimals: number = 6): string {
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  
  if (amount === MAX_UINT256 || amount === BigInt(0)) {
    return 'Unlimited';
  }
  
  return formatUSD(amount, decimals);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

export function isValidFee(fee: string): boolean {
  const num = parseFloat(fee);
  return !isNaN(num) && num >= 0;
}

export function isValidThreshold(threshold: string): boolean {
  const num = parseInt(threshold);
  return !isNaN(num) && num >= 0 && num <= 100;
}

export function isValidTierLimit(limit: string): boolean {
  const num = parseFloat(limit);
  return !isNaN(num) && num >= 0;
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

export function parseFeeToWei(fee: string, decimals: number = 18): bigint {
  try {
    return parseUnits(fee, decimals);
  } catch {
    return BigInt(0);
  }
}

export function parseLimitToUnits(limit: string, decimals: number = 6): bigint {
  try {
    return parseUnits(limit, decimals);
  } catch {
    return BigInt(0);
  }
}

export function weiToEther(wei: bigint, decimals: number = 18): string {
  return formatUnits(wei, decimals);
}

// ============================================================================
// IPFS UTILITIES
// ============================================================================

export function resolveIPFSUrl(url: string): string {
  if (!url) return '';
  
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${url}`;
  }
  
  return url;
}

export function getDocumentFileName(url: string, type: number): string {
  const typeName = DOCUMENT_TYPE_NAMES[type] || 'Document';
  const extension = url.split('.').pop()?.toLowerCase() || 'pdf';
  return `${typeName.replace(/\s+/g, '_')}.${extension}`;
}

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

export function parsePersonalInfo(data: any): PersonalInfo {
  return {
    fullName: data?.fullName || '',
    dateOfBirth: data?.dateOfBirth || '',
    nationality: data?.nationality || '',
    residenceCountry: data?.residenceCountry || '',
    residenceAddress: data?.residenceAddress || '',
    postalCode: data?.postalCode || '',
    phoneNumber: data?.phoneNumber || '',
    email: data?.email || '',
    taxId: data?.taxId || '',
    occupation: data?.occupation || '',
    sourceOfFunds: data?.sourceOfFunds || '',
    expectedInvestmentRange: data?.expectedInvestmentRange || '',
    politicallyExposed: data?.politicallyExposed || false,
    additionalInfo: data?.additionalInfo || ''
  };
}

export function parseDocumentUrls(data: any): DocumentUrls {
  return {
    governmentId: data?.governmentId || '',
    passport: data?.passport || '',
    driverLicense: data?.driverLicense || '',
    proofOfAddress: data?.proofOfAddress || '',
    bankStatement: data?.bankStatement || '',
    taxDocument: data?.taxDocument || '',
    selfie: data?.selfie || '',
    other: data?.other || ''
  };
}

export function parseValidationScores(data: any): ValidationScores {
  return {
    documentScore: data?.documentScore || 0,
    addressScore: data?.addressScore || 0,
    identityScore: data?.identityScore || 0,
    overallScore: data?.overallScore || 0,
    riskLevel: data?.riskLevel || 0,
    lastUpdated: BigInt(data?.lastUpdated || 0)
  };
}

export function contractDataToStoredSubmission(
  address: string,
  onChainData: OnChainKYCData,
  storedData?: Partial<StoredSubmission>
): StoredSubmission {
  return {
    address,
    tier: onChainData.tier,
    status: onChainData.status,
    personalInfo: storedData?.personalInfo || parsePersonalInfo(null),
    documentUrls: storedData?.documentUrls || parseDocumentUrls(null),
    validationScores: storedData?.validationScores || parseValidationScores(null),
    submittedAt: onChainData.submittedAt.toString(),
    expiresAt: onChainData.expiresAt.toString(),
    totalInvested: storedData?.totalInvested || '0',
    isValid: storedData?.isValid || false,
    upgradeRequest: storedData?.upgradeRequest
  };
}

// ============================================================================
// RISK LEVEL UTILITIES
// ============================================================================

export function getRiskLevelName(level: number): string {
  const levels: Record<number, string> = {
    0: 'Unknown',
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Very High',
    5: 'Critical'
  };
  return levels[level] || 'Unknown';
}

export function getRiskLevelColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'text-gray-400',
    1: 'text-green-400',
    2: 'text-yellow-400',
    3: 'text-orange-400',
    4: 'text-red-400',
    5: 'text-red-600'
  };
  return colors[level] || 'text-gray-400';
}

export function getRiskBadgeColors(level: number): { bg: string; text: string; border: string } {
  const colors: Record<number, { bg: string; text: string; border: string }> = {
    0: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
    1: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    2: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    3: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    4: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    5: { bg: 'bg-red-600/20', text: 'text-red-500', border: 'border-red-600/30' }
  };
  return colors[level] || colors[0];
}

// ============================================================================
// SCORE UTILITIES
// ============================================================================

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// ============================================================================
// CLIPBOARD UTILITIES
// ============================================================================

export async function copyToClipboard(text: string): Promise<boolean> {
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
}

// ============================================================================
// TIER UTILITIES
// ============================================================================

export function getTierRequirements(tier: number): string[] {
  const requirements: Record<number, string[]> = {
    0: [],
    1: ['Basic personal information', 'Email verification'],
    2: ['Government-issued ID', 'Proof of address', 'Phone verification'],
    3: ['All Standard tier requirements', 'Bank statement', 'Source of funds documentation'],
    4: ['All Enhanced tier requirements', 'Tax documentation', 'Additional verification', 'Video call verification']
  };
  return requirements[tier] || [];
}

export function getTierBenefits(tier: number): string[] {
  const benefits: Record<number, string[]> = {
    0: [],
    1: ['Access to public projects', 'Basic investment limits'],
    2: ['Higher investment limits', 'Access to more projects', 'Priority support'],
    3: ['Premium investment limits', 'Early access to projects', 'Dedicated support'],
    4: ['Unlimited investments', 'Exclusive projects', 'VIP support', 'Custom terms']
  };
  return benefits[tier] || [];
}

export function canUpgradeToTier(currentTier: number, targetTier: number): boolean {
  return targetTier > currentTier && targetTier <= 4;
}

export function getNextTier(currentTier: number): number | null {
  if (currentTier >= 4) return null;
  return currentTier + 1;
}
