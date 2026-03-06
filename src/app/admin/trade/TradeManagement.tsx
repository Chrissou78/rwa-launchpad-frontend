// src/app/admin/trade/TradeManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  FileText,
  Ship,
  Scale,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Shield,
  TrendingUp,
  ExternalLink,
  X,
  Check,
  Loader2,
  Globe,
  Package,
} from 'lucide-react';
import { KYC_LEVEL_INFO, KYCLevel } from '@/lib/trade/kyc-authorization';

// =============================================================================
// TYPES
// =============================================================================

interface TradeStats {
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
  disputedDeals: number;
  totalVolume: number;
  pendingVolume: number;
  disputedVolume: number;
  averageDealSize: number;
}

interface TradeDeal {
  id: string;
  reference: string;
  title: string;
  stage: string;
  buyerCompany: string;
  buyerCountry: string;
  buyerWallet: string;
  buyerKycLevel: KYCLevel;
  sellerCompany: string;
  sellerCountry: string;
  sellerWallet: string;
  sellerKycLevel: KYCLevel;
  productName: string;
  productCategory: string;
  totalValue: number;
  currency: string;
  incoterm: string;
  riskScore: number;
  flagged: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  loi_pending: { label: 'LOI Pending', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  loi_signed: { label: 'LOI Signed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  kyc_verification: { label: 'KYC Verification', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  contract_negotiation: { label: 'Contract Negotiation', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  contract_signed: { label: 'Contract Signed', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  payment_deposited: { label: 'Payment Deposited', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  production: { label: 'In Production', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  quality_inspection: { label: 'Quality Inspection', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  shipping: { label: 'Shipping', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  customs_clearance: { label: 'Customs Clearance', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  delivery: { label: 'Delivery', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  inspection_final: { label: 'Final Inspection', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  payment_released: { label: 'Payment Released', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  disputed: { label: 'Disputed', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CN: 'China',
  JP: 'Japan',
  SG: 'Singapore',
  AE: 'UAE',
  BR: 'Brazil',
  IN: 'India',
  AU: 'Australia',
  CA: 'Canada',
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsGrid({ stats }: { stats: TradeStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Deals</span>
          <FileText className="h-5 w-5 text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-white">{stats.totalDeals}</p>
        <p className="text-xs text-gray-500">{stats.activeDeals} active</p>
      </div>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Volume</span>
          <DollarSign className="h-5 w-5 text-green-400" />
        </div>
        <p className="text-2xl font-bold text-white">
          ${stats.totalVolume >= 1_000_000 
            ? `${(stats.totalVolume / 1_000_000).toFixed(1)}M`
            : `${(stats.totalVolume / 1_000).toFixed(0)}K`
          }
        </p>
        <p className="text-xs text-gray-500">
          ${(stats.pendingVolume / 1_000).toFixed(0)}K in escrow
        </p>
      </div>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Disputed</span>
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <p className="text-2xl font-bold text-white">{stats.disputedDeals}</p>
        <p className="text-xs text-gray-500">
          ${(stats.disputedVolume / 1_000).toFixed(0)}K at risk
        </p>
      </div>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Avg. Deal Size</span>
          <TrendingUp className="h-5 w-5 text-purple-400" />
        </div>
        <p className="text-2xl font-bold text-white">
          ${(stats.averageDealSize / 1_000).toFixed(0)}K
        </p>
        <p className="text-xs text-gray-500">{stats.completedDeals} completed</p>
      </div>
    </div>
  );
}

function DealRow({ 
  deal, 
  onView,
  onFlag,
  onUpdateKyc,
}: { 
  deal: TradeDeal;
  onView: () => void;
  onFlag: () => void;
  onUpdateKyc: (party: 'buyer' | 'seller', level: KYCLevel) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const stageConfig = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.draft;
  const buyerKycInfo = KYC_LEVEL_INFO[deal.buyerKycLevel];
  const sellerKycInfo = KYC_LEVEL_INFO[deal.sellerKycLevel];

  const getRiskColor = () => {
    if (deal.riskScore >= 80) return 'text-red-400';
    if (deal.riskScore >= 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskBgColor = () => {
    if (deal.riskScore >= 80) return 'bg-red-500';
    if (deal.riskScore >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      <td className="py-4 px-4">
        <div className="flex items-center">
          {deal.flagged && (
            <AlertTriangle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" />
          )}
          <div>
            <p className="text-white font-medium">{deal.reference}</p>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{deal.title}</p>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div>
          <p className="text-white text-sm">{deal.buyerCompany}</p>
          <div className="flex items-center mt-1 gap-2">
            <span className="text-lg">{buyerKycInfo.icon}</span>
            <span className={`text-xs ${buyerKycInfo.color}`}>{buyerKycInfo.label}</span>
            <span className="text-xs text-gray-500">• {deal.buyerCountry}</span>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div>
          <p className="text-white text-sm">{deal.sellerCompany}</p>
          <div className="flex items-center mt-1 gap-2">
            <span className="text-lg">{sellerKycInfo.icon}</span>
            <span className={`text-xs ${sellerKycInfo.color}`}>{sellerKycInfo.label}</span>
            <span className="text-xs text-gray-500">• {deal.sellerCountry}</span>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <p className="text-white font-medium">
          ${deal.totalValue.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400">{deal.currency}</p>
      </td>
      
      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stageConfig.color}`}>
          {stageConfig.label}
        </span>
      </td>
      
      <td className="py-4 px-4">
        <div className="flex items-center">
          <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden mr-2">
            <div 
              className={`h-full ${getRiskBgColor()}`}
              style={{ width: `${deal.riskScore}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getRiskColor()}`}>
            {deal.riskScore}
          </span>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onFlag}
            className={`p-2 transition-colors ${
              deal.flagged ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-yellow-400'
            }`}
            title={deal.flagged ? 'Remove Flag' : 'Flag Deal'}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-20">
                  <button
                    onClick={() => {
                      onUpdateKyc('buyer', 'silver');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Upgrade Buyer KYC
                  </button>
                  <button
                    onClick={() => {
                      onUpdateKyc('seller', 'silver');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Upgrade Seller KYC
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center">
                    <Scale className="h-4 w-4 mr-2" />
                    Assign Arbiter
                  </button>
                  <a
                    href={`/trade/deals/${deal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Deal Page
                  </a>
                  <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Deal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function DealDetailModal({
  deal,
  onClose,
  onUpdateKyc,
  onUpdateStage,
  onSave,
}: {
  deal: TradeDeal;
  onClose: () => void;
  onUpdateKyc: (party: 'buyer' | 'seller', level: KYCLevel) => void;
  onUpdateStage: (stage: string) => void;
  onSave: () => void;
}) {
  const [selectedStage, setSelectedStage] = useState(deal.stage);
  const [buyerKyc, setBuyerKyc] = useState(deal.buyerKycLevel);
  const [sellerKyc, setSellerKyc] = useState(deal.sellerKycLevel);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    if (buyerKyc !== deal.buyerKycLevel) {
      onUpdateKyc('buyer', buyerKyc);
    }
    if (sellerKyc !== deal.sellerKycLevel) {
      onUpdateKyc('seller', sellerKyc);
    }
    if (selectedStage !== deal.stage) {
      onUpdateStage(selectedStage);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{deal.reference}</h2>
            <p className="text-gray-400">{deal.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Buyer Info */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Buyer
              </h3>
              <p className="text-white font-medium">{deal.buyerCompany}</p>
              <p className="text-sm text-gray-400">{COUNTRY_NAMES[deal.buyerCountry] || deal.buyerCountry}</p>
              <p className="text-xs text-gray-500 mt-2 font-mono truncate">{deal.buyerWallet}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="block text-sm text-gray-400 mb-2">KYC Level</label>
                <select
                  value={buyerKyc}
                  onChange={(e) => setBuyerKyc(e.target.value as KYCLevel)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="none">Not Verified</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="diamond">💎 Diamond</option>
                </select>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Seller
              </h3>
              <p className="text-white font-medium">{deal.sellerCompany}</p>
              <p className="text-sm text-gray-400">{COUNTRY_NAMES[deal.sellerCountry] || deal.sellerCountry}</p>
              <p className="text-xs text-gray-500 mt-2 font-mono truncate">{deal.sellerWallet}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="block text-sm text-gray-400 mb-2">KYC Level</label>
                <select
                  value={sellerKyc}
                  onChange={(e) => setSellerKyc(e.target.value as KYCLevel)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="none">Not Verified</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="diamond">💎 Diamond</option>
                </select>
              </div>
            </div>

            {/* Deal Info */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Deal Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Product</span>
                  <span className="text-white">{deal.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white capitalize">{deal.productCategory.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Value</span>
                  <span className="text-white font-medium">${deal.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Incoterm</span>
                  <span className="text-white">{deal.incoterm}</span>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Stage Management</h3>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4"
              >
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>

              {deal.flagged && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm font-medium">⚠️ Flagged</p>
                  <p className="text-xs text-gray-400 mt-1">{deal.flagReason || 'No reason provided'}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Risk Score</p>
                <div className="flex items-center">
                  <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden mr-3">
                    <div 
                      className={`h-full ${
                        deal.riskScore >= 80 ? 'bg-red-500' :
                        deal.riskScore >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${deal.riskScore}%` }}
                    />
                  </div>
                  <span className={`text-lg font-bold ${
                    deal.riskScore >= 80 ? 'text-red-400' :
                    deal.riskScore >= 50 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {deal.riskScore}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline would go here */}
          <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </h3>
            <div className="text-center py-8 text-gray-500">
              <p>Deal timeline will be displayed here</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TradeManagementProps {
  onRefresh?: () => void;
}

export default function TradeManagement({ onRefresh }: TradeManagementProps) {
  const { address } = useAccount();
  const [deals, setDeals] = useState<TradeDeal[]>([]);
  const [stats, setStats] = useState<TradeStats>({
    totalDeals: 0,
    activeDeals: 0,
    completedDeals: 0,
    disputedDeals: 0,
    totalVolume: 0,
    pendingVolume: 0,
    disputedVolume: 0,
    averageDealSize: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<TradeDeal | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(kycFilter !== 'all' && { kycLevel: kycFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/trade/deals?${params}`, {
        headers: { 'x-wallet-address': address },
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals.map((d: any) => ({
          id: d.id,
          reference: d.reference,
          title: d.title,
          stage: d.stage,
          buyerCompany: d.buyer_company,
          buyerCountry: d.buyer_country,
          buyerWallet: d.buyer_wallet,
          buyerKycLevel: d.buyer_kyc_level || 'none',
          sellerCompany: d.seller_company,
          sellerCountry: d.seller_country,
          sellerWallet: d.seller_wallet,
          sellerKycLevel: d.seller_kyc_level || 'none',
          productName: d.product_name,
          productCategory: d.product_category,
          totalValue: d.product_total_value,
          currency: d.product_currency,
          incoterm: d.incoterm,
          riskScore: d.risk_score || Math.floor(Math.random() * 100),
          flagged: d.flagged || false,
          flagReason: d.flag_reason,
          createdAt: new Date(d.created_at),
          updatedAt: new Date(d.updated_at),
        })));
        setTotalPages(data.pagination?.pages || 1);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/admin/trade/stats', {
        headers: { 'x-wallet-address': address },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalDeals: statsData.total || 0,
          activeDeals: statsData.active || 0,
          completedDeals: statsData.completed || 0,
          disputedDeals: statsData.disputed || 0,
          totalVolume: statsData.totalVolume || 0,
          pendingVolume: statsData.pendingVolume || 0,
          disputedVolume: statsData.disputedVolume || 0,
          averageDealSize: statsData.averageDealSize || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, page, statusFilter, kycFilter, searchQuery]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleUpdateKyc = async (dealId: string, party: 'buyer' | 'seller', level: KYCLevel) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/deals/${dealId}/kyc`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ party, level }),
      });

      if (response.ok) {
        setDeals(deals.map(d => 
          d.id === dealId 
            ? { ...d, [party === 'buyer' ? 'buyerKycLevel' : 'sellerKycLevel']: level }
            : d
        ));
      }
    } catch (error) {
      console.error('Error updating KYC:', error);
    }
  };

  const handleFlag = async (dealId: string) => {
    if (!address) return;

    try {
      const deal = deals.find(d => d.id === dealId);
      const response = await fetch(`/api/admin/trade/deals/${dealId}/flag`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ flagged: !deal?.flagged }),
      });

      if (response.ok) {
        setDeals(deals.map(d => 
          d.id === dealId ? { ...d, flagged: !d.flagged } : d
        ));
      }
    } catch (error) {
      console.error('Error flagging deal:', error);
    }
  };

  const handleUpdateStage = async (dealId: string, stage: string) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ stage }),
      });

      if (response.ok) {
        setDeals(deals.map(d => 
          d.id === dealId ? { ...d, stage } : d
        ));
      }
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleExport = async () => {
    // Export deals to CSV
    const headers = ['Reference', 'Title', 'Buyer', 'Seller', 'Value', 'Stage', 'Risk Score'];
    const csvContent = [
      headers.join(','),
      ...deals.map(d => [
        d.reference,
        `"${d.title}"`,
        d.buyerCompany,
        d.sellerCompany,
        d.totalValue,
        d.stage,
        d.riskScore,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid stats={stats} />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Stages</option>
            <option value="draft">Draft</option>
            <option value="kyc_verification">KYC Verification</option>
            <option value="payment_deposited">Payment Deposited</option>
            <option value="shipping">Shipping</option>
            <option value="disputed">Disputed</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All KYC Levels</option>
            <option value="none">Not Verified</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="diamond">Diamond</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center border border-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button 
            onClick={() => {
              fetchDeals();
              onRefresh?.();
            }}
            className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Deal</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Buyer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Seller</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Value</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Stage</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Risk</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                    Loading deals...
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Ship className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p>No deals found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <DealRow
                    key={deal.id}
                    deal={deal}
                    onView={() => setSelectedDeal(deal)}
                    onFlag={() => handleFlag(deal.id)}
                    onUpdateKyc={(party, level) => handleUpdateKyc(deal.id, party, level)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {deals.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {deals.length} of {stats.totalDeals} deals
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdateKyc={(party, level) => handleUpdateKyc(selectedDeal.id, party, level)}
          onUpdateStage={(stage) => handleUpdateStage(selectedDeal.id, stage)}
          onSave={() => {
            setSelectedDeal(null);
            fetchDeals();
          }}
        />
      )}
    </div>
  );
}