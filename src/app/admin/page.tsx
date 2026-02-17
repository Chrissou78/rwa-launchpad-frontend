'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import {
  Shield,
  Users,
  Settings,
  Activity,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  BarChart3,
  Eye,
  UserCheck,
  Briefcase,
  CreditCard,
  Image,
  Vault,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  pendingKyc: number;
  totalProjects: number;
  activeProjects: number;
  totalInvestments: number;
  pendingTokenizations: number;
  approvedTokenizations: number;
  totalTokenizationRevenue: number;
}

interface TokenizationApplication {
  id: string;
  user_address: string;
  asset_name: string;
  asset_type: string;
  token_type: string;
  status: string;
  fee_amount: number;
  estimated_value: number;
  created_at: string;
  contact_email: string;
}

const TOKEN_TYPE_LABELS: Record<string, string> = {
  token_only: 'Token Only',
  nft_only: 'NFT Only',
  nft_and_token: 'NFT + Token',
  nft_token_escrow: 'NFT + Token + Escrow',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  under_review: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400', icon: <Eye className="w-4 h-4" /> },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: <AlertCircle className="w-4 h-4" /> },
  payment_pending: { label: 'Payment Pending', color: 'bg-orange-500/20 text-orange-400', icon: <CreditCard className="w-4 h-4" /> },
  payment_confirmed: { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> },
  creation_ready: { label: 'Ready', color: 'bg-purple-500/20 text-purple-400', icon: <Coins className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400', icon: <AlertCircle className="w-4 h-4" /> },
};

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { isAdmin, isSuperAdmin, isLoading: isAdminLoading } = useAdmin();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tokenizations' | 'users' | 'projects' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tokenizations, setTokenizations] = useState<TokenizationApplication[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTokenizations, setLoadingTokenizations] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      if (!address || !isAdmin) return;
      
      try {
        const response = await fetch('/api/admin/stats', {
          headers: { 'x-wallet-address': address },
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isAdmin) {
      loadStats();
    }
  }, [address, isAdmin]);

  // Load tokenization applications
  useEffect(() => {
    const loadTokenizations = async () => {
      if (!address || !isAdmin || activeTab !== 'tokenizations') return;
      
      setLoadingTokenizations(true);
      try {
        const url = selectedStatus === 'all' 
          ? '/api/admin/tokenizations'
          : `/api/admin/tokenizations?status=${selectedStatus}`;
          
        const response = await fetch(url, {
          headers: { 'x-wallet-address': address },
        });
        
        if (response.ok) {
          const data = await response.json();
          setTokenizations(data.applications || []);
        }
      } catch (err) {
        console.error('Error loading tokenizations:', err);
      } finally {
        setLoadingTokenizations(false);
      }
    };

    loadTokenizations();
  }, [address, isAdmin, activeTab, selectedStatus]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdminLoading && !isAdmin && isConnected) {
      router.push('/');
    }
  }, [isAdmin, isAdminLoading, isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </main>
      </div>
    );
  }

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Checking admin access...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You don't have permission to access the admin panel.</p>
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              Admin Panel
            </h1>
            <p className="text-gray-400 mt-1">
              {isSuperAdmin ? '⭐ Super Admin' : 'Admin'} • {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tokenizations')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'tokenizations'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            Tokenizations
            {stats?.pendingTokenizations ? (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                {stats.pendingTokenizations}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'users'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Users & KYC
            {stats?.pendingKyc ? (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                {stats.pendingKyc}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'projects'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4 inline mr-2" />
            Projects
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {loadingStats ? '-' : stats?.totalUsers || 0}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-blue-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending KYC</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">
                      {loadingStats ? '-' : stats?.pendingKyc || 0}
                    </p>
                  </div>
                  <UserCheck className="w-10 h-10 text-yellow-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Tokenizations</p>
                    <p className="text-2xl font-bold text-orange-400 mt-1">
                      {loadingStats ? '-' : stats?.pendingTokenizations || 0}
                    </p>
                  </div>
                  <Coins className="w-10 h-10 text-orange-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tokenization Revenue</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      {loadingStats ? '-' : formatCurrency(stats?.totalTokenizationRevenue || 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-400 opacity-50" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('tokenizations'); }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Review Tokenizations</h3>
                      <p className="text-gray-400 text-sm">Approve or reject token requests</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition" />
                </div>
              </Link>

              <Link
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('users'); }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Review KYC</h3>
                      <p className="text-gray-400 text-sm">Verify user identities</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition" />
                </div>
              </Link>

              <Link
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('projects'); }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Manage Projects</h3>
                      <p className="text-gray-400 text-sm">View and manage all projects</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Tokenizations Tab */}
        {activeTab === 'tokenizations' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Tokenization Applications</h2>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="payment_confirmed">Payment Confirmed</option>
                <option value="creation_ready">Creation Ready</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Applications List */}
            {loadingTokenizations ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading applications...</p>
              </div>
            ) : tokenizations.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Applications</h3>
                <p className="text-gray-400">No tokenization applications found for this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tokenizations.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                  return (
                    <div
                      key={app.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{app.asset_name}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              {TOKEN_TYPE_LABELS[app.token_type] || app.token_type}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Asset Type</span>
                              <p className="text-gray-300">{app.asset_type.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Value</span>
                              <p className="text-gray-300">{formatCurrency(app.estimated_value)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Fee</span>
                              <p className="text-green-400">${app.fee_amount} USDC</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Submitted</span>
                              <p className="text-gray-300">{formatDate(app.created_at)}</p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Contact: </span>
                            <span className="text-gray-300">{app.contact_email}</span>
                            <span className="text-gray-600 mx-2">•</span>
                            <span className="text-gray-500">Wallet: </span>
                            <span className="text-gray-300 font-mono">
                              {app.user_address.slice(0, 6)}...{app.user_address.slice(-4)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/tokenization/${app.id}`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Users Tab Placeholder */}
        {activeTab === 'users' && (
          <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Users & KYC Management</h3>
            <p className="text-gray-400">User management interface coming soon...</p>
          </div>
        )}

        {/* Projects Tab Placeholder */}
        {activeTab === 'projects' && (
          <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Project Management</h3>
            <p className="text-gray-400">Project management interface coming soon...</p>
          </div>
        )}

        {/* Settings Tab Placeholder */}
        {activeTab === 'settings' && isSuperAdmin && (
          <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
            <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Platform Settings</h3>
            <p className="text-gray-400">Platform settings interface coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}
