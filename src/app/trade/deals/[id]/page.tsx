Copy// src/app/trade/deals/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Package,
  Ship,
  DollarSign,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  ExternalLink,
  MessageSquare,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Play,
  Pause,
  Eye,
  Send,
  AlertCircle,
  Check,
  X,
  Loader2,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import {
  Deal,
  DealStage,
  DEAL_STAGES,
  DealDocument,
  TimelineEvent,
  Milestone,
  TRADE_DOCUMENTS,
  COUNTRIES,
  INCOTERMS,
  PRODUCT_CATEGORIES,
} from '@/lib/trade/constants';

// =============================================================================
// TYPES
// =============================================================================

type TabType = 'overview' | 'documents' | 'milestones' | 'messages' | 'history';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_DEAL: Deal = {
  id: 'DEAL-2026-001',
  reference: 'DEAL-2026-001',
  title: 'Steel Coils from Germany',
  description: 'Import of hot-rolled steel coils for manufacturing',
  buyer: {
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    companyName: 'Global Manufacturing Ltd',
    country: 'US',
    contactName: 'John Smith',
    contactEmail: 'john@globalmanufacturing.com',
    kycStatus: 'verified',
  },
  seller: {
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    companyName: 'Deutsche Stahl GmbH',
    country: 'DE',
    contactName: 'Hans Mueller',
    contactEmail: 'hans@deutschestahl.de',
    kycStatus: 'verified',
  },
  product: {
    name: 'Hot-Rolled Steel Coils',
    category: 'metals',
    description: 'Grade S235JR steel coils, thickness 2-6mm, width 1000-1500mm',
    hsCode: '7208.10',
    quantity: 500,
    unit: 'MT',
    unitPrice: 850,
    currency: 'USDC',
    totalValue: 425000,
  },
  terms: {
    incoterm: 'CIF',
    originCountry: 'DE',
    destinationCountry: 'US',
    originPort: 'Hamburg',
    destinationPort: 'Los Angeles',
    deliveryDate: new Date('2026-04-15'),
    paymentTerms: '30% advance, 50% on B/L, 20% on delivery',
  },
  escrow: {
    contractAddress: '0x9876543210fedcba9876543210fedcba98765432',
    depositedAmount: BigInt(425000000000),
    releasedAmount: BigInt(127500000000),
    currency: 'USDC',
    milestones: [
      {
        id: 'ms-1',
        type: 'advance_payment',
        name: 'Advance Payment',
        description: 'Initial deposit to secure order',
        paymentPercentage: 30,
        requiredDocuments: ['purchase_agreement_signed'],
        autoRelease: false,
        status: 'completed',
        completedAt: new Date('2026-01-20'),
        releasedAmount: BigInt(127500000000),
        txHash: '0xabc123...',
      },
      {
        id: 'ms-2',
        type: 'inspection_passed',
        name: 'Inspection Passed',
        description: 'Third-party inspection approved',
        paymentPercentage: 20,
        requiredDocuments: ['inspection_report', 'quality_cert'],
        autoRelease: true,
        status: 'completed',
        completedAt: new Date('2026-02-10'),
      },
      {
        id: 'ms-3',
        type: 'goods_shipped',
        name: 'Goods Shipped',
        description: 'Goods loaded and B/L issued',
        paymentPercentage: 30,
        requiredDocuments: ['bill_of_lading', 'commercial_invoice', 'packing_list'],
        autoRelease: true,
        status: 'in_progress',
      },
      {
        id: 'ms-4',
        type: 'final_acceptance',
        name: 'Final Acceptance',
        description: 'Buyer confirms receipt',
        paymentPercentage: 20,
        requiredDocuments: ['delivery_receipt', 'acceptance_cert'],
        autoRelease: false,
        status: 'pending',
      },
    ],
  },
  stage: 'shipping',
  documents: [
    {
      id: 'doc-1',
      dealId: 'DEAL-2026-001',
      type: 'purchase_agreement_signed',
      name: 'Purchase Agreement',
      originalName: 'purchase_agreement_v2_signed.pdf',
      url: '/documents/purchase_agreement.pdf',
      size: 2456000,
      mimeType: 'application/pdf',
      uploadedBy: '0x1234...',
      uploadedAt: new Date('2026-01-18'),
      status: 'verified',
      verifiedBy: '0xadmin...',
      verifiedAt: new Date('2026-01-19'),
    },
    {
      id: 'doc-2',
      dealId: 'DEAL-2026-001',
      type: 'inspection_report',
      name: 'SGS Inspection Report',
      originalName: 'sgs_inspection_2026_001.pdf',
      url: '/documents/inspection.pdf',
      size: 5678000,
      mimeType: 'application/pdf',
      uploadedBy: '0xabcd...',
      uploadedAt: new Date('2026-02-08'),
      status: 'verified',
      verifiedBy: '0xadmin...',
      verifiedAt: new Date('2026-02-09'),
    },
    {
      id: 'doc-3',
      dealId: 'DEAL-2026-001',
      type: 'bill_of_lading',
      name: 'Bill of Lading',
      originalName: 'bl_hamburg_la_2026.pdf',
      url: '/documents/bl.pdf',
      size: 1234000,
      mimeType: 'application/pdf',
      uploadedBy: '0xabcd...',
      uploadedAt: new Date('2026-02-15'),
      status: 'pending',
    },
  ],
  timeline: [
    {
      id: 'evt-1',
      dealId: 'DEAL-2026-001',
      type: 'stage_change',
      title: 'Deal Created',
      description: 'Deal initiated by Global Manufacturing Ltd',
      actor: '0x1234...',
      createdAt: new Date('2026-01-15'),
    },
    {
      id: 'evt-2',
      dealId: 'DEAL-2026-001',
      type: 'document_upload',
      title: 'Purchase Agreement Uploaded',
      description: 'Signed purchase agreement submitted',
      actor: '0x1234...',
      createdAt: new Date('2026-01-18'),
    },
    {
      id: 'evt-3',
      dealId: 'DEAL-2026-001',
      type: 'payment',
      title: 'Advance Payment Released',
      description: '$127,500 released to seller',
      actor: 'Escrow Contract',
      metadata: { amount: 127500, txHash: '0xabc123...' },
      createdAt: new Date('2026-01-20'),
    },
    {
      id: 'evt-4',
      dealId: 'DEAL-2026-001',
      type: 'milestone',
      title: 'Inspection Completed',
      description: 'SGS inspection passed',
      actor: '0xabcd...',
      createdAt: new Date('2026-02-10'),
    },
    {
      id: 'evt-5',
      dealId: 'DEAL-2026-001',
      type: 'stage_change',
      title: 'Goods Shipped',
      description: 'Shipment departed Hamburg',
      actor: '0xabcd...',
      createdAt: new Date('2026-02-15'),
    },
  ],
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-02-15'),
  createdBy: '0x1234567890abcdef1234567890abcdef12345678',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatCurrency = (value: number | bigint) => {
  const num = typeof value === 'bigint' ? Number(value) / 1e6 : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getStageProgress = (stage: DealStage): number => {
  const order = DEAL_STAGES[stage].order;
  return Math.min(100, (order / 15) * 100);
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    verified: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StageProgress({ stage, stages }: { stage: DealStage; stages: typeof DEAL_STAGES }) {
  const stageInfo = stages[stage];
  const stageOrder = Object.entries(stages)
    .filter(([_, s]) => s.order <= 15)
    .sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Deal Progress</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
          stage === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
          stage === 'disputed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          'bg-blue-500/10 text-blue-400 border-blue-500/20'
        }`}>
          {stageInfo.label}
        </span>
      </div>

      <div className="relative">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${getStageProgress(stage)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">Started</span>
          <span className="text-xs text-gray-500">Completed</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2">
        {['initiation', 'compliance', 'contract', 'fulfillment', 'completion'].map((category, idx) => {
          const categoryStages = stageOrder.filter(([_, s]) => s.category === category);
          const isActive = categoryStages.some(([key]) => key === stage);
          const isPast = categoryStages.every(([_, s]) => s.order < stageInfo.order);
          
          return (
            <div key={category} className="text-center">
              <div className={`w-full h-1 rounded-full mb-2 ${
                isPast ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-700'
              }`} />
              <span className={`text-xs capitalize ${
                isPast ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-gray-500'
              }`}>
                {category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneCard({ 
  milestone, 
  index, 
  isActive,
  onApprove,
}: { 
  milestone: Milestone; 
  index: number;
  isActive: boolean;
  onApprove?: () => void;
}) {
  const statusIcons = {
    pending: <Clock className="h-5 w-5" />,
    in_progress: <Play className="h-5 w-5" />,
    completed: <CheckCircle2 className="h-5 w-5" />,
    failed: <X className="h-5 w-5" />,
  };

  return (
    <div className={`bg-gray-800/50 rounded-xl p-5 border transition-all ${
      isActive ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-gray-700/50'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
            milestone.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            milestone.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {milestone.status === 'completed' ? (
              <Check className="h-5 w-5" />
            ) : (
              <span className="font-bold">{index + 1}</span>
            )}
          </div>
          <div>
            <h4 className="text-white font-semibold">{milestone.name}</h4>
            <p className="text-sm text-gray-400">{milestone.description}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(milestone.status)}`}>
          {milestone.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <div>
          <p className="text-xs text-gray-500">Payment Release</p>
          <p className="text-lg font-bold text-white">{milestone.paymentPercentage}%</p>
        </div>
        {milestone.completedAt && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-sm text-gray-400">{formatDate(milestone.completedAt)}</p>
          </div>
        )}
        {milestone.status === 'in_progress' && onApprove && (
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Approve & Release
          </button>
        )}
      </div>

      {milestone.autoRelease && (
        <div className="mt-3 flex items-center text-xs text-green-400">
          <RefreshCw className="h-3 w-3 mr-1" />
          Auto-release when documents verified
        </div>
      )}
    </div>
  );
}

function DocumentRow({ document }: { document: DealDocument }) {
  const docType = TRADE_DOCUMENTS.find(d => d.id === document.type);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mr-4">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-white font-medium">{document.name}</p>
          <div className="flex items-center text-sm text-gray-400">
            <span>{docType?.name || document.type}</span>
            <span className="mx-2">•</span>
            <span>{formatFileSize(document.size)}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(document.uploadedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}>
          {document.status}
        </span>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Eye className="h-5 w-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const typeIcons = {
    stage_change: <ChevronRight className="h-4 w-4" />,
    document_upload: <Upload className="h-4 w-4" />,
    payment: <DollarSign className="h-4 w-4" />,
    milestone: <CheckCircle2 className="h-4 w-4" />,
    message: <MessageSquare className="h-4 w-4" />,
    dispute: <AlertTriangle className="h-4 w-4" />,
  };

  const typeColors = {
    stage_change: 'bg-blue-500/20 text-blue-400',
    document_upload: 'bg-purple-500/20 text-purple-400',
    payment: 'bg-green-500/20 text-green-400',
    milestone: 'bg-cyan-500/20 text-cyan-400',
    message: 'bg-gray-500/20 text-gray-400',
    dispute: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeColors[event.type]}`}>
          {typeIcons[event.type]}
        </div>
        <div className="w-0.5 h-full bg-gray-700 mt-2" />
      </div>
      <div className="pb-8 flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-medium">{event.title}</h4>
          <span className="text-xs text-gray-500">{formatDate(event.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
        {event.metadata?.txHash && (
          <a 
            href={`https://etherscan.io/tx/${event.metadata.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 mt-2"
          >
            View Transaction <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [deal, setDeal] = useState<Deal | null>(MOCK_DEAL);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const dealId = params.id as string;

  // Fetch deal data
  useEffect(() => {
    // In production, fetch from API
    // fetchDeal(dealId);
  }, [dealId]);

  if (!deal) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading deal...</p>
        </div>
      </main>
    );
  }

  const isBuyer = address?.toLowerCase() === deal.buyer.walletAddress.toLowerCase();
  const isSeller = address?.toLowerCase() === deal.seller.walletAddress.toLowerCase();
  const isParty = isBuyer || isSeller;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'documents' as TabType, label: 'Documents', count: deal.documents.length },
    { id: 'milestones' as TabType, label: 'Milestones' },
    { id: 'messages' as TabType, label: 'Messages' },
    { id: 'history' as TabType, label: 'History' },
  ];

  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/trade" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trade
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{deal.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  deal.stage === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  deal.stage === 'disputed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {DEAL_STAGES[deal.stage].label}
                </span>
              </div>
              <p className="text-gray-400">{deal.reference}</p>
            </div>
            <div className="flex items-center gap-3">
              {isParty && (
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </button>
              )}
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <StageProgress stage={deal.stage} stages={DEAL_STAGES} />

        {/* Tabs */}
        <div className="border-b border-gray-800 mt-8 mb-6">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-800">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Product Info */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-400" />
                    Product Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Product</p>
                      <p className="text-white font-medium">{deal.product.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="text-white">{PRODUCT_CATEGORIES[deal.product.category]?.label}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="text-white">{deal.product.quantity.toLocaleString()} {deal.product.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Unit Price</p>
                      <p className="text-white">{formatCurrency(deal.product.unitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">HS Code</p>
                      <p className="text-white">{deal.product.hsCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(deal.product.totalValue)}</p>
                    </div>
                  </div>
                  {deal.product.description && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-gray-300">{deal.product.description}</p>
                    </div>
                  )}
                </div>

                {/* Trade Terms */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Ship className="h-5 w-5 mr-2 text-cyan-400" />
                    Trade Terms
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Incoterm</p>
                      <p className="text-white font-medium">
                        {deal.terms.incoterm} - {INCOTERMS[deal.terms.incoterm]?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Delivery Date</p>
                      <p className="text-white">{formatDate(deal.terms.deliveryDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Origin</p>
                      <p className="text-white">
                        {deal.terms.originPort}, {COUNTRIES[deal.terms.originCountry]?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Destination</p>
                      <p className="text-white">
                        {deal.terms.destinationPort}, {COUNTRIES[deal.terms.destinationCountry]?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-0">
                    {deal.timeline.slice(0, 5).map((event) => (
                      <TimelineItem key={event.id} event={event} />
                    ))}
                  </div>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="w-full mt-4 py-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View Full History
                  </button>
                </div>
              </>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Deal Documents</h3>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </button>
                </div>
                {deal.documents.map((doc) => (
                  <DocumentRow key={doc.id} document={doc} />
                ))}
                {deal.documents.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'milestones' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Payment Milestones</h3>
                {deal.escrow.milestones.map((milestone, index) => (
                  <MilestoneCard 
                    key={milestone.id} 
                    milestone={milestone} 
                    index={index}
                    isActive={milestone.status === 'in_progress'}
                    onApprove={isBuyer && milestone.status === 'in_progress' ? () => {} : undefined}
                  />
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-6">Deal Timeline</h3>
                {deal.timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Messages</h3>
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-1">Start a conversation with the other party</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Escrow Status */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-400" />
                Escrow Status
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Deposited</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(deal.escrow.depositedAmount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Released</p>
                    <p className="text-lg font-semibold text-green-400">
                      {formatCurrency(deal.escrow.releasedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {formatCurrency(BigInt(Number(deal.escrow.depositedAmount) - Number(deal.escrow.releasedAmount)))}
                    </p>
                  </div>
                </div>
                {deal.escrow.contractAddress && (
                  <a
                    href={`https://etherscan.io/address/${deal.escrow.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Contract <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                )}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-400" />
                Parties
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">Buyer</p>
                    {deal.buyer.kycStatus === 'verified' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{deal.buyer.companyName}</p>
                  <p className="text-sm text-gray-400">{COUNTRIES[deal.buyer.country]?.name}</p>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">Seller</p>
                    {deal.seller.kycStatus === 'verified' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{deal.seller.companyName}</p>
                  <p className="text-sm text-gray-400">{COUNTRIES[deal.seller.country]?.name}</p>
                </div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-yellow-400" />
                Key Dates
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Created</span>
                  <span className="text-sm text-white">{formatDate(deal.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Last Updated</span>
                  <span className="text-sm text-white">{formatDate(deal.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Expected Delivery</span>
                  <span className="text-sm text-white">{formatDate(deal.terms.deliveryDate)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {isParty && deal.stage !== 'completed' && deal.stage !== 'cancelled' && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </button>
                  {isBuyer && deal.escrow.milestones.some(m => m.status === 'in_progress') && (
                    <button className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center">
                      <Check className="h-4 w-4 mr-2" />
                      Approve Milestone
                    </button>
                  )}
                  <button className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                  <button className="w-full px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Raise Dispute
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}