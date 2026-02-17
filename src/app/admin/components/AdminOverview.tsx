// src/app/admin/components/AdminOverview.tsx
'use client';

import { Project, AdminTab, KYCStats, TokenizationStats, STATUS_COLORS, STATUS_NAMES } from '../constants';
import { formatUSD } from '../helpers';
import {
  FolderKanban,
  DollarSign,
  UserCheck,
  Coins,
  FileCode,
  Settings,
  ArrowRight,
  Clock,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface AdminOverviewProps {
  projects: Project[];
  kycStats: KYCStats;
  tokenizationStats?: TokenizationStats;
  setActiveTab: (tab: AdminTab) => void;
}

export default function AdminOverview({ projects, kycStats, tokenizationStats, setActiveTab }: AdminOverviewProps) {
  const activeProjects = projects.filter(p => p.status === 2).length;
  const fundedProjects = projects.filter(p => p.status >= 3 && p.status <= 5).length;
  const totalRaised = projects.reduce((sum, p) => sum + p.totalRaised, 0n);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Total Projects</p>
          <p className="text-3xl font-bold text-white">{projects.length}</p>
          <p className="text-sm text-green-400 mt-1">{activeProjects} active</p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-green-500/50 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-gray-400 text-sm">Total Raised</p>
          <p className="text-3xl font-bold text-white">{formatUSD(totalRaised)}</p>
          <p className="text-sm text-blue-400 mt-1">{fundedProjects} funded projects</p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-yellow-500/50 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-yellow-400" />
            </div>
            {kycStats.pending > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full animate-pulse">
                {kycStats.pending} pending
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">KYC Applications</p>
          <p className="text-3xl font-bold text-white">{kycStats.total || (kycStats.pending + kycStats.approved + kycStats.rejected)}</p>
          <p className="text-sm text-yellow-400 mt-1">{kycStats.pending} awaiting review</p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-purple-500/50 transition-colors"
          onClick={() => setActiveTab('tokenization')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            {tokenizationStats && tokenizationStats.pending > 0 && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full animate-pulse">
                {tokenizationStats.pending} pending
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Tokenization Requests</p>
          <p className="text-3xl font-bold text-white">{tokenizationStats?.total || 0}</p>
          <p className="text-sm text-green-400 mt-1">{tokenizationStats?.completed || 0} completed</p>
        </div>
      </div>

      {/* Quick Action Alerts */}
      {(kycStats.pending > 0 || (tokenizationStats && tokenizationStats.pending > 0)) && (
        <div className="grid md:grid-cols-2 gap-4">
          {kycStats.pending > 0 && (
            <button
              onClick={() => setActiveTab('kyc')}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left hover:bg-yellow-500/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-yellow-400 font-semibold">{kycStats.pending} Pending KYC Reviews</p>
                  <p className="text-gray-400 text-sm">Applications awaiting your approval</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-yellow-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {tokenizationStats && tokenizationStats.pending > 0 && (
            <button
              onClick={() => setActiveTab('tokenization')}
              className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-left hover:bg-purple-500/20 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Coins className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-purple-400 font-semibold">{tokenizationStats.pending} Pending Tokenization</p>
                  <p className="text-gray-400 text-sm">Asset tokenization requests to review</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-gray-600 transition-colors group"
          onClick={() => setActiveTab('tokenization')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Tokenization</h3>
          </div>
          <p className="text-gray-400 text-sm">Review asset tokenization applications and manage deployments.</p>
          <p className="text-purple-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-gray-600 transition-colors group"
          onClick={() => setActiveTab('contracts')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileCode className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Contracts</h3>
          </div>
          <p className="text-gray-400 text-sm">View deployed contract addresses and configurations.</p>
          <p className="text-blue-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            View <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-gray-600 transition-colors group"
          onClick={() => setActiveTab('kyc')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">KYC Management</h3>
          </div>
          <p className="text-gray-400 text-sm">Review and approve KYC submissions from investors.</p>
          <p className="text-yellow-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Manage <ArrowRight className="w-4 h-4" />
          </p>
        </div>

        <div
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-gray-600 transition-colors group"
          onClick={() => setActiveTab('settings')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Settings</h3>
          </div>
          <p className="text-gray-400 text-sm">Configure fees, recipients, and platform parameters.</p>
          <p className="text-gray-400 text-sm mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">
            Configure <ArrowRight className="w-4 h-4" />
          </p>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Launchpad Projects</h3>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{project.name || `Project #${project.id}`}</p>
                    <p className="text-gray-400 text-sm">{formatUSD(project.totalRaised)} raised</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[project.status]}`}>
                    {STATUS_NAMES[project.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tokenization Summary */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tokenization Summary</h3>
            <button
              onClick={() => setActiveTab('tokenization')}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {!tokenizationStats || tokenizationStats.total === 0 ? (
            <div className="text-center py-8">
              <Coins className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">No tokenization requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{tokenizationStats.pending}</p>
                  <p className="text-gray-400 text-sm">Pending</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{tokenizationStats.approved}</p>
                  <p className="text-gray-400 text-sm">In Progress</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{tokenizationStats.completed}</p>
                  <p className="text-gray-400 text-sm">Completed</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{tokenizationStats.total}</p>
                  <p className="text-gray-400 text-sm">Total</p>
                </div>
              </div>
              
              {tokenizationStats.completed > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-green-400 text-sm">
                    {tokenizationStats.completed} assets successfully tokenized
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
