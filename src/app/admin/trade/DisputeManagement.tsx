// src/app/admin/trade/DisputeManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  Search,
  Filter,
  Eye,
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  DollarSign,
  Users,
  MessageSquare,
  FileText,
  Loader2,
  X,
  UserCheck,
  Gavel,
  Send,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface DisputeStats {
  total: number;
  pending: number;
  inMediation: number;
  inArbitration: number;
  resolved: number;
  totalValue: number;
}

interface Dispute {
  id: string;
  dealId: string;
  dealReference: string;
  dealTitle: string;
  type: string;
  status: string;
  initiator: string;
  initiatorCompany: string;
  respondent: string;
  respondentCompany: string;
  claimedAmount: number;
  description: string;
  arbiter?: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DISPUTE_TYPES: Record<string, { label: string; icon: string }> = {
  quality_issue: { label: 'Quality Issue', icon: '⚠️' },
  quantity_discrepancy: { label: 'Quantity Discrepancy', icon: '📦' },
  late_delivery: { label: 'Late Delivery', icon: '⏰' },
  documentation_issue: { label: 'Documentation Issue', icon: '📄' },
  payment_dispute: { label: 'Payment Dispute', icon: '💰' },
  fraud_suspected: { label: 'Fraud Suspected', icon: '🚨' },
  contract_breach: { label: 'Contract Breach', icon: '📝' },
  other: { label: 'Other', icon: '❓' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_review: { label: 'Under Review', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  evidence_requested: { label: 'Evidence Requested', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  mediation: { label: 'In Mediation', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  arbitration: { label: 'In Arbitration', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  resolved_buyer: { label: 'Resolved - Buyer', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_seller: { label: 'Resolved - Seller', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  resolved_split: { label: 'Resolved - Split', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StatsGrid({ stats }: { stats: DisputeStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total</span>
          <AlertTriangle className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      
      <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Pending</span>
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
      </div>
      
      <div className="bg-gray-800 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Mediation</span>
          <Users className="h-5 w-5 text-orange-400" />
        </div>
        <p className="text-2xl font-bold text-orange-400">{stats.inMediation}</p>
      </div>
      
      <div className="bg-gray-800 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Arbitration</span>
          <Scale className="h-5 w-5 text-red-400" />
        </div>
        <p className="text-2xl font-bold text-red-400">{stats.inArbitration}</p>
      </div>
      
      <div className="bg-gray-800 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Resolved</span>
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        </div>
        <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
      </div>
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Value at Risk</span>
          <DollarSign className="h-5 w-5 text-yellow-400" />
        </div>
        <p className="text-2xl font-bold text-yellow-400">
          ${(stats.totalValue / 1_000).toFixed(0)}K
        </p>
      </div>
    </div>
  );
}

function DisputeRow({ 
  dispute, 
  onView,
  onAssignArbiter,
  onResolve,
}: { 
  dispute: Dispute;
  onView: () => void;
  onAssignArbiter: () => void;
  onResolve: () => void;
}) {
  const typeInfo = DISPUTE_TYPES[dispute.type] || DISPUTE_TYPES.other;
  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.submitted;
  const isResolved = dispute.status.startsWith('resolved');
  const isUrgent = dispute.deadline && new Date(dispute.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      <td className="py-4 px-4">
        <div className="flex items-center">
          {isUrgent && !isResolved && (
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
          )}
          <div>
            <p className="text-white font-medium">#{dispute.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-400">{dispute.dealReference}</p>
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span>{typeInfo.icon}</span>
          <span className="text-white text-sm">{typeInfo.label}</span>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div>
          <p className="text-white text-sm">{dispute.initiatorCompany}</p>
          <p className="text-xs text-gray-400">vs {dispute.respondentCompany}</p>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <p className="text-white font-medium">
          ${dispute.claimedAmount.toLocaleString()}
        </p>
      </td>
      
      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </td>
      
      <td className="py-4 px-4">
        {dispute.arbiter ? (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-400 font-mono">
              {dispute.arbiter.slice(0, 6)}...
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Not assigned</span>
        )}
      </td>
      
      <td className="py-4 px-4">
        {dispute.deadline ? (
          <div className={`text-sm ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
            {new Date(dispute.deadline).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-sm text-gray-500">-</span>
        )}
      </td>
      
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!isResolved && !dispute.arbiter && (
            <button
              onClick={onAssignArbiter}
              className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
              title="Assign Arbiter"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          {!isResolved && dispute.status === 'arbitration' && (
            <button
              onClick={onResolve}
              className="p-2 text-gray-400 hover:text-green-400 transition-colors"
              title="Resolve Dispute"
            >
              <Gavel className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DisputeDetailModal({
  dispute,
  onClose,
  onAssignArbiter,
  onUpdateStatus,
  onResolve,
}: {
  dispute: Dispute;
  onClose: () => void;
  onAssignArbiter: (arbiterAddress: string) => void;
  onUpdateStatus: (status: string) => void;
  onResolve: (buyerAmount: number, sellerAmount: number, reasoning: string) => void;
}) {
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [buyerPercentage, setBuyerPercentage] = useState(50);
  const [reasoning, setReasoning] = useState('');
  const [activeSection, setActiveSection] = useState<'details' | 'arbiter' | 'resolve'>('details');

  const typeInfo = DISPUTE_TYPES[dispute.type] || DISPUTE_TYPES.other;
  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.submitted;
  const isResolved = dispute.status.startsWith('resolved');

  const buyerAmount = (dispute.claimedAmount * buyerPercentage) / 100;
  const sellerAmount = dispute.claimedAmount - buyerAmount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{typeInfo.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-white">Dispute #{dispute.id.slice(0, 8)}</h2>
              <p className="text-gray-400">{dispute.dealReference} - {typeInfo.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveSection('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeSection === 'details' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Details
          </button>
          {!isResolved && (
            <>
              <button
                onClick={() => setActiveSection('arbiter')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeSection === 'arbiter' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Assign Arbiter
              </button>
              <button
                onClick={() => setActiveSection('resolve')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeSection === 'resolve' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Resolve
              </button>
            </>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Details Section */}
          {activeSection === 'details' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {!isResolved && (
                  <select
                    value={dispute.status}
                    onChange={(e) => onUpdateStatus(e.target.value)}
                    className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="evidence_requested">Evidence Requested</option>
                    <option value="mediation">Mediation</option>
                    <option value="arbitration">Arbitration</option>
                  </select>
                )}
              </div>

              {/* Parties */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-2">Initiator (Claimant)</p>
                  <p className="text-white font-medium">{dispute.initiatorCompany}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{dispute.initiator}</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-2">Respondent</p>
                  <p className="text-white font-medium">{dispute.respondentCompany}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{dispute.respondent}</p>
                </div>
              </div>

              {/* Claimed Amount */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-2">Claimed Amount</p>
                <p className="text-3xl font-bold text-white">
                  ${dispute.claimedAmount.toLocaleString()}
                </p>
              </div>

              {/* Description */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-2">Description</p>
                <p className="text-gray-300 whitespace-pre-wrap">{dispute.description}</p>
              </div>

              {/* Arbiter */}
              {dispute.arbiter && (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-2">Assigned Arbiter</p>
                  <p className="text-white font-mono">{dispute.arbiter}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Filed</span>
                    <span className="text-white">{new Date(dispute.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-white">{new Date(dispute.updatedAt).toLocaleString()}</span>
                  </div>
                  {dispute.deadline && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deadline</span>
                      <span className="text-white">{new Date(dispute.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assign Arbiter Section */}
          {activeSection === 'arbiter' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Arbiter Wallet Address
                </label>
                <input
                  type="text"
                  value={arbiterAddress}
                  onChange={(e) => setArbiterAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-400 text-sm">
                  The assigned arbiter will have the authority to review evidence and make a final 
                  binding decision on this dispute.
                </p>
              </div>

              <button
                onClick={() => onAssignArbiter(arbiterAddress)}
                disabled={!arbiterAddress || arbiterAddress.length !== 42}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Assign Arbiter
              </button>
            </div>
          )}

          {/* Resolve Section */}
          {activeSection === 'resolve' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-medium">⚠️ Final Resolution</p>
                <p className="text-gray-400 text-sm mt-1">
                  This action is irreversible. The escrow will release funds according to your decision.
                </p>
              </div>

              {/* Amount Slider */}
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Initiator: {buyerPercentage}%</span>
                  <span>Respondent: {100 - buyerPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={buyerPercentage}
                  onChange={(e) => setBuyerPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Amount Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 text-center border border-blue-500/20">
                  <p className="text-sm text-gray-400 mb-1">Initiator Receives</p>
                  <p className="text-2xl font-bold text-blue-400">
                    ${buyerAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/20">
                  <p className="text-sm text-gray-400 mb-1">Respondent Receives</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${sellerAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Reasoning *
                </label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  rows={4}
                  placeholder="Provide detailed reasoning for this decision..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={() => onResolve(buyerAmount, sellerAmount, reasoning)}
                disabled={!reasoning.trim()}
                className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Gavel className="h-5 w-5 mr-2" />
                Submit Final Resolution
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface DisputeManagementProps {
  onRefresh?: () => void;
}

export default function DisputeManagement({ onRefresh }: DisputeManagementProps) {
  const { address } = useAccount();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    total: 0,
    pending: 0,
    inMediation: 0,
    inArbitration: 0,
    resolved: 0,
    totalValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/trade/disputes?${params}`, {
        headers: { 'x-wallet-address': address },
      });

      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes.map((d: any) => ({
          id: d.id,
          dealId: d.deal_id,
          dealReference: d.deal_reference,
          dealTitle: d.deal_title,
          type: d.type,
          status: d.status,
          initiator: d.initiator,
          initiatorCompany: d.initiator_company,
          respondent: d.respondent,
          respondentCompany: d.respondent_company,
          claimedAmount: d.claimed_amount,
          description: d.description,
          arbiter: d.arbiter,
          createdAt: new Date(d.created_at),
          updatedAt: new Date(d.updated_at),
          deadline: d.deadline ? new Date(d.deadline) : undefined,
        })));
        setTotalPages(data.pagination?.pages || 1);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/admin/trade/disputes/stats', {
        headers: { 'x-wallet-address': address },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleAssignArbiter = async (disputeId: string, arbiterAddress: string) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/disputes/${disputeId}/arbiter`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ arbiter: arbiterAddress }),
      });

      if (response.ok) {
        setDisputes(disputes.map(d => 
          d.id === disputeId ? { ...d, arbiter: arbiterAddress, status: 'arbitration' } : d
        ));
        setSelectedDispute(null);
        fetchDisputes();
      }
    } catch (error) {
      console.error('Error assigning arbiter:', error);
    }
  };

  const handleUpdateStatus = async (disputeId: string, status: string) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setDisputes(disputes.map(d => 
          d.id === disputeId ? { ...d, status } : d
        ));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleResolve = async (
    disputeId: string, 
    buyerAmount: number, 
    sellerAmount: number, 
    reasoning: string
  ) => {
    if (!address) return;

    try {
      const response = await fetch(`/api/admin/trade/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ buyerAmount, sellerAmount, reasoning }),
      });

      if (response.ok) {
        setSelectedDispute(null);
        fetchDisputes();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
    }
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
              placeholder="Search disputes..."
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
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="mediation">In Mediation</option>
            <option value="arbitration">In Arbitration</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <button 
          onClick={() => {
            fetchDisputes();
            onRefresh?.();
          }}
          className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Dispute</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Parties</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Arbiter</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Deadline</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                    Loading disputes...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Scale className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p>No disputes found</p>
                    <p className="text-sm text-gray-500 mt-1">All clear!</p>
                  </td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <DisputeRow
                    key={dispute.id}
                    dispute={dispute}
                    onView={() => setSelectedDispute(dispute)}
                    onAssignArbiter={() => {
                      setSelectedDispute(dispute);
                    }}
                    onResolve={() => {
                      setSelectedDispute(dispute);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {disputes.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {disputes.length} of {stats.total} disputes
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
      {selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onAssignArbiter={(arbiter) => handleAssignArbiter(selectedDispute.id, arbiter)}
          onUpdateStatus={(status) => handleUpdateStatus(selectedDispute.id, status)}
          onResolve={(buyerAmount, sellerAmount, reasoning) => 
            handleResolve(selectedDispute.id, buyerAmount, sellerAmount, reasoning)
          }
        />
      )}
    </div>
  );
}
