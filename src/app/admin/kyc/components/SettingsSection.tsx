// src/app/admin/kyc/components/SettingsSection.tsx
'use client';

import { useState } from 'react';
import { 
  Settings, 
  DollarSign, 
  Shield, 
  User, 
  Clock,
  Pause,
  Play,
  Edit2,
  Loader2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { Address } from 'viem';
import { KYCSettings, TIER_NAMES, MAX_UINT256 } from '../types';
import { 
  formatNativeCurrency, 
  formatAddress, 
  formatInvestmentLimit,
  formatDuration,
  isValidFee,
  isValidThreshold,
  isValidAddress,
  isValidTierLimit
} from '../utils';

interface SettingsSectionProps {
  settings: KYCSettings | null;
  isLoading: boolean;
  currencySymbol: string;
  explorerUrl: string;
  isProcessing: boolean;
  onUpdateFee: (fee: string) => Promise<boolean>;
  onUpdateThreshold: (threshold: number) => Promise<boolean>;
  onUpdateRecipient: (recipient: Address) => Promise<boolean>;
  onUpdateTierLimit: (tier: number, limit: string) => Promise<boolean>;
  onPause: () => Promise<boolean>;
  onUnpause: () => Promise<boolean>;
}

export function SettingsSection({
  settings,
  isLoading,
  currencySymbol,
  explorerUrl,
  isProcessing,
  onUpdateFee,
  onUpdateThreshold,
  onUpdateRecipient,
  onUpdateTierLimit,
  onPause,
  onUnpause
}: SettingsSectionProps) {
  const [editingFee, setEditingFee] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [editingTierLimit, setEditingTierLimit] = useState<number | null>(null);
  
  const [newFee, setNewFee] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newTierLimit, setNewTierLimit] = useState('');

  const handleUpdateFee = async () => {
    if (!isValidFee(newFee)) return;
    const success = await onUpdateFee(newFee);
    if (success) {
      setEditingFee(false);
      setNewFee('');
    }
  };

  const handleUpdateThreshold = async () => {
    if (!isValidThreshold(newThreshold)) return;
    const success = await onUpdateThreshold(parseInt(newThreshold));
    if (success) {
      setEditingThreshold(false);
      setNewThreshold('');
    }
  };

  const handleUpdateRecipient = async () => {
    if (!isValidAddress(newRecipient)) return;
    const success = await onUpdateRecipient(newRecipient as Address);
    if (success) {
      setEditingRecipient(false);
      setNewRecipient('');
    }
  };

  const handleUpdateTierLimit = async (tier: number) => {
    if (!isValidTierLimit(newTierLimit)) return;
    const success = await onUpdateTierLimit(tier, newTierLimit);
    if (success) {
      setEditingTierLimit(null);
      setNewTierLimit('');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8">
        <p className="text-center text-gray-400">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Status */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Contract Status
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.isPaused ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-medium">Contract Paused</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-green-400 font-medium">Contract Active</span>
              </>
            )}
          </div>
          
          <button
            onClick={settings.isPaused ? onUnpause : onPause}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              settings.isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : settings.isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
            {settings.isPaused ? 'Unpause' : 'Pause'}
          </button>
        </div>
        
        {settings.isPaused && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">New KYC submissions and verifications are disabled while paused.</span>
            </div>
          </div>
        )}
      </div>

      {/* Fee Settings */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Fee Settings
        </h3>
        
        <div className="space-y-4">
          {/* KYC Fee */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">KYC Submission Fee</p>
              <p className="text-xl font-bold text-white">
                {formatNativeCurrency(settings.kycFee, currencySymbol)}
              </p>
            </div>
            
            {editingFee ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder={`0.01 ${currencySymbol}`}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateFee}
                  disabled={isProcessing || !isValidFee(newFee)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingFee(false);
                    setNewFee('');
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingFee(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Auto-Verify Threshold */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Auto-Verify Threshold</p>
              <p className="text-xl font-bold text-white">{settings.autoVerifyThreshold}%</p>
              <p className="text-xs text-gray-500">Submissions with scores above this are auto-approved</p>
            </div>
            
            {editingThreshold ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  placeholder="80"
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">%</span>
                <button
                  onClick={handleUpdateThreshold}
                  disabled={isProcessing || !isValidThreshold(newThreshold)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingThreshold(false);
                    setNewThreshold('');
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingThreshold(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Fee Recipient */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Fee Recipient</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono">{formatAddress(settings.feeRecipient)}</p>
                <a
                  href={`${explorerUrl}/address/${settings.feeRecipient}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            {editingRecipient ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="0x..."
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-64 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateRecipient}
                  disabled={isProcessing || !isValidAddress(newRecipient)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingRecipient(false);
                    setNewRecipient('');
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingRecipient(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tier Investment Limits */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Tier Investment Limits
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Tier {tier} - {TIER_NAMES[tier]}
                </span>
                {editingTierLimit === tier ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTierLimit}
                      onChange={(e) => setNewTierLimit(e.target.value)}
                      placeholder="10000"
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white w-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleUpdateTierLimit(tier)}
                      disabled={isProcessing || !isValidTierLimit(newTierLimit)}
                      className="p-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded text-white"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTierLimit(null);
                        setNewTierLimit('');
                      }}
                      className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTierLimit(tier);
                      setNewTierLimit('');
                    }}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
              <p className="text-lg font-bold text-white">
                {formatInvestmentLimit(settings.tierLimits[tier] || MAX_UINT256)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Validity: {formatDuration(settings.validityPeriods[tier] || BigInt(0))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
