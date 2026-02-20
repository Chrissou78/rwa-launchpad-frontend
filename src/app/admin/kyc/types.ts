// src/app/admin/kyc/types.ts
import { Address } from 'viem';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIER_NAMES: Record<number, string> = {
  0: 'Unverified',
  1: 'Basic',
  2: 'Standard', 
  3: 'Enhanced',
  4: 'Premium'
};

export const TIER_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-purple-500',
  4: 'bg-yellow-500'
};

export const TIER_BADGE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  1: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  2: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  3: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  4: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }
};

export const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'Approved',
  3: 'Rejected',
  4: 'Expired'
};

export const STATUS_COLORS: Record<number, string> = {
  0: 'text-gray-400',
  1: 'text-yellow-400',
  2: 'text-green-400',
  3: 'text-red-400',
  4: 'text-orange-400'
};

export const STATUS_BADGE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  1: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  2: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  3: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  4: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }
};

export const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

export const UPGRADE_STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'Approved',
  3: 'Rejected'
};

export const DOCUMENT_TYPE_NAMES: Record<number, string> = {
  0: 'Government ID',
  1: 'Passport',
  2: 'Driver License',
  3: 'Proof of Address',
  4: 'Bank Statement',
  5: 'Tax Document',
  6: 'Selfie',
  7: 'Other'
};

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentUrls {
  governmentId?: string;
  passport?: string;
  driverLicense?: string;
  proofOfAddress?: string;
  bankStatement?: string;
  taxDocument?: string;
  selfie?: string;
  other?: string;
}

export interface DocumentInfo {
  documentType: number;
  documentHash: string;
  ipfsHash: string;
  uploadedAt: bigint;
  verified: boolean;
  verifiedBy: Address;
  verifiedAt: bigint;
}

export interface ValidationScores {
  documentScore: number;
  addressScore: number;
  identityScore: number;
  overallScore: number;
  riskLevel: number;
  lastUpdated: bigint;
}

export interface PersonalInfo {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  residenceCountry: string;
  residenceAddress: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  taxId: string;
  occupation: string;
  sourceOfFunds: string;
  expectedInvestmentRange: string;
  politicallyExposed: boolean;
  additionalInfo: string;
}

export interface StoredSubmission {
  address: string;
  tier: number;
  status: number;
  personalInfo: PersonalInfo;
  documentUrls: DocumentUrls;
  validationScores: ValidationScores;
  submittedAt: string;
  expiresAt: string;
  totalInvested: string;
  isValid: boolean;
  upgradeRequest?: UpgradeRequest;
}

export interface UpgradeRequest {
  currentTier: number;
  requestedTier: number;
  status: number;
  requestedAt: bigint;
  processedAt: bigint;
  processedBy: Address;
  reason: string;
  additionalDocuments: string[];
}

export interface PendingSubmission {
  address: Address;
  tier: number;
  status: number;
  submittedAt: bigint;
  storedData?: StoredSubmission;
}

export interface PendingUpgrade {
  address: Address;
  currentTier: number;
  requestedTier: number;
  status: number;
  requestedAt: bigint;
  reason: string;
  storedData?: StoredSubmission;
}

export interface KYCSettings {
  kycFee: bigint;
  feeRecipient: Address;
  autoVerifyThreshold: number;
  isPaused: boolean;
  tierLimits: Record<number, bigint>;
  validityPeriods: Record<number, bigint>;
}

export interface SearchResult {
  submission: StoredSubmission | null;
  onChainData: OnChainKYCData | null;
  totalInvested: bigint;
  isValid: boolean;
  upgradeRequest: UpgradeRequest | null;
}

export interface OnChainKYCData {
  tier: number;
  status: number;
  submittedAt: bigint;
  approvedAt: bigint;
  expiresAt: bigint;
  approvedBy: Address;
  rejectionReason: string;
  documentHashes: string[];
}

export interface ResultMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  txHash?: string;
}

export interface ModalState {
  approve: boolean;
  reject: boolean;
  reset: boolean;
  approveUpgrade: boolean;
  rejectUpgrade: boolean;
  documentViewer: boolean;
  updateFee: boolean;
  updateThreshold: boolean;
  updateRecipient: boolean;
  updateTierLimit: boolean;
  confirmPause: boolean;
}

export interface FormInputs {
  rejectReason: string;
  resetReason: string;
  upgradeRejectReason: string;
  newFee: string;
  newThreshold: string;
  newRecipient: string;
  selectedTierForLimit: number;
  newTierLimit: string;
}
