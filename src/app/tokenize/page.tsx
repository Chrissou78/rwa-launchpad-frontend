// src/app/tokenize/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@/components/ConnectButton';
import { useKYC } from '@/contexts/KYCContext';
import {
  Coins,
  Building2,
  Package,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Clock,
  Globe,
  Zap,
  Users,
  BarChart3,
  ChevronRight,
  Lock,
  Send,
  AlertCircle,
  Briefcase,
  Factory,
  Gem,
  Music,
  Car,
  Wheat,
  Fuel,
  Eye,
  CreditCard,
  Plus,
  Image,
  Key,
  Vault,
  Info,
  TrendingUp,
  Upload,
  X,
  File,
  FileImage,
  FileType,
  Loader2,
  Trash2,
  Circle,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Application {
  id: string;
  asset_name: string;
  asset_type: string;
  status: string;
  fee_amount: number;
  fee_currency: string;
  created_at: string;
  estimated_value: number;
  needs_escrow: boolean;
  needs_dividends: boolean;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  documentType: string;
  uploadedAt: Date;
}

interface DocumentType {
  value: string;
  label: string;
  requiredFor: string[];
  optional?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-4 h-4" /> },
  approved: { label: 'Awaiting Payment', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle2 className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <AlertCircle className="w-4 h-4" /> },
  creation_ready: { label: 'Ready to Create', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Coins className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <AlertCircle className="w-4 h-4" /> },
};

// Document types with asset-type requirements
const DOCUMENT_TYPES: DocumentType[] = [
  // Universal Documents (required for all)
  { value: 'valuation', label: 'Independent Valuation Report', requiredFor: ['all'] },
  { value: 'legal_opinion', label: 'Legal Opinion / Structure', requiredFor: ['all'] },
  
  // Real Estate Specific
  { value: 'title_deed', label: 'Title Deed / Property Registration', requiredFor: ['real_estate'] },
  { value: 'land_survey', label: 'Land Survey / Cadastral Plan', requiredFor: ['real_estate'] },
  { value: 'building_permits', label: 'Building Permits / Certificates', requiredFor: ['real_estate'] },
  { value: 'occupancy_certificate', label: 'Certificate of Occupancy', requiredFor: ['real_estate'] },
  { value: 'lease_agreements', label: 'Lease Agreements', requiredFor: ['real_estate'], optional: true },
  { value: 'property_tax', label: 'Property Tax Records', requiredFor: ['real_estate'] },
  { value: 'insurance_property', label: 'Property Insurance', requiredFor: ['real_estate'] },
  { value: 'environmental_report', label: 'Environmental Assessment', requiredFor: ['real_estate'], optional: true },
  
  // Commodity Specific
  { value: 'warehouse_receipt', label: 'Warehouse Receipt', requiredFor: ['commodity'] },
  { value: 'quality_certificate', label: 'Quality/Grade Certificate', requiredFor: ['commodity'] },
  { value: 'origin_certificate', label: 'Certificate of Origin', requiredFor: ['commodity'] },
  { value: 'storage_agreement', label: 'Storage Agreement', requiredFor: ['commodity'] },
  { value: 'insurance_commodity', label: 'Commodity Insurance', requiredFor: ['commodity'] },
  { value: 'inspection_report', label: 'Inspection Report', requiredFor: ['commodity'] },
  
  // Company Equity / Private Equity Specific
  { value: 'articles_incorporation', label: 'Articles of Incorporation', requiredFor: ['company_equity'] },
  { value: 'shareholder_agreement', label: 'Shareholder Agreement', requiredFor: ['company_equity'] },
  { value: 'financial_statements', label: 'Audited Financial Statements', requiredFor: ['company_equity', 'revenue_stream'] },
  { value: 'business_plan', label: 'Business Plan', requiredFor: ['company_equity'] },
  { value: 'cap_table', label: 'Capitalization Table', requiredFor: ['company_equity'] },
  { value: 'due_diligence', label: 'Due Diligence Report', requiredFor: ['company_equity'], optional: true },
  
  // Equipment & Machinery Specific
  { value: 'purchase_invoice', label: 'Purchase Invoice / Bill of Sale', requiredFor: ['equipment', 'vehicles'] },
  { value: 'registration_equipment', label: 'Equipment/Vehicle Registration', requiredFor: ['equipment', 'vehicles'] },
  { value: 'maintenance_records', label: 'Maintenance Records', requiredFor: ['equipment', 'vehicles'] },
  { value: 'inspection_certificate', label: 'Inspection Certificate', requiredFor: ['equipment', 'vehicles'] },
  { value: 'insurance_equipment', label: 'Equipment/Vehicle Insurance', requiredFor: ['equipment', 'vehicles'] },
  { value: 'depreciation_schedule', label: 'Depreciation Schedule', requiredFor: ['equipment'] },
  
  // Intellectual Property Specific
  { value: 'ip_registration', label: 'IP Registration Certificate', requiredFor: ['intellectual_property'] },
  { value: 'patent_trademark', label: 'Patent/Trademark Documentation', requiredFor: ['intellectual_property'] },
  { value: 'licensing_agreements', label: 'Licensing Agreements', requiredFor: ['intellectual_property'], optional: true },
  { value: 'revenue_history', label: 'Revenue/Royalty History', requiredFor: ['intellectual_property', 'revenue_stream'] },
  { value: 'ip_valuation', label: 'IP Valuation Report', requiredFor: ['intellectual_property'] },
  
  // Revenue Stream / Royalties Specific
  { value: 'revenue_contracts', label: 'Revenue Contracts', requiredFor: ['revenue_stream'] },
  { value: 'payment_history', label: 'Payment History', requiredFor: ['revenue_stream'] },
  { value: 'credit_assessment', label: 'Credit Assessment', requiredFor: ['revenue_stream'] },
  
  // Product Inventory Specific
  { value: 'inventory_list', label: 'Inventory List / Manifest', requiredFor: ['product_inventory'] },
  { value: 'inventory_valuation', label: 'Inventory Valuation', requiredFor: ['product_inventory'] },
  { value: 'storage_proof', label: 'Storage/Warehouse Proof', requiredFor: ['product_inventory'] },
  { value: 'insurance_inventory', label: 'Inventory Insurance', requiredFor: ['product_inventory'] },
  
  // Agricultural Assets Specific
  { value: 'land_ownership', label: 'Land Ownership / Lease', requiredFor: ['agricultural'] },
  { value: 'crop_certification', label: 'Crop Certification', requiredFor: ['agricultural'] },
  { value: 'yield_projections', label: 'Yield Projections', requiredFor: ['agricultural'] },
  { value: 'agricultural_insurance', label: 'Agricultural Insurance', requiredFor: ['agricultural'] },
  
  // Energy Assets Specific
  { value: 'energy_license', label: 'Energy License / Permit', requiredFor: ['energy'] },
  { value: 'ppa_agreement', label: 'Power Purchase Agreement (PPA)', requiredFor: ['energy'] },
  { value: 'capacity_report', label: 'Capacity / Generation Report', requiredFor: ['energy'] },
  { value: 'environmental_permits', label: 'Environmental Permits', requiredFor: ['energy'] },
  
  // General Optional (available for all)
  { value: 'photos', label: 'Asset Photos/Media', requiredFor: ['all'], optional: true },
  { value: 'other', label: 'Other Supporting Documents', requiredFor: ['all'], optional: true },
];

// Fee structure
const FEES = {
  base: 750,      // Project NFT + ERC3643 Token
  escrow: 250,    // Trade escrow add-on
  dividend: 200,  // Dividend distributor add-on
};

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function TokenizePage() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { kycData } = useKYC();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'request' | 'applications'>('overview');
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    assetType: '',
    assetName: '',
    assetDescription: '',
    estimatedValue: '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    useCase: '',
    additionalInfo: '',
    needsEscrow: false,
    needsDividends: false,
  });
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadError, setUploadError] = useState('');
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  
  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const isGoldOrHigher = kycData.tier === 'Gold' || kycData.tier === 'Diamond';

  const assetTypes = [
    { value: 'company_equity', label: 'Company Equity / Shares', icon: <Building2 className="w-5 h-5" /> },
    { value: 'real_estate', label: 'Real Estate Property', icon: <Building2 className="w-5 h-5" /> },
    { value: 'commodity', label: 'Commodities (Gold, Silver, etc.)', icon: <Gem className="w-5 h-5" /> },
    { value: 'product_inventory', label: 'Product Inventory', icon: <Package className="w-5 h-5" /> },
    { value: 'intellectual_property', label: 'Intellectual Property / Patents', icon: <FileText className="w-5 h-5" /> },
    { value: 'revenue_stream', label: 'Revenue Streams / Royalties', icon: <Music className="w-5 h-5" /> },
    { value: 'equipment', label: 'Equipment / Machinery', icon: <Factory className="w-5 h-5" /> },
    { value: 'vehicles', label: 'Vehicles / Fleet', icon: <Car className="w-5 h-5" /> },
    { value: 'agricultural', label: 'Agricultural Assets', icon: <Wheat className="w-5 h-5" /> },
    { value: 'energy', label: 'Energy Assets', icon: <Fuel className="w-5 h-5" /> },
    { value: 'other', label: 'Other', icon: <Coins className="w-5 h-5" /> },
  ];

  const useCases = [
    { value: 'ownership_tracking', label: 'Ownership Tracking & Management', description: 'Track and manage asset ownership on blockchain' },
    { value: 'fractional_ownership', label: 'Fractional Ownership', description: 'Allow multiple investors to own fractions of the asset' },
    { value: 'fundraising', label: 'Fundraising / Capital Raise', description: 'Raise capital by selling tokens to investors' },
    { value: 'loyalty_program', label: 'Customer Loyalty Program', description: 'Reward customers with tradeable tokens' },
    { value: 'supply_chain', label: 'Supply Chain Tracking', description: 'Track products through the supply chain' },
    { value: 'employee_equity', label: 'Employee Equity Distribution', description: 'Distribute equity to employees via tokens' },
    { value: 'asset_backed', label: 'Asset-Backed Token', description: 'Create tokens backed by physical assets' },
    { value: 'membership', label: 'Membership / Access Token', description: 'Gate access to services or communities' },
    { value: 'trade_settlement', label: 'B2B Trade Settlement', description: 'Settle trades between businesses' },
    { value: 'other', label: 'Other', description: 'Custom use case' },
  ];

  const benefits = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Ownership",
      description: "Immutable blockchain records ensure transparent and tamper-proof ownership tracking."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Transferability",
      description: "Transfer ownership instantly to anyone worldwide without intermediaries."
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Exchange Listing",
      description: "Option to list your tokens on our exchange for secondary market trading."
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automated Compliance",
      description: "Built-in compliance rules, transfer restrictions, and investor eligibility checks."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Stakeholder Management",
      description: "Easily manage token holders, distributions, and corporate actions."
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Full Control",
      description: "You retain full control of your assets. We provide the infrastructure."
    }
  ];

  const process = [
    {
      step: "1",
      title: "Submit Request",
      description: "Fill out the tokenization request form with your asset details and documents."
    },
    {
      step: "2",
      title: "Admin Review",
      description: "Our team reviews your submission, verifies documentation, and assesses feasibility."
    },
    {
      step: "3",
      title: "Pay Fee",
      description: "Once approved, pay the tokenization fee to proceed with token creation."
    },
    {
      step: "4",
      title: "Create Token",
      description: "Access the token creation form to customize your token and deploy on-chain."
    },
    {
      step: "5",
      title: "Manage & Trade",
      description: "Your tokens are live! Manage holders, distributions, and optionally list on exchange."
    }
  ];

  // Video controls
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // Helper function to get required documents for an asset type
  const getRequiredDocuments = (assetType: string): DocumentType[] => {
    if (!assetType) return [];
    return DOCUMENT_TYPES.filter(doc => 
      !doc.optional && (doc.requiredFor.includes(assetType) || doc.requiredFor.includes('all'))
    );
  };

  // Helper function to get optional documents for an asset type
  const getOptionalDocuments = (assetType: string): DocumentType[] => {
    if (!assetType) return [];
    return DOCUMENT_TYPES.filter(doc => 
      doc.optional && (doc.requiredFor.includes(assetType) || doc.requiredFor.includes('all'))
    );
  };

  // Helper function to get all available documents for an asset type
  const getAvailableDocuments = (assetType: string): DocumentType[] => {
    if (!assetType) return [];
    return DOCUMENT_TYPES.filter(doc => 
      doc.requiredFor.includes(assetType) || doc.requiredFor.includes('all')
    );
  };

  // Check if all required documents are uploaded
  const hasAllRequiredDocuments = (assetType: string, uploadedDocs: UploadedDocument[]): boolean => {
    if (!assetType) return false;
    const required = getRequiredDocuments(assetType);
    const uploadedTypes = uploadedDocs.map(d => d.documentType);
    return required.every(req => uploadedTypes.includes(req.value));
  };

  // Get missing required documents
  const getMissingDocuments = (assetType: string, uploadedDocs: UploadedDocument[]): DocumentType[] => {
    if (!assetType) return [];
    const required = getRequiredDocuments(assetType);
    const uploadedTypes = uploadedDocs.map(d => d.documentType);
    return required.filter(req => !uploadedTypes.includes(req.value));
  };

  // Calculate fee based on options
  const calculateFee = (): number => {
    let total = FEES.base;
    if (formData.needsEscrow) total += FEES.escrow;
    if (formData.needsDividends) total += FEES.dividend;
    return total;
  };

  // Load user's applications
  const loadApplications = async () => {
    if (!address) return;
    
    setLoadingApplications(true);
    try {
      const response = await fetch('/api/tokenization/apply', {
        headers: { 'x-wallet-address': address },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (address && activeTab === 'applications') {
      loadApplications();
    }
  }, [address, activeTab]);

  // Reset selected doc type when asset type changes
  useEffect(() => {
    if (formData.assetType) {
      const availableDocs = getAvailableDocuments(formData.assetType);
      if (availableDocs.length > 0) {
        // Set to first required document if available
        const requiredDocs = getRequiredDocuments(formData.assetType);
        const firstUnuploaded = requiredDocs.find(doc => !documents.some(d => d.documentType === doc.value));
        setSelectedDocType(firstUnuploaded?.value || availableDocs[0].value);
      }
    }
  }, [formData.assetType]);

  // Document upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError('');

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PDF, DOC, DOCX, JPG, PNG, or WEBP files.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadingDocument(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'document');

      const response = await fetch('/api/ipfs/upload-file', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();

      const newDocument: UploadedDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: data.gatewayUrl,
        ipfsHash: data.ipfsHash,
        ipfsUrl: data.ipfsUri,
        documentType: selectedDocType,
        uploadedAt: new Date(),
      };

      setDocuments(prev => [...prev, newDocument]);
      
      // Auto-select next required document that hasn't been uploaded
      const requiredDocs = getRequiredDocuments(formData.assetType);
      const nextUnuploaded = requiredDocs.find(doc => 
        doc.value !== selectedDocType && !documents.some(d => d.documentType === doc.value)
      );
      if (nextUnuploaded) {
        setSelectedDocType(nextUnuploaded.value);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Remove document
  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  // Get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-blue-400" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileType className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get document type label
  const getDocTypeLabel = (value: string): string => {
    return DOCUMENT_TYPES.find(t => t.value === value)?.label || value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    if (!formData.assetName || !formData.assetType) {
      setError('Please fill in all required fields');
      return;
    }

    // Check for required documents based on asset type
    const missingDocs = getMissingDocuments(formData.assetType, documents);
    if (missingDocs.length > 0) {
      setError(`Please upload required documents: ${missingDocs.map(d => d.label).join(', ')}`);
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/tokenization/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          ...formData,
          feeAmount: calculateFee(),
          documents: documents.map(doc => ({
            name: doc.name,
            type: doc.documentType,
            url: doc.url,
            mimeType: doc.type,
            size: doc.size,
          })),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }
      
      setSubmitted(true);
      loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // If asset type changes, clear documents
    if (name === 'assetType' && value !== formData.assetType) {
      setDocuments([]);
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      assetType: '',
      assetName: '',
      assetDescription: '',
      estimatedValue: '',
      tokenName: '',
      tokenSymbol: '',
      totalSupply: '',
      useCase: '',
      additionalInfo: '',
      needsEscrow: false,
      needsDividends: false,
    });
    setDocuments([]);
    setSubmitted(false);
    setSelectedDocType('');
  };

  // Get asset type label
  const getAssetTypeLabel = (value: string): string => {
    return assetTypes.find(t => t.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-6">
            <Coins className="w-4 h-4 mr-2" />
            Custom Asset Tokenization
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tokenize Your Assets
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Transform your real-world assets into blockchain-based security tokens. 
            Enable fractional ownership, global trading, and automated compliance.
          </p>
        </div>

        {/* Gold KYC Requirement Notice */}
        {!isGoldOrHigher && (
          <div className="mb-8 p-4 bg-yellow-900/30 border border-yellow-600 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">Gold KYC Required</h3>
                <p className="text-yellow-200/80 text-sm mb-3">
                  To tokenize assets on our platform, you need to complete Gold tier KYC verification. 
                  This ensures compliance and protects all parties involved.
                </p>
                <Link
                  href="/kyc"
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Complete KYC Verification <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'request'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Request Tokenization
          </button>
          {isConnected && (
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'applications'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Applications
              {applications.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  {applications.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {activeTab === 'overview' ? (
          <>
            {/* Video Section - What is RWA Tokenization? */}
            <section className="mb-16">
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      What is RWA Tokenization?
                    </h2>
                    <p className="text-gray-300 mb-4">
                      Real World Asset (RWA) tokenization is the process of converting ownership rights 
                      of physical assets into digital tokens on a blockchain. This enables:
                    </p>
                    <ul className="space-y-3 text-gray-400">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Fractional Ownership</strong> - Divide expensive assets into affordable pieces</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">24/7 Liquidity</strong> - Trade assets anytime, anywhere globally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Transparent Ownership</strong> - Immutable on-chain records</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Automated Compliance</strong> - Built-in KYC and transfer restrictions</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Video Player */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video group">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      poster="/video/whatisrwa-poster.jpg"
                      muted={isVideoMuted}
                      playsInline
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onEnded={() => setIsVideoPlaying(false)}
                    >
                      <source src="/video/whatisrwa.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* Play/Pause Overlay */}
                    {!isVideoPlaying && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
                        onClick={toggleVideoPlay}
                      >
                        <div className="w-20 h-20 rounded-full bg-blue-600/90 flex items-center justify-center hover:bg-blue-500 transition-colors">
                          <Play className="w-10 h-10 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Video Controls */}
                    <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${isVideoPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={toggleVideoPlay}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          {isVideoPlaying ? (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <Play className="w-5 h-5 text-white" fill="white" />
                          )}
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={toggleVideoMute}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            {isVideoMuted ? (
                              <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                              <Volume2 className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                        Watch Video
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Benefits Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Why Tokenize With Us?
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 inline-block mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-400 text-sm">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Process Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                How It Works
              </h2>
              <div className="relative">
                <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {process.map((item, index) => (
                    <div key={index} className="relative text-center">
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4 relative z-10">
                          {item.step}
                        </div>
                        <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Simple, Transparent Pricing
              </h2>
              <div className="max-w-3xl mx-auto">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  {/* Base Package */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Coins className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Base Package</h3>
                        <p className="text-gray-400 text-sm">Project NFT + ERC-3643 Security Token</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">${FEES.base}</div>
                  </div>

                  {/* Escrow Add-on */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <Lock className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Trade Escrow</h3>
                        <p className="text-gray-400 text-sm">Secure P2P trading with escrow protection (1% fee on trades)</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">+${FEES.escrow}</div>
                  </div>

                  {/* Dividends Add-on */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Dividend Distributor</h3>
                        <p className="text-gray-400 text-sm">Automatic revenue distribution (0.5% fee on claims)</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">+${FEES.dividend}</div>
                  </div>

                  {/* Examples */}
                  <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="text-white font-medium mb-3">Example Pricing:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base only:</span>
                        <span className="text-white font-medium">${FEES.base}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base + Escrow:</span>
                        <span className="text-white font-medium">${FEES.base + FEES.escrow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base + Dividends:</span>
                        <span className="text-white font-medium">${FEES.base + FEES.dividend}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Full package:</span>
                        <span className="text-green-400 font-medium">${FEES.base + FEES.escrow + FEES.dividend}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-gray-500 text-sm mt-4">
                    + 0.1% platform fee on all token transfers and trades
                  </p>
                </div>
              </div>
            </section>

            {/* Asset Categories Section */}
              <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">
                  What Can You Tokenize?
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-center mb-8">
                  From energy infrastructure to real estate, discover the wide range of assets 
                  that can be tokenized on our platform.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Energy */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white mb-4">
                      <Zap className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Energy</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Tokenize renewable energy projects, solar farms, wind turbines, and energy credits. Enable fractional investment in sustainable infrastructure.
                    </p>
                    <div className="space-y-1">
                      {["Solar farm equity", "Wind turbine shares", "Renewable energy credits", "Carbon offset tokens"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-yellow-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Real Estate */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white mb-4">
                      <Building2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Real Estate</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Transform property ownership through fractional tokenization. From luxury apartments to commercial buildings, make real estate accessible to everyone.
                    </p>
                    <div className="space-y-1">
                      {["Commercial buildings", "Residential properties", "REITs", "Land development"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-blue-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Trade */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-4">
                      <Briefcase className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Business Trade</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Tokenize trade receivables, invoices, and supply chain assets. Unlock working capital and streamline international trade finance.
                    </p>
                    <div className="space-y-1">
                      {["Trade receivables", "Invoice financing", "Supply chain assets", "Export credits"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-purple-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fund Raising */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white mb-4">
                      <TrendingUp className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Fund Raising</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Launch compliant security token offerings (STOs) to raise capital globally. Access institutional and retail investors through regulated channels.
                    </p>
                    <div className="space-y-1">
                      {["Equity tokens", "Debt instruments", "Revenue sharing", "Convertible notes"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-green-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dividends Distribution */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white mb-4">
                      <Coins className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Dividends Distribution</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Automate dividend and profit distributions through smart contracts. Ensure transparent, instant payments to all token holders worldwide.
                    </p>
                    <div className="space-y-1">
                      {["Automated payouts", "Profit sharing", "Rental income", "Interest payments"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-indigo-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commodities */}
                  <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white mb-4">
                      <Package className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Commodities</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Digitize ownership of precious metals, agricultural products, and raw materials. Trade commodities 24/7 with instant settlement.
                    </p>
                    <div className="space-y-1">
                      {["Gold & silver", "Agricultural products", "Oil & gas", "Industrial metals"].map((example, i) => (
                        <div key={i} className="flex items-center text-xs text-gray-500">
                          <ChevronRight className="w-3 h-3 mr-1 text-amber-400" />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            {/* CTA */}
            <section className="text-center">
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Ready to Tokenize Your Assets?
                </h2>
                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                  Submit your tokenization request and our team will guide you through the process.
                </p>
                {!isConnected ? (
                  <button
                    onClick={openConnectModal}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center mx-auto cursor-pointer"
                  >
                    <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
                  </button>
                ) : isGoldOrHigher ? (
                  <button
                    onClick={() => setActiveTab('request')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center mx-auto"
                  >
                    Submit Request <ArrowRight className="ml-2 w-5 h-5" />
                  </button>
                ) : (
                  <Link
                    href="/kyc"
                    className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition inline-flex items-center"
                  >
                    Complete Gold KYC First <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                )}
              </div>
            </section>
          </>
        ) : activeTab === 'applications' ? (
          /* Applications Tab */
          <section>
            {!isConnected ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">Please connect your wallet to view your applications.</p>
                <button
                  onClick={openConnectModal}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition cursor-pointer"
                >
                  Connect Wallet
                </button>
              </div>
            ) : loadingApplications ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Applications Yet</h3>
                <p className="text-gray-400 mb-6">You haven't submitted any tokenization requests yet.</p>
                <button
                  onClick={() => setActiveTab('request')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition inline-flex items-center"
                >
                  <Plus className="mr-2 w-4 h-4" /> Submit Your First Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Your Applications</h2>
                  <button
                    onClick={() => setActiveTab('request')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition inline-flex items-center"
                  >
                    <Plus className="mr-2 w-4 h-4" /> New Request
                  </button>
                </div>
                
                {applications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                  return (
                    <div
                      key={app.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{app.asset_name}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <span>Type: {app.asset_type.replace('_', ' ')}</span>
                            <span>Value: {formatCurrency(app.estimated_value)}</span>
                            <span>Submitted: {formatDate(app.created_at)}</span>
                          </div>
                          {/* Add-ons indicators */}
                          <div className="flex gap-2 mt-2">
                            {app.needs_escrow && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">
                                <Lock className="w-3 h-3" /> Escrow
                              </span>
                            )}
                            {app.needs_dividends && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded">
                                <TrendingUp className="w-3 h-3" /> Dividends
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {app.status === 'payment_pending' && (
                            <Link
                              href={`/tokenize/pay/${app.id}`}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition inline-flex items-center"
                            >
                              <CreditCard className="mr-2 w-4 h-4" />
                              Pay ${app.fee_amount}
                            </Link>
                          )}
                          {app.status === 'creation_ready' && (
                            <Link
                              href={`/tokenize/create/${app.id}`}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition inline-flex items-center"
                            >
                              <Coins className="mr-2 w-4 h-4" />
                              Create Token
                            </Link>
                          )}
                          <Link
                            href={`/tokenize/application/${app.id}`}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition inline-flex items-center"
                          >
                            <Eye className="mr-2 w-4 h-4" />
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* Request Form Tab */
          <section>
            {!isConnected ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">Please connect your wallet to submit a tokenization request.</p>
                <button
                  onClick={openConnectModal}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition cursor-pointer"
                >
                  Connect Wallet
                </button>
              </div>
            ) : !isGoldOrHigher ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Gold KYC Required</h3>
                <p className="text-gray-400 mb-6">You need Gold tier KYC verification to submit tokenization requests.</p>
                <Link
                  href="/kyc"
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition inline-flex items-center"
                >
                  Complete KYC <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400 mb-6">
                  Thank you for your tokenization request. Our team will review your submission and contact you within 2-3 business days.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    Submit Another Request
                  </button>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    View My Applications
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                {/* Company Information */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                    Company Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Your Company Ltd."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Contact Name *</label>
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Asset Details */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-purple-400" />
                    Asset Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Asset Name *</label>
                      <input
                        type="text"
                        name="assetName"
                        value={formData.assetName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Manhattan Office Building"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Asset Type *</label>
                      <select
                        name="assetType"
                        value={formData.assetType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select asset type...</option>
                        {assetTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Asset Description *</label>
                      <textarea
                        name="assetDescription"
                        value={formData.assetDescription}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Describe the asset you want to tokenize, including its current status, location, and any relevant details..."
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Estimated Value (USD) *</label>
                        <input
                          type="text"
                          name="estimatedValue"
                          value={formData.estimatedValue}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          placeholder="$1,000,000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Use Case *</label>
                        <select
                          name="useCase"
                          value={formData.useCase}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select use case...</option>
                          {useCases.map((uc) => (
                            <option key={uc.value} value={uc.value}>
                              {uc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Upload Section - Adapts to Asset Type */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Upload className="w-5 h-5 mr-2 text-cyan-400" />
                      Required Documents
                    </h3>
                    {formData.assetType && (
                      <span className="text-xs">
                        {hasAllRequiredDocuments(formData.assetType, documents) 
                          ? <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> All required documents uploaded
                            </span>
                          : <span className="text-amber-400">
                              {getMissingDocuments(formData.assetType, documents).length} required documents missing
                            </span>
                        }
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-4">
                    Upload documents to support your tokenization request. Requirements vary by asset type.
                  </p>

                  {!formData.assetType ? (
                    <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">Please select an asset type first to see required documents</p>
                    </div>
                  ) : (
                    <>
                      {/* Required Documents Checklist */}
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-400" />
                          Required for {getAssetTypeLabel(formData.assetType)}:
                        </h4>
                        <div className="grid gap-2">
                          {getRequiredDocuments(formData.assetType).map(doc => {
                            const isUploaded = documents.some(d => d.documentType === doc.value);
                            return (
                              <div 
                                key={doc.value}
                                className={`flex items-center gap-2 text-sm p-2 rounded transition-colors ${
                                  isUploaded 
                                    ? 'bg-green-500/10 text-green-400' 
                                    : 'bg-gray-700/50 text-gray-400'
                                }`}
                              >
                                {isUploaded ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                )}
                                <span className="flex-1">{doc.label}</span>
                                {isUploaded && (
                                  <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                    {documents.find(d => d.documentType === doc.value)?.name}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Document Upload Controls */}
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <select
                          value={selectedDocType}
                          onChange={(e) => setSelectedDocType(e.target.value)}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select document type...</option>
                          <optgroup label="Required Documents">
                            {getRequiredDocuments(formData.assetType).map(doc => (
                              <option 
                                key={doc.value} 
                                value={doc.value}
                                disabled={documents.some(d => d.documentType === doc.value)}
                              >
                                {doc.label} {documents.some(d => d.documentType === doc.value) ? '✓' : ''}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Optional Documents">
                            {getOptionalDocuments(formData.assetType).map(doc => (
                              <option key={doc.value} value={doc.value}>
                                {doc.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          id="document-upload"
                        />
                        <label
                          htmlFor="document-upload"
                          className={`px-4 py-2 rounded-lg font-medium transition inline-flex items-center justify-center cursor-pointer ${
                            !selectedDocType || uploadingDocument
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          }`}
                        >
                          {uploadingDocument ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </>
                          )}
                        </label>
                      </div>

                      {/* Upload error */}
                      {uploadError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <p className="text-red-400 text-sm">{uploadError}</p>
                        </div>
                      )}

                      {/* Uploaded Documents List */}
                      {documents.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-medium text-gray-300">Uploaded Documents ({documents.length})</h4>
                          {documents.map((doc) => {
                            const docType = DOCUMENT_TYPES.find(d => d.value === doc.documentType);
                            const isRequired = docType && !docType.optional;
                            
                            return (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {getFileIcon(doc.type)}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white text-sm truncate">{doc.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className={isRequired ? 'text-blue-400' : 'text-gray-500'}>
                                        {docType?.label || doc.documentType}
                                      </span>
                                      <span>•</span>
                                      <span>{formatFileSize(doc.size)}</span>
                                      {isRequired && (
                                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-white transition"
                                    title="View document"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => removeDocument(doc.id)}
                                    className="p-2 text-red-400 hover:text-red-300 transition"
                                    title="Remove document"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Optional Documents Info */}
                      {getOptionalDocuments(formData.assetType).length > 0 && (
                        <div className="text-xs text-gray-500 p-3 bg-gray-700/30 rounded-lg">
                          <span className="text-gray-400 font-medium">Optional documents: </span>
                          {getOptionalDocuments(formData.assetType).map(d => d.label).join(', ')}
                        </div>
                      )}

                      {/* Empty state */}
                      {documents.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-gray-600 rounded-lg mt-4">
                          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                          <p className="text-gray-600 text-xs mt-1">
                            Supported formats: PDF, DOC, DOCX, JPG, PNG, WEBP (max 10MB)
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Optional Add-ons */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                    <Key className="w-5 h-5 mr-2 text-green-400" />
                    Optional Add-ons
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Enhance your tokenization with additional features
                  </p>
                  
                  <div className="space-y-4">
                    {/* Escrow Option */}
                    <label className="flex items-start gap-4 p-4 bg-gray-700/50 border border-gray-600 rounded-xl cursor-pointer hover:border-gray-500 transition">
                      <input
                        type="checkbox"
                        name="needsEscrow"
                        checked={formData.needsEscrow}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-500 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-green-400" />
                            <span className="text-white font-medium">Trade Escrow</span>
                          </div>
                          <span className="text-green-400 font-semibold">+${FEES.escrow}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          Enable secure P2P trading with escrow protection. Buyers deposit funds, sellers deposit tokens, 
                          and the escrow ensures atomic swaps.
                        </p>
                        <ul className="mt-2 space-y-1">
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mr-1.5" />
                            Secure fund holding
                          </li>
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mr-1.5" />
                            Atomic token/payment swap
                          </li>
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mr-1.5" />
                            1% fee on escrow trades
                          </li>
                        </ul>
                      </div>
                    </label>

                    {/* Dividends Option */}
                    <label className="flex items-start gap-4 p-4 bg-gray-700/50 border border-gray-600 rounded-xl cursor-pointer hover:border-gray-500 transition">
                      <input
                        type="checkbox"
                        name="needsDividends"
                        checked={formData.needsDividends}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-500 text-yellow-600 focus:ring-yellow-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-yellow-400" />
                            <span className="text-white font-medium">Dividend Distributor</span>
                          </div>
                          <span className="text-yellow-400 font-semibold">+${FEES.dividend}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          Automatically distribute revenue, profits, or dividends to all token holders 
                          proportionally based on their holdings.
                        </p>
                        <ul className="mt-2 space-y-1">
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-yellow-400 mr-1.5" />
                            Proportional distribution via snapshots
                          </li>
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-yellow-400 mr-1.5" />
                            Multiple payment tokens supported
                          </li>
                          <li className="flex items-center text-xs text-gray-400">
                            <CheckCircle2 className="w-3 h-3 text-yellow-400 mr-1.5" />
                            0.5% fee on dividend claims
                          </li>
                        </ul>
                      </div>
                    </label>
                  </div>

                  {/* Info box */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      Every tokenization includes a <strong>Project NFT</strong> (representing your asset) and 
                      <strong> ERC-3643 security tokens</strong> (for fractional ownership). Add-ons can be 
                      enabled now or added later after token creation.
                    </div>
                  </div>
                </div>

                {/* Token Configuration (Optional) */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Coins className="w-5 h-5 mr-2 text-yellow-400" />
                    Token Details (Optional)
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    If you have preferences for your token, fill these in. Otherwise, our team will help you decide.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Name</label>
                      <input
                        type="text"
                        name="tokenName"
                        value={formData.tokenName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="My Asset Token"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                      <input
                        type="text"
                        name="tokenSymbol"
                        value={formData.tokenSymbol}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="MAT"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Total Supply</label>
                      <input
                        type="text"
                        name="totalSupply"
                        value={formData.totalSupply}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="1,000,000"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-400" />
                    Additional Information
                  </h3>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Any additional information, questions, or specific requirements..."
                  />
                </div>

                {/* Fee Summary */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-green-400" />
                    Fee Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Base Fee (Project NFT + ERC-3643 Token)</span>
                      <span className="text-white font-medium">${FEES.base}</span>
                    </div>
                    {formData.needsEscrow && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Trade Escrow</span>
                        <span className="text-green-400 font-medium">+${FEES.escrow}</span>
                      </div>
                    )}
                    {formData.needsDividends && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Dividend Distributor</span>
                        <span className="text-yellow-400 font-medium">+${FEES.dividend}</span>
                      </div>
                    )}
                    
                    <div className="pt-2 mt-2 border-t border-green-500/30 flex justify-between">
                      <span className="text-gray-300 font-medium">Total Due After Approval</span>
                      <span className="text-green-400 font-bold text-lg">
                        ${calculateFee()} USDC
                      </span>
                    </div>
                    
                    {/* Ongoing fees section */}
                    <div className="pt-3 mt-3 border-t border-gray-600">
                      <p className="text-gray-500 text-xs mb-2">Ongoing platform fees:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Platform fee (on all trades)</span>
                          <span className="text-gray-400">0.1%</span>
                        </div>
                        {formData.needsEscrow && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Escrow fee (on escrow trades)</span>
                            <span className="text-gray-400">1%</span>
                          </div>
                        )}
                        {formData.needsDividends && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Dividend fee (on claims)</span>
                            <span className="text-gray-400">0.5%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Info */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">Connected Wallet:</span>
                    </div>
                    <span className="text-white font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || (formData.assetType && !hasAllRequiredDocuments(formData.assetType, documents))}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 w-5 h-5" />
                      Submit Tokenization Request
                    </>
                  )}
                </button>

                {formData.assetType && !hasAllRequiredDocuments(formData.assetType, documents) && (
                  <p className="text-center text-amber-400 text-sm mt-3">
                    Please upload all required documents before submitting
                  </p>
                )}

                <p className="text-center text-gray-500 text-sm mt-4">
                  By submitting, you agree to our terms and conditions. Our team will review your request 
                  and contact you within 2-3 business days.
                </p>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}