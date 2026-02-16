'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import Link from 'next/link';
import { EXPLORER_URL } from '@/config/contracts';

interface FeeSettings {
  transactionFee: string;
  transactionFeeWei: string;
  collectedFees: string;
  collectedFeesWei: string;
  feeRecipient: string;
}

export default function AdminSettingsPage() {
  const { isConnected } = useAccount();
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form states
  const [newFee, setNewFee] = useState('');
  const [newRecipient, setNewRecipient] = useState('');

  // Modal states
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/fee');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
        setNewFee(data.data.transactionFee);
        setNewRecipient(data.data.feeRecipient);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSetFee = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setTransactionFee',
          value: newFee,
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchSettings();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleSetRecipient = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setFeeRecipient',
          value: newRecipient,
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchSettings();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
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
        body: JSON.stringify({
          action: 'withdrawFees',
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchSettings();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400">Please connect your wallet to access admin features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Back to Admin
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading settings...</p>
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Transaction Fee Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Transaction Fee</h2>
              <p className="text-gray-400 text-sm mb-4">
                Fee charged on each investment transaction (paid in POL)
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Current Fee</p>
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(settings.transactionFee) === 0 ? (
                      <span className="text-green-400">Free</span>
                    ) : (
                      `${settings.transactionFee} POL`
                    )}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Collected Fees</p>
                  <p className="text-2xl font-bold text-white">{settings.collectedFees} POL</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFeeModal(true);
                    setResult(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                  Change Fee
                </button>
                {parseFloat(settings.collectedFees) > 0 && (
                  <button
                    onClick={() => {
                      setShowWithdrawModal(true);
                      setResult(null);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
                  >
                    Withdraw Fees
                  </button>
                )}
              </div>
            </div>

            {/* Fee Recipient Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Fee Recipient</h2>
              <p className="text-gray-400 text-sm mb-4">
                Address that receives platform fees (2.5% from milestones) and transaction fees
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm">Current Recipient</p>
                <a
                  href={`${EXPLORER_URL}/address/${settings.feeRecipient}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
                >
                  {settings.feeRecipient}
                </a>
              </div>

              <button
                onClick={() => {
                  setShowRecipientModal(true);
                  setResult(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                Change Recipient
              </button>
            </div>

            {/* Platform Fee Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Platform Fee</h2>
              <p className="text-gray-400 text-sm mb-4">
                Percentage taken from each milestone fund release
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Platform Fee</p>
                <p className="text-2xl font-bold text-white">2.5%</p>
                <p className="text-gray-500 text-xs mt-1">
                  This is a constant set in the smart contract
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800 rounded-xl">
            <p className="text-gray-400">Failed to load settings</p>
          </div>
        )}

        {/* Change Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-4">Change Transaction Fee</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">New Fee (POL)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="0.01"
                  />
                  <p className="text-gray-500 text-xs mt-1">Enter 0 to disable transaction fees</p>
                </div>

                {/* Quick select buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewFee('0')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setNewFee('0.005')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                  >
                    0.005
                  </button>
                  <button
                    onClick={() => setNewFee('0.01')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                  >
                    0.01
                  </button>
                  <button
                    onClick={() => setNewFee('0.05')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                  >
                    0.05
                  </button>
                  <button
                    onClick={() => setNewFee('0.1')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                  >
                    0.1
                  </button>
                </div>

                {result && (
                  <div
                    className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                  >
                    {result.success ? (
                      <p className="text-green-400">Fee updated successfully!</p>
                    ) : (
                      <p className="text-red-400">{result.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetFee}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition"
                >
                  {processing ? 'Updating...' : 'Update Fee'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Recipient Modal */}
        {showRecipientModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-4">Change Fee Recipient</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">New Recipient Address</label>
                  <input
                    type="text"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>

                <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <span className="text-yellow-500">⚠️</span>
                  <div>
                    <p className="text-yellow-400 font-medium">Warning</p>
                    <p className="text-yellow-400/80 text-sm">
                      All platform fees and transaction fees will be sent to this address. Make sure
                      it's correct!
                    </p>
                  </div>
                </div>

                {result && (
                  <div
                    className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                  >
                    {result.success ? (
                      <p className="text-green-400">Recipient updated successfully!</p>
                    ) : (
                      <p className="text-red-400">{result.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecipientModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetRecipient}
                  disabled={processing || !/^0x[a-fA-F0-9]{40}$/.test(newRecipient)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition"
                >
                  {processing ? 'Updating...' : 'Update Recipient'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Fees Modal */}
        {showWithdrawModal && settings && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-4">Withdraw Transaction Fees</h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Amount to Withdraw</p>
                  <p className="text-2xl font-bold text-white">{settings.collectedFees} POL</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Will be sent to</p>
                  <p className="text-white font-mono text-sm break-all">{settings.feeRecipient}</p>
                </div>

                {result && (
                  <div
                    className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                  >
                    {result.success ? (
                      <div>
                        <p className="text-green-400 font-medium">Fees withdrawn successfully!</p>
                        <a
                          href={`${EXPLORER_URL}/tx/${result.transaction}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400/60 text-xs hover:underline"
                        >
                          View transaction →
                        </a>
                      </div>
                    ) : (
                      <p className="text-red-400">{result.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                {!result?.success && (
                  <button
                    onClick={handleWithdrawFees}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {processing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
