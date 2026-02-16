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

export type AdminTab = 'overview' | 'projects' | 'offchain' | 'kyc' | 'identity' | 'contracts' | 'factory' | 'settings';

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
