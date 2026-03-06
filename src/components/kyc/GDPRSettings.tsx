// src/components/kyc/GDPRSettings.tsx

'use client';

import { useState } from 'react';
import { useKYC } from '@/hooks/useKYC';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export function GDPRSettings() {
    const { exportData, deleteData } = useKYC();
    
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [earliestDeletion, setEarliestDeletion] = useState<string | null>(null);

    const handleExport = async () => {
        setExporting(true);
        const data = await exportData();
        setExporting(false);

        if (data) {
            // Download as JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rwa-launchpad-data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        
        const result = await deleteData();
        
        setDeleting(false);

        if (result.success) {
            setShowDeleteConfirm(false);
            // Redirect or show success
            window.location.reload();
        } else {
            setDeleteError(result.error || 'Failed to delete data');
            if (result.earliestDeletion) {
                setEarliestDeletion(result.earliestDeletion);
            }
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Data Privacy (GDPR)</h2>
            <p className="text-gray-600 mb-6">
                Manage your personal data in accordance with GDPR regulations.
            </p>

            <div className="space-y-4">
                {/* Export Data */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                        <h3 className="font-medium text-gray-900">Export My Data</h3>
                        <p className="text-sm text-gray-500">
                            Download a copy of all your personal data (Article 15 & 20)
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export
                    </button>
                </div>

                {/* Delete Data */}
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                        <h3 className="font-medium text-red-900">Delete My Data</h3>
                        <p className="text-sm text-red-700">
                            Permanently delete your personal data (Article 17)
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete All Data?</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> Due to legal requirements (AML/CFT), data may be retained for up to 5 years after your last activity. Minimal audit records are kept for compliance.
                            </p>
                        </div>

                        {deleteError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-red-800">{deleteError}</p>
                                {earliestDeletion && (
                                    <p className="text-sm text-red-600 mt-1">
                                        Earliest deletion date: {new Date(earliestDeletion).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteError(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Yes, Delete Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
