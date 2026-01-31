'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { IdentityRegistryABI, RWALaunchpadFactoryABI } from '@/config/abis';

type AdminTab = 'overview' | 'identity' | 'factory' | 'kyc';

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Panel</h1>

        {!isConnected ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-lg">
              Connect your wallet to access admin functions
            </p>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('kyc')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'kyc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                KYC Management
              </button>
              <button
                onClick={() => setActiveTab('identity')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'identity'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Identity Registry
              </button>
              <button
                onClick={() => setActiveTab('factory')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'factory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Factory Settings
              </button>
            </div>

            {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
            {activeTab === 'kyc' && <KYCManagementPanel />}
            {activeTab === 'identity' && <IdentityManagement />}
            {activeTab === 'factory' && <FactorySettings />}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminOverview({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* KYC Management Card */}
      <div 
        onClick={() => onNavigate('kyc')}
        className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-750 hover:ring-2 hover:ring-blue-500 transition-all"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">KYC Management</h3>
            <p className="text-gray-400 text-sm">Manage user verifications</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          View all users, approve/reject KYC submissions, revoke access, and monitor verification statistics.
        </p>
      </div>

      {/* Identity Registry Card */}
      <div 
        onClick={() => onNavigate('identity')}
        className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-750 hover:ring-2 hover:ring-blue-500 transition-all"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Identity Registry</h3>
            <p className="text-gray-400 text-sm">On-chain identity management</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          Register and delete on-chain identities, manage country codes and compliance.
        </p>
      </div>

      {/* Factory Settings Card */}
      <div 
        onClick={() => onNavigate('factory')}
        className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-750 hover:ring-2 hover:ring-blue-500 transition-all"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Factory Settings</h3>
            <p className="text-gray-400 text-sm">Platform configuration</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          View and manage factory fees, platform settings, and contract addresses.
        </p>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-800 rounded-xl p-6 md:col-span-2 lg:col-span-3">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/kyc"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Open Full KYC Dashboard →
          </Link>
          <Link
            href="/projects"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View Projects
          </Link>
          <a
            href={`https://amoy.polygonscan.com/address/${CONTRACTS.factory}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View on Polygonscan ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function KYCManagementPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    totalAutoApproved: 0,
    totalManualApproved: 0,
    pendingManualReview: 0,
    totalRejected: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats on mount
  useState(() => {
    fetch('/api/kyc/admin/users?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.stats) {
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  });

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{loading ? '...' : stats.totalUsers}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Submissions</p>
          <p className="text-2xl font-bold text-white">{loading ? '...' : stats.totalSubmissions}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Auto Approved</p>
          <p className="text-2xl font-bold text-green-400">{loading ? '...' : stats.totalAutoApproved}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Manual Approved</p>
          <p className="text-2xl font-bold text-blue-400">{loading ? '...' : stats.totalManualApproved}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Pending Review</p>
          <p className="text-2xl font-bold text-orange-400">{loading ? '...' : stats.pendingManualReview}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{loading ? '...' : stats.totalRejected}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">KYC Administration</h3>
        <p className="text-gray-400 mb-6">
          Manage user KYC submissions, approve or reject verifications, and monitor compliance status.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/kyc"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Open Full KYC Dashboard
          </Link>
          
          {stats.pendingManualReview > 0 && (
            <Link
              href="/admin/kyc?filter=manual_review"
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Review Pending ({stats.pendingManualReview})
            </Link>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">KYC Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-500 text-lg">🥉</span>
              <span className="text-amber-500 font-medium">Bronze</span>
            </div>
            <p className="text-gray-400 text-sm">Up to $1,000</p>
            <p className="text-gray-500 text-xs mt-1">Email + Wallet</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-300 text-lg">🥈</span>
              <span className="text-gray-300 font-medium">Silver</span>
            </div>
            <p className="text-gray-400 text-sm">Up to $10,000</p>
            <p className="text-gray-500 text-xs mt-1">+ ID Document</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-lg">🥇</span>
              <span className="text-yellow-400 font-medium">Gold</span>
            </div>
            <p className="text-gray-400 text-sm">Up to $100,000</p>
            <p className="text-gray-500 text-xs mt-1">+ Selfie + Liveness</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-cyan-400 text-lg">💎</span>
              <span className="text-cyan-400 font-medium">Diamond</span>
            </div>
            <p className="text-gray-400 text-sm">Unlimited</p>
            <p className="text-gray-500 text-xs mt-1">+ Accredited Proof</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentityManagement() {
  const [registerData, setRegisterData] = useState({
    account: '',
    identity: '',
    country: '840',
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleRegister = () => {
    writeContract({
      address: CONTRACTS.identityRegistry as `0x${string}`,
      abi: IdentityRegistryABI,
      functionName: 'registerIdentity',
      args: [
        registerData.account as `0x${string}`,
        registerData.identity as `0x${string}`,
        Number(registerData.country),
      ],
    });
  };

  const handleDelete = () => {
    writeContract({
      address: CONTRACTS.identityRegistry as `0x${string}`,
      abi: IdentityRegistryABI,
      functionName: 'deleteIdentity',
      args: [registerData.account as `0x${string}`],
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Register Identity
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Wallet Address</label>
            <input
              type="text"
              value={registerData.account}
              onChange={(e) =>
                setRegisterData({ ...registerData, account: e.target.value })
              }
              placeholder="0x..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Identity Contract</label>
            <input
              type="text"
              value={registerData.identity}
              onChange={(e) =>
                setRegisterData({ ...registerData, identity: e.target.value })
              }
              placeholder="0x..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Country Code</label>
            <select
              value={registerData.country}
              onChange={(e) =>
                setRegisterData({ ...registerData, country: e.target.value })
              }
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
            >
              <option value="840">United States (840)</option>
              <option value="826">United Kingdom (826)</option>
              <option value="276">Germany (276)</option>
              <option value="250">France (250)</option>
              <option value="392">Japan (392)</option>
              <option value="156">China (156)</option>
              <option value="356">India (356)</option>
              <option value="76">Brazil (76)</option>
              <option value="124">Canada (124)</option>
              <option value="36">Australia (36)</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRegister}
              disabled={isPending || isConfirming}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Register Identity'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending || isConfirming}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Delete Identity
            </button>
          </div>

          {isSuccess && (
            <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
              <p className="text-green-400">Transaction successful!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FactorySettings() {
  const { data: creationFee } = useReadContract({
    address: CONTRACTS.factory as `0x${string}`,
    abi: RWALaunchpadFactoryABI,
    functionName: 'creationFee',
  });

  const { data: platformFee } = useReadContract({
    address: CONTRACTS.factory as `0x${string}`,
    abi: RWALaunchpadFactoryABI,
    functionName: 'platformFee',
  });

  const { data: isPaused } = useReadContract({
    address: CONTRACTS.factory as `0x${string}`,
    abi: RWALaunchpadFactoryABI,
    functionName: 'paused',
  });

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Factory Status
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-gray-400">Factory Address</span>
            <a
              href={`https://amoy.polygonscan.com/address/${CONTRACTS.factory}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 font-mono"
            >
              {CONTRACTS.factory.slice(0, 6)}...{CONTRACTS.factory.slice(-4)}
            </a>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-gray-400">Creation Fee</span>
            <span className="text-white">
              {creationFee ? `${(Number(creationFee) / 1e18).toFixed(4)} MATIC` : 'Loading...'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-gray-400">Platform Fee</span>
            <span className="text-white">
              {platformFee !== undefined ? `${Number(platformFee) / 100}%` : 'Loading...'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3">
            <span className="text-gray-400">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPaused
                  ? 'bg-red-900 text-red-300'
                  : 'bg-green-900 text-green-300'
              }`}
            >
              {isPaused ? 'Paused' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Contract Addresses
        </h2>

        <div className="space-y-2 text-sm">
          {Object.entries(CONTRACTS).map(([name, address]) => (
            <div key={name} className="flex justify-between py-2">
              <span className="text-gray-400 capitalize">
                {name.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <a
                href={`https://amoy.polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 font-mono"
              >
                {address.slice(0, 6)}...{address.slice(-4)}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
