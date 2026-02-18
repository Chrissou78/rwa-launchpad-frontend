Copy// src/lib/trade/kyc-authorization.ts

// =============================================================================
// KYC LEVEL DEFINITIONS FOR TRADE
// =============================================================================

export type KYCLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TradeLimits {
  maxDealValue: number;
  maxMonthlyVolume: number;
  maxActiveDeals: number;
  allowedProductCategories: string[];
  restrictedCountries: string[];
  requiresEnhancedDueDiligence: boolean;
  escrowRequired: boolean;
  inspectionRequired: boolean;
  allowedPaymentMethods: string[];
  maxMilestones: number;
  minAdvancePayment: number; // Minimum advance payment percentage
  maxPaymentRelease: number; // Maximum single payment release percentage
}

export const KYC_TRADE_LIMITS: Record<KYCLevel, TradeLimits> = {
  none: {
    maxDealValue: 0,
    maxMonthlyVolume: 0,
    maxActiveDeals: 0,
    allowedProductCategories: [],
    restrictedCountries: ['*'], // All countries restricted
    requiresEnhancedDueDiligence: true,
    escrowRequired: true,
    inspectionRequired: true,
    allowedPaymentMethods: [],
    maxMilestones: 0,
    minAdvancePayment: 100,
    maxPaymentRelease: 0,
  },
  
  bronze: {
    maxDealValue: 10_000, // $10,000 per deal
    maxMonthlyVolume: 25_000, // $25,000 per month
    maxActiveDeals: 2,
    allowedProductCategories: [
      'manufactured_goods',
      'textiles',
      'electronics',
    ],
    restrictedCountries: [
      'KP', 'IR', 'SY', 'CU', 'VE', 'RU', 'BY', // Sanctioned
      'AF', 'IQ', 'LY', 'SO', 'SS', 'YE', // High-risk
    ],
    requiresEnhancedDueDiligence: false,
    escrowRequired: true,
    inspectionRequired: false,
    allowedPaymentMethods: ['USDC', 'USDT'],
    maxMilestones: 3,
    minAdvancePayment: 50, // 50% minimum advance
    maxPaymentRelease: 50, // Max 50% per release
  },

  silver: {
    maxDealValue: 100_000, // $100,000 per deal
    maxMonthlyVolume: 500_000, // $500,000 per month
    maxActiveDeals: 5,
    allowedProductCategories: [
      'manufactured_goods',
      'textiles',
      'electronics',
      'machinery',
      'automotive',
      'raw_materials',
      'food_beverage',
      'agricultural',
    ],
    restrictedCountries: [
      'KP', 'IR', 'SY', 'CU', 'VE', 'RU', 'BY', // Sanctioned only
    ],
    requiresEnhancedDueDiligence: false,
    escrowRequired: true,
    inspectionRequired: true,
    allowedPaymentMethods: ['USDC', 'USDT', 'ETH'],
    maxMilestones: 5,
    minAdvancePayment: 30, // 30% minimum advance
    maxPaymentRelease: 50, // Max 50% per release
  },

  gold: {
    maxDealValue: 1_000_000, // $1,000,000 per deal
    maxMonthlyVolume: 5_000_000, // $5,000,000 per month
    maxActiveDeals: 15,
    allowedProductCategories: [
      'manufactured_goods',
      'textiles',
      'electronics',
      'machinery',
      'automotive',
      'raw_materials',
      'food_beverage',
      'agricultural',
      'commodities',
      'metals',
      'chemicals',
      'energy',
    ],
    restrictedCountries: [
      'KP', 'IR', 'SY', // Strictly sanctioned only
    ],
    requiresEnhancedDueDiligence: true,
    escrowRequired: true,
    inspectionRequired: true,
    allowedPaymentMethods: ['USDC', 'USDT', 'ETH', 'WBTC'],
    maxMilestones: 8,
    minAdvancePayment: 20, // 20% minimum advance
    maxPaymentRelease: 60, // Max 60% per release
  },

  diamond: {
    maxDealValue: 50_000_000, // $50,000,000 per deal
    maxMonthlyVolume: 200_000_000, // $200,000,000 per month
    maxActiveDeals: 50,
    allowedProductCategories: [
      'manufactured_goods',
      'textiles',
      'electronics',
      'machinery',
      'automotive',
      'raw_materials',
      'food_beverage',
      'agricultural',
      'commodities',
      'metals',
      'chemicals',
      'energy',
      'pharmaceuticals', // Diamond only
    ],
    restrictedCountries: [
      'KP', // Only North Korea
    ],
    requiresEnhancedDueDiligence: true,
    escrowRequired: false, // Optional escrow
    inspectionRequired: true,
    allowedPaymentMethods: ['USDC', 'USDT', 'ETH', 'WBTC'],
    maxMilestones: 12,
    minAdvancePayment: 10, // 10% minimum advance
    maxPaymentRelease: 80, // Max 80% per release
  },
};

// =============================================================================
// KYC LEVEL DISPLAY INFO
// =============================================================================

export const KYC_LEVEL_INFO: Record<KYCLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  requirements: string[];
}> = {
  none: {
    label: 'Not Verified',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: '🔒',
    description: 'Complete KYC verification to start trading',
    requirements: [],
  },
  bronze: {
    label: 'Bronze',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: '🥉',
    description: 'Basic verification for small trades',
    requirements: [
      'Government ID verification',
      'Email verification',
      'Phone verification',
    ],
  },
  silver: {
    label: 'Silver',
    color: 'text-slate-300',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/20',
    icon: '🥈',
    description: 'Standard verification for medium trades',
    requirements: [
      'All Bronze requirements',
      'Proof of address',
      'Company registration documents',
      'Basic source of funds declaration',
    ],
  },
  gold: {
    label: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: '🥇',
    description: 'Enhanced verification for large trades',
    requirements: [
      'All Silver requirements',
      'Beneficial ownership declaration',
      'Bank reference letter',
      'Audited financial statements',
      'Enhanced due diligence review',
    ],
  },
  diamond: {
    label: 'Diamond',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    icon: '💎',
    description: 'Premium verification for enterprise trades',
    requirements: [
      'All Gold requirements',
      'On-site verification',
      'Board resolution',
      'Credit rating report',
      'Insurance certificates',
      'Dedicated compliance officer review',
    ],
  },
};

// =============================================================================
// AUTHORIZATION FUNCTIONS
// =============================================================================

export interface TradeAuthorizationResult {
  authorized: boolean;
  kycLevel: KYCLevel;
  limits: TradeLimits;
  errors: string[];
  warnings: string[];
  requiredUpgrade?: KYCLevel;
}

export function checkTradeAuthorization(
  buyerKycLevel: KYCLevel,
  sellerKycLevel: KYCLevel,
  dealValue: number,
  productCategory: string,
  buyerCountry: string,
  sellerCountry: string,
  buyerActiveDeals: number,
  buyerMonthlyVolume: number,
): TradeAuthorizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Use the lower of the two KYC levels for deal limits
  const effectiveLevel = getLowestKycLevel(buyerKycLevel, sellerKycLevel);
  const limits = KYC_TRADE_LIMITS[effectiveLevel];

  // Check if trading is allowed at all
  if (effectiveLevel === 'none') {
    errors.push('Both parties must complete KYC verification to trade');
    return {
      authorized: false,
      kycLevel: effectiveLevel,
      limits,
      errors,
      warnings,
      requiredUpgrade: 'bronze',
    };
  }

  // Check deal value limit
  if (dealValue > limits.maxDealValue) {
    errors.push(
      `Deal value ($${dealValue.toLocaleString()}) exceeds ${KYC_LEVEL_INFO[effectiveLevel].label} limit ($${limits.maxDealValue.toLocaleString()})`
    );
    const requiredLevel = findRequiredLevel(dealValue, 'maxDealValue');
    if (requiredLevel) {
      return {
        authorized: false,
        kycLevel: effectiveLevel,
        limits,
        errors,
        warnings,
        requiredUpgrade: requiredLevel,
      };
    }
  }

  // Check monthly volume
  const projectedVolume = buyerMonthlyVolume + dealValue;
  if (projectedVolume > limits.maxMonthlyVolume) {
    errors.push(
      `Monthly volume would exceed ${KYC_LEVEL_INFO[effectiveLevel].label} limit ($${limits.maxMonthlyVolume.toLocaleString()})`
    );
  }

  // Check active deals limit
  if (buyerActiveDeals >= limits.maxActiveDeals) {
    errors.push(
      `Maximum active deals (${limits.maxActiveDeals}) reached for ${KYC_LEVEL_INFO[effectiveLevel].label}`
    );
  }

  // Check product category
  if (!limits.allowedProductCategories.includes(productCategory)) {
    errors.push(
      `Product category "${productCategory}" not allowed for ${KYC_LEVEL_INFO[effectiveLevel].label} level`
    );
    const requiredLevel = findLevelForCategory(productCategory);
    if (requiredLevel) {
      warnings.push(`Upgrade to ${KYC_LEVEL_INFO[requiredLevel].label} to trade this category`);
    }
  }

  // Check restricted countries
  if (limits.restrictedCountries.includes(buyerCountry)) {
    errors.push(`Trading with ${buyerCountry} is restricted at your KYC level`);
  }
  if (limits.restrictedCountries.includes(sellerCountry)) {
    errors.push(`Trading with ${sellerCountry} is restricted at your KYC level`);
  }

  // Add warnings for near-limit situations
  if (dealValue > limits.maxDealValue * 0.8) {
    warnings.push('Deal value is near your limit. Consider upgrading KYC for higher limits.');
  }
  if (projectedVolume > limits.maxMonthlyVolume * 0.8) {
    warnings.push('Approaching monthly volume limit.');
  }
  if (buyerActiveDeals >= limits.maxActiveDeals - 1) {
    warnings.push('Approaching active deals limit.');
  }

  // EDD warning
  if (limits.requiresEnhancedDueDiligence) {
    warnings.push('This deal requires Enhanced Due Diligence review.');
  }

  return {
    authorized: errors.length === 0,
    kycLevel: effectiveLevel,
    limits,
    errors,
    warnings,
  };
}

function getLowestKycLevel(level1: KYCLevel, level2: KYCLevel): KYCLevel {
  const order: KYCLevel[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];
  const index1 = order.indexOf(level1);
  const index2 = order.indexOf(level2);
  return order[Math.min(index1, index2)];
}

function findRequiredLevel(value: number, limitType: keyof TradeLimits): KYCLevel | null {
  const levels: KYCLevel[] = ['bronze', 'silver', 'gold', 'diamond'];
  for (const level of levels) {
    const limit = KYC_TRADE_LIMITS[level][limitType];
    if (typeof limit === 'number' && value <= limit) {
      return level;
    }
  }
  return null;
}

function findLevelForCategory(category: string): KYCLevel | null {
  const levels: KYCLevel[] = ['bronze', 'silver', 'gold', 'diamond'];
  for (const level of levels) {
    if (KYC_TRADE_LIMITS[level].allowedProductCategories.includes(category)) {
      return level;
    }
  }
  return null;
}

// =============================================================================
// MILESTONE VALIDATION
// =============================================================================

export function validateMilestones(
  kycLevel: KYCLevel,
  milestones: { paymentPercentage: number }[],
): { valid: boolean; errors: string[] } {
  const limits = KYC_TRADE_LIMITS[kycLevel];
  const errors: string[] = [];

  // Check number of milestones
  if (milestones.length > limits.maxMilestones) {
    errors.push(
      `Maximum ${limits.maxMilestones} milestones allowed for ${KYC_LEVEL_INFO[kycLevel].label}`
    );
  }

  // Check advance payment (first milestone)
  const advancePayment = milestones[0]?.paymentPercentage || 0;
  if (advancePayment < limits.minAdvancePayment) {
    errors.push(
      `Minimum advance payment is ${limits.minAdvancePayment}% for ${KYC_LEVEL_INFO[kycLevel].label}`
    );
  }

  // Check individual milestone limits
  for (let i = 0; i < milestones.length; i++) {
    if (milestones[i].paymentPercentage > limits.maxPaymentRelease) {
      errors.push(
        `Milestone ${i + 1} exceeds maximum payment release of ${limits.maxPaymentRelease}%`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// DEAL REQUIREMENTS CHECK
// =============================================================================

export interface DealRequirements {
  escrowRequired: boolean;
  inspectionRequired: boolean;
  eddRequired: boolean;
  documentsRequired: string[];
  additionalChecks: string[];
}

export function getDealRequirements(
  kycLevel: KYCLevel,
  dealValue: number,
  productCategory: string,
  originCountry: string,
  destinationCountry: string,
): DealRequirements {
  const limits = KYC_TRADE_LIMITS[kycLevel];
  const requirements: DealRequirements = {
    escrowRequired: limits.escrowRequired,
    inspectionRequired: limits.inspectionRequired,
    eddRequired: limits.requiresEnhancedDueDiligence,
    documentsRequired: [],
    additionalChecks: [],
  };

  // Standard documents
  requirements.documentsRequired = [
    'purchase_agreement_signed',
    'commercial_invoice',
    'packing_list',
  ];

  // Add category-specific documents
  switch (productCategory) {
    case 'pharmaceuticals':
      requirements.documentsRequired.push('gmp_cert', 'import_license', 'batch_records');
      requirements.inspectionRequired = true;
      break;
    case 'food_beverage':
      requirements.documentsRequired.push('health_cert', 'phytosanitary_cert');
      break;
    case 'chemicals':
      requirements.documentsRequired.push('msds', 'hazmat_cert');
      break;
    case 'agricultural':
      requirements.documentsRequired.push('phytosanitary_cert', 'fumigation_cert');
      break;
    case 'electronics':
      requirements.documentsRequired.push('fcc_cert', 'ce_marking');
      break;
    case 'commodities':
    case 'metals':
      requirements.documentsRequired.push('assay_cert', 'warehouse_receipt');
      break;
  }

  // High-value deals require additional checks
  if (dealValue > 500_000) {
    requirements.eddRequired = true;
    requirements.additionalChecks.push('Enhanced source of funds verification');
    requirements.additionalChecks.push('Senior management approval');
  }

  if (dealValue > 1_000_000) {
    requirements.additionalChecks.push('Board approval required');
    requirements.additionalChecks.push('External audit trail');
  }

  // Inspection always required for large deals
  if (dealValue > 250_000) {
    requirements.inspectionRequired = true;
  }

  return requirements;
}