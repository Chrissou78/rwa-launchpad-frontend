// src/app/admin/AdminClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';
import { Project, AdminTab, KYCStats, TokenizationStats, TradeStats, DisputeStats } from './constants';
import { convertIPFSUrl } from './helpers';
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  UserCheck,
  FileCode,
  Factory,
  Settings,
  Loader2,
  Wallet,
  Shield,
  Coins,
  Users,
  Ship,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  ArrowRightLeft,
  ExternalLink,
  Globe,
} from 'lucide-react';

// Import all tab components
import { AdminOverview, PlatformContracts } from './components';
import KYCManagement from './kyc/KYCManagement';
import ProjectManagement from './projects/ProjectManagement';
import OffChainPayments from './offchain/OffChainPayments';
import FactorySettings from './settings/FactorySettings';
import PlatformSettings from './settings/PlatformSettings';
import TokenizationManagement from './tokenization/TokenizationManagement';
import TradeManagement from './trade/TradeManagement';
import DisputeManagement from './trade/DisputeManagement';

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'projects', label: 'Launchpad', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'tokenization', label: 'Tokenization', icon: <Coins className="w-4 h-4" /> },
  { id: 'trade', label: 'Trade', icon: <Ship className="w-4 h-4" /> },
  { id: 'disputes', label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'offchain', label: 'Off-Chain', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'kyc', label: 'KYC', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'contracts', label: 'Contracts', icon: <FileCode className="w-4 h-4" /> },
  { id: 'factory', label: 'Factory', icon: <Factory className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

// Default stats to prevent undefined errors
const DEFAULT_KYC_STATS: KYCStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
const DEFAULT_TOKENIZATION_STATS: TokenizationStats = { total: 0, pending: 0, inProgress: 0, completed: 0 };
const DEFAULT_TRADE_STATS: TradeStats = { 
  totalDeals: 0, activeDeals: 0, completedDeals: 0, disputedDeals: 0, 
  totalVolume: 0, pendingVolume: 0, inEscrow: 0, averageDealSize: 0 
};
const DEFAULT_DISPUTE_STATS: DisputeStats = { 
  total: 0, pending: 0, inMediation: 0, inArbitration: 0, resolved: 0, 
  totalValue: 0, valueAtRisk: 0, avgResolutionTime: 0 
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
  isConnected?: boolean;
}

function NetworkBadge({ chainName, isTestnet, isConnected = true }: NetworkBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      isConnected 
        ? isTestnet 
          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
          : 'bg-green-500/20 border border-green-500/30 text-green-400'
        : 'bg-red-500/20 border border-red-500/30 text-red-400'
    }`}>
      {isConnected ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span>{chainName}</span>
      {isTestnet && isConnected && (
        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 rounded text-yellow-300">
          Testnet
        </span>
      )}
    </div>
  );
}

interface NetworkSwitcherProps {
  currentChainId: number | undefined;
  deployedChains: Array<{ id: number; name: string; isTestnet: boolean }>;
  isSwitching: boolean;
  onSwitch: (chainId: number) => void;
}

function NetworkSwitcher({ currentChainId, deployedChains, isSwitching, onSwitch }: NetworkSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (deployedChains.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" />
        <span>Switch Network</span>
        {isSwitching && <Loader2 className="w-3 h-3 animate-spin" />}
      </button>
      
      {isExpanded && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsExpanded(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-400 px-2 py-1 mb-1">Select Network</p>
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onSwitch(chain.id);
                    setIsExpanded(false);
                  }}
                  disabled={chain.id === currentChainId || isSwitching}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    chain.id === currentChainId
                      ? 'bg-blue-600/20 text-blue-400 cursor-default'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  } disabled:opacity-50`}
                >
                  <span className="flex items-center gap-2">
                    {chain.id === currentChainId && (
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                    {chain.name}
                  </span>
                  {chain.isTestnet && (
                    <span className="text-xs text-yellow-400 opacity-70">Test</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  onClick: () => void;
  color: string;
  hoverBorder: string;
}

function QuickStatCard({ label, value, onClick, color, hoverBorder }: QuickStatCardProps) {
  return (
    <button 
      onClick={onClick} 
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 text-left ${hoverBorder} transition-all hover:shadow-lg`}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT - Named AdminClient (not AdminPage)
// ============================================================================

export default function AdminClient() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  
  // Chain config
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  const projectNFTAddress = contracts?.RWAProjectNFT as Address | undefined;


  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kycStats, setKycStats] = useState<KYCStats>(DEFAULT_KYC_STATS);
  const [tokenizationStats, setTokenizationStats] = useState<TokenizationStats>(DEFAULT_TOKENIZATION_STATS);
  const [tradeStats, setTradeStats] = useState<TradeStats>(DEFAULT_TRADE_STATS);
  const [disputeStats, setDisputeStats] = useState<DisputeStats>(DEFAULT_DISPUTE_STATS);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    if (!address) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/check', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
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
  }, [address, chainId]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!publicClient || !projectNFTAddress) {
      setProjects([]);
      return;
    }

    try {
      const totalProjects = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      }) as bigint;

      const projectPromises = [];
      for (let i = 1; i <= Number(totalProjects); i++) {
        projectPromises.push(
          publicClient.readContract({
            address: projectNFTAddress,
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
        if (project.owner === ZERO_ADDRESS) continue;

        let name = `Project #${project.id}`;
        let refundsEnabled = false;

        // Fetch metadata
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

        // Fetch escrow data
        if (project.escrowVault && project.escrowVault !== ZERO_ADDRESS) {
          try {
            const fundingData = await publicClient.readContract({
              address: project.escrowVault as Address,
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
      setProjects([]);
    }
  }, [publicClient, projectNFTAddress]);

  // Fetch KYC stats
  const fetchKYCStats = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/kyc/stats', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setKycStats({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
    }
  }, [address, chainId]);

  // Fetch tokenization stats
  const fetchTokenizationStats = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/tokenization/stats', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTokenizationStats({
          total: data.total || 0,
          pending: data.pending || 0,
          inProgress: data.inProgress || data.approved || 0,
          completed: data.completed || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching tokenization stats:', error);
    }
  }, [address, chainId]);

  // Fetch trade stats
  const fetchTradeStats = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/trade/stats', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTradeStats({
          totalDeals: data.totalDeals || data.total || 0,
          activeDeals: data.activeDeals || data.active || 0,
          completedDeals: data.completedDeals || data.completed || 0,
          disputedDeals: data.disputedDeals || data.disputed || 0,
          totalVolume: data.totalVolume || 0,
          pendingVolume: data.pendingVolume || 0,
          inEscrow: data.inEscrow || 0,
          averageDealSize: data.averageDealSize || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching trade stats:', error);
    }
  }, [address, chainId]);

  // Fetch dispute stats
  const fetchDisputeStats = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/trade/disputes/stats', {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDisputeStats({
          total: data.total || 0,
          pending: data.pending || 0,
          inMediation: data.inMediation || 0,
          inArbitration: data.inArbitration || 0,
          resolved: data.resolved || 0,
          totalValue: data.totalValue || 0,
          valueAtRisk: data.valueAtRisk || 0,
          avgResolutionTime: data.avgResolutionTime || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dispute stats:', error);
    }
  }, [address, chainId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchProjects(), 
      fetchKYCStats(), 
      fetchTokenizationStats(),
      fetchTradeStats(),
      fetchDisputeStats(),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchProjects, fetchKYCStats, fetchTokenizationStats, fetchTradeStats, fetchDisputeStats]);

  // Load data when admin is confirmed
  useEffect(() => {
    if (isAdmin) {
      refreshAll();
    }
  }, [isAdmin, chainId]);

  // Format volume
  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(1)}B`;
    }
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  // Not connected
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

  // Checking admin
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Access</h2>
            <p className="text-gray-400">Checking admin permissions on {chainName}...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
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
            <p className="text-gray-400 mb-4">You don&apos;t have permission to access the admin panel on {chainName}.</p>
            <p className="text-gray-500 text-sm font-mono mb-4">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
            
            {deployedChains.length > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Try a different network:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {deployedChains
                    .filter(chain => chain.id !== chainId)
                    .map(chain => (
                      <button
                        key={chain.id}
                        onClick={() => switchToChain(chain.id)}
                        disabled={isSwitching}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {chain.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <span className="text-gray-400">Loading data from {chainName}...</span>
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
            tradeStats={tradeStats}
            disputeStats={disputeStats}
            setActiveTab={setActiveTab}
            chainName={chainName}
            explorerUrl={explorerUrl}
          />
        );
      case 'projects':
        return <ProjectManagement projects={projects} onRefresh={fetchProjects} />;
      case 'tokenization':
        return <TokenizationManagement onRefresh={fetchTokenizationStats} />;
      case 'trade':
        return <TradeManagement onRefresh={fetchTradeStats} />;
      case 'disputes':
        return <DisputeManagement onRefresh={fetchDisputeStats} />;
      case 'offchain':
        return <OffChainPayments projects={projects} onRefresh={fetchProjects} />;
      case 'kyc':
        return <KYCManagement />;
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                <p className="text-gray-400">Manage projects, tokenization, trade, KYC, and platform settings</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NetworkBadge chainName={chainName} isTestnet={isTestnet} />
              <NetworkSwitcher
                currentChainId={chainId}
                deployedChains={deployedChains}
                isSwitching={isSwitching}
                onSwitch={switchToChain}
              />
              <button
                onClick={refreshAll}
                disabled={loading}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh all data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()} on {chainName}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <QuickStatCard
            label="Launchpad"
            value={projects.length}
            onClick={() => setActiveTab('projects')}
            color="text-white"
            hoverBorder="hover:border-blue-500/50"
          />
          <QuickStatCard
            label="Pending KYC"
            value={kycStats.pending}
            onClick={() => setActiveTab('kyc')}
            color="text-yellow-400"
            hoverBorder="hover:border-yellow-500/50"
          />
          <QuickStatCard
            label="Token Requests"
            value={tokenizationStats.pending}
            onClick={() => setActiveTab('tokenization')}
            color="text-purple-400"
            hoverBorder="hover:border-purple-500/50"
          />
          <QuickStatCard
            label="Active Trades"
            value={tradeStats.activeDeals}
            onClick={() => setActiveTab('trade')}
            color="text-cyan-400"
            hoverBorder="hover:border-cyan-500/50"
          />
          <QuickStatCard
            label="Open Disputes"
            value={disputeStats.pending + disputeStats.inMediation}
            onClick={() => setActiveTab('disputes')}
            color="text-red-400"
            hoverBorder="hover:border-red-500/50"
          />
          <QuickStatCard
            label="Trade Volume"
            value={formatVolume(tradeStats.totalVolume)}
            onClick={() => setActiveTab('trade')}
            color="text-green-400"
            hoverBorder="hover:border-green-500/50"
          />
        </div>

        {/* Network Info Bar */}
        {!projectNFTAddress && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium">Limited functionality on {chainName}</p>
                <p className="text-yellow-300/70 text-sm mt-1">
                  Some contracts are not deployed on this network. Switch to a fully deployed network for complete functionality.
                </p>
                {deployedChains.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {deployedChains
                      .filter(chain => chain.id !== chainId)
                      .slice(0, 3)
                      .map(chain => (
                        <button
                          key={chain.id}
                          onClick={() => switchToChain(chain.id)}
                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded-lg transition-colors"
                        >
                          Switch to {chain.name}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
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

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {chainName}
              </span>
              <span>•</span>
              <span>Chain ID: {chainId}</span>
              <span>•</span>
              <span>Currency: {nativeCurrency?.symbol || 'ETH'}</span>
              {isTestnet && (
                <>
                  <span>•</span>
                  <span className="text-yellow-400">Testnet</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="text-gray-500">
                Admin: {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
