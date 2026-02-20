'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  Settings,
  DollarSign,
  Wallet,
  ArrowDownToLine,
  Globe,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Network,
  Percent
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface FeeSettings {
  transactionFee: string;
  transactionFeeWei: string;
  collectedFees: string;
  collectedFeesWei: string;
  feeRecipient: string;
  vaultCount?: number;
}

interface ChainFeeData {
  chainId: number;
  chainName: string;
  isTestnet: boolean;
  configured: boolean;
  transactionFee?: string;
  collectedFees?: string;
  feeRecipient?: string;
  vaultCount?: number;
  error?: string;
}

// ============================================
// NETWORK BADGE COMPONENT
// ============================================

function NetworkBadge({ 
  chainName, 
  isTestnet 
}: { 
  chainName: string; 
  isTestnet: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
      <span className="text-sm text-gray-300">{chainName}</span>
      {isTestnet && (
        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
          Testnet
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSettingsPage() {
  const { isConnected } = useAccount();
  const {
    chainId,
    chainName,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Multi-chain overview
  const [allChainsData, setAllChainsData] = useState<ChainFeeData[]>([]);
  const [showAllChains, setShowAllChains] = useState(false);
  const [loadingAllChains, setLoadingAllChains] = useState(false);

  // Form states
  const [newFee, setNewFee] = useState('');
  const [newRecipient, setNewRecipient] = useState('');

  // Modal states
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Get deployed chains
  const deployedChains = getDeployedChains();
  const currencySymbol = nativeCurrency?.symbol || 'ETH';

  // Fetch settings for current chain
  const fetchSettings = async () => {
    if (!chainId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/settings/fee?chainId=${chainId}`, {
        headers: {
          'x-chain-id': chainId.toString(),
        }
      });
      const data = await response.json();
      if (data.success) {
        setSettings({
          transactionFee: data.transactionFee || '0',
          transactionFeeWei: data.transactionFeeWei || '0',
          collectedFees: data.totalCollectedFees || '0',
          collectedFeesWei: data.totalCollectedFeesWei || '0',
          feeRecipient: data.feeRecipient || '',
          vaultCount: data.vaultCount || 0,
        });
        setNewFee(data.transactionFee || '0');
        setNewRecipient(data.feeRecipient || '');
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings for all chains
  const fetchAllChainsData = async () => {
    setLoadingAllChains(true);
    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty to get all chains
      });
      const data = await response.json();
      
      if (data.success && data.chains) {
        const chainsArray: ChainFeeData[] = Object.entries(data.chains).map(([id, chain]: [string, any]) => ({
          chainId: parseInt(id),
          chainName: chain.chainName || 'Unknown',
          isTestnet: chain.isTestnet || false,
          configured: chain.configured !== false,
          transactionFee: chain.transactionFee,
          collectedFees: chain.totalCollectedFees,
          feeRecipient: chain.feeRecipient,
          vaultCount: chain.vaultCount,
          error: chain.error,
        }));
        setAllChainsData(chainsArray);
      }
    } catch (error) {
      console.error('Error fetching all chains data:', error);
    } finally {
      setLoadingAllChains(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [chainId]);

  useEffect(() => {
    if (showAllChains && allChainsData.length === 0) {
      fetchAllChainsData();
    }
  }, [showAllChains]);

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    if (switchToChain) {
      await switchToChain(targetChainId);
    }
  };

  // Handle set fee
  const handleSetFee = async () => {
    if (!chainId) return;
    
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          action: 'setTransactionFee',
          value: newFee,
          chainId,
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

  // Handle set recipient
  const handleSetRecipient = async () => {
    if (!chainId) return;
    
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          action: 'setFeeRecipient',
          value: newRecipient,
          chainId,
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

  // Handle withdraw fees
  const handleWithdrawFees = async () => {
    if (!chainId) return;
    
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          action: 'withdrawFees',
          chainId,
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

  // Get explorer URL for address
  const getExplorerAddressUrl = (addr: string) => {
    return explorerUrl ? `${explorerUrl}/address/${addr}` : '#';
  };

  // Get explorer URL for transaction
  const getExplorerTxUrl = (hash: string) => {
    return explorerUrl ? `${explorerUrl}/tx/${hash}` : '#';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Please connect your wallet to access admin features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-400" />
              Platform Settings
            </h1>
            <p className="text-gray-400 mt-1">Manage fees and recipients on {chainName}</p>
          </div>
          <div className="flex items-center gap-3">
            <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Network Switcher */}
        {deployedChains.length > 1 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">Manage settings on:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {deployedChains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => handleSwitchNetwork(chain.id)}
                    disabled={chain.id === chainId || isSwitching}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      chain.id === chainId
                        ? 'bg-blue-500/20 text-blue-400 cursor-default'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    } disabled:opacity-50`}
                  >
                    {isSwitching ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      chain.name
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading settings for {chainName}...</p>
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Transaction Fee Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Transaction Fee
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Fee charged on each investment transaction (paid in {currencySymbol})
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Current Fee</p>
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(settings.transactionFee) === 0 ? (
                      <span className="text-green-400">Free</span>
                    ) : (
                      `${settings.transactionFee} ${currencySymbol}`
                    )}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Collected Fees</p>
                  <p className="text-2xl font-bold text-white">{settings.collectedFees} {currencySymbol}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Escrow Vaults</p>
                  <p className="text-2xl font-bold text-white">{settings.vaultCount || 0}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFeeModal(true);
                    setResult(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Change Fee
                </button>
                {parseFloat(settings.collectedFees) > 0 && (
                  <button
                    onClick={() => {
                      setShowWithdrawModal(true);
                      setResult(null);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition flex items-center gap-2"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Withdraw Fees
                  </button>
                )}
              </div>
            </div>

            {/* Fee Recipient Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                Fee Recipient
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Address that receives platform fees (2.5% from milestones) and transaction fees on {chainName}
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm">Current Recipient</p>
                {explorerUrl ? (
                  <a
                    href={getExplorerAddressUrl(settings.feeRecipient)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all flex items-center gap-2"
                  >
                    {settings.feeRecipient}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <p className="text-white font-mono text-sm break-all">{settings.feeRecipient}</p>
                )}
              </div>

              <button
                onClick={() => {
                  setShowRecipientModal(true);
                  setResult(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Change Recipient
              </button>
            </div>

            {/* Platform Fee Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-yellow-400" />
                Platform Fee
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Percentage taken from each milestone fund release
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Platform Fee</p>
                <p className="text-2xl font-bold text-white">2.5%</p>
                <p className="text-gray-500 text-xs mt-1">
                  This is a constant set in the smart contract on {chainName}
                </p>
              </div>
            </div>

            {/* Multi-Chain Overview */}
            {deployedChains.length > 1 && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowAllChains(!showAllChains)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-400" />
                    Multi-Chain Overview
                  </h2>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAllChains ? 'rotate-180' : ''}`} />
                </button>

                {showAllChains && (
                  <div className="border-t border-gray-700">
                    {loadingAllChains ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-6 h-6 text-gray-500 animate-spin mx-auto" />
                        <p className="text-gray-500 mt-2">Loading data from all chains...</p>
                      </div>
                    ) : allChainsData.length === 0 ? (
                      <div className="p-8 text-center">
                        <button
                          onClick={fetchAllChainsData}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                        >
                          Load All Chains Data
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {allChainsData.map((chain) => (
                          <div key={chain.chainId} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${chain.isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
                                <span className="text-white font-medium">{chain.chainName}</span>
                                {chain.isTestnet && (
                                  <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                    Testnet
                                  </span>
                                )}
                              </div>
                              {chain.chainId !== chainId && (
                                <button
                                  onClick={() => handleSwitchNetwork(chain.chainId)}
                                  disabled={isSwitching}
                                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
                                >
                                  Switch
                                </button>
                              )}
                            </div>
                            
                            {chain.configured ? (
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Fee</p>
                                  <p className="text-gray-300">
                                    {parseFloat(chain.transactionFee || '0') === 0 
                                      ? 'Free' 
                                      : `${chain.transactionFee}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Collected</p>
                                  <p className="text-gray-300">{chain.collectedFees || '0'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Vaults</p>
                                  <p className="text-gray-300">{chain.vaultCount || 0}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">{chain.error || 'Not configured'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800 rounded-xl">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Failed to load settings for {chainName}</p>
            <button
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Network Info Footer */}
        <div className="mt-6 bg-gray-800/30 border border-gray-700 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 text-gray-500">
              <span>Network: <span className="text-gray-300">{chainName}</span></span>
              <span>•</span>
              <span>Chain ID: <span className="text-gray-300">{chainId}</span></span>
              <span>•</span>
              <span>Currency: <span className="text-gray-300">{currencySymbol}</span></span>
            </div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View Explorer
              </a>
            )}
          </div>
        </div>

        {/* Change Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-2">Change Transaction Fee</h2>
              <p className="text-gray-400 text-sm mb-4">on {chainName}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">New Fee ({currencySymbol})</label>
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
                <div className="flex gap-2 flex-wrap">
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
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fee updated successfully on {chainName}!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{result.error}</span>
                      </div>
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
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Fee'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Recipient Modal */}
        {showRecipientModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-2">Change Fee Recipient</h2>
              <p className="text-gray-400 text-sm mb-4">on {chainName}</p>

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
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Warning</p>
                    <p className="text-yellow-400/80 text-sm">
                      All platform fees and transaction fees on {chainName} will be sent to this address. Make sure
                      it's correct!
                    </p>
                  </div>
                </div>

                {result && (
                  <div
                    className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                  >
                    {result.success ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Recipient updated successfully!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{result.error}</span>
                      </div>
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
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Recipient'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Fees Modal */}
        {showWithdrawModal && settings && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-2">Withdraw Transaction Fees</h2>
              <p className="text-gray-400 text-sm mb-4">from {chainName}</p>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Amount to Withdraw</p>
                  <p className="text-2xl font-bold text-white">{settings.collectedFees} {currencySymbol}</p>
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
                        <div className="flex items-center gap-2 text-green-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Fees withdrawn successfully!</span>
                        </div>
                        {explorerUrl && result.transaction && (
                          <a
                            href={getExplorerTxUrl(result.transaction)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400/60 text-xs hover:underline flex items-center gap-1 mt-1"
                          >
                            View transaction on {chainName}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{result.error}</span>
                      </div>
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
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      'Withdraw'
                    )}
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
