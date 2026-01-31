'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface KYCSubmission {
  user: string;
  status: number;
  level: number;
  requestedLevel: number;
  countryCode: number;
  documentHash: string;
  dataHash: string;
  submittedAt: number;
  verifiedAt: number;
  expiresAt: number;
  verifiedBy: string;
  autoVerified: boolean;
  rejectionReason: number;
  rejectionDetails: string;
  verificationScore: number;
  totalInvested: string;
}

interface KYCStats {
  totalSubmissions: number;
  totalAutoApproved: number;
  totalManualApproved: number;
  totalRejected: number;
  pendingManualReview: number;
  totalUsers: number;
}

interface KYCDocuments {
  walletAddress: string;
  submittedAt: number;
  idDocument?: { name: string; type: string; data: string };
  selfie?: { name: string; type: string; data: string };
  addressProof?: { name: string; type: string; data: string };
  accreditedProof?: { name: string; type: string; data: string };
  livenessScreenshots?: string[];
  personalInfo?: {
    fullName: string;
    dateOfBirth: string;
    countryCode: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_NAMES: Record<number, string> = {
  0: 'None', 1: 'Pending', 2: 'AutoVerifying', 3: 'ManualReview',
  4: 'Approved', 5: 'Rejected', 6: 'Expired', 7: 'Revoked'
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-slate-500', 1: 'bg-yellow-500', 2: 'bg-blue-500', 3: 'bg-orange-500',
  4: 'bg-green-500', 5: 'bg-red-500', 6: 'bg-gray-500', 7: 'bg-purple-500'
};

const LEVEL_NAMES: Record<number, string> = {
  0: 'None', 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Diamond'
};

const LEVEL_COLORS: Record<number, string> = {
  0: 'text-slate-400', 1: 'text-amber-600', 2: 'text-slate-300', 3: 'text-yellow-400', 4: 'text-purple-400'
};

const LEVEL_ICONS: Record<number, string> = {
  0: '○', 1: '🥉', 2: '🥈', 3: '🥇', 4: '💎'
};

const REJECTION_REASONS: Record<number, string> = {
  0: 'None', 1: 'Blocked Country', 2: 'Underage', 3: 'Document Expired',
  4: 'Document Unreadable', 5: 'Face Mismatch', 6: 'Liveness Check Failed',
  7: 'Sanctions List', 8: 'Duplicate Identity', 9: 'Suspicious Activity', 10: 'Other'
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminKYCPage() {
  const { isConnected } = useAccount();

  // State
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [stats, setStats] = useState<KYCStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');

  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resetReason, setResetReason] = useState('Admin reset for testing');
  const [approveLevel, setApproveLevel] = useState(1);
  const [rejectReason, setRejectReason] = useState(10);
  const [rejectDetails, setRejectDetails] = useState('');

  // Document viewer states
  const [documents, setDocuments] = useState<KYCDocuments | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ---- Data Fetching ----

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/kyc/admin/users?limit=100');
      const data = await response.json();

      if (data.success) {
        setSubmissions(data.submissions || []);
        setStats(data.stats || null);
      } else {
        setError(data.error || 'Failed to fetch KYC data');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchData();
    }
  }, [isConnected, fetchData]);

  // Fetch documents when a submission is selected
  useEffect(() => {
    const fetchDocs = async () => {
      if (!selectedSubmission) {
        setDocuments(null);
        return;
      }

      setLoadingDocs(true);
      try {
        const res = await fetch(`/api/kyc/documents/${selectedSubmission.user}`);
        const data = await res.json();
        if (data.found) {
          setDocuments(data.documents);
        } else {
          setDocuments(null);
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setDocuments(null);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocs();
  }, [selectedSubmission]);

  // ---- Actions ----

  const handleReset = async () => {
    if (!selectedSubmission) return;

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/kyc/reset/${selectedSubmission.user}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: resetReason })
      });

      const data = await response.json();

      if (data.success) {
        setActionSuccess(data.message || 'KYC reset successfully');
        setShowResetModal(false);
        setSelectedSubmission(null);
        await fetchData();
      } else {
        setActionError(data.error || 'Failed to reset KYC');
      }
    } catch (err: any) {
      console.error('Reset error:', err);
      setActionError(err.message || 'Failed to reset KYC');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch('/api/kyc/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: selectedSubmission.user,
          level: approveLevel
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionSuccess(data.message || 'KYC approved successfully');
        setShowApproveModal(false);
        setSelectedSubmission(null);
        await fetchData();
      } else {
        setActionError(data.error || 'Failed to approve KYC');
      }
    } catch (err: any) {
      console.error('Approve error:', err);
      setActionError(err.message || 'Failed to approve KYC');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch('/api/kyc/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: selectedSubmission.user,
          reason: rejectReason,
          details: rejectDetails
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionSuccess(data.message || 'KYC rejected successfully');
        setShowRejectModal(false);
        setSelectedSubmission(null);
        await fetchData();
      } else {
        setActionError(data.error || 'Failed to reject KYC');
      }
    } catch (err: any) {
      console.error('Reject error:', err);
      setActionError(err.message || 'Failed to reject KYC');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Filtering ----

  const filteredSubmissions = submissions.filter(sub => {
    if (searchAddress && !sub.user.toLowerCase().includes(searchAddress.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'all' && sub.status !== filterStatus) {
      return false;
    }
    if (filterLevel !== 'all' && sub.level !== filterLevel) {
      return false;
    }
    return true;
  });

  // ---- Helpers ----

  const formatAddress = (addr: string) => {
    if (!addr) return 'N/A';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ---- Document Rendering ----

  const renderDocument = (doc: { name: string; type: string; data: string } | undefined, label: string) => {
    if (!doc) {
      return (
        <div className="bg-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-slate-500 text-sm">{label}</div>
          <div className="text-slate-400 mt-1">Not provided</div>
        </div>
      );
    }

    const isImage = doc.type.startsWith('image/');
    const dataUrl = `data:${doc.type};base64,${doc.data}`;

    return (
      <div className="bg-slate-700/50 rounded-lg p-4">
        <div className="text-slate-400 text-sm mb-2">{label}</div>
        <div className="text-white text-sm mb-2 truncate">{doc.name}</div>
        {isImage ? (
          <div
            className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => setPreviewImage(dataUrl)}
          >
            <img src={dataUrl} alt={label} className="w-full h-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-sm">Click to enlarge</span>
            </div>
          </div>
        ) : (
          <a
            href={dataUrl}
            download={doc.name}
            className="block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-center text-sm"
          >
            Download {doc.type.includes('pdf') ? 'PDF' : 'File'}
          </a>
        )}
      </div>
    );
  };

  // ---- Render ----

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admin KYC Management</h1>
          <p className="text-slate-400">Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-slate-400 hover:text-white">
                ← Back to Admin
              </Link>
              <h1 className="text-xl font-bold text-white">KYC Management</h1>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Total Users</div>
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Total Submissions</div>
              <div className="text-2xl font-bold text-white">{stats.totalSubmissions}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Auto Approved</div>
              <div className="text-2xl font-bold text-green-400">{stats.totalAutoApproved}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Manual Approved</div>
              <div className="text-2xl font-bold text-blue-400">{stats.totalManualApproved}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Pending Review</div>
              <div className="text-2xl font-bold text-orange-400">{stats.pendingManualReview}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm">Rejected</div>
              <div className="text-2xl font-bold text-red-400">{stats.totalRejected}</div>
            </div>
          </div>
        )}

        {/* Action Messages */}
        {actionSuccess && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400">
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400">
            {actionError}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-slate-400 mb-1">Search Address</label>
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Level</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                {Object.entries(LEVEL_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Users Table */}
        {!isLoading && !error && (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Level</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Requested</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Submitted</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No submissions found
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.user} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white">{formatAddress(sub.user)}</span>
                            <button
                              onClick={() => copyToClipboard(sub.user)}
                              className="text-slate-400 hover:text-white"
                              title="Copy address"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${STATUS_COLORS[sub.status]}`}>
                            {STATUS_NAMES[sub.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 ${LEVEL_COLORS[sub.level]}`}>
                            <span>{LEVEL_ICONS[sub.level]}</span>
                            <span>{LEVEL_NAMES[sub.level]}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 ${LEVEL_COLORS[sub.requestedLevel]}`}>
                            <span>{LEVEL_ICONS[sub.requestedLevel]}</span>
                            <span>{LEVEL_NAMES[sub.requestedLevel]}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white">{sub.verificationScore}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-400">{formatDate(sub.submittedAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setActiveTab('info');
                              }}
                              className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs text-white"
                            >
                              View
                            </button>
                            {[4, 5].includes(sub.status) && (
                              <button
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setShowResetModal(true);
                                }}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs text-white"
                              >
                                Reset
                              </button>
                            )}
                            {sub.status === 3 && (
                              <button
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setApproveLevel(sub.requestedLevel);
                                  setShowApproveModal(true);
                                }}
                                className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white"
                              >
                                Approve
                              </button>
                            )}
                            {[1, 3].includes(sub.status) && (
                              <button
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setShowRejectModal(true);
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected User Detail Panel with Documents */}
        {selectedSubmission && !showResetModal && !showApproveModal && !showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
                <h3 className="text-lg font-semibold text-white">KYC Details</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Information
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'documents'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Documents {documents ? '✓' : ''}
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'info' ? (
                  <div className="space-y-4">
                    {/* Address */}
                    <div>
                      <label className="text-sm text-slate-400">Wallet Address</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-white break-all">{selectedSubmission.user}</span>
                        <button
                          onClick={() => copyToClipboard(selectedSubmission.user)}
                          className="text-slate-400 hover:text-white shrink-0"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Personal Info from documents */}
                    {documents?.personalInfo && (
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-3">Personal Information</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm text-slate-400">Full Name</label>
                            <div className="text-white mt-1">{documents.personalInfo.fullName}</div>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Date of Birth</label>
                            <div className="text-white mt-1">{documents.personalInfo.dateOfBirth}</div>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Country Code</label>
                            <div className="text-white mt-1">{documents.personalInfo.countryCode}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status & Level */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-400">Status</label>
                        <div className="mt-1">
                          <span className={`px-3 py-1 rounded-full text-sm text-white ${STATUS_COLORS[selectedSubmission.status]}`}>
                            {STATUS_NAMES[selectedSubmission.status]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Current Level</label>
                        <div className={`mt-1 flex items-center gap-2 ${LEVEL_COLORS[selectedSubmission.level]}`}>
                          <span className="text-2xl">{LEVEL_ICONS[selectedSubmission.level]}</span>
                          <span className="font-semibold">{LEVEL_NAMES[selectedSubmission.level]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requested Level */}
                    {selectedSubmission.requestedLevel !== selectedSubmission.level && (
                      <div>
                        <label className="text-sm text-slate-400">Requested Level</label>
                        <div className={`mt-1 flex items-center gap-2 ${LEVEL_COLORS[selectedSubmission.requestedLevel]}`}>
                          <span className="text-2xl">{LEVEL_ICONS[selectedSubmission.requestedLevel]}</span>
                          <span className="font-semibold">{LEVEL_NAMES[selectedSubmission.requestedLevel]}</span>
                        </div>
                      </div>
                    )}

                    {/* Verification Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-400">Verification Score</label>
                        <div className="text-white text-lg mt-1">{selectedSubmission.verificationScore}%</div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Auto Verified</label>
                        <div className="text-white text-lg mt-1">{selectedSubmission.autoVerified ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-slate-400">Submitted</label>
                        <div className="text-white mt-1">{formatDate(selectedSubmission.submittedAt)}</div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Verified</label>
                        <div className="text-white mt-1">{formatDate(selectedSubmission.verifiedAt)}</div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Expires</label>
                        <div className="text-white mt-1">{formatDate(selectedSubmission.expiresAt)}</div>
                      </div>
                    </div>

                    {/* Rejection Details */}
                    {selectedSubmission.status === 5 && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <label className="text-sm text-red-400">Rejection Reason</label>
                        <div className="text-white mt-1">{REJECTION_REASONS[selectedSubmission.rejectionReason]}</div>
                        {selectedSubmission.rejectionDetails && (
                          <>
                            <label className="text-sm text-red-400 mt-2 block">Details</label>
                            <div className="text-white mt-1">{selectedSubmission.rejectionDetails}</div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Country & Investment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-400">Country Code</label>
                        <div className="text-white mt-1">{selectedSubmission.countryCode}</div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Total Invested</label>
                        <div className="text-white mt-1">
                          ${(Number(selectedSubmission.totalInvested) / 1e6).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loadingDocs ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    ) : !documents ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-slate-400">No documents found for this submission.</p>
                        <p className="text-slate-500 text-sm mt-2">
                          Documents may not have been stored or the submission was made before document storage was enabled.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Document Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          {renderDocument(documents.idDocument, 'Government ID')}
                          {renderDocument(documents.selfie, 'Selfie Photo')}
                          {renderDocument(documents.addressProof, 'Proof of Address')}
                          {renderDocument(documents.accreditedProof, 'Accredited Investor Proof')}
                        </div>

                        {/* Liveness Screenshots */}
                        {documents.livenessScreenshots && documents.livenessScreenshots.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-3">Liveness Check Screenshots</h4>
                            <div className="grid grid-cols-5 gap-2">
                              {documents.livenessScreenshots.map((screenshot: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="aspect-square bg-slate-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                                  onClick={() => setPreviewImage(screenshot)}
                                >
                                  <img
                                    src={screenshot}
                                    alt={`Liveness ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Submission Time */}
                        <div className="text-slate-500 text-sm">
                          Documents submitted: {new Date(documents.submittedAt).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
                  {[4, 5].includes(selectedSubmission.status) && (
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium"
                    >
                      Reset KYC
                    </button>
                  )}
                  {selectedSubmission.status === 3 && (
                    <>
                      <button
                        onClick={() => {
                          setApproveLevel(selectedSubmission.requestedLevel);
                          setShowApproveModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh]">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Reset Modal */}
        {showResetModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Reset KYC</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-slate-300">
                  Are you sure you want to reset KYC for{' '}
                  <span className="font-mono text-white">{formatAddress(selectedSubmission.user)}</span>?
                </p>
                <p className="text-yellow-400 text-sm">
                  ⚠️ This will revoke their current KYC status and they will need to resubmit.
                </p>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Reason</label>
                  <input
                    type="text"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Reason for reset..."
                  />
                </div>

                {actionError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {actionError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowResetModal(false);
                      setActionError(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Resetting...' : 'Reset KYC'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Approve KYC</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-slate-300">
                  Approve KYC for{' '}
                  <span className="font-mono text-white">{formatAddress(selectedSubmission.user)}</span>
                </p>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Approve to Level</label>
                  <select
                    value={approveLevel}
                    onChange={(e) => setApproveLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value={1}>🥉 Bronze</option>
                    <option value={2}>🥈 Silver</option>
                    <option value={3}>🥇 Gold</option>
                    <option value={4}>💎 Diamond</option>
                  </select>
                </div>

                {actionError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {actionError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowApproveModal(false);
                      setActionError(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Reject KYC</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-slate-300">
                  Reject KYC for{' '}
                  <span className="font-mono text-white">{formatAddress(selectedSubmission.user)}</span>
                </p>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rejection Reason</label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    {Object.entries(REJECTION_REASONS).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Details (Optional)</label>
                  <textarea
                    value={rejectDetails}
                    onChange={(e) => setRejectDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500 resize-none"
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>

                {actionError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {actionError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setActionError(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
