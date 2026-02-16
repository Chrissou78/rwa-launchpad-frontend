// src/app/admin/users/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useAdmin, AdminUser } from '@/hooks/useAdmin';
import Header from '@/components/Header';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  UserMinus,
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
  ArrowDownCircle
} from 'lucide-react';

export default function AdminUsersPage() {
  const { address, isConnected } = useAccount();
  const { role, isAdmin, isSuperAdmin, isLoading, admins, promoteUser, demoteUser, refreshAdmins } = useAdmin();
  
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [isPromoting, setIsPromoting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Fetch activity log
  const fetchActivityLog = async () => {
    if (!address || !isSuperAdmin) return;

    try {
      const response = await fetch('/api/admin/activity?limit=20', {
        headers: {
          'x-wallet-address': address
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityLog(data.activityLog || []);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchActivityLog();
    }
  }, [isSuperAdmin, address]);

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
      setMessage({ type: 'success', text: `Successfully promoted to ${newAdminRole.replace('_', ' ')}` });
      setNewAdminAddress('');
      fetchActivityLog();
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
      setMessage({ type: 'success', text: 'Successfully demoted to admin' });
      fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to demote user' });
    }

    setActionLoading(null);
  };

  // Handle remove
  const handleRemove = async (targetAddress: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;

    setActionLoading(targetAddress);
    setMessage(null);

    const result = await demoteUser(targetAddress, 'remove');

    if (result.success) {
      setMessage({ type: 'success', text: 'Admin removed successfully' });
      fetchActivityLog();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove admin' });
    }

    setActionLoading(null);
  };

  // Handle promote to super admin
  const handlePromoteToSuper = async (targetAddress: string) => {
    if (!confirm('Are you sure you want to promote this user to Super Admin?')) return;

    setActionLoading(targetAddress);
    setMessage(null);

    const result = await promoteUser(targetAddress, 'super_admin');

    if (result.success) {
      setMessage({ type: 'success', text: 'Successfully promoted to super admin' });
      fetchActivityLog();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <ShieldAlert className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to access this page.</p>
          <Link href="/" className="mt-6 inline-block text-blue-400 hover:text-blue-300">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Admin Management</h1>
          </div>
          <p className="text-gray-400">
            Manage platform administrators and their permissions.
          </p>
        </div>

        {/* Current User Info */}
        <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSuperAdmin ? (
                <Crown className="w-6 h-6 text-yellow-400" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              )}
              <div>
                <div className="text-white font-medium">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </div>
                <div className="text-gray-500 text-sm font-mono">
                  {formatAddress(address || '')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                refreshAdmins();
                fetchActivityLog();
              }}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-600 text-green-400'
              : 'bg-red-900/30 border border-red-600 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Add New Admin (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="mb-8 bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" />
              Add New Admin
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
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono"
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
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              All Admins ({admins.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address..."
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm w-64"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-700">
            {filteredAdmins.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No admins found
              </div>
            ) : (
              filteredAdmins.map((admin) => {
                const isCurrentUser = admin.wallet_address.toLowerCase() === address?.toLowerCase();
                const isSuperAdminUser = admin.role === 'super_admin';
                
                return (
                  <div 
                    key={admin.id} 
                    className={`p-4 flex items-center justify-between ${
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
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">
                            {formatAddress(admin.wallet_address)}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className={isSuperAdminUser ? 'text-yellow-400' : 'text-blue-400'}>
                            {isSuperAdminUser ? 'Super Admin' : 'Admin'}
                          </span>
                          <span>•</span>
                          <span>Added {formatDate(admin.created_at)}</span>
                          {admin.promoted_by && admin.promoted_by !== 'system' && (
                            <>
                              <span>•</span>
                              <span>by {formatAddress(admin.promoted_by)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions (Super Admin Only, not for self) */}
                    {isSuperAdmin && !isCurrentUser && (
                      <div className="flex items-center gap-2">
                        {actionLoading === admin.wallet_address ? (
                          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            {isSuperAdminUser ? (
                              // Demote super admin to admin
                              <button
                                onClick={() => handleDemote(admin.wallet_address)}
                                className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                                title="Demote to Admin"
                              >
                                <ArrowDownCircle className="w-5 h-5" />
                              </button>
                            ) : (
                              <>
                                {/* Promote admin to super admin */}
                                <button
                                  onClick={() => handlePromoteToSuper(admin.wallet_address)}
                                  className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                  title="Promote to Super Admin"
                                >
                                  <ArrowUpCircle className="w-5 h-5" />
                                </button>
                                {/* Remove admin */}
                                <button
                                  onClick={() => handleRemove(admin.wallet_address)}
                                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Remove Admin"
                                >
                                  <Trash2 className="w-5 h-5" />
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
          <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowActivityLog(!showActivityLog)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Activity Log
              </h2>
              {showActivityLog ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showActivityLog && (
              <div className="border-t border-gray-700 divide-y divide-gray-700">
                {activityLog.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No activity recorded
                  </div>
                ) : (
                  activityLog.map((log) => (
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
                      <div className="text-sm text-gray-500 mt-1">
                        by <span className="font-mono">{formatAddress(log.actor_address)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
