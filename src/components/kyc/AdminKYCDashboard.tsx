// src/components/kyc/AdminKYCDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useKYCAdmin } from '@/hooks/useKYCAdmin';
import { CheckCircle, XCircle, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface KYCEntry {
    id: string;
    name: string;
    level: number;
    status: string;
    countryCode: number;
    submittedAt: string;
    hasDocuments: boolean;
}

const KYC_LEVELS = [
    { value: 1, label: 'BASIC' },
    { value: 2, label: 'STANDARD' },
    { value: 3, label: 'ACCREDITED' },
    { value: 4, label: 'INSTITUTIONAL' }
];

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'SUBMITTED', label: 'Pending Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' }
];

export function AdminKYCDashboard() {
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { approveKYC, rejectKYC } = useKYCAdmin();

    const [entries, setEntries] = useState<KYCEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('SUBMITTED');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedEntry, setSelectedEntry] = useState<KYCEntry | null>(null);
    const [approvalLevel, setApprovalLevel] = useState(2);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchList = async () => {
        if (!address) return;

        setLoading(true);
        try {
            const timestamp = Date.now();
            const message = `RWA Launchpad - View KYC List\n\nStatus: ${statusFilter}\nPage: ${page}\nTimestamp: ${timestamp}`;
            const signature = await signMessageAsync({ message });

            const response = await fetch('/api/kyc/admin/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminAddress: address,
                    signature,
                    timestamp,
                    status: statusFilter,
                    page
                })
            });

            const data = await response.json();

            if (response.ok) {
                setEntries(data.results || []);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Failed to fetch list:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [address, statusFilter, page]);

    const handleApprove = async () => {
        if (!selectedEntry) return;

        setActionLoading(true);
        const result = await approveKYC(selectedEntry.id, approvalLevel);
        setActionLoading(false);

        if (result.success) {
            setSelectedEntry(null);
            fetchList();
        } else {
            alert(result.error);
        }
    };

    const handleReject = async () => {
        if (!selectedEntry || !rejectReason.trim()) return;

        setActionLoading(true);
        const result = await rejectKYC(selectedEntry.id, rejectReason);
        setActionLoading(false);

        if (result.success) {
            setSelectedEntry(null);
            setRejectReason('');
            fetchList();
        } else {
            alert(result.error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">KYC Management</h2>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {STATUS_FILTERS.map(filter => (
                    <button
                        key={filter.value}
                        onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            statusFilter === filter.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No KYC submissions found
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Level</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Submitted</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">{entry.name}</div>
                                        <div className="text-xs text-gray-500">{entry.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            entry.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            entry.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {entry.level > 0 ? KYC_LEVELS.find(l => l.value === entry.level)?.label : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                        {entry.status === 'SUBMITTED' && (
                                            <button
                                                onClick={() => setSelectedEntry(entry)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Review Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Review KYC: {selectedEntry.name}
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Approval Level
                                </label>
                                <select
                                    value={approvalLevel}
                                    onChange={(e) => setApprovalLevel(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {KYC_LEVELS.map(level => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason (if rejecting)
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
