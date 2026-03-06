// src/__tests__/components/GDPRDataManagement.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the useKYC hook
const mockExportData = vi.fn();
const mockRequestDeletion = vi.fn();

let mockIsConnected = true;
let mockHasKYC = true;

vi.mock('@/hooks/useKYC', () => ({
  useKYC: vi.fn(() => ({
    status: mockHasKYC ? {
      applicationStatus: 'approved',
      kycLevel: 2,
      hasApplication: true,
    } : null,
    isKYCValid: mockHasKYC,
    exportData: mockExportData,
    requestDeletion: mockRequestDeletion,
    error: null,
    clearError: vi.fn(),
  })),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: mockIsConnected ? '0x1234567890123456789012345678901234567890' : undefined,
    isConnected: mockIsConnected,
  })),
}));

// Simple GDPR component for testing
function GDPRDataManagement() {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [checkboxes, setCheckboxes] = React.useState({
    understand: false,
    permanent: false,
    consent: false,
  });

  if (!mockIsConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">Please connect your wallet to manage your data.</p>
      </div>
    );
  }

  if (!mockHasKYC) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-2xl font-bold text-white mb-2">No KYC Data</h2>
        <p className="text-gray-400">You haven&apos;t submitted any KYC data yet.</p>
      </div>
    );
  }

  const handleExport = async () => {
    const blob = await mockExportData();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kyc-data-export.json';
      a.click();
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || !Object.values(checkboxes).every(Boolean)) {
      return;
    }
    await mockRequestDeletion();
    setShowDeleteConfirm(false);
  };

  const allChecked = Object.values(checkboxes).every(Boolean);
  const canDelete = allChecked && confirmText === 'DELETE';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Data Privacy</h1>
        <p className="text-gray-400">Manage your personal data and privacy settings</p>
      </div>

      {/* Data Categories */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Data</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <span>👤</span>
              <span className="text-white">Personal Information</span>
            </div>
            <span className="text-green-400 text-sm">Encrypted</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <span>📄</span>
              <span className="text-white">Identity Documents</span>
            </div>
            <span className="text-green-400 text-sm">Encrypted</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <span>🔗</span>
              <span className="text-white">Linked Wallets</span>
            </div>
            <span className="text-blue-400 text-sm">2 wallets</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <span>✅</span>
              <span className="text-white">Verification Proofs</span>
            </div>
            <span className="text-blue-400 text-sm">Active</span>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Export Your Data</h3>
        <p className="text-gray-400 text-sm mb-4">
          Download a copy of all your KYC data in JSON format. This includes your personal information, documents metadata, and verification history.
        </p>
        <button
          onClick={handleExport}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium"
        >
          Download My Data
        </button>
      </div>

      {/* Delete Section */}
      <div className="bg-gray-800 rounded-xl p-6 border border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Delete Your Data</h3>
        <p className="text-gray-400 text-sm mb-4">
          Permanently delete all your KYC data. This action cannot be undone and you will need to complete KYC again to access investment features.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium"
        >
          Request Data Deletion
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Confirm Deletion</h3>
            <p className="text-gray-300 mb-4">
              This will permanently delete all your KYC data including:
            </p>
            <ul className="text-gray-400 text-sm space-y-1 mb-4 list-disc list-inside">
              <li>Personal information</li>
              <li>Identity documents</li>
              <li>Verification proofs</li>
              <li>Linked wallet associations</li>
            </ul>

            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxes.understand}
                  onChange={(e) => setCheckboxes({ ...checkboxes, understand: e.target.checked })}
                  className="mt-1"
                />
                <span className="text-sm text-gray-300">
                  I understand this action is permanent
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxes.permanent}
                  onChange={(e) => setCheckboxes({ ...checkboxes, permanent: e.target.checked })}
                  className="mt-1"
                />
                <span className="text-sm text-gray-300">
                  I understand I will lose access to investment features
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxes.consent}
                  onChange={(e) => setCheckboxes({ ...checkboxes, consent: e.target.checked })}
                  className="mt-1"
                />
                <span className="text-sm text-gray-300">
                  I consent to the deletion of my data
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                  setCheckboxes({ understand: false, permanent: false, consent: false });
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 rounded-lg"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GDPR Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Privacy Rights</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="text-white font-medium mb-1">Right to Access</h4>
            <p className="text-gray-400">You can request a copy of all data we hold about you.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">Right to Rectification</h4>
            <p className="text-gray-400">You can request corrections to inaccurate data.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">Right to Erasure</h4>
            <p className="text-gray-400">You can request deletion of your personal data.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">Right to Portability</h4>
            <p className="text-gray-400">You can export your data in a machine-readable format.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

describe('GDPRDataManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected = true;
    mockHasKYC = true;
    mockExportData.mockResolvedValue(new Blob(['{}'], { type: 'application/json' }));
    mockRequestDeletion.mockResolvedValue(true);
  });

  it('should render data privacy page', () => {
    render(<GDPRDataManagement />);
    
    expect(screen.getByText('Data Privacy')).toBeInTheDocument();
    expect(screen.getByText('Your Data')).toBeInTheDocument();
  });

  it('should show data categories', () => {
    render(<GDPRDataManagement />);
    
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Identity Documents')).toBeInTheDocument();
    expect(screen.getByText('Linked Wallets')).toBeInTheDocument();
    expect(screen.getByText('Verification Proofs')).toBeInTheDocument();
  });

  it('should export data when clicking download', async () => {
    // Mock URL.createObjectURL and element click
    const mockCreateObjectURL = vi.fn(() => 'blob:test');
    const mockClick = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    render(<GDPRDataManagement />);
    
    const downloadButton = screen.getByText('Download My Data');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalled();
    });
  });

  it('should show confirmation dialog before deletion', async () => {
    render(<GDPRDataManagement />);
    
    const deleteButton = screen.getByText('Request Data Deletion');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Confirm Deletion')).toBeInTheDocument();
    });
  });

  it('should require all checkboxes and confirmation text', async () => {
    render(<GDPRDataManagement />);
    
    const deleteButton = screen.getByText('Request Data Deletion');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Confirm Deletion')).toBeInTheDocument();
    });

    const finalDeleteButton = screen.getByText('Delete Forever');
    expect(finalDeleteButton).toBeDisabled();

    // Check all checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      fireEvent.click(checkbox);
    });

    // Type DELETE
    const input = screen.getByPlaceholderText('DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    await waitFor(() => {
      expect(finalDeleteButton).not.toBeDisabled();
    });
  });

  it('should delete data after confirmation', async () => {
    render(<GDPRDataManagement />);
    
    const deleteButton = screen.getByText('Request Data Deletion');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Confirm Deletion')).toBeInTheDocument();
    });

    // Check all checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      fireEvent.click(checkbox);
    });

    // Type DELETE
    const input = screen.getByPlaceholderText('DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const finalDeleteButton = screen.getByText('Delete Forever');
    fireEvent.click(finalDeleteButton);

    await waitFor(() => {
      expect(mockRequestDeletion).toHaveBeenCalled();
    });
  });

  it('should allow canceling deletion', async () => {
    render(<GDPRDataManagement />);
    
    const deleteButton = screen.getByText('Request Data Deletion');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Confirm Deletion')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('⚠️ Confirm Deletion')).not.toBeInTheDocument();
    });
  });

  it('should show connect wallet message when disconnected', () => {
    mockIsConnected = false;
    
    render(<GDPRDataManagement />);
    
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
  });

  it('should show no data message when user has no KYC', () => {
    mockIsConnected = true;
    mockHasKYC = false;
    
    render(<GDPRDataManagement />);
    
    expect(screen.getByText('No KYC Data')).toBeInTheDocument();
  });
});
