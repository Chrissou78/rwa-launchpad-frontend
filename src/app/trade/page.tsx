// src/app/trade/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Shield,
  Clock,
  DollarSign,
  Package,
  Ship,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Globe,
  Lock,
  Users,
  Briefcase,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/trade/constants';

// =============================================================================
// TYPES
// =============================================================================

type TabType = 'overview' | 'my-deals' | 'documents' | 'compliance';

interface DealSummary {
  total: number;
  active: number;
  completed: number;
  disputed: number;
  totalValue: number;
  pendingPayments: number;
}

// =============================================================================
// MOCK DATA (Replace with API calls)
// =============================================================================

const MOCK_DEALS: Partial<Deal>[] = [
  {
    id: 'DEAL-2026-001',
    reference: 'DEAL-2026-001',
    title: 'Steel Coils from Germany',
    stage: 'shipping',
    product: {
      name: 'Hot-Rolled Steel Coils',
      category: 'metals',
      description: 'Grade S235JR steel coils',
      hsCode: '7208.10',
      quantity: 500,
      unit: 'MT',
      unitPrice: 850,
      currency: 'USDC',
      totalValue: 425000,
    },
    buyer: {
      walletAddress: '0x1234...5678',
      companyName: 'Global Manufacturing Ltd',
      country: 'US',
      contactName: 'John Smith',
      contactEmail: 'john@globalmanufacturing.com',
      kycStatus: 'verified',
    },
    seller: {
      walletAddress: '0x8765...4321',
      companyName: 'Deutsche Stahl GmbH',
      country: 'DE',
      contactName: 'Hans Mueller',
      contactEmail: 'hans@deutschestahl.de',
      kycStatus: 'verified',
    },
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-02-10'),
  },
  {
    id: 'DEAL-2026-002',
    reference: 'DEAL-2026-002',
    title: 'Electronic Components from Japan',
    stage: 'quality_inspection',
    product: {
      name: 'Semiconductor Chips',
      category: 'electronics',
      description: 'MCU chips for automotive',
      hsCode: '8542.31',
      quantity: 100000,
      unit: 'PCS',
      unitPrice: 2.5,
      currency: 'USDC',
      totalValue: 250000,
    },
    buyer: {
      walletAddress: '0x1234...5678',
      companyName: 'Global Manufacturing Ltd',
      country: 'US',
      contactName: 'John Smith',
      contactEmail: 'john@globalmanufacturing.com',
      kycStatus: 'verified',
    },
    seller: {
      walletAddress: '0x9876...1234',
      companyName: 'Tokyo Electronics Co.',
      country: 'JP',
      contactName: 'Yuki Tanaka',
      contactEmail: 'yuki@tokyoelectronics.jp',
      kycStatus: 'verified',
    },
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-02-12'),
  },
  {
    id: 'DEAL-2026-003',
    reference: 'DEAL-2026-003',
    title: 'Organic Coffee Beans from Brazil',
    stage: 'contract_negotiation',
    product: {
      name: 'Organic Arabica Coffee',
      category: 'agricultural',
      description: 'Single origin certified organic',
      hsCode: '0901.11',
      quantity: 50,
      unit: 'MT',
      unitPrice: 4500,
      currency: 'USDC',
      totalValue: 225000,
    },
    buyer: {
      walletAddress: '0x1234...5678',
      companyName: 'Global Manufacturing Ltd',
      country: 'US',
      contactName: 'John Smith',
      contactEmail: 'john@globalmanufacturing.com',
      kycStatus: 'verified',
    },
    seller: {
      walletAddress: '0x5432...8765',
      companyName: 'Fazenda Verde SA',
      country: 'BR',
      contactName: 'Carlos Santos',
      contactEmail: 'carlos@fazendaverde.br',
      kycStatus: 'pending',
    },
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-15'),
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getStageIcon = (stage: DealStage) => {
  const icons: Record<string, React.ReactNode> = {
    draft: <FileText className="h-4 w-4" />,
    loi_pending: <FileText className="h-4 w-4" />,
    loi_signed: <CheckCircle2 className="h-4 w-4" />,
    kyc_verification: <Shield className="h-4 w-4" />,
    contract_negotiation: <FileText className="h-4 w-4" />,
    contract_signed: <CheckCircle2 className="h-4 w-4" />,
    payment_deposited: <DollarSign className="h-4 w-4" />,
    production: <Package className="h-4 w-4" />,
    quality_inspection: <Shield className="h-4 w-4" />,
    shipping: <Ship className="h-4 w-4" />,
    customs_clearance: <FileText className="h-4 w-4" />,
    delivery: <Package className="h-4 w-4" />,
    inspection_final: <Shield className="h-4 w-4" />,
    payment_released: <DollarSign className="h-4 w-4" />,
    completed: <CheckCircle2 className="h-4 w-4" />,
    disputed: <AlertTriangle className="h-4 w-4" />,
    cancelled: <AlertTriangle className="h-4 w-4" />,
  };
  return icons[stage] || <Clock className="h-4 w-4" />;
};

const getStageColor = (stage: DealStage) => {
  const stageInfo = DEAL_STAGES[stage];
  const colors: Record<string, string> = {
    initiation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    compliance: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    contract: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    payment: 'bg-green-500/10 text-green-400 border-green-500/20',
    fulfillment: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    completion: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return colors[stageInfo.category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  color = 'blue' 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20',
  };
  
  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-6 border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${!trend.positive && 'rotate-180'}`} />
              {trend.value}% from last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gray-800/50 ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Partial<Deal> }) {
  const stage = deal.stage as DealStage;
  const stageInfo = DEAL_STAGES[stage];

  return (
    <Link href={`/trade/deals/${deal.id}`}>
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              {deal.title}
            </h3>
            <p className="text-sm text-gray-400">{deal.reference}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStageColor(stage)}`}>
            {getStageIcon(stage)}
            <span className="ml-1.5">{stageInfo.label}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Product</p>
            <p className="text-sm text-white">{deal.product?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Value</p>
            <p className="text-sm text-white font-medium">
              {formatCurrency(deal.product?.totalValue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Seller</p>
            <p className="text-sm text-white">{deal.seller?.companyName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Origin</p>
            <p className="text-sm text-white">{deal.seller?.country}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <p className="text-xs text-gray-500">
            Updated {formatDate(deal.updatedAt || new Date())}
          </p>
          <div className="flex items-center text-blue-400 text-sm group-hover:translate-x-1 transition-transform">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/30 transition-all">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
  isLast = false,
}: {
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
          {number}
        </div>
        {!isLast && <div className="w-0.5 h-full bg-blue-500/30 mt-2" />}
      </div>
      <div className="pb-8">
        <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [deals, setDeals] = useState<Partial<Deal>[]>(MOCK_DEALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate summary stats
  const dealSummary: DealSummary = {
    total: deals.length,
    active: deals.filter(d => !['completed', 'cancelled'].includes(d.stage || '')).length,
    completed: deals.filter(d => d.stage === 'completed').length,
    disputed: deals.filter(d => d.stage === 'disputed').length,
    totalValue: deals.reduce((sum, d) => sum + (d.product?.totalValue || 0), 0),
    pendingPayments: deals
      .filter(d => ['payment_deposited', 'production', 'quality_inspection', 'shipping'].includes(d.stage || ''))
      .reduce((sum, d) => sum + (d.product?.totalValue || 0), 0),
  };

  // Filter deals based on search and status
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = 
      deal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.seller?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || deal.stage === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: <Globe className="h-4 w-4" /> },
    { id: 'my-deals' as TabType, label: 'My Deals', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'documents' as TabType, label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { id: 'compliance' as TabType, label: 'Compliance', icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen bg-gray-900">
      <Header />
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
                <Lock className="h-4 w-4 mr-2" />
                Secure International Trade
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                International Trade
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Payment Platform
                </span>
              </h1>
              <p className="text-xl text-gray-400 mb-8">
                Execute secure cross-border transactions with crypto-powered escrow, 
                complete compliance management, and milestone-based payment releases.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/trade/deals/new">
                  <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Deal
                  </button>
                </Link>
                <button 
                  onClick={() => setActiveTab('my-deals')}
                  className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  View My Deals
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            {isConnected && (
              <div className="grid grid-cols-2 gap-4">
                <StatsCard
                  title="Active Deals"
                  value={dealSummary.active}
                  icon={<Briefcase className="h-6 w-6" />}
                  color="blue"
                />
                <StatsCard
                  title="Total Value"
                  value={formatCurrency(dealSummary.totalValue)}
                  icon={<DollarSign className="h-6 w-6" />}
                  color="green"
                />
                <StatsCard
                  title="In Escrow"
                  value={formatCurrency(dealSummary.pendingPayments)}
                  icon={<Lock className="h-6 w-6" />}
                  color="purple"
                />
                <StatsCard
                  title="Completed"
                  value={dealSummary.completed}
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  color="yellow"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800 sticky top-16 bg-gray-900/95 backdrop-blur-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-16">
            {/* Features Grid */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Why Use Our Platform?
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Our platform combines blockchain security with traditional trade finance workflows
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                  icon={<Lock className="h-6 w-6" />}
                  title="Secure Escrow"
                  description="Smart contract-powered escrow holds funds until contractual conditions are met, protecting both buyer and seller."
                />
                <FeatureCard
                  icon={<FileText className="h-6 w-6" />}
                  title="Document Management"
                  description="Comprehensive document workflow from LOI to delivery receipt, with verification and compliance checks."
                />
                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Full Compliance"
                  description="Built-in KYC/AML verification, sanctions screening, and regulatory compliance for international trade."
                />
                <FeatureCard
                  icon={<DollarSign className="h-6 w-6" />}
                  title="Milestone Payments"
                  description="Release funds based on verified milestones - from production to inspection to delivery confirmation."
                />
                <FeatureCard
                  icon={<Globe className="h-6 w-6" />}
                  title="Global Coverage"
                  description="Support for international trade across all major markets with multi-currency support (USDC, USDT, ETH)."
                />
                <FeatureCard
                  icon={<Users className="h-6 w-6" />}
                  title="Dispute Resolution"
                  description="Professional arbitration services to resolve disputes fairly and efficiently."
                />
              </div>
            </section>

            {/* Process Steps */}
            <section className="bg-gray-800/30 rounded-2xl p-8 md:p-12 border border-gray-700/50">
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    How It Works
                  </h2>
                  <p className="text-gray-400 mb-8">
                    Our streamlined process takes you from initial agreement to successful delivery 
                    with full transparency and security at every step.
                  </p>
                  <Link href="/trade/deals/new">
                    <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center">
                      Start Your First Deal
                      <ArrowUpRight className="h-5 w-5 ml-2" />
                    </button>
                  </Link>
                </div>
                <div>
                  <ProcessStep
                    number={1}
                    title="Create Deal & LOI"
                    description="Define deal terms, products, and parties. Generate and sign Letter of Intent."
                  />
                  <ProcessStep
                    number={2}
                    title="KYC & Compliance"
                    description="Complete identity verification and sanctions screening for all parties."
                  />
                  <ProcessStep
                    number={3}
                    title="Sign Contract & Deposit"
                    description="Execute purchase agreement and deposit funds into secure escrow."
                  />
                  <ProcessStep
                    number={4}
                    title="Production & Inspection"
                    description="Seller produces goods, third-party inspection verifies quality."
                  />
                  <ProcessStep
                    number={5}
                    title="Shipping & Delivery"
                    description="Goods shipped with full documentation, tracked to delivery."
                  />
                  <ProcessStep
                    number={6}
                    title="Final Acceptance"
                    description="Buyer confirms receipt, escrow releases final payment to seller."
                    isLast
                  />
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="text-center py-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Create your first deal today and experience secure, compliant international trade
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/trade/deals/new">
                  <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Create New Deal
                  </button>
                </Link>
                <Link href="/docs/trade">
                  <button className="px-8 py-4 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors">
                    Read Documentation
                  </button>
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* My Deals Tab */}
        {activeTab === 'my-deals' && (
          <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="loi_pending">LOI Pending</option>
                    <option value="kyc_verification">KYC Verification</option>
                    <option value="contract_negotiation">Contract Negotiation</option>
                    <option value="payment_deposited">Payment Deposited</option>
                    <option value="production">Production</option>
                    <option value="shipping">Shipping</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <Link href="/trade/deals/new">
                  <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    New Deal
                  </button>
                </Link>
              </div>
            </div>

            {/* Deals Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredDeals.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No deals found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : "You haven't created any deals yet"}
                </p>
                <Link href="/trade/deals/new">
                  <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                    Create Your First Deal
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Document Center</h3>
            <p className="text-gray-400 mb-6">
              View and manage all trade documents across your deals
            </p>
            <Link href="/trade/documents">
              <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                Open Document Center
              </button>
            </Link>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Compliance Center</h3>
            <p className="text-gray-400 mb-6">
              Manage KYC verification, sanctions screening, and compliance status
            </p>
            <Link href="/trade/compliance">
              <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                Open Compliance Center
              </button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
