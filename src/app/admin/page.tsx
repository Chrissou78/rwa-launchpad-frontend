// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
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

const tabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'offchain', label: 'Off-Chain', icon: '💳' },
  { id: 'kyc', label: 'KYC', icon: '✅' },
  { id: 'identity', label: 'Identity', icon: '🪪' },
  { id: 'contracts', label: 'Contracts', icon: '📜' },
  { id: 'factory', label: 'Factory', icon: '🏭' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading) {
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage projects, KYC, and platform settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
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
