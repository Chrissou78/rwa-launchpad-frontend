// src/app/admin/constants.ts

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const OFFCHAIN_PAYMENT = '0x0000000000000000000000000000000000000001';

export const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Pending',
  2: 'Active',
  3: 'Funded',
  4: 'In Progress',
  5: 'Completed',
  6: 'Cancelled',
  7: 'Failed',
};

export const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-yellow-500',
  2: 'bg-green-500',
  3: 'bg-blue-500',
  4: 'bg-purple-500',
  5: 'bg-emerald-500',
  6: 'bg-red-500',
  7: 'bg-red-700',
};

export const PROJECT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
  1: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  2: { label: 'Active', color: 'bg-green-500/20 text-green-400' },
  3: { label: 'Funded', color: 'bg-blue-500/20 text-blue-400' },
  4: { label: 'In Progress', color: 'bg-purple-500/20 text-purple-400' },
  5: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400' },
  6: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
  7: { label: 'Failed', color: 'bg-red-700/20 text-red-400' },
};

export const MILESTONE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-gray-500' },
  1: { label: 'Submitted', color: 'bg-yellow-500' },
  2: { label: 'Approved', color: 'bg-green-500' },
  3: { label: 'Rejected', color: 'bg-red-500' },
  4: { label: 'Disputed', color: 'bg-orange-500' },
  5: { label: 'Released', color: 'bg-blue-500' },
};

export const KYC_LEVELS: Record<number, string> = {
  0: 'None',
  1: 'Basic',
  2: 'Standard',
  3: 'Accredited',
  4: 'Institutional',
};

export const KYC_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-yellow-500' },
  1: { label: 'Approved', color: 'bg-green-500' },
  2: { label: 'Rejected', color: 'bg-red-500' },
  3: { label: 'Expired', color: 'bg-gray-500' },
};

export const COUNTRY_CODES: Record<number, string> = {
  840: 'United States',
  826: 'United Kingdom',
  276: 'Germany',
  250: 'France',
  392: 'Japan',
  156: 'China',
  356: 'India',
  124: 'Canada',
  36: 'Australia',
  756: 'Switzerland',
};

// Tokenization status config
export const TOKENIZATION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  under_review: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  payment_confirmed: { label: 'Payment Confirmed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  creation_ready: { label: 'Ready to Create', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  company_equity: 'Company Equity',
  real_estate: 'Real Estate',
  commodity: 'Commodities',
  product_inventory: 'Product Inventory',
  intellectual_property: 'Intellectual Property',
  revenue_stream: 'Revenue Streams',
  equipment: 'Equipment',
  vehicles: 'Vehicles',
  agricultural: 'Agricultural',
  energy: 'Energy',
  other: 'Other',
};

export type AdminTab = 
  | 'overview' 
  | 'projects' 
  | 'tokenization'
  | 'offchain' 
  | 'kyc' 
  | 'identity' 
  | 'contracts' 
  | 'factory' 
  | 'users' 
  | 'settings';

export interface Project {
  id: number;
  owner: string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  completedAt: bigint;
  transferable: boolean;
  name?: string;
  refundsEnabled?: boolean;
}

export interface DeploymentRecord {
  projectId: bigint;
  securityToken: string;
  escrowVault: string;
  compliance: string;
  dividendDistributor: string;
  maxBalanceModule: string;
  lockupModule: string;
  deployer: string;
  deployedAt: bigint;
  active: boolean;
}

export interface Milestone {
  description: string;
  percentage: bigint;
  status: number;
  proofURI: string;
  submittedAt: bigint;
  approvedAt: bigint;
  releasedAmount: bigint;
  rejectionReason: string;
  disputeRaiser: string;
  disputeReason: string;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  deposited: bigint;
  released: bigint;
  available: bigint;
}

export interface VaultSettings {
  address: string;
  transactionFee: bigint;
  collectedFees: bigint;
  feeRecipient: string;
  error?: string;
}

export interface KYCSubmissionData {
  investor: string;
  level: number;
  status: number;
  submittedAt: bigint;
  reviewedAt: bigint;
  expiresAt: bigint;
  reviewer: string;
  documentHash: string;
  countryCode: number;
}

export interface KYCStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface TokenizationStats {
  total: number;
  pending: number;
  approved: number;
  completed: number;
}

export interface TokenizationApplication {
  id: string;
  wallet_address: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  website?: string;
  asset_type: string;
  asset_name: string;
  asset_description: string;
  estimated_value: number;
  token_name?: string;
  token_symbol?: string;
  total_supply?: string;
  use_case: string;
  additional_info?: string;
  needs_escrow: boolean;
  needs_dividends: boolean;
  fee_amount: number;
  fee_currency: string;
  status: string;
  admin_notes?: string;
  documents?: TokenizationDocument[];
  created_at: string;
  updated_at: string;
  deployment_tx_hash?: string;
  token_address?: string;
  nft_address?: string;
  escrow_address?: string;
}

export interface TokenizationDocument {
  name: string;
  type: string;
  url: string;
  mimeType: string;
  size: number;
}