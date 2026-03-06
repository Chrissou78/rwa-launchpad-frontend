// KYC Level Constants
export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  STANDARD: 2,
  ACCREDITED: 3,
  INSTITUTIONAL: 4,
} as const;

export const KYC_LEVEL_NAMES: Record<number, string> = {
  [KYC_LEVELS.NONE]: 'None',
  [KYC_LEVELS.BASIC]: 'Basic',
  [KYC_LEVELS.STANDARD]: 'Standard',
  [KYC_LEVELS.ACCREDITED]: 'Accredited',
  [KYC_LEVELS.INSTITUTIONAL]: 'Institutional',
};

// Investment Limits by KYC Tier (in USD)
export const KYC_INVESTMENT_LIMITS = {
  [KYC_LEVELS.NONE]: 0,                // No KYC - cannot invest
  [KYC_LEVELS.BASIC]: 20_000,          // Tier 1: $20,000 max
  [KYC_LEVELS.STANDARD]: 200_000,      // Tier 2: $200,000 max
  [KYC_LEVELS.ACCREDITED]: 2_000_000,  // Tier 3: $2,000,000 max
  [KYC_LEVELS.INSTITUTIONAL]: Infinity, // Tier 4: No limit
} as const;

// Investment Limits in Wei (for on-chain comparison, assuming 1 USD = 1 token unit)
export const KYC_INVESTMENT_LIMITS_WEI = {
  [KYC_LEVELS.NONE]: BigInt(0),
  [KYC_LEVELS.BASIC]: BigInt(20_000) * BigInt(10 ** 18),
  [KYC_LEVELS.STANDARD]: BigInt(200_000) * BigInt(10 ** 18),
  [KYC_LEVELS.ACCREDITED]: BigInt(2_000_000) * BigInt(10 ** 18),
  [KYC_LEVELS.INSTITUTIONAL]: BigInt(2 ** 255), // Max safe bigint
} as const;

// Helper function to get investment limit for a KYC level
export function getInvestmentLimit(kycLevel: number): number {
  if (kycLevel <= 0) return KYC_INVESTMENT_LIMITS[KYC_LEVELS.NONE];
  if (kycLevel === 1) return KYC_INVESTMENT_LIMITS[KYC_LEVELS.BASIC];
  if (kycLevel === 2) return KYC_INVESTMENT_LIMITS[KYC_LEVELS.STANDARD];
  if (kycLevel === 3) return KYC_INVESTMENT_LIMITS[KYC_LEVELS.ACCREDITED];
  return KYC_INVESTMENT_LIMITS[KYC_LEVELS.INSTITUTIONAL];
}

// Format limit for display
export function formatInvestmentLimit(kycLevel: number): string {
  const limit = getInvestmentLimit(kycLevel);
  if (limit === 0) return '$0';
  if (limit === Infinity) return 'Unlimited';
  if (limit >= 1_000_000) return `$${(limit / 1_000_000).toFixed(0)}M`;
  if (limit >= 1_000) return `$${(limit / 1_000).toFixed(0)}K`;
  return `$${limit.toLocaleString()}`;
}

// Check if investment amount is within limit
export function isWithinInvestmentLimit(
  kycLevel: number,
  currentInvested: number,
  newInvestment: number
): boolean {
  const limit = getInvestmentLimit(kycLevel);
  if (limit === Infinity) return true;
  return currentInvested + newInvestment <= limit;
}

// Get remaining investment capacity
export function getRemainingInvestmentCapacity(
  kycLevel: number,
  currentInvested: number
): number {
  const limit = getInvestmentLimit(kycLevel);
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - currentInvested);
}

// KYC Status Types
export type KYCStatus = 
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'under_review';

// Restricted Countries (ISO 3166-1 numeric codes)
export const RESTRICTED_COUNTRIES = [
  408, // North Korea
  364, // Iran
  729, // Sudan
  760, // Syria
  192, // Cuba
] as const;

// KYC Expiry Duration (in seconds) - 1 year
export const KYC_EXPIRY_DURATION = 365 * 24 * 60 * 60;

// Link Code Configuration
export const LINK_CODE_LENGTH = 8;
export const LINK_CODE_EXPIRY = 15 * 60; // 15 minutes in seconds
export const MAX_LINKED_WALLETS = 10;

// Registration Fee (in ETH)
export const DEFAULT_REGISTRATION_FEE = '0.001';
