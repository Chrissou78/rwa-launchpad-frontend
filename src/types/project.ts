export interface ProjectMetadata {
  name: string;
  description: string;
  image: string; // IPFS hash for logo
  external_url?: string;
  documents?: {
    whitepaper?: string;
    financials?: string;
    legal?: string;
    pitch_deck?: string;
  };
  attributes: {
    category: string;
    jurisdiction: string;
    company_name: string;
    projected_roi: number; // percentage
    dividend_frequency?: 'monthly' | 'quarterly' | 'annually';
    minimum_holding_period?: number; // days
  };
  social?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

export type BadgeType = 'wildcard' | 'verified' | 'sponsored';
export type BadgeColor = 'bronze' | 'silver' | 'gold';

export interface ProjectBadge {
  type: BadgeType;
  color: BadgeColor;
}

export interface Project {
  id: bigint;
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
  compliance: string;
  createdAt: bigint;
  investorCount: bigint;
  cancelled: boolean;
  // Enriched data
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
  badge?: ProjectBadge;
}

export interface UserInvestment {
  projectId: bigint;
  amount: bigint;
  tokenBalance: bigint;
  investedAt: bigint;
  claimedDividends: bigint;
  pendingDividends: bigint;
}

export interface UserProfile {
  address: string;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycLevel: number; // 0 = none, 1 = basic, 2 = accredited
  totalInvested: bigint;
  totalReturns: bigint;
  investments: UserInvestment[];
}

export const STATUS_LABELS = ['Draft', 'Active', 'Funded', 'Completed', 'Cancelled'];
export const STATUS_COLORS = ['gray', 'blue', 'green', 'purple', 'red'];
