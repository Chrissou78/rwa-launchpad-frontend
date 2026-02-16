// src/app/admin/components/AdminOverview.tsx
'use client';

import { Project, AdminTab, KYCStats, STATUS_COLORS, STATUS_NAMES } from '../constants';
import { formatUSD } from '../helpers';

interface AdminOverviewProps {
  projects: Project[];
  kycStats: KYCStats;
  setActiveTab: (tab: AdminTab) => void;
}

export default function AdminOverview({ projects, kycStats, setActiveTab }: AdminOverviewProps) {
  const activeProjects = projects.filter(p => p.status === 2).length;
  const fundedProjects = projects.filter(p => p.status >= 3 && p.status <= 5).length;
  const totalRaised = projects.reduce((sum, p) => sum + p.totalRaised, 0n);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <p className="text-gray-400 text-sm">Total Projects</p>
          <p className="text-3xl font-bold text-white">{projects.length}</p>
          <p className="text-sm text-green-400">{activeProjects} active</p>
        </div>

        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <p className="text-gray-400 text-sm">Funded Projects</p>
          <p className="text-3xl font-bold text-white">{fundedProjects}</p>
          <p className="text-sm text-blue-400">In progress or completed</p>
        </div>

        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <p className="text-gray-400 text-sm">KYC Pending</p>
          <p className="text-3xl font-bold text-white">{kycStats.pending}</p>
          <p className="text-sm text-yellow-400">Awaiting review</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Total Raised</p>
          <p className="text-3xl font-bold text-white">{formatUSD(totalRaised)}</p>
          <p className="text-sm text-purple-400">Across all projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('contracts')}
        >
          <h3 className="text-lg font-semibold text-white mb-2">Platform Contracts</h3>
          <p className="text-gray-400 text-sm">View all deployed contract addresses and configurations.</p>
          <p className="text-blue-400 text-sm mt-2">Click to view →</p>
        </div>

        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <h3 className="text-lg font-semibold text-white mb-2">KYC Management</h3>
          <p className="text-gray-400 text-sm">Review and approve KYC submissions from investors.</p>
          <p className="text-blue-400 text-sm mt-2">Click to manage →</p>
        </div>

        <div
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('settings')}
        >
          <h3 className="text-lg font-semibold text-white mb-2">Platform Settings</h3>
          <p className="text-gray-400 text-sm">Configure fees, recipients, and platform parameters.</p>
          <p className="text-blue-400 text-sm mt-2">Click to manage →</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
        <div className="space-y-3">
          {projects.slice(0, 5).map(project => (
            <div key={project.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">{project.name || `Project #${project.id}`}</p>
                <p className="text-gray-400 text-sm">{formatUSD(project.totalRaised)} raised</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[project.status]}`}>
                {STATUS_NAMES[project.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
