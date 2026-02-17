// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWAEscrowVaultABI, KYCManagerABI } from '@/config/abis';
import { publicClient } from './client';
import { Project, AdminTab, KYCStats, TokenizationStats, ZERO_ADDRESS } from './constants';
import { convertIPFSUrl } from './helpers';
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  UserCheck,
  Fingerprint,
  FileCode,
  Factory,
  Settings,
  Loader2,
  Wallet,
  Shield,
  Coins,
  Users
} from 'lucide-react';

// Import all tab components
import { AdminOverview, PlatformContracts } from './components';
import KYCManagement from './kyc/KYCManagement';
import ProjectManagement from './projects/ProjectManagement';
import OffChainPayments from './offchain/OffChainPayments';
import IdentityManagement from './identity/IdentityManagement';
import FactorySettings from './settings/FactorySettings';
import PlatformSettings from './settings/PlatformSettings';
import TokenizationManagement from './tokenization/TokenizationManagement';

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'projects', label: 'Launchpad', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'tokenization', label: 'Tokenization', icon: <Coins className="w-4 h-4" /> },
  { id: 'offchain', label: 'Off-Chain', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'kyc', label: 'KYC', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'identity', label: 'Identity', icon: <Fingerprint className="w-4 h-4" /> },
  { id: 'contracts', label: 'Contracts', icon: <FileCode className="w-4 h-4" /> },
  { id: 'factory', label: 'Factory', icon: <Factory className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kycStats, setKycStats] = useState<KYCStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [tokenizationStats, setTokenizationStats] = useState<TokenizationStats>({ total: 0, pending: 0, approved: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!address) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/check', {
        headers: { 'x-wallet-address': address },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, [address]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

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
    if (!CONTRACTS.KYCManager || !address) return;

    try {
      // Try to get on-chain pending count
      let pendingCount = 0;
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
          abi: KYCManagerABI,
          functionName: 'getPendingCount',
        });
        pendingCount = Number(result);
      } catch (e) {
        console.error('Error fetching on-chain KYC stats:', e);
      }

      // Fetch from API for complete stats
      try {
        const response = await fetch('/api/admin/kyc/stats', {
          headers: { 'x-wallet-address': address },
        });
        
        if (response.ok) {
          const data = await response.json();
          setKycStats({
            total: data.total || 0,
            pending: data.pending || pendingCount,
            approved: data.approved || 0,
            rejected: data.rejected || 0,
          });
          return;
        }
      } catch (e) {
        console.error('Error fetching API KYC stats:', e);
      }

      // Fallback
      setKycStats({
        total: 0,
        pending: pendingCount,
        approved: 0,
        rejected: 0,
      });
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
    }
  }, [address]);

  const fetchTokenizationStats = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/tokenization/stats', {
        headers: { 'x-wallet-address': address },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTokenizationStats({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          completed: data.completed || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching tokenization stats:', error);
    }
  }, [address]);

  useEffect(() => {
    if (isAdmin) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchProjects(), fetchKYCStats(), fetchTokenizationStats()]);
        setLoading(false);
      };
      loadData();
    }
  }, [isAdmin, fetchProjects, fetchKYCStats, fetchTokenizationStats]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Checking admin status
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Access</h2>
            <p className="text-gray-400">Checking admin permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not admin state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You don't have permission to access the admin panel.
            </p>
            <p className="text-gray-500 text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-400">Loading data...</span>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <AdminOverview 
            projects={projects} 
            kycStats={kycStats} 
            tokenizationStats={tokenizationStats}
            setActiveTab={setActiveTab} 
          />
        );
      case 'projects':
        return <ProjectManagement projects={projects} onRefresh={fetchProjects} />;
      case 'tokenization':
        return <TokenizationManagement onRefresh={fetchTokenizationStats} />;
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
      case 'users':
        return (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">User Management</h3>
            <p className="text-gray-400">Coming soon...</p>
          </div>
        );
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400">Manage projects, tokenization, KYC, and platform settings</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('projects')}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:border-blue-500/50 transition"
          >
            <p className="text-gray-400 text-sm">Launchpad Projects</p>
            <p className="text-2xl font-bold text-white">{projects.length}</p>
          </button>
          <button 
            onClick={() => setActiveTab('kyc')}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:border-yellow-500/50 transition"
          >
            <p className="text-gray-400 text-sm">Pending KYC</p>
            <p className="text-2xl font-bold text-yellow-400">{kycStats.pending}</p>
          </button>
          <button 
            onClick={() => setActiveTab('tokenization')}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:border-purple-500/50 transition"
          >
            <p className="text-gray-400 text-sm">Tokenization Requests</p>
            <p className="text-2xl font-bold text-purple-400">{tokenizationStats.pending}</p>
          </button>
          <button 
            onClick={() => setActiveTab('tokenization')}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:border-green-500/50 transition"
          >
            <p className="text-gray-400 text-sm">Completed Tokens</p>
            <p className="text-2xl font-bold text-green-400">{tokenizationStats.completed}</p>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
            >
              {tab.icon}
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
