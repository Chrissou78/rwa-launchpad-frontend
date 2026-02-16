// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { useAdmin } from '@/hooks/useAdmin';
import { CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI, KYCManagerABI } from '@/config/abis';
import { publicClient } from './client';
import { Project, AdminTab, KYCStats, ZERO_ADDRESS } from './constants';
import { convertIPFSUrl } from './helpers';

// Import all tab components
import { AdminOverview, PlatformContracts } from './components';
import KYCManagement from './kyc/KYCManagement';
import ProjectManagement from './projects/ProjectManagement';
import OffChainPayments from './offchain/OffChainPayments';
import IdentityManagement from './identity/IdentityManagement';
import FactorySettings from './settings/FactorySettings';
import PlatformSettings from './settings/PlatformSettings';
import AdminUsersManagement from './users/AdminUsersManagement';

import { ShieldAlert, Shield, Crown } from 'lucide-react';
import Link from 'next/link';

// Update AdminTab type to include 'users'
type ExtendedAdminTab = AdminTab | 'users';

const tabs: { id: ExtendedAdminTab; label: string; icon: string; superAdminOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'offchain', label: 'Off-Chain', icon: '💳' },
  { id: 'kyc', label: 'KYC', icon: '✅' },
  { id: 'identity', label: 'Identity', icon: '🪪' },
  { id: 'contracts', label: 'Contracts', icon: '📜' },
  { id: 'factory', label: 'Factory', icon: '🏭' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'users', label: 'Admins', icon: '👥', superAdminOnly: false }, // visible to all admins, but actions restricted
];

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const { isAdmin, isSuperAdmin, isLoading: isAdminLoading, role } = useAdmin();
  const [activeTab, setActiveTab] = useState<ExtendedAdminTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kycStats, setKycStats] = useState<KYCStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const totalProjects = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as `0x${string}`,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      });

      const projectPromises = [];
      for (let i = 1; i <= Number(totalProjects); i++) {
        projectPromises.push(
          publicClient.readContract({
            address: CONTRACTS.RWAProjectNFT as `0x${string}`,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          })
        );
      }

      const projectData = await Promise.all(projectPromises);
      const formattedProjects: Project[] = [];

      for (const data of projectData) {
        const project = data as any;

        if (project.owner === ZERO_ADDRESS) {
          continue;
        }

        let name = `Project #${project.id}`;
        let refundsEnabled = false;

        if (project.metadataURI) {
          try {
            const metadataUrl = convertIPFSUrl(project.metadataURI);
            const response = await fetch(metadataUrl);
            const metadata = await response.json();
            name = metadata.name || name;
          } catch (e) {
            console.error('Error fetching metadata:', e);
          }
        }

        if (project.escrowVault !== ZERO_ADDRESS) {
          try {
            const fundingData = await publicClient.readContract({
              address: project.escrowVault as `0x${string}`,
              abi: RWAEscrowVaultABI,
              functionName: 'getProjectFunding',
              args: [project.id],
            });
            refundsEnabled = (fundingData as any).refundsEnabled;
          } catch (e) {
            console.error('Error fetching funding data:', e);
          }
        }

        formattedProjects.push({
          id: Number(project.id),
          owner: project.owner,
          metadataURI: project.metadataURI,
          fundingGoal: project.fundingGoal,
          totalRaised: project.totalRaised,
          minInvestment: project.minInvestment,
          maxInvestment: project.maxInvestment,
          deadline: project.deadline,
          status: project.status,
          securityToken: project.securityToken,
          escrowVault: project.escrowVault,
          createdAt: project.createdAt,
          completedAt: project.completedAt,
          transferable: project.transferable,
          name,
          refundsEnabled,
        });
      }

      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  const fetchKYCStats = useCallback(async () => {
    if (!CONTRACTS.KYCManager) return;

    try {
      const pendingCount = await publicClient.readContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'getPendingCount',
      });

      setKycStats({
        total: 0,
        pending: Number(pendingCount),
        approved: 0,
        rejected: 0,
      });
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchKYCStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProjects, fetchKYCStats]);

  // Show loading state while checking admin status
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">You do not have permission to access the admin panel.</p>
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading && activeTab !== 'users') {
      return (
        <div className="bg-gray-800 rounded-xl p-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading data...</span>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <AdminOverview projects={projects} kycStats={kycStats} setActiveTab={setActiveTab} />;
      case 'projects':
        return <ProjectManagement projects={projects} onRefresh={fetchProjects} />;
      case 'offchain':
        return <OffChainPayments projects={projects} onRefresh={fetchProjects} />;
      case 'kyc':
        return <KYCManagement />;
      case 'identity':
        return <IdentityManagement projects={projects} />;
      case 'contracts':
        return <PlatformContracts />;
      case 'factory':
        return <FactorySettings />;
      case 'settings':
        return <PlatformSettings />;
      case 'users':
        return <AdminUsersManagement />;
      default:
        return null;
    }
  };

  // Filter tabs based on permissions (superAdminOnly)
  const visibleTabs = tabs.filter(tab => !tab.superAdminOnly || isSuperAdmin);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header with role badge */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400">Manage projects, KYC, and platform settings</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isSuperAdmin 
              ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' 
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            {isSuperAdmin ? (
              <Crown className="w-5 h-5" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}
