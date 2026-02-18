// src/lib/trade/constants.ts

// =============================================================================
// DEAL STATUS & STAGES
// =============================================================================

export type DealStage = 
  | 'draft'
  | 'loi_pending'
  | 'loi_signed'
  | 'kyc_verification'
  | 'contract_negotiation'
  | 'contract_signed'
  | 'payment_deposited'
  | 'production'
  | 'quality_inspection'
  | 'shipping'
  | 'customs_clearance'
  | 'delivery'
  | 'inspection_final'
  | 'payment_released'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export const DEAL_STAGES: Record<DealStage, {
  label: string;
  description: string;
  order: number;
  category: 'initiation' | 'compliance' | 'contract' | 'payment' | 'fulfillment' | 'completion';
  requiredDocuments: string[];
  nextStages: DealStage[];
}> = {
  draft: {
    label: 'Draft',
    description: 'Deal is being drafted',
    order: 1,
    category: 'initiation',
    requiredDocuments: [],
    nextStages: ['loi_pending', 'cancelled'],
  },
  loi_pending: {
    label: 'LOI Pending',
    description: 'Letter of Intent awaiting signatures',
    order: 2,
    category: 'initiation',
    requiredDocuments: ['loi'],
    nextStages: ['loi_signed', 'cancelled'],
  },
  loi_signed: {
    label: 'LOI Signed',
    description: 'Letter of Intent signed by all parties',
    order: 3,
    category: 'initiation',
    requiredDocuments: ['loi_signed'],
    nextStages: ['kyc_verification'],
  },
  kyc_verification: {
    label: 'KYC Verification',
    description: 'Compliance verification in progress',
    order: 4,
    category: 'compliance',
    requiredDocuments: ['kyc_buyer', 'kyc_seller', 'company_docs'],
    nextStages: ['contract_negotiation', 'cancelled'],
  },
  contract_negotiation: {
    label: 'Contract Negotiation',
    description: 'Purchase agreement being negotiated',
    order: 5,
    category: 'contract',
    requiredDocuments: ['purchase_agreement_draft'],
    nextStages: ['contract_signed', 'cancelled'],
  },
  contract_signed: {
    label: 'Contract Signed',
    description: 'Purchase agreement executed',
    order: 6,
    category: 'contract',
    requiredDocuments: ['purchase_agreement_signed'],
    nextStages: ['payment_deposited'],
  },
  payment_deposited: {
    label: 'Payment Deposited',
    description: 'Buyer funds deposited in escrow',
    order: 7,
    category: 'payment',
    requiredDocuments: ['escrow_receipt'],
    nextStages: ['production'],
  },
  production: {
    label: 'In Production',
    description: 'Goods being manufactured/prepared',
    order: 8,
    category: 'fulfillment',
    requiredDocuments: ['production_schedule', 'quality_cert'],
    nextStages: ['quality_inspection'],
  },
  quality_inspection: {
    label: 'Quality Inspection',
    description: 'Pre-shipment inspection',
    order: 9,
    category: 'fulfillment',
    requiredDocuments: ['inspection_report', 'quality_cert'],
    nextStages: ['shipping', 'disputed'],
  },
  shipping: {
    label: 'Shipping',
    description: 'Goods in transit',
    order: 10,
    category: 'fulfillment',
    requiredDocuments: ['bill_of_lading', 'commercial_invoice', 'packing_list', 'insurance_cert'],
    nextStages: ['customs_clearance'],
  },
  customs_clearance: {
    label: 'Customs Clearance',
    description: 'Goods clearing customs',
    order: 11,
    category: 'fulfillment',
    requiredDocuments: ['customs_declaration', 'certificate_of_origin', 'import_license'],
    nextStages: ['delivery'],
  },
  delivery: {
    label: 'Delivery',
    description: 'Goods being delivered to buyer',
    order: 12,
    category: 'fulfillment',
    requiredDocuments: ['delivery_receipt'],
    nextStages: ['inspection_final'],
  },
  inspection_final: {
    label: 'Final Inspection',
    description: 'Buyer verifying goods received',
    order: 13,
    category: 'completion',
    requiredDocuments: ['acceptance_cert'],
    nextStages: ['payment_released', 'disputed'],
  },
  payment_released: {
    label: 'Payment Released',
    description: 'Escrow releasing funds to seller',
    order: 14,
    category: 'completion',
    requiredDocuments: ['release_confirmation'],
    nextStages: ['completed'],
  },
  completed: {
    label: 'Completed',
    description: 'Deal successfully completed',
    order: 15,
    category: 'completion',
    requiredDocuments: [],
    nextStages: [],
  },
  disputed: {
    label: 'Disputed',
    description: 'Deal is under dispute resolution',
    order: 100,
    category: 'completion',
    requiredDocuments: ['dispute_claim'],
    nextStages: ['payment_released', 'cancelled'],
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Deal has been cancelled',
    order: 101,
    category: 'completion',
    requiredDocuments: [],
    nextStages: [],
  },
};

// =============================================================================
// TRADE DOCUMENT TYPES
// =============================================================================

export type DocumentCategory = 
  | 'initiation'
  | 'compliance'
  | 'commercial'
  | 'shipping'
  | 'customs'
  | 'financial'
  | 'inspection'
  | 'legal';

export interface TradeDocumentType {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  requiredFor: DealStage[];
  validationRules: {
    maxSize: number; // MB
    allowedTypes: string[];
    expiryDays?: number;
    requiresSignature?: boolean;
    requiresNotarization?: boolean;
  };
  template?: string;
}

export const TRADE_DOCUMENTS: TradeDocumentType[] = [
  // Initiation Documents
  {
    id: 'loi',
    name: 'Letter of Intent (LOI)',
    description: 'Preliminary agreement expressing intent to proceed with the transaction',
    category: 'initiation',
    requiredFor: ['loi_pending'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },
  {
    id: 'loi_signed',
    name: 'Signed Letter of Intent',
    description: 'LOI with all party signatures',
    category: 'initiation',
    requiredFor: ['loi_signed'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },
  {
    id: 'purchase_order',
    name: 'Purchase Order (PO)',
    description: 'Formal order document from buyer',
    category: 'initiation',
    requiredFor: ['contract_negotiation'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'proforma_invoice',
    name: 'Proforma Invoice',
    description: 'Preliminary invoice before shipment',
    category: 'initiation',
    requiredFor: ['contract_negotiation'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },

  // Compliance Documents
  {
    id: 'kyc_buyer',
    name: 'Buyer KYC Documents',
    description: 'Know Your Customer documents for buyer',
    category: 'compliance',
    requiredFor: ['kyc_verification'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      expiryDays: 365,
    },
  },
  {
    id: 'kyc_seller',
    name: 'Seller KYC Documents',
    description: 'Know Your Customer documents for seller',
    category: 'compliance',
    requiredFor: ['kyc_verification'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      expiryDays: 365,
    },
  },
  {
    id: 'company_docs',
    name: 'Company Registration Documents',
    description: 'Certificate of incorporation, articles, etc.',
    category: 'compliance',
    requiredFor: ['kyc_verification'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'beneficial_ownership',
    name: 'Beneficial Ownership Declaration',
    description: 'Declaration of ultimate beneficial owners',
    category: 'compliance',
    requiredFor: ['kyc_verification'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },
  {
    id: 'sanctions_screening',
    name: 'Sanctions Screening Report',
    description: 'OFAC/EU sanctions screening results',
    category: 'compliance',
    requiredFor: ['kyc_verification'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
      expiryDays: 30,
    },
  },

  // Commercial Documents
  {
    id: 'purchase_agreement_draft',
    name: 'Purchase Agreement (Draft)',
    description: 'Draft sales contract',
    category: 'commercial',
    requiredFor: ['contract_negotiation'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
  },
  {
    id: 'purchase_agreement_signed',
    name: 'Purchase Agreement (Signed)',
    description: 'Executed sales contract',
    category: 'commercial',
    requiredFor: ['contract_signed'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },
  {
    id: 'commercial_invoice',
    name: 'Commercial Invoice',
    description: 'Invoice for customs and payment',
    category: 'commercial',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },

  // Shipping Documents
  {
    id: 'bill_of_lading',
    name: 'Bill of Lading (B/L)',
    description: 'Shipping document and title of goods',
    category: 'shipping',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'packing_list',
    name: 'Packing List',
    description: 'Detailed list of shipped items',
    category: 'shipping',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'shipping_instructions',
    name: 'Shipping Instructions',
    description: 'Instructions for freight forwarder',
    category: 'shipping',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'insurance_cert',
    name: 'Insurance Certificate',
    description: 'Cargo insurance documentation',
    category: 'shipping',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },

  // Customs Documents
  {
    id: 'certificate_of_origin',
    name: 'Certificate of Origin',
    description: 'Document certifying country of manufacture',
    category: 'customs',
    requiredFor: ['customs_clearance'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'customs_declaration',
    name: 'Customs Declaration',
    description: 'Import/export customs form',
    category: 'customs',
    requiredFor: ['customs_clearance'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'import_license',
    name: 'Import License',
    description: 'Government authorization to import',
    category: 'customs',
    requiredFor: ['customs_clearance'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'export_license',
    name: 'Export License',
    description: 'Government authorization to export',
    category: 'customs',
    requiredFor: ['shipping'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'phytosanitary_cert',
    name: 'Phytosanitary Certificate',
    description: 'Plant health certificate (for agricultural goods)',
    category: 'customs',
    requiredFor: ['customs_clearance'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },

  // Financial Documents
  {
    id: 'escrow_receipt',
    name: 'Escrow Deposit Receipt',
    description: 'Confirmation of funds deposited in escrow',
    category: 'financial',
    requiredFor: ['payment_deposited'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'bank_guarantee',
    name: 'Bank Guarantee',
    description: 'Financial guarantee from bank',
    category: 'financial',
    requiredFor: ['contract_signed'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'release_confirmation',
    name: 'Payment Release Confirmation',
    description: 'Confirmation of escrow release',
    category: 'financial',
    requiredFor: ['payment_released'],
    validationRules: {
      maxSize: 5,
      allowedTypes: ['application/pdf'],
    },
  },

  // Inspection Documents
  {
    id: 'inspection_report',
    name: 'Inspection Report',
    description: 'Third-party quality inspection report',
    category: 'inspection',
    requiredFor: ['quality_inspection'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'quality_cert',
    name: 'Quality Certificate',
    description: 'Certificate of quality/conformity',
    category: 'inspection',
    requiredFor: ['quality_inspection'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'test_report',
    name: 'Test Report',
    description: 'Laboratory or testing results',
    category: 'inspection',
    requiredFor: ['quality_inspection'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'delivery_receipt',
    name: 'Delivery Receipt',
    description: 'Proof of delivery signed by buyer',
    category: 'inspection',
    requiredFor: ['delivery'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      requiresSignature: true,
    },
  },
  {
    id: 'acceptance_cert',
    name: 'Acceptance Certificate',
    description: 'Buyer acceptance of goods',
    category: 'inspection',
    requiredFor: ['inspection_final'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },

  // Legal Documents
  {
    id: 'dispute_claim',
    name: 'Dispute Claim',
    description: 'Formal dispute filing',
    category: 'legal',
    requiredFor: ['disputed'],
    validationRules: {
      maxSize: 20,
      allowedTypes: ['application/pdf'],
    },
  },
  {
    id: 'arbitration_agreement',
    name: 'Arbitration Agreement',
    description: 'Agreement for dispute resolution',
    category: 'legal',
    requiredFor: ['contract_signed'],
    validationRules: {
      maxSize: 10,
      allowedTypes: ['application/pdf'],
      requiresSignature: true,
    },
  },
];

// =============================================================================
// PAYMENT & CURRENCY SETTINGS
// =============================================================================

export type PaymentCurrency = 'USDC' | 'USDT' | 'ETH' | 'WBTC';

export const SUPPORTED_CURRENCIES: Record<PaymentCurrency, {
  name: string;
  symbol: string;
  decimals: number;
  contractAddress: Record<number, string>; // chainId -> address
  icon: string;
}> = {
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    contractAddress: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    },
    icon: '/icons/usdc.svg',
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    contractAddress: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    },
    icon: '/icons/usdt.svg',
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    contractAddress: {},
    icon: '/icons/eth.svg',
  },
  WBTC: {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    contractAddress: {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    },
    icon: '/icons/wbtc.svg',
  },
};

// =============================================================================
// MILESTONE TYPES
// =============================================================================

export type MilestoneType = 
  | 'loi_signed'
  | 'kyc_approved'
  | 'contract_signed'
  | 'advance_payment'
  | 'production_complete'
  | 'inspection_passed'
  | 'goods_shipped'
  | 'customs_cleared'
  | 'goods_delivered'
  | 'final_acceptance'
  | 'custom';

export interface Milestone {
  id: string;
  type: MilestoneType;
  name: string;
  description: string;
  paymentPercentage: number;
  requiredDocuments: string[];
  autoRelease: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: Date;
  releasedAmount?: bigint;
  txHash?: string;
}

export const DEFAULT_MILESTONES: Omit<Milestone, 'id' | 'status'>[] = [
  {
    type: 'contract_signed',
    name: 'Contract Execution',
    description: 'Purchase agreement signed by all parties',
    paymentPercentage: 0,
    requiredDocuments: ['purchase_agreement_signed'],
    autoRelease: false,
  },
  {
    type: 'advance_payment',
    name: 'Advance Payment',
    description: 'Initial deposit to secure order',
    paymentPercentage: 30,
    requiredDocuments: ['escrow_receipt'],
    autoRelease: false,
  },
  {
    type: 'production_complete',
    name: 'Production Complete',
    description: 'Goods manufactured and ready for inspection',
    paymentPercentage: 0,
    requiredDocuments: ['production_schedule', 'quality_cert'],
    autoRelease: false,
  },
  {
    type: 'inspection_passed',
    name: 'Inspection Passed',
    description: 'Third-party inspection approved',
    paymentPercentage: 20,
    requiredDocuments: ['inspection_report'],
    autoRelease: true,
  },
  {
    type: 'goods_shipped',
    name: 'Goods Shipped',
    description: 'Goods loaded and in transit',
    paymentPercentage: 30,
    requiredDocuments: ['bill_of_lading', 'commercial_invoice', 'packing_list'],
    autoRelease: true,
  },
  {
    type: 'final_acceptance',
    name: 'Final Acceptance',
    description: 'Buyer confirms receipt and acceptance',
    paymentPercentage: 20,
    requiredDocuments: ['delivery_receipt', 'acceptance_cert'],
    autoRelease: false,
  },
];

// =============================================================================
// PRODUCT CATEGORIES
// =============================================================================

export type ProductCategory = 
  | 'commodities'
  | 'raw_materials'
  | 'manufactured_goods'
  | 'electronics'
  | 'machinery'
  | 'agricultural'
  | 'chemicals'
  | 'textiles'
  | 'automotive'
  | 'pharmaceuticals'
  | 'food_beverage'
  | 'energy'
  | 'metals'
  | 'other';

export const PRODUCT_CATEGORIES: Record<ProductCategory, {
  label: string;
  description: string;
  requiredCertifications: string[];
  specialDocuments: string[];
}> = {
  commodities: {
    label: 'Commodities',
    description: 'Raw commodities like oil, gas, minerals',
    requiredCertifications: ['quality_cert'],
    specialDocuments: ['warehouse_receipt', 'grade_certificate'],
  },
  raw_materials: {
    label: 'Raw Materials',
    description: 'Unprocessed materials for manufacturing',
    requiredCertifications: ['quality_cert'],
    specialDocuments: ['material_safety_data_sheet'],
  },
  manufactured_goods: {
    label: 'Manufactured Goods',
    description: 'Finished products',
    requiredCertifications: ['quality_cert', 'ce_marking'],
    specialDocuments: [],
  },
  electronics: {
    label: 'Electronics',
    description: 'Electronic components and devices',
    requiredCertifications: ['fcc_cert', 'ce_marking', 'rohs_cert'],
    specialDocuments: ['technical_specs'],
  },
  machinery: {
    label: 'Machinery & Equipment',
    description: 'Industrial machinery and equipment',
    requiredCertifications: ['ce_marking', 'safety_cert'],
    specialDocuments: ['operation_manual', 'warranty_cert'],
  },
  agricultural: {
    label: 'Agricultural Products',
    description: 'Farm products and produce',
    requiredCertifications: ['phytosanitary_cert', 'organic_cert'],
    specialDocuments: ['fumigation_cert'],
  },
  chemicals: {
    label: 'Chemicals',
    description: 'Chemical products and substances',
    requiredCertifications: ['msds', 'hazmat_cert'],
    specialDocuments: ['dg_declaration', 'chemical_analysis'],
  },
  textiles: {
    label: 'Textiles & Apparel',
    description: 'Fabrics, clothing, and textile goods',
    requiredCertifications: ['oeko_tex', 'reach_compliance'],
    specialDocuments: ['fabric_composition'],
  },
  automotive: {
    label: 'Automotive',
    description: 'Vehicles and auto parts',
    requiredCertifications: ['type_approval', 'emissions_cert'],
    specialDocuments: ['vin_documentation'],
  },
  pharmaceuticals: {
    label: 'Pharmaceuticals',
    description: 'Medicines and medical devices',
    requiredCertifications: ['gmp_cert', 'fda_approval', 'who_prequalification'],
    specialDocuments: ['batch_records', 'stability_data'],
  },
  food_beverage: {
    label: 'Food & Beverage',
    description: 'Food products and beverages',
    requiredCertifications: ['haccp', 'fda_registration', 'halal_cert', 'kosher_cert'],
    specialDocuments: ['health_cert', 'shelf_life_cert'],
  },
  energy: {
    label: 'Energy Products',
    description: 'Oil, gas, renewable energy equipment',
    requiredCertifications: ['quality_cert'],
    specialDocuments: ['energy_specs'],
  },
  metals: {
    label: 'Metals & Minerals',
    description: 'Precious and industrial metals',
    requiredCertifications: ['assay_cert', 'conflict_free_cert'],
    specialDocuments: ['mill_test_cert'],
  },
  other: {
    label: 'Other',
    description: 'Other product categories',
    requiredCertifications: [],
    specialDocuments: [],
  },
};

// =============================================================================
// INCOTERMS
// =============================================================================

export type Incoterm = 
  | 'EXW' | 'FCA' | 'CPT' | 'CIP' 
  | 'DAP' | 'DPU' | 'DDP'
  | 'FAS' | 'FOB' | 'CFR' | 'CIF';

export const INCOTERMS: Record<Incoterm, {
  name: string;
  description: string;
  riskTransfer: string;
  sellerResponsibility: string[];
  buyerResponsibility: string[];
}> = {
  EXW: {
    name: 'Ex Works',
    description: 'Seller makes goods available at their premises',
    riskTransfer: "Seller's premises",
    sellerResponsibility: ['Packaging'],
    buyerResponsibility: ['All transport', 'Export/Import clearance', 'Insurance'],
  },
  FCA: {
    name: 'Free Carrier',
    description: 'Seller delivers goods to carrier at named place',
    riskTransfer: 'Named place of delivery',
    sellerResponsibility: ['Export clearance', 'Delivery to carrier'],
    buyerResponsibility: ['Main carriage', 'Import clearance', 'Insurance'],
  },
  CPT: {
    name: 'Carriage Paid To',
    description: 'Seller pays freight to named destination',
    riskTransfer: 'Handed to first carrier',
    sellerResponsibility: ['Export clearance', 'Freight to destination'],
    buyerResponsibility: ['Import clearance', 'Insurance', 'Unloading'],
  },
  CIP: {
    name: 'Carriage and Insurance Paid To',
    description: 'Seller pays freight and insurance',
    riskTransfer: 'Handed to first carrier',
    sellerResponsibility: ['Export clearance', 'Freight', 'Insurance'],
    buyerResponsibility: ['Import clearance', 'Unloading'],
  },
  DAP: {
    name: 'Delivered at Place',
    description: 'Seller delivers goods ready for unloading',
    riskTransfer: 'Named place of destination',
    sellerResponsibility: ['Export clearance', 'All transport', 'Insurance'],
    buyerResponsibility: ['Import clearance', 'Unloading'],
  },
  DPU: {
    name: 'Delivered at Place Unloaded',
    description: 'Seller delivers and unloads goods',
    riskTransfer: 'After unloading at destination',
    sellerResponsibility: ['Export clearance', 'All transport', 'Unloading'],
    buyerResponsibility: ['Import clearance'],
  },
  DDP: {
    name: 'Delivered Duty Paid',
    description: 'Seller bears all costs including duties',
    riskTransfer: 'Named place of destination',
    sellerResponsibility: ['Export clearance', 'All transport', 'Import clearance', 'Duties'],
    buyerResponsibility: ['Unloading'],
  },
  FAS: {
    name: 'Free Alongside Ship',
    description: 'Seller delivers goods alongside vessel',
    riskTransfer: 'Alongside ship at port',
    sellerResponsibility: ['Export clearance', 'Delivery to port'],
    buyerResponsibility: ['Loading', 'Main carriage', 'Import clearance'],
  },
  FOB: {
    name: 'Free On Board',
    description: 'Seller delivers goods on board vessel',
    riskTransfer: 'On board vessel',
    sellerResponsibility: ['Export clearance', 'Loading on ship'],
    buyerResponsibility: ['Main carriage', 'Import clearance', 'Insurance'],
  },
  CFR: {
    name: 'Cost and Freight',
    description: 'Seller pays costs and freight to port',
    riskTransfer: 'On board vessel',
    sellerResponsibility: ['Export clearance', 'Loading', 'Freight'],
    buyerResponsibility: ['Import clearance', 'Insurance', 'Unloading'],
  },
  CIF: {
    name: 'Cost, Insurance and Freight',
    description: 'Seller pays costs, insurance and freight',
    riskTransfer: 'On board vessel',
    sellerResponsibility: ['Export clearance', 'Loading', 'Freight', 'Insurance'],
    buyerResponsibility: ['Import clearance', 'Unloading'],
  },
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface Deal {
  id: string;
  reference: string;
  title: string;
  description: string;
  
  // Parties
  buyer: {
    walletAddress: string;
    companyName: string;
    country: string;
    contactName: string;
    contactEmail: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
  };
  seller: {
    walletAddress: string;
    companyName: string;
    country: string;
    contactName: string;
    contactEmail: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
  };
  
  // Product Details
  product: {
    name: string;
    category: ProductCategory;
    description: string;
    hsCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    currency: PaymentCurrency;
    totalValue: number;
  };
  
  // Trade Terms
  terms: {
    incoterm: Incoterm;
    originCountry: string;
    destinationCountry: string;
    originPort?: string;
    destinationPort?: string;
    deliveryDate: Date;
    paymentTerms: string;
  };
  
  // Escrow Details
  escrow: {
    contractAddress?: string;
    depositedAmount: bigint;
    releasedAmount: bigint;
    currency: PaymentCurrency;
    milestones: Milestone[];
  };
  
  // Status
  stage: DealStage;
  documents: DealDocument[];
  timeline: TimelineEvent[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DealDocument {
  id: string;
  dealId: string;
  type: string;
  name: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  hash?: string;
  expiresAt?: Date;
}

export interface TimelineEvent {
  id: string;
  dealId: string;
  type: 'stage_change' | 'document_upload' | 'payment' | 'milestone' | 'message' | 'dispute';
  title: string;
  description: string;
  actor: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// FEE STRUCTURE
// =============================================================================

export const PLATFORM_FEES = {
  escrowFee: 0.5, // 0.5% of deal value
  documentVerification: 25, // $25 per document verification
  disputeResolution: 500, // $500 base fee for dispute resolution
  expeditedProcessing: 200, // $200 for expedited processing
  complianceCheck: 100, // $100 per compliance check
};

// =============================================================================
// COUNTRY DATA
// =============================================================================

export const COUNTRIES: Record<string, { name: string; code: string; region: string }> = {
  US: { name: 'United States', code: 'US', region: 'North America' },
  GB: { name: 'United Kingdom', code: 'GB', region: 'Europe' },
  DE: { name: 'Germany', code: 'DE', region: 'Europe' },
  FR: { name: 'France', code: 'FR', region: 'Europe' },
  CN: { name: 'China', code: 'CN', region: 'Asia' },
  JP: { name: 'Japan', code: 'JP', region: 'Asia' },
  SG: { name: 'Singapore', code: 'SG', region: 'Asia' },
  AE: { name: 'United Arab Emirates', code: 'AE', region: 'Middle East' },
  SA: { name: 'Saudi Arabia', code: 'SA', region: 'Middle East' },
  BR: { name: 'Brazil', code: 'BR', region: 'South America' },
  IN: { name: 'India', code: 'IN', region: 'Asia' },
  AU: { name: 'Australia', code: 'AU', region: 'Oceania' },
  CA: { name: 'Canada', code: 'CA', region: 'North America' },
  MX: { name: 'Mexico', code: 'MX', region: 'North America' },
  KR: { name: 'South Korea', code: 'KR', region: 'Asia' },
  NL: { name: 'Netherlands', code: 'NL', region: 'Europe' },
  CH: { name: 'Switzerland', code: 'CH', region: 'Europe' },
  IT: { name: 'Italy', code: 'IT', region: 'Europe' },
  ES: { name: 'Spain', code: 'ES', region: 'Europe' },
  ZA: { name: 'South Africa', code: 'ZA', region: 'Africa' },
};