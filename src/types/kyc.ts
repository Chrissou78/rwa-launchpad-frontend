// src/types/kyc.ts
import { DocumentType } from '@/lib/documentValidation';

// ======================================
// TYPES & INTERFACES
// ======================================

export interface Country {
  code: number;
  name: string;
  blocked: boolean;
}

export interface LivenessResult {
  passed: boolean;
  score: number;
  completedChallenges: number;
  totalChallenges: number;
  screenshots?: string[];
  timestamp: number;
}

export interface DocumentCapture {
  front: File | null;
  back: File | null;
  frontPreview: string | null;
  backPreview: string | null;
}

export interface WebcamCaptureState {
  isOpen: boolean;
  side: 'front' | 'back';
}

export interface OCRProgress {
  status: 'idle' | 'loading' | 'preprocessing' | 'recognizing' | 'extracting' | 'validating' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface ValidationError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

export interface SubmissionResult {
  autoApproved: boolean;
  status: string;
  verificationScore: number;
}

export interface VerifiedDocuments {
  idDocument: boolean;
  selfie: boolean;
  addressProof: boolean;
  accreditedProof: boolean;
}

export interface RequirementWithStatus {
  requirement: string;
  verified: boolean;
  key: string;
}

// ======================================
// CONSTANTS
// ======================================

export const TIER_ORDER = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
export const MAX_TIER_INDEX = 4;
export const MAX_RETRIES = 3;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const TIER_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond'
};

export const TIER_NEW_REQUIREMENTS: Record<number, {
  needsPersonalInfo: boolean;
  needsIdDocument: boolean;
  needsSelfie: boolean;
  needsLiveness: boolean;
  needsAddressProof: boolean;
  needsAccreditedProof: boolean;
}> = {
  1: { needsPersonalInfo: true, needsIdDocument: true, needsSelfie: false, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: false },
  2: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: true, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: false },
  3: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: false, needsLiveness: true, needsAddressProof: true, needsAccreditedProof: false },
  4: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: false, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: true }
};

export const COUNTRY_CODE_TO_NAME: Record<number, string> = {
  840: 'United States',
  826: 'United Kingdom',
  276: 'Germany',
  250: 'France',
  208: 'Denmark',
  380: 'Italy',
  724: 'Spain',
  528: 'Netherlands',
  56: 'Belgium',
  40: 'Austria',
  756: 'Switzerland',
  620: 'Portugal',
  372: 'Ireland',
  752: 'Sweden',
  578: 'Norway',
  246: 'Finland',
  616: 'Poland',
  203: 'Czech Republic',
  348: 'Hungary',
  300: 'Greece',
  124: 'Canada',
  36: 'Australia',
  554: 'New Zealand',
  392: 'Japan',
  410: 'South Korea',
  702: 'Singapore',
  344: 'Hong Kong',
  158: 'Taiwan',
  484: 'Mexico',
  76: 'Brazil',
  32: 'Argentina'
};

export const TIER_STYLES: Record<number, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  requirements: string[];
}> = {
  0: {
    name: 'None',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
    borderColor: 'border-gray-600',
    icon: '⚪',
    description: 'No verification',
    requirements: []
  },
  1: {
    name: 'Bronze',
    color: 'text-orange-400',
    bgColor: 'bg-gradient-to-br from-orange-900/30 to-orange-800/20',
    borderColor: 'border-orange-500/50',
    icon: '🥉',
    description: 'Basic verification',
    requirements: ['Personal Information', 'Government-issued ID']
  },
  2: {
    name: 'Silver',
    color: 'text-gray-300',
    bgColor: 'bg-gradient-to-br from-gray-700/30 to-gray-600/20',
    borderColor: 'border-gray-400/50',
    icon: '🥈',
    description: 'Enhanced verification',
    requirements: ['Selfie Photo']
  },
  3: {
    name: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20',
    borderColor: 'border-yellow-500/50',
    icon: '🥇',
    description: 'Advanced verification',
    requirements: ['Liveness Check', 'Proof of Address']
  },
  4: {
    name: 'Diamond',
    color: 'text-cyan-400',
    bgColor: 'bg-gradient-to-br from-cyan-900/30 to-cyan-800/20',
    borderColor: 'border-cyan-500/50',
    icon: '💎',
    description: 'Maximum verification',
    requirements: ['Accredited Investor Documentation']
  }
};

export const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'Auto Verifying',
  3: 'Manual Review',
  4: 'Approved',
  5: 'Rejected',
  6: 'Expired',
  7: 'Revoked'
};

export const REJECTION_REASONS: Record<number, string> = {
  0: 'Not rejected',
  1: 'Blocked country',
  2: 'Underage',
  3: 'Invalid document',
  4: 'Document expired',
  5: 'Face mismatch',
  6: 'Liveness check failed',
  7: 'Suspicious activity',
  8: 'Duplicate submission',
  9: 'Other'
};

// ======================================
// HELPER FUNCTIONS
// ======================================

export function getRequirementsForUpgrade(currentLevel: number, targetLevel: number) {
  const requirements = {
    needsPersonalInfo: false,
    needsIdDocument: false,
    needsSelfie: false,
    needsLiveness: false,
    needsAddressProof: false,
    needsAccreditedProof: false
  };

  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const tierReqs = TIER_NEW_REQUIREMENTS[level];
    if (tierReqs) {
      if (tierReqs.needsPersonalInfo) requirements.needsPersonalInfo = true;
      if (tierReqs.needsIdDocument) requirements.needsIdDocument = true;
      if (tierReqs.needsSelfie) requirements.needsSelfie = true;
      if (tierReqs.needsLiveness) requirements.needsLiveness = true;
      if (tierReqs.needsAddressProof) requirements.needsAddressProof = true;
      if (tierReqs.needsAccreditedProof) requirements.needsAccreditedProof = true;
    }
  }

  return requirements;
}

export function getRequirementsList(requirements: ReturnType<typeof getRequirementsForUpgrade>): string[] {
  const list: string[] = [];
  if (requirements.needsPersonalInfo) list.push('Personal Information');
  if (requirements.needsIdDocument) list.push('Valid ID document');
  if (requirements.needsSelfie) list.push('Selfie photo');
  if (requirements.needsLiveness) list.push('Liveness Check');
  if (requirements.needsAddressProof) list.push('Proof of address');
  if (requirements.needsAccreditedProof) list.push('Accredited investor proof');
  return list;
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getPreferredFacingMode(forSelfie: boolean): 'user' | 'environment' {
  return forSelfie ? 'user' : 'environment';
}

export function mapContractError(error: Error): string {
  const message = error.message || '';
  
  // Existing errors
  if (message.includes('AlreadySubmitted')) return 'You already have an active KYC submission. Use upgrade instead.';
  if (message.includes('InvalidLevel')) return 'Invalid tier level selected';
  if (message.includes('BlockedCountry') || message.includes('CountryBlockedError')) return 'KYC is not available in your country';
  if (message.includes('Underage')) return 'You must be at least 18 years old';
  if (message.includes('rejected')) return 'Transaction was rejected';
  
  // Upgrade-specific errors
  if (message.includes('MustHaveApprovedKYC')) return 'You must have approved KYC before upgrading';
  if (message.includes('CannotDowngrade')) return 'Cannot downgrade to a lower tier';
  if (message.includes('UpgradeAlreadyPending')) return 'You already have a pending upgrade request';
  if (message.includes('NoUpgradePending')) return 'No upgrade request pending';
  
  // Fee errors
  if (message.includes('InsufficientFee')) return 'Insufficient fee. Please ensure you have enough ETH.';
  if (message.includes('FeeTransferFailed')) return 'Fee transfer failed. Please try again.';
  
  // Generic
  if (message.includes('NotPending')) return 'This submission is not pending review';
  
  return 'Transaction failed. Please try again.';
}

/**
 * Determines which documents are already verified based on the user's approved tier index
 * @param approvedTierIndex - The numeric tier index (0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond)
 */
export function getVerifiedDocumentsForTier(approvedTierIndex: number): VerifiedDocuments {
  // Bronze (1) and above have ID + Selfie verified
  const hasBasicVerification = approvedTierIndex >= 1;
  
  // Silver (2) and above have Selfie verified (in addition to ID from Bronze)
  const hasSelfie = approvedTierIndex >= 2;
  
  // Gold (3) and above have Address Proof verified
  const hasAddressProof = approvedTierIndex >= 3;
  
  // Diamond (4) has Accredited Proof verified
  const hasAccreditedProof = approvedTierIndex >= 4;
  
  return {
    idDocument: hasBasicVerification,
    selfie: hasSelfie,
    addressProof: hasAddressProof,
    accreditedProof: hasAccreditedProof,
  };
}

/**
 * Gets requirements for a target tier with verification status based on current approved tier
 * @param targetTierIndex - The numeric tier index being applied for
 * @param approvedTierIndex - The numeric tier index already approved
 */
export function getRequirementsWithStatus(
  targetTierIndex: number,
  approvedTierIndex: number
): RequirementWithStatus[] {
  // Get all requirements needed for the target tier (from None to target)
  const allRequirements = getRequirementsForUpgrade(0, targetTierIndex);
  const requirementLabels = getRequirementsList(allRequirements);
  const verified = getVerifiedDocumentsForTier(approvedTierIndex);
  
  const requirementMap: Record<string, keyof VerifiedDocuments> = {
    'Personal Information': 'idDocument',
    'Valid ID document': 'idDocument',
    'Selfie photo': 'selfie',
    'Liveness Check': 'selfie', // Liveness is tied to selfie verification
    'Proof of address': 'addressProof',
    'Accredited investor proof': 'accreditedProof',
  };
  
  return requirementLabels.map(req => {
    const key = requirementMap[req];
    return {
      requirement: req,
      verified: key ? verified[key] : false,
      key: key || req,
    };
  });
}
