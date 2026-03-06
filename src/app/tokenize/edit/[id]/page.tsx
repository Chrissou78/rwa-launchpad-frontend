// src/app/tokenize/edit/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@/components/ConnectButton';
import {
  Coins,
  Building2,
  Package,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Clock,
  AlertCircle,
  Lock,
  Send,
  Key,
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
  Eye,
  MessageSquare
} from 'lucide-react';

interface Application {
  id: string;
  user_address: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  asset_type: string;
  asset_name: string;
  asset_description: string;
  estimated_value: number;
  use_case: string;
  needs_escrow: boolean;
  needs_dividends: boolean;
  fee_amount: number;
  fee_currency: string;
  status: string;
  admin_notes: string;
  rejection_reason: string;
  documents: any;
  created_at: string;
  updated_at: string;
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

const DOCUMENT_TYPES: DocumentType[] = [
  { value: 'valuation', label: 'Independent Valuation Report', requiredFor: ['all'] },
  { value: 'legal_opinion', label: 'Legal Opinion / Structure', requiredFor: ['all'] },
  { value: 'title_deed', label: 'Title Deed / Property Registration', requiredFor: ['real_estate'] },
  { value: 'land_survey', label: 'Land Survey / Cadastral Plan', requiredFor: ['real_estate'] },
  { value: 'building_permits', label: 'Building Permits / Certificates', requiredFor: ['real_estate'] },
  { value: 'occupancy_certificate', label: 'Certificate of Occupancy', requiredFor: ['real_estate'] },
  { value: 'lease_agreements', label: 'Lease Agreements', requiredFor: ['real_estate'], optional: true },
  { value: 'property_tax', label: 'Property Tax Records', requiredFor: ['real_estate'] },
  { value: 'insurance_property', label: 'Property Insurance', requiredFor: ['real_estate'] },
  { value: 'environmental_report', label: 'Environmental Assessment', requiredFor: ['real_estate'], optional: true },
  { value: 'warehouse_receipt', label: 'Warehouse Receipt', requiredFor: ['commodity'] },
  { value: 'quality_certificate', label: 'Quality/Grade Certificate', requiredFor: ['commodity'] },
  { value: 'origin_certificate', label: 'Certificate of Origin', requiredFor: ['commodity'] },
  { value: 'storage_agreement', label: 'Storage Agreement', requiredFor: ['commodity'] },
  { value: 'insurance_commodity', label: 'Commodity Insurance', requiredFor: ['commodity'] },
  { value: 'inspection_report', label: 'Inspection Report', requiredFor: ['commodity'] },
  { value: 'articles_incorporation', label: 'Articles of Incorporation', requiredFor: ['company_equity'] },
  { value: 'shareholder_agreement', label: 'Shareholder Agreement', requiredFor: ['company_equity'] },
  { value: 'financial_statements', label: 'Audited Financial Statements', requiredFor: ['company_equity', 'revenue_stream'] },
  { value: 'business_plan', label: 'Business Plan', requiredFor: ['company_equity'] },
  { value: 'cap_table', label: 'Capitalization Table', requiredFor: ['company_equity'] },
  { value: 'due_diligence', label: 'Due Diligence Report', requiredFor: ['company_equity'], optional: true },
  { value: 'purchase_invoice', label: 'Purchase Invoice / Bill of Sale', requiredFor: ['equipment', 'vehicles'] },
  { value: 'registration_equipment', label: 'Equipment/Vehicle Registration', requiredFor: ['equipment', 'vehicles'] },
  { value: 'maintenance_records', label: 'Maintenance Records', requiredFor: ['equipment', 'vehicles'] },
  { value: 'inspection_certificate', label: 'Inspection Certificate', requiredFor: ['equipment', 'vehicles'] },
  { value: 'insurance_equipment', label: 'Equipment/Vehicle Insurance', requiredFor: ['equipment', 'vehicles'] },
  { value: 'depreciation_schedule', label: 'Depreciation Schedule', requiredFor: ['equipment'] },
  { value: 'ip_registration', label: 'IP Registration Certificate', requiredFor: ['intellectual_property'] },
  { value: 'patent_trademark', label: 'Patent/Trademark Documentation', requiredFor: ['intellectual_property'] },
  { value: 'licensing_agreements', label: 'Licensing Agreements', requiredFor: ['intellectual_property'], optional: true },
  { value: 'revenue_history', label: 'Revenue/Royalty History', requiredFor: ['intellectual_property', 'revenue_stream'] },
  { value: 'ip_valuation', label: 'IP Valuation Report', requiredFor: ['intellectual_property'] },
  { value: 'revenue_contracts', label: 'Revenue Contracts', requiredFor: ['revenue_stream'] },
  { value: 'payment_history', label: 'Payment History', requiredFor: ['revenue_stream'] },
  { value: 'credit_assessment', label: 'Credit Assessment', requiredFor: ['revenue_stream'] },
  { value: 'inventory_list', label: 'Inventory List / Manifest', requiredFor: ['product_inventory'] },
  { value: 'inventory_valuation', label: 'Inventory Valuation', requiredFor: ['product_inventory'] },
  { value: 'storage_proof', label: 'Storage/Warehouse Proof', requiredFor: ['product_inventory'] },
  { value: 'insurance_inventory', label: 'Inventory Insurance', requiredFor: ['product_inventory'] },
  { value: 'land_ownership', label: 'Land Ownership / Lease', requiredFor: ['agricultural'] },
  { value: 'crop_certification', label: 'Crop Certification', requiredFor: ['agricultural'] },
  { value: 'yield_projections', label: 'Yield Projections', requiredFor: ['agricultural'] },
  { value: 'agricultural_insurance', label: 'Agricultural Insurance', requiredFor: ['agricultural'] },
  { value: 'energy_license', label: 'Energy License / Permit', requiredFor: ['energy'] },
  { value: 'ppa_agreement', label: 'Power Purchase Agreement (PPA)', requiredFor: ['energy'] },
  { value: 'capacity_report', label: 'Capacity / Generation Report', requiredFor: ['energy'] },
  { value: 'environmental_permits', label: 'Environmental Permits', requiredFor: ['energy'] },
  { value: 'photos', label: 'Asset Photos/Media', requiredFor: ['all'], optional: true },
  { value: 'other', label: 'Other Supporting Documents', requiredFor: ['all'], optional: true },
];

const FEES = {
  base: 750,
  escrow: 250,
  dividend: 200,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const assetTypes = [
  { value: 'company_equity', label: 'Company Equity / Shares' },
  { value: 'real_estate', label: 'Real Estate Property' },
  { value: 'commodity', label: 'Commodities (Gold, Silver, etc.)' },
  { value: 'product_inventory', label: 'Product Inventory' },
  { value: 'intellectual_property', label: 'Intellectual Property / Patents' },
  { value: 'revenue_stream', label: 'Revenue Streams / Royalties' },
  { value: 'equipment', label: 'Equipment / Machinery' },
  { value: 'vehicles', label: 'Vehicles / Fleet' },
  { value: 'agricultural', label: 'Agricultural Assets' },
  { value: 'energy', label: 'Energy Assets' },
  { value: 'other', label: 'Other' },
];

const useCases = [
  { value: 'ownership_tracking', label: 'Ownership Tracking & Management' },
  { value: 'fractional_ownership', label: 'Fractional Ownership' },
  { value: 'fundraising', label: 'Fundraising / Capital Raise' },
  { value: 'loyalty_program', label: 'Customer Loyalty Program' },
  { value: 'supply_chain', label: 'Supply Chain Tracking' },
  { value: 'employee_equity', label: 'Employee Equity Distribution' },
  { value: 'asset_backed', label: 'Asset-Backed Token' },
  { value: 'membership', label: 'Membership / Access Token' },
  { value: 'trade_settlement', label: 'B2B Trade Settlement' },
  { value: 'other', label: 'Other' },
];

export default function EditApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
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
    useCase: '',
    needsEscrow: false,
    needsDividends: false,
  });
  
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadError, setUploadError] = useState('');

  const loadApplication = useCallback(async () => {
    if (!address || !applicationId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        headers: { 'x-wallet-address': address },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load application');
      }
      
      const data = await response.json();
      
      if (data.user_address.toLowerCase() !== address.toLowerCase()) {
        throw new Error('You do not have permission to edit this application');
      }
      
      if (data.status !== 'rejected') {
        throw new Error('Only rejected applications can be edited');
      }
      
      setApplication(data);
      
      // Pre-fill ALL form fields
      setFormData({
        companyName: data.company_name || '',
        contactName: data.contact_name || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        assetType: data.asset_type || '',
        assetName: data.asset_name || '',
        assetDescription: data.asset_description || '',
        estimatedValue: data.estimated_value?.toString() || '',
        useCase: data.use_case || '',
        needsEscrow: data.needs_escrow || false,
        needsDividends: data.needs_dividends || false,
      });
      
      // Parse documents
      if (data.documents) {
        try {
          const parsedDocs = typeof data.documents === 'string' 
            ? JSON.parse(data.documents) 
            : data.documents;
          
          const docList = parsedDocs?.files || (Array.isArray(parsedDocs) ? parsedDocs : []);
          
          setDocuments(docList.map((doc: any, index: number) => ({
            id: `existing_${index}`,
            name: doc.name,
            type: doc.mimeType || doc.type,
            size: doc.size || 0,
            url: doc.url,
            documentType: doc.type || doc.documentType,
            uploadedAt: new Date(),
          })));
        } catch (e) {
          console.error('Error parsing documents:', e);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [address, applicationId]);

  useEffect(() => {
    if (address && applicationId) {
      loadApplication();
    }
  }, [address, applicationId, loadApplication]);

  const getRequiredDocuments = (assetType: string): DocumentType[] => {
    if (!assetType) return [];
    return DOCUMENT_TYPES.filter(doc => 
      !doc.optional && (doc.requiredFor.includes(assetType) || doc.requiredFor.includes('all'))
    );
  };

  const getOptionalDocuments = (assetType: string): DocumentType[] => {
    if (!assetType) return [];
    return DOCUMENT_TYPES.filter(doc => 
      doc.optional && (doc.requiredFor.includes(assetType) || doc.requiredFor.includes('all'))
    );
  };

  const hasAllRequiredDocuments = (assetType: string, uploadedDocs: UploadedDocument[]): boolean => {
    if (!assetType) return false;
    const required = getRequiredDocuments(assetType);
    const uploadedTypes = uploadedDocs.map(d => d.documentType);
    return required.every(req => uploadedTypes.includes(req.value));
  };

  const getMissingDocuments = (assetType: string, uploadedDocs: UploadedDocument[]): DocumentType[] => {
    if (!assetType) return [];
    const required = getRequiredDocuments(assetType);
    const uploadedTypes = uploadedDocs.map(d => d.documentType);
    return required.filter(req => !uploadedTypes.includes(req.value));
  };

  const calculateFee = (): number => {
    let total = FEES.base;
    if (formData.needsEscrow) total += FEES.escrow;
    if (formData.needsDividends) total += FEES.dividend;
    return total;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError('');

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PDF, DOC, DOCX, JPG, PNG, or WEBP files.');
      return;
    }

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
      
      const requiredDocs = getRequiredDocuments(formData.assetType);
      const nextUnuploaded = requiredDocs.find(doc => 
        doc.value !== selectedDocType && !documents.some(d => d.documentType === doc.value)
      );
      if (nextUnuploaded) {
        setSelectedDocType(nextUnuploaded.value);
      }
      
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

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-blue-400" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileType className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (value: string): string => {
    return DOCUMENT_TYPES.find(t => t.value === value)?.label || value;
  };

  const getAssetTypeLabel = (value: string): string => {
    return assetTypes.find(t => t.value === value)?.label || value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !applicationId) return;
    
    if (!formData.assetName || !formData.assetType) {
      setError('Please fill in all required fields');
      return;
    }

    const missingDocs = getMissingDocuments(formData.assetType, documents);
    if (missingDocs.length > 0) {
      setError(`Please upload required documents: ${missingDocs.map(d => d.label).join(', ')}`);
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/tokenization/${applicationId}/resubmit`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to resubmit application');
      }
      
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to edit your application.</p>
            <button
              onClick={openConnectModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-400">Loading application...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <Link
              href="/tokenize"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition inline-flex items-center"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Tokenization
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Application Resubmitted!</h2>
            <p className="text-gray-400 mb-6">
              Your updated application has been submitted for review. Our team will review it and notify you of the decision.
            </p>
            <Link
              href="/tokenize"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition inline-flex items-center"
            >
              View My Applications
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tokenize"
            className="text-gray-400 hover:text-white transition inline-flex items-center mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Edit & Resubmit Application</h1>
          <p className="text-gray-400">
            Update your application based on the feedback and resubmit for review.
          </p>
        </div>

        {/* Rejection Reason */}
        {(application?.admin_notes || application?.rejection_reason) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-red-400 font-semibold mb-2 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Rejection Feedback
            </h3>
            <p className="text-gray-300">
              {application.rejection_reason || application.admin_notes}
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Please address the issues mentioned above before resubmitting.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
                  placeholder="Describe the asset you want to tokenize..."
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

          {/* Documents */}
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

            {formData.assetType && (
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Controls */}
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
                                  {getDocTypeLabel(doc.documentType)}
                                </span>
                                {doc.size > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.size)}</span>
                                  </>
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
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => removeDocument(doc.id)}
                              className="p-2 text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Optional Add-ons */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2 text-green-400" />
              Optional Add-ons
            </h3>
            
            <div className="space-y-4">
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
                    Enable secure P2P trading with escrow protection. 1% fee on escrow trades.
                  </p>
                </div>
              </label>

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
                    Automatically distribute revenue to token holders. 0.5% fee on claims.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Coins className="w-5 h-5 mr-2 text-green-400" />
              Fee Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Base Fee (Project NFT + ERC-3643 Token)</span>
                <span className="text-white">${FEES.base}</span>
              </div>
              {formData.needsEscrow && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Trade Escrow</span>
                  <span className="text-green-400">+${FEES.escrow}</span>
                </div>
              )}
              {formData.needsDividends && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dividend Distributor</span>
                  <span className="text-yellow-400">+${FEES.dividend}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-green-500/30 flex justify-between">
                <span className="text-gray-300 font-medium">Total (Already Paid)</span>
                <span className="text-green-400 font-bold text-lg">${calculateFee()} USDC</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              <Info className="w-3 h-3 inline mr-1" />
              Your original payment will be applied. No additional payment required.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Link
              href="/tokenize"
              className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition inline-flex items-center"
            >
              <ArrowLeft className="mr-2 w-5 h-5" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || (!!formData.assetType && !hasAllRequiredDocuments(formData.assetType, documents))}
              className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Resubmitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 w-5 h-5" />
                  Resubmit Application
                </>
              )}
            </button>
          </div>

          {formData.assetType && !hasAllRequiredDocuments(formData.assetType, documents) && (
            <p className="text-center text-amber-400 text-sm mt-3">
              Please upload all required documents before resubmitting
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
