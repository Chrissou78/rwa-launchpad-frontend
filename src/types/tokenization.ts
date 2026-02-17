// src/types/tokenization.ts

export type AssetType = 
  | 'real_estate' 
  | 'infrastructure' 
  | 'art_collectibles' 
  | 'business_equity' 
  | 'revenue_based' 
  | 'commodities' 
  | 'other';

export type TokenType = 
  | 'token_only' 
  | 'nft_only' 
  | 'nft_and_token' 
  | 'nft_token_escrow';

export type ApplicationStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'payment_pending' 
  | 'payment_confirmed' 
  | 'creation_ready' 
  | 'completed' 
  | 'cancelled';

export type DocumentType = 
  | 'ownership_proof' 
  | 'valuation' 
  | 'legal' 
  | 'identity' 
  | 'financial' 
  | 'other';

export interface TokenizationDocument {
  id: string;
  application_id: string;
  document_name: string;
  document_type: DocumentType;
  file_url: string;
  file_hash?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface TokenizationApplication {
  id: string;
  user_address: string;
  
  // Basic Info
  asset_name: string;
  asset_type: AssetType;
  asset_description: string;
  
  // Location
  asset_location?: string;
  asset_country: string;
  
  // Valuation
  estimated_value: number;
  currency: string;
  valuation_source?: string;
  
  // Tokenization Details
  desired_token_supply?: number;
  token_price_estimate?: number;
  fundraising_goal?: number;
  
  // Token Configuration
  token_type: TokenType;
  needs_escrow: boolean;
  
  // Legal
  ownership_proof_type?: string;
  legal_entity_name?: string;
  legal_entity_type?: string;
  legal_jurisdiction?: string;
  
  // Contact
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  contact_telegram?: string;
  
  // Documents
  documents: TokenizationDocument[];
  
  // Admin Review
  status: ApplicationStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  
  // Payment
  fee_amount?: number;
  fee_currency: string;
  fee_tx_hash?: string;
  fee_paid_at?: string;
  
  // Created Token Info
  project_id?: number;
  token_address?: string;
  nft_token_id?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TokenCreationData {
  application_id: string;
  token_name: string;
  token_symbol: string;
  token_supply: number;
  token_decimals: number;
  
  // NFT
  create_nft: boolean;
  nft_name?: string;
  nft_description?: string;
  nft_image_url?: string;
  nft_metadata?: Record<string, any>;
  
  // Escrow
  create_escrow: boolean;
  escrow_release_conditions?: Record<string, any>;
  
  // Media
  logo_url?: string;
  banner_url?: string;
  website_url?: string;
  social_links?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    linkedin?: string;
  };
}

export interface PlatformFee {
  id: string;
  fee_type: string;
  fee_amount: number;
  fee_currency: string;
  fee_percentage?: number;
  is_active: boolean;
  description?: string;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  real_estate: 'Real Estate',
  infrastructure: 'Infrastructure',
  art_collectibles: 'Art & Collectibles',
  business_equity: 'Business Equity',
  revenue_based: 'Revenue-Based Assets',
  commodities: 'Commodities',
  other: 'Other',
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  real_estate: '🏢',
  infrastructure: '🏭',
  art_collectibles: '🎨',
  business_equity: '💼',
  revenue_based: '📄',
  commodities: '🌾',
  other: '📦',
};

export const TOKEN_TYPE_LABELS: Record<TokenType, string> = {
  token_only: 'Security Token Only (ERC3643)',
  nft_only: 'NFT Only',
  nft_and_token: 'NFT + Security Token',
  nft_token_escrow: 'NFT + Token + Escrow',
};

export const TOKEN_TYPE_DESCRIPTIONS: Record<TokenType, string> = {
  token_only: 'Standard compliant security token for fractional ownership',
  nft_only: 'Unique NFT representing full ownership of the asset',
  nft_and_token: 'NFT for asset representation + tokens for fractional investment',
  nft_token_escrow: 'Full package with escrow for secure fund management',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  payment_pending: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed',
  creation_ready: 'Ready to Create',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  payment_pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  payment_confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  creation_ready: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ownership_proof: 'Ownership Proof',
  valuation: 'Valuation Report',
  legal: 'Legal Documents',
  identity: 'Identity Documents',
  financial: 'Financial Statements',
  other: 'Other',
};

export const REQUIRED_DOCUMENTS: Record<AssetType, DocumentType[]> = {
  real_estate: ['ownership_proof', 'valuation', 'legal', 'identity'],
  infrastructure: ['ownership_proof', 'valuation', 'legal', 'identity', 'financial'],
  art_collectibles: ['ownership_proof', 'valuation', 'identity'],
  business_equity: ['legal', 'identity', 'financial'],
  revenue_based: ['legal', 'identity', 'financial'],
  commodities: ['ownership_proof', 'valuation', 'identity'],
  other: ['ownership_proof', 'identity'],
};
