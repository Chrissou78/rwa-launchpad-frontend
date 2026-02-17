// src/app/admin/tokenization/TokenizationManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  TokenizationApplication,
  TokenizationDocument,
  TOKENIZATION_STATUS,
  ASSET_TYPE_LABELS
} from '../constants';
import {
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Coins,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  DollarSign,
  Calendar,
  User,
  Lock,
  TrendingUp,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react';

interface TokenizationManagementProps {
  onRefresh?: () => void;
}

export default function TokenizationManagement({ onRefresh }: TokenizationManagementProps) {
  const { address } = useAccount();
  const [applications, setApplications] = useState<TokenizationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedApp, setSelectedApp] = useState<TokenizationApplication | null>(null);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');

  const fetchApplications = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/admin/tokenizations?${params}`, {
        headers: { 'x-wallet-address': address },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      const data = await response.json();
      setApplications(data.applications || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [address, page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleUpdateApplication = async () => {
    if (!selectedApp || !newStatus || !address) return;
    
    setUpdating(true);
    
    try {
      const response = await fetch('/api/admin/tokenizations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          status: newStatus,
          adminNotes: adminNotes || undefined,
          feeAmount: newFeeAmount ? parseFloat(newFeeAmount) : undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update application');
      }
      
      await fetchApplications();
      setSelectedApp(null);
      setAdminNotes('');
      setNewStatus('');
      setNewFeeAmount('');
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update application');
    } finally {
      setUpdating(false);
    }
  };

  const openApplicationDetails = (app: TokenizationApplication) => {
    setSelectedApp(app);
    setNewStatus(app.status);
    setAdminNotes(app.admin_notes || '');
    setNewFeeAmount(app.fee_amount.toString());
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'under_review':
        return <Clock className="w-4 h-4" />;
      case 'approved':
      case 'payment_confirmed':
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'payment_pending':
        return <CreditCard className="w-4 h-4" />;
      case 'creation_ready':
        return <Coins className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.asset_name.toLowerCase().includes(query) ||
      app.company_name.toLowerCase().includes(query) ||
      app.contact_name.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.wallet_address.toLowerCase().includes(query)
    );
  });

  if (loading && applications.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-400">Loading tokenization applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-400" />
              Tokenization Applications
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {totalCount} total applications • Review and manage asset tokenization requests
            </p>
          </div>
          
          <button
            onClick={() => fetchApplications()}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="payment_confirmed">Payment Confirmed</option>
              <option value="creation_ready">Ready to Create</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Applications List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No tokenization applications found</p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Asset</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Company</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Value</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Fee</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Add-ons</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredApplications.map((app) => {
                  const statusConfig = TOKENIZATION_STATUS[app.status] || TOKENIZATION_STATUS.pending;
                  return (
                    <tr key={app.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-white font-medium">{app.asset_name}</p>
                          <p className="text-gray-500 text-xs font-mono">
                            {app.wallet_address.slice(0, 6)}...{app.wallet_address.slice(-4)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-gray-300 text-sm">{app.company_name}</p>
                          <p className="text-gray-500 text-xs">{app.contact_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-300 text-sm">
                          {ASSET_TYPE_LABELS[app.asset_type] || app.asset_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white text-sm">{formatCurrency(app.estimated_value)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-green-400 text-sm font-medium">${app.fee_amount}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {app.needs_escrow && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded" title="Escrow">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {app.needs_dividends && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded" title="Dividends">
                              <TrendingUp className="w-3 h-3" />
                            </span>
                          )}
                          {!app.needs_escrow && !app.needs_dividends && (
                            <span className="text-gray-500 text-xs">Base</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          {getStatusIcon(app.status)}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-400 text-xs">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openApplicationDetails(app)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-700">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedApp.asset_name}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  ID: {selectedApp.id} • Submitted {formatDate(selectedApp.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Add-ons */}
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const config = TOKENIZATION_STATUS[selectedApp.status] || TOKENIZATION_STATUS.pending;
                  return (
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${config.color}`}>
                      {getStatusIcon(selectedApp.status)}
                      {config.label}
                    </span>
                  );
                })()}
                
                {selectedApp.needs_escrow && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-lg border border-green-500/30">
                    <Lock className="w-4 h-4" /> Trade Escrow
                  </span>
                )}
                {selectedApp.needs_dividends && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-sm rounded-lg border border-yellow-500/30">
                    <TrendingUp className="w-4 h-4" /> Dividend Distributor
                  </span>
                )}
              </div>

              {/* Company Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Company Information
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Company:</span>
                    <span className="text-white ml-2">{selectedApp.company_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Contact:</span>
                    <span className="text-white ml-2">{selectedApp.contact_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <a href={`mailto:${selectedApp.email}`} className="text-blue-400 ml-2 hover:underline">
                      {selectedApp.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white ml-2">{selectedApp.phone || 'N/A'}</span>
                  </div>
                  {selectedApp.website && (
                    <div className="md:col-span-2">
                      <span className="text-gray-400">Website:</span>
                      <a 
                        href={selectedApp.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 ml-2 hover:underline inline-flex items-center gap-1"
                      >
                        {selectedApp.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="text-gray-400">Wallet:</span>
                    <span className="text-white ml-2 font-mono text-xs bg-gray-600 px-2 py-1 rounded">
                      {selectedApp.wallet_address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Asset Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Asset Details
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Asset Type:</span>
                      <span className="text-white ml-2">{ASSET_TYPE_LABELS[selectedApp.asset_type] || selectedApp.asset_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Estimated Value:</span>
                      <span className="text-white ml-2 font-semibold">{formatCurrency(selectedApp.estimated_value)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Use Case:</span>
                      <span className="text-white ml-2">{selectedApp.use_case.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Fee:</span>
                      <span className="text-green-400 ml-2 font-semibold">${selectedApp.fee_amount} {selectedApp.fee_currency}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Description:</span>
                    <p className="text-white bg-gray-600/50 p-3 rounded">{selectedApp.asset_description}</p>
                  </div>
                  {selectedApp.additional_info && (
                    <div>
                      <span className="text-gray-400 block mb-1">Additional Info:</span>
                      <p className="text-white bg-gray-600/50 p-3 rounded">{selectedApp.additional_info}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Token Preferences */}
              {(selectedApp.token_name || selectedApp.token_symbol || selectedApp.total_supply) && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    Token Preferences
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Token Name:</span>
                      <span className="text-white ml-2">{selectedApp.token_name || 'TBD'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Symbol:</span>
                      <span className="text-white ml-2 font-mono">{selectedApp.token_symbol || 'TBD'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Supply:</span>
                      <span className="text-white ml-2">{selectedApp.total_supply || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedApp.documents && selectedApp.documents.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Documents ({selectedApp.documents.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedApp.documents.map((doc: TokenizationDocument, idx: number) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-600/50 rounded-lg hover:bg-gray-600 transition group"
                      >
                        <FileText className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{doc.name}</p>
                          <p className="text-gray-500 text-xs">{doc.type} • {(doc.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Deployment Info */}
              {selectedApp.status === 'completed' && (selectedApp.token_address || selectedApp.nft_address) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Deployment Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedApp.token_address && (
                      <div>
                        <span className="text-gray-400">Token Address:</span>
                        <span className="text-white ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">{selectedApp.token_address}</span>
                      </div>
                    )}
                    {selectedApp.nft_address && (
                      <div>
                        <span className="text-gray-400">NFT Address:</span>
                        <span className="text-white ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">{selectedApp.nft_address}</span>
                      </div>
                    )}
                    {selectedApp.escrow_address && (
                      <div>
                        <span className="text-gray-400">Escrow Address:</span>
                        <span className="text-white ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">{selectedApp.escrow_address}</span>
                      </div>
                    )}
                    {selectedApp.deployment_tx_hash && (
                      <div>
                        <span className="text-gray-400">TX Hash:</span>
                        <span className="text-white ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">{selectedApp.deployment_tx_hash}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Admin Actions
                </h4>
                
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Status Update */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Update Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="pending">Pending Review</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="payment_pending">Payment Pending</option>
                        <option value="payment_confirmed">Payment Confirmed</option>
                        <option value="creation_ready">Ready to Create</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Fee Amount */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Fee Amount (USD)</label>
                      <input
                        type="number"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="750"
                      />
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Admin Notes (internal)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                      placeholder="Add internal notes about this application..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-gray-800">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateApplication}
                disabled={updating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Update Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
