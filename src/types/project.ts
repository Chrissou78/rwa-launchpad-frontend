// src/types/project.ts

import { Address } from 'viem';

// ============================================
// PAYMENT TOKENS (for blockchain payments)
// ============================================

export const ACCEPTED_PAYMENT_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Avalanche Fuji USDC
    decimals: 6,
    icon: '💵'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD', 
    address: '0x1dBe87Efd97c84d3a73807399EBbfcfF13Ff578e', // Avalanche Fuji USDT
    decimals: 6,
    icon: '💲'
  }
] as const;

export type AcceptedPaymentToken = typeof ACCEPTED_PAYMENT_TOKENS[number];
export type PaymentTokenSymbol = AcceptedPaymentToken['symbol'];

// ============================================
// FIAT CURRENCIES
// ============================================

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA', flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA', flag: '🌍' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', flag: '🇷🇼' },
];

// ============================================
// MILESTONES
// ============================================

export interface Milestone {
  id: string;
  title: string;
  description: string;
  percentage: number;
  targetDate?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  percentageOfFunds: number;
  targetDate: string;
  deliverables: string[];
  amountUSD: number;
  amountLocal: number;
}

// ============================================
// PROJECT AMOUNTS
// ============================================

export interface ProjectAmount {
  amount: number;
  currency: string;
}

// ============================================
// PROJECT STATUS
// ============================================

export enum ProjectStatus {
  Pending = 0,
  Active = 1,
  Funded = 2,
  Completed = 3,
  Cancelled = 4,
  Refunding = 5,
}

export const PROJECT_STATUS_NAMES: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Funded',
  3: 'Completed',
  4: 'Cancelled',
  5: 'Refunding',
};

// ============================================
// PROJECT DATA (from smart contract)
// ============================================

/**
 * Raw project data from the RWAProjectNFT contract
 */
export interface ProjectData {
  id: number | bigint;
  owner: Address | string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  status: number;
  securityToken: Address | string;
  escrowVault: Address | string;
  createdAt: bigint;
  completedAt: bigint;
  transferable: boolean;
}

/**
 * Extended project with metadata and computed fields
 */
export interface Project extends ProjectData {
  name: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  category?: string;
  refundsEnabled?: boolean;
  investorCount?: number;
  chainId?: number;
  metadata?: ProjectMetadata;
}

/**
 * Project metadata stored on IPFS
 */
export interface ProjectMetadata {
  name: string;
  description: string;
  shortDescription?: string;
  image?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  website?: string;
  whitepaper?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    linkedin?: string;
    medium?: string;
  };
  team?: TeamMember[];
  documents?: ProjectDocument[];
  tokenomics?: TokenomicsInfo;
  roadmap?: RoadmapItem[];
  legalInfo?: LegalInfo;
  location?: string;
  assetType?: string;
  expectedReturns?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// TEAM & DOCUMENTS
// ============================================

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  image?: string;
  linkedin?: string;
  twitter?: string;
}

export interface ProjectDocument {
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

// ============================================
// TOKENOMICS
// ============================================

export interface TokenomicsInfo {
  totalSupply?: string;
  tokenPrice?: string;
  distribution?: {
    category: string;
    percentage: number;
    description?: string;
  }[];
  vestingSchedule?: {
    category: string;
    cliff?: string;
    duration?: string;
    percentage: number;
  }[];
}

export interface RoadmapItem {
  quarter: string;
  year: string;
  title: string;
  description?: string;
  completed?: boolean;
}

export interface LegalInfo {
  jurisdiction?: string;
  entityType?: string;
  registrationNumber?: string;
  regulatoryStatus?: string;
  disclaimers?: string[];
}

// ============================================
// PROJECT CREATION
// ============================================

/**
 * Form data for creating a new project
 */
export interface ProjectFormData {
  // Basic Info
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  
  // Funding
  fundingGoal: string;
  minInvestment: string;
  maxInvestment: string;
  deadline: Date | string;
  
  // Token
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  transferable: boolean;
  
  // Media
  image?: File | string;
  coverImage?: File | string;
  documents?: File[];
  
  // Links
  website?: string;
  whitepaper?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  
  // Additional
  team?: TeamMember[];
  tokenomics?: TokenomicsInfo;
  legalInfo?: LegalInfo;
}

/**
 * Parameters for contract project creation
 */
export interface ProjectCreationParams {
  metadataURI: string;
  fundingGoal: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: bigint;
  transferable: boolean;
}

// ============================================
// PROJECT FUNDING
// ============================================

/**
 * Funding data from escrow vault
 */
export interface ProjectFunding {
  projectId: bigint;
  totalRaised: bigint;
  investorCount: bigint;
  fundingGoal: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  isActive: boolean;
  refundsEnabled: boolean;
  fundsReleased: boolean;
}

/**
 * Individual investment record
 */
export interface Investment {
  investor: Address | string;
  projectId: number | bigint;
  amount: bigint;
  tokenAmount: bigint;
  timestamp: bigint;
  claimed: boolean;
  refunded: boolean;
  paymentToken: Address | string;
  txHash?: string;
}

// ============================================
// DEPLOYMENT
// ============================================

/**
 * Deployment record from factory
 */
export interface DeploymentRecord {
  projectId: bigint;
  securityToken: Address | string;
  escrowVault: Address | string;
  compliance: Address | string;
  dividendDistributor: Address | string;
  maxBalanceModule: Address | string;
  lockupModule: Address | string;
  deployer: Address | string;
  deployedAt: bigint;
  active: boolean;
}

export type DeployStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'creating'
  | 'confirming'
  | 'deploying'
  | 'success'
  | 'error';

export interface DeploymentResult {
  success: boolean;
  projectId?: number;
  transactionHash?: string;
  deployment?: DeploymentRecord;
  error?: string;
}

// ============================================
// FILTERS & PAGINATION
// ============================================

export interface ProjectFilters {
  status?: ProjectStatus | number | 'all';
  category?: string;
  minFunding?: number;
  maxFunding?: number;
  search?: string;
  chainId?: number;
  owner?: Address | string;
  sortBy?: 'newest' | 'oldest' | 'funding' | 'deadline' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectList {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// STATISTICS
// ============================================

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  fundedProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  totalRaised: bigint;
  totalInvestors: number;
  averageFundingGoal: bigint;
  successRate: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    return `${symbol}${amount.toLocaleString()}`;
  }
}

export function getPaymentTokenBySymbol(symbol: string): AcceptedPaymentToken | undefined {
  return ACCEPTED_PAYMENT_TOKENS.find(t => t.symbol === symbol);
}

export function getPaymentTokenByAddress(address: string): AcceptedPaymentToken | undefined {
  return ACCEPTED_PAYMENT_TOKENS.find(
    t => t.address.toLowerCase() === address.toLowerCase()
  );
}

export function getProjectStatusName(status: number): string {
  return PROJECT_STATUS_NAMES[status] || 'Unknown';
}

export function isProjectActive(status: number): boolean {
  return status === ProjectStatus.Active;
}

export function isProjectFunded(status: number): boolean {
  return status === ProjectStatus.Funded || status === ProjectStatus.Completed;
}

export function calculateFundingProgress(totalRaised: bigint, fundingGoal: bigint): number {
  if (fundingGoal === 0n) return 0;
  return Number((totalRaised * 10000n) / fundingGoal) / 100;
}

export function isDeadlinePassed(deadline: bigint): boolean {
  return deadline > 0n && Number(deadline) < Math.floor(Date.now() / 1000);
}
