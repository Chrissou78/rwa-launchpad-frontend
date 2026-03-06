// src/app/admin/users/AdminUsersManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useAdmin, AdminUser } from '@/hooks/useAdmin';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Crown,
  User,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Copy,
  ExternalLink,
  Globe,
  Network
} from 'lucide-react';

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

export default function AdminUsersManagement() {
  const { address } = useAccount();
  const { 
    chainId,
    chainName, 
    explorerUrl, 
    isDeployed, 
    isTestnet,
    nativeCurrency,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();
  
  const { role, isAdmin, isSuperAdmin, admins, promoteUser, demoteUser, refreshAdmins } = useAdmin();
  
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [isPromoting, setIsPromoting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [loadingActivityLog, setLoadingActivityLog] = useState(false);

  // Fetch activity log with chain context
  const fetchActivityLog = async () => {
    if (!address || !isSuperAdmin) return;

    setLoadingActivityLog(true);
    try {
      const response = await fetch('/api/admin/activity?limit=20', {
        headers: {
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityLog(data.activityLog || []);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoadingActivityLog(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && showActivityLog) {
      fetchActivityLog();
    }
  }, [isSuperAdmin, showActivityLog, address, chainId]);

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    if (switchToChain) {
      await switchToChain(targetChainId);
    }
  };

  // Handle promote
  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newAdminAddress) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' });
      return;
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      setMessage({ type: 'error', text: 'Invalid wallet address format' });
      return;
    }

    setIsPromoting(true);

    const result = await promoteUser(newAdminAddress, newAdminRole);

    if (result.success) {
      setMessage({ type: 'success', text: `Successfully promoted to ${newAdminRole.replace('_', ' ')} on ${chainName}` });
      setNewAdminAddress('');
      if (showActivityLog) fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to promote user' });
    }

    setIsPromoting(false);
  };

  // Handle demote
  const handleDemote = async (targetAddress: string) => {
    setActionLoading(targetAddress);
    setMessage(null);

    const result = await demoteUser(targetAddress, 'demote');

    if (result.success) {
      setMessage({ type: 'success', text: `Successfully demoted to admin on ${chainName}` });
      if (showActivityLog) fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to demote user' });
    }

    setActionLoading(null);
  };

  // Handle remove
  const handleRemove = async (targetAddress: string) => {
    if (!confirm(`Are you sure you want to remove this admin on ${chainName}?`)) return;

    setActionLoading(targetAddress);
    setMessage(null);

    const result = await demoteUser(targetAddress, 'remove');

    if (result.success) {
      setMessage({ type: 'success', text: `Admin removed successfully on ${chainName}` });
      if (showActivityLog) fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove admin' });
    }

    setActionLoading(null);
  };

  // Handle promote to super admin
  const handlePromoteToSuper = async (targetAddress: string) => {
    if (!confirm(`Are you sure you want to promote this user to Super Admin on ${chainName}?`)) return;

    setActionLoading(targetAddress);
    setMessage(null);

    const result = await promoteUser(targetAddress, 'super_admin');

    if (result.success) {
      setMessage({ type: 'success', text: `Successfully promoted to super admin on ${chainName}` });
      if (showActivityLog) fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to promote user' });
    }

    setActionLoading(null);
  };

  // Filter admins by search
  const filteredAdmins = admins.filter(admin =>
    admin.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format address for display
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Copy address to clipboard
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setMessage({ type: 'success', text: 'Address copied to clipboard' });
    setTimeout(() => setMessage(null), 2000);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get action label
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'promote_admin': 'Promoted to Admin',
      'promote_super_admin': 'Promoted to Super Admin',
      'demote_to_admin': 'Demoted to Admin',
      'remove_admin': 'Removed Admin'
    };
    return labels[action] || action;
  };

  // Count admins by role
  const superAdminCount = admins.filter(a => a.role === 'super_admin').length;
  const adminCount = admins.filter(a => a.role === 'admin').length;

  // Get explorer URL for address
  const getExplorerAddressUrl = (addr: string) => {
    return explorerUrl ? `${explorerUrl}/address/${addr}` : '#';
  };

  return (
    <div className="space-y-6">
      {/* Network Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm text-gray-400">Connected Network</div>
            <div className="flex items-center gap-2 mt-1">
              <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
            </div>
          </div>
        </div>
        
        {/* Network Switcher */}
        {deployedChains.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Switch to:</span>
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
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{admins.length}</div>
              <div className="text-gray-400 text-sm">Total Admins</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{superAdminCount}</div>
              <div className="text-gray-400 text-sm">Super Admins</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{adminCount}</div>
              <div className="text-gray-400 text-sm">Regular Admins</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{deployedChains.length}</div>
              <div className="text-gray-400 text-sm">Networks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-600 text-green-400'
            : 'bg-red-900/30 border border-red-600 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Add New Admin (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Add New Admin
            <span className="text-sm font-normal text-gray-500">on {chainName}</span>
          </h2>
          <form onSubmit={handlePromote} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'super_admin')}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isPromoting}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPromoting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Admin
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Admin List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            All Admins ({admins.length})
            <span className="text-sm font-normal text-gray-500">on {chainName}</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address..."
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm w-48 sm:w-64"
              />
            </div>
            <button
              onClick={refreshAdmins}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredAdmins.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No admins found matching your search' : `No admins found on ${chainName}`}
            </div>
          ) : (
            filteredAdmins.map((admin) => {
              const isCurrentUser = admin.wallet_address.toLowerCase() === address?.toLowerCase();
              const isSuperAdminUser = admin.role === 'super_admin';
              
              return (
                <div 
                  key={admin.id} 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrentUser ? 'bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      isSuperAdminUser 
                        ? 'bg-yellow-500/10 text-yellow-400' 
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {isSuperAdminUser ? (
                        <Crown className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono text-sm">
                          {formatAddress(admin.wallet_address)}
                        </span>
                        <button
                          onClick={() => copyAddress(admin.wallet_address)}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                          title="Copy address"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {explorerUrl && (
                          <a
                            href={getExplorerAddressUrl(admin.wallet_address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-500 hover:text-white transition-colors"
                            title={`View on ${chainName} explorer`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className={isSuperAdminUser ? 'text-yellow-400' : 'text-blue-400'}>
                          {isSuperAdminUser ? 'Super Admin' : 'Admin'}
                        </span>
                        <span>•</span>
                        <span>Added {formatDate(admin.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Super Admin Only, not for self) */}
                  {isSuperAdmin && !isCurrentUser && (
                    <div className="flex items-center gap-2 ml-auto">
                      {actionLoading === admin.wallet_address ? (
                        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          {isSuperAdminUser ? (
                            // Demote super admin to admin
                            <button
                              onClick={() => handleDemote(admin.wallet_address)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Demote to Admin"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                              <span className="hidden sm:inline">Demote</span>
                            </button>
                          ) : (
                            <>
                              {/* Promote admin to super admin */}
                              <button
                                onClick={() => handlePromoteToSuper(admin.wallet_address)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                title="Promote to Super Admin"
                              >
                                <ArrowUpCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Promote</span>
                              </button>
                              {/* Remove admin */}
                              <button
                                onClick={() => handleRemove(admin.wallet_address)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove Admin"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Activity Log (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => {
              setShowActivityLog(!showActivityLog);
              if (!showActivityLog) fetchActivityLog();
            }}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Activity Log
              <span className="text-sm font-normal text-gray-500">on {chainName}</span>
            </h2>
            {showActivityLog ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showActivityLog && (
            <div className="border-t border-gray-700">
              {loadingActivityLog ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-gray-500 animate-spin mx-auto" />
                  <p className="text-gray-500 mt-2">Loading activity from {chainName}...</p>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No activity recorded on {chainName}
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {activityLog.map((log) => (
                    <div key={log.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">
                            {getActionLabel(log.action)}
                          </span>
                          {log.target_address && (
                            <span className="text-gray-400 ml-2">
                              → <span className="font-mono text-sm">{formatAddress(log.target_address)}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>by <span className="font-mono">{formatAddress(log.actor_address)}</span></span>
                        {log.chain_name && (
                          <>
                            <span>•</span>
                            <span>{log.chain_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Network Info Footer */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4 text-gray-500">
            <span>Network: <span className="text-gray-300">{chainName}</span></span>
            <span>•</span>
            <span>Chain ID: <span className="text-gray-300">{chainId}</span></span>
            <span>•</span>
            <span>Currency: <span className="text-gray-300">{nativeCurrency?.symbol || 'ETH'}</span></span>
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

      {/* Info for non-super admins */}
      {!isSuperAdmin && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            Only Super Admins can add, promote, demote, or remove admins on {chainName}.
          </p>
        </div>
      )}
    </div>
  );
}
