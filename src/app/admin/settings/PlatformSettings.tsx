// src/app/admin/settings/PlatformSettings.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { isAddress, formatEther } from 'viem';
import { VaultSettings } from '../constants';
import { getExplorerUrl } from '../helpers';
import { ZERO_ADDRESS } from '@/config/contracts';

export default function PlatformSettings() {
  const [settings, setSettings] = useState<{
    transactionFee: string;
    totalCollectedFees: string;
    feeRecipient: string;
    vaultCount: number;
    vaultDetails: VaultSettings[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);

  const [newFee, setNewFee] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/fee');
      const data = await response.json();

      if (data.success) {
        setSettings(data);
        setNewFee(data.transactionFee);
        setNewRecipient(data.feeRecipient);
      } else {
        setResult({ success: false, message: data.error || 'Failed to fetch settings' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error fetching settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSetFee = async () => {
    if (!newFee) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTransactionFee', value: newFee }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Transaction fee updated!', details: data.results });
        setShowFeeModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to update fee' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSetRecipient = async () => {
    if (!newRecipient || !isAddress(newRecipient)) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setFeeRecipient', value: newRecipient }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Fee recipient updated!', details: data.results });
        setShowRecipientModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to update recipient' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawFees = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdrawFees' }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Fees withdrawn!', details: data.results });
        setShowWithdrawModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to withdraw fees' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Platform Settings</h2>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          <p>{result.message}</p>
          {result.details && result.details.length > 0 && (
            <ul className="mt-2 text-sm">
              {result.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Transaction Fee</p>
          <p className="text-2xl font-bold text-white">{settings?.transactionFee || '0'} POL</p>
          <button
            onClick={() => setShowFeeModal(true)}
            className="mt-3 text-blue-400 text-sm hover:underline"
          >
            Change Fee →
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Total Collected Fees</p>
          <p className="text-2xl font-bold text-white">{settings?.totalCollectedFees || '0'} POL</p>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!settings?.totalCollectedFees || settings.totalCollectedFees === '0'}
            className="mt-3 text-blue-400 text-sm hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Withdraw Fees →
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Active Escrow Vaults</p>
          <p className="text-2xl font-bold text-white">{settings?.vaultCount || 0}</p>
          <p className="mt-3 text-gray-500 text-sm">Project-specific vaults</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Platform Fee (Investments)</p>
          <p className="text-2xl font-bold text-white">2.5%</p>
          <p className="mt-3 text-gray-500 text-sm">Hardcoded in contract</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fee Recipient</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">Current Recipient</p>
            {settings?.feeRecipient && settings.feeRecipient !== ZERO_ADDRESS ? (
              <a
                href={getExplorerUrl(settings.feeRecipient)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 font-mono text-sm break-all hover:underline"
              >
                {settings.feeRecipient}
              </a>
            ) : (
              <p className="text-yellow-400">Not set</p>
            )}
          </div>
          <button
            onClick={() => setShowRecipientModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
          >
            Change Recipient
          </button>
        </div>
      </div>

      {settings?.vaultDetails && settings.vaultDetails.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Vault Details</h3>
          <div className="space-y-3">
            {settings.vaultDetails.map((vault, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <a
                      href={getExplorerUrl(vault.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-mono text-sm hover:underline"
                    >
                      {vault.address.slice(0, 10)}...{vault.address.slice(-8)}
                    </a>
                    {vault.error && (
                      <p className="text-red-400 text-xs mt-1">{vault.error}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">Fee: {formatEther(vault.transactionFee)} POL</p>
                    <p className="text-gray-400 text-xs">Collected: {formatEther(vault.collectedFees)} POL</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Set Transaction Fee</h3>
            <p className="text-gray-300 mb-4">
              This fee is charged on all investments. Set to 0 to disable.
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Fee Amount (POL)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="0.01"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSetFee}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Update Fee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Set Fee Recipient</h3>
            <p className="text-gray-300 mb-4">
              All platform fees and transaction fees will be sent to this address.
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
              {newRecipient && !isAddress(newRecipient) && (
                <p className="text-red-400 text-sm mt-1">Invalid address format</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecipientModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSetRecipient}
                disabled={processing || !newRecipient || !isAddress(newRecipient)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Update Recipient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Withdraw Collected Fees</h3>
            <p className="text-gray-300 mb-4">
              Withdraw all collected transaction fees to the fee recipient address.
            </p>
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm">Total to withdraw:</p>
              <p className="text-2xl font-bold text-white">{settings?.totalCollectedFees || '0'} POL</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawFees}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Withdraw All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
