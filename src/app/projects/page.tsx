// src/app/projects/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePublicClient, useChainId, useAccount } from 'wagmi';
import { Address } from 'viem';
import Header from '@/components/Header';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAProjectNFTABI, RWASecurityTokenABI } from '@/config/abis';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: {
    category?: string;
    projected_roi?: number;
    company_name?: string;
  };
}

interface Project {
  id: bigint;
  owner: string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: bigint;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  completedAt: bigint;
  transferable: boolean;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
}

// Contract enum from IRWAProjectNFT.sol:
// 0=Draft, 1=Pending, 2=Active, 3=Funded, 4=InProgress, 5=Completed, 6=Cancelled, 7=Failed
const STATUS_LABELS = ['Draft', 'Pending', 'Active', 'Funded', 'In Progress', 'Completed', 'Cancelled', 'Failed'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Check if project is archived (cancelled/failed AND fully refunded)
const isProjectArchived = (project: Project): boolean => {
  const isCancelledOrFailed = project.status === 6 || project.status === 7;
  const hasNoFundsLeft = project.totalRaised === 0n;
  return isCancelledOrFailed && hasNoFundsLeft;
};

// Format USD - fundingGoal is PLAIN USD (no decimals!)
const formatUSD = (amount: bigint): string => {
  return Number(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Format USDC - totalRaised is in USDC (6 decimals)
const formatUSDC = (amount: bigint): string => {
  return (Number(amount) / 1e6).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// Check if IPFS hash is valid (real hashes are 46+ characters)
const isValidIPFSHash = (uri: string): boolean => {
  if (!uri) return false;
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return hash.length >= 46;
  }
  return uri.startsWith('http');
};

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

interface ProjectCardProps {
  project: Project;
  chainName: string;
  isTestnet: boolean;
}

function ProjectCard({ project, chainName, isTestnet }: ProjectCardProps) {
  const isCancelled = project.status === 6;
  const isFailed = project.status === 7;
  const isArchived = isProjectArchived(project);
  
  // fundingGoal is plain USD, totalRaised is USDC (6 decimals)
  const fundingGoalNum = Number(project.fundingGoal);
  const totalRaisedNum = Number(project.totalRaised) / 1e6;
  const progress = fundingGoalNum > 0 ? (totalRaisedNum / fundingGoalNum) * 100 : 0;

  const deadline = new Date(Number(project.deadline) * 1000);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const displayName = project.metadata?.name || project.tokenName || `Project #${project.id}`;
  
  // Safe status label lookup
  const statusLabel = STATUS_LABELS[project.status] ?? `Status ${project.status}`;

  // Status color mapping
  const getStatusColor = () => {
    if (isCancelled || isFailed) return 'bg-red-500/20 text-red-400 border border-red-500/30';
    switch (project.status) {
      case 0: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'; // Draft
      case 1: return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'; // Pending
      case 2: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'; // Active
      case 3: return 'bg-green-500/20 text-green-400 border border-green-500/30'; // Funded
      case 4: return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; // InProgress
      case 5: return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; // Completed
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`bg-gray-800 rounded-xl border overflow-hidden transition-all group ${
        isArchived 
          ? 'border-gray-800 opacity-60 hover:opacity-80' 
          : 'border-gray-700 hover:border-gray-600 hover:shadow-lg hover:shadow-blue-500/10'
      }`}>
        {/* Banner/Image */}
        <div className={`h-40 bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative ${isArchived ? 'grayscale' : ''}`}>
          {project.metadata?.image && isValidIPFSHash(project.metadata.image) ? (
            <Image
              src={project.metadata.image.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${project.metadata.image.replace('ipfs://', '')}`
                : project.metadata.image}
              alt={displayName}
              fill
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-bold text-gray-700 group-hover:text-gray-600 transition-colors">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {isArchived ? (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-700/80 text-gray-400 border border-gray-600">
                📦 Archived
              </span>
            ) : (
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
                {statusLabel}
              </span>
            )}
          </div>

          {/* Network Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              isTestnet 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {chainName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="mb-3">
            <h3 className={`text-lg font-semibold transition-colors truncate ${
              isArchived ? 'text-gray-400' : 'text-white group-hover:text-blue-400'
            }`}>
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {project.tokenSymbol && (
                <span className="text-sm text-gray-500">${project.tokenSymbol}</span>
              )}
              {project.metadata?.attributes?.category && (
                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                  {project.metadata.attributes.category}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {project.metadata?.description || 'Tokenized real-world asset investment opportunity'}
          </p>

          {/* ROI Badge - hide for archived */}
          {!isArchived && project.metadata?.attributes?.projected_roi && (
            <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-sm text-green-400 font-medium">
                📈 Projected ROI: {project.metadata.attributes.projected_roi}%
              </span>
            </div>
          )}

          {/* Status Banners */}
          {isArchived ? (
            <div className="mb-4 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
              <span className="text-sm text-gray-400 font-medium">
                📦 Archived - All funds refunded
              </span>
            </div>
          ) : (isCancelled || isFailed) && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-sm text-red-400 font-medium">
                ⚠️ {isCancelled ? 'Cancelled - Refunds available' : 'Failed'}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Raised</span>
              <span className={`font-medium ${isArchived ? 'text-gray-500' : 'text-white'}`}>
                {formatUSDC(project.totalRaised)} 
                <span className="text-gray-500"> / {formatUSD(project.fundingGoal)}</span>
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isArchived ? 'bg-gray-600' :
                  isCancelled || isFailed ? 'bg-red-500' : 
                  'bg-gradient-to-r from-blue-500 to-blue-400'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {isArchived ? 'Refunded' : `${progress.toFixed(1)}% funded`}
            </div>
          </div>

          {/* Footer Stats */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isArchived ? 'Archived' : statusLabel}
            </div>
            <div className={`text-sm ${
              isArchived ? 'text-gray-500' :
              isCancelled || isFailed ? 'text-red-400' : 
              isExpired ? 'text-orange-400' : 
              'text-gray-400'
            }`}>
              {isArchived ? 'Closed' : isCancelled ? 'Cancelled' : isFailed ? 'Failed' : isExpired ? 'Ended' : `${daysLeft} days left`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProjectsPage() {
  // Wagmi hooks
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  const { isConnected } = useAccount();

  // Chain config for multichain support
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'funded' | 'ended' | 'archived'>('all');
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    if (!contracts?.RWAProjectNFT || !publicClient) {
      setError('Project contracts not available on this network');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const total = await publicClient.readContract({
        address: contracts.RWAProjectNFT as Address,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      });

      if (total === 0n) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const loadedProjects: Project[] = [];

      for (let i = 1n; i <= total; i++) {
        try {
          const projectData = await publicClient.readContract({
            address: contracts.RWAProjectNFT as Address,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [i],
          });

          const project: Project = {
            id: projectData.id,
            owner: projectData.owner,
            metadataURI: projectData.metadataURI,
            fundingGoal: projectData.fundingGoal,
            totalRaised: projectData.totalRaised,
            minInvestment: projectData.minInvestment,
            maxInvestment: projectData.maxInvestment,
            deadline: projectData.deadline,
            status: projectData.status,
            securityToken: projectData.securityToken,
            escrowVault: projectData.escrowVault,
            createdAt: projectData.createdAt,
            completedAt: projectData.completedAt,
            transferable: projectData.transferable,
          };

          // Skip metadata and token loading for archived or cancelled/failed projects
          const isCancelledOrFailed = project.status === 6 || project.status === 7;

          if (!isCancelledOrFailed) {
            // Load metadata only if valid IPFS hash
            if (project.metadataURI && isValidIPFSHash(project.metadataURI)) {
              try {
                let url = project.metadataURI;
                if (url.startsWith('ipfs://')) {
                  url = `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
                }
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
                if (res.ok) project.metadata = await res.json();
              } catch {
                // Silently fail
              }
            }

            // Load token info
            if (project.securityToken && project.securityToken !== ZERO_ADDRESS) {
              try {
                const [name, symbol] = await Promise.all([
                  publicClient.readContract({ 
                    address: project.securityToken as Address, 
                    abi: RWASecurityTokenABI, 
                    functionName: 'name' 
                  }),
                  publicClient.readContract({ 
                    address: project.securityToken as Address, 
                    abi: RWASecurityTokenABI, 
                    functionName: 'symbol' 
                  }),
                ]);
                project.tokenName = name as string;
                project.tokenSymbol = symbol as string;
              } catch {
                // Silently fail
              }
            }
          }

          loadedProjects.push(project);
        } catch (e) {
          console.error(`Error loading project ${i}:`, e);
        }
      }

      setProjects(loadedProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [contracts, publicClient]);

  // Load projects when chain or contracts change
  useEffect(() => {
    if (isDeployed) {
      loadProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [isDeployed, chainId, loadProjects]);

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // Count archived projects
  const archivedCount = projects.filter(isProjectArchived).length;

  const filteredProjects = projects.filter((p) => {
    const isArchived = isProjectArchived(p);
    
    // Filter logic
    if (filter === 'active' && p.status !== 2) return false;
    if (filter === 'funded' && p.status !== 3) return false;
    if (filter === 'ended') {
      // Ended = Completed, Cancelled, Failed but NOT archived
      if (p.status !== 5 && p.status !== 6 && p.status !== 7) return false;
      if (isArchived) return false;
    }
    if (filter === 'archived' && !isArchived) return false;
    
    // For 'all', hide archived projects
    if (filter === 'all' && isArchived) return false;

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      const matchesName = p.metadata?.name?.toLowerCase().includes(s);
      const matchesSymbol = p.tokenSymbol?.toLowerCase().includes(s);
      const matchesDesc = p.metadata?.description?.toLowerCase().includes(s);
      const matchesId = `project #${p.id}`.toLowerCase().includes(s);
      if (!matchesName && !matchesSymbol && !matchesDesc && !matchesId) return false;
    }

    return true;
  });

  // Network not supported view
  if (!isDeployed) {
    const deployedChains = getDeployedChains();
    
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🌐</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              Projects are not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deployedChains.map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleSwitchNetwork(chain.chainId)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isSwitching && (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  )}
                  {chain.name}
                  {chain.isTestnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      {/* Network Banner */}
      <div className={`border-b ${isTestnet ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
            <span className={`text-sm font-medium ${isTestnet ? 'text-yellow-400' : 'text-green-400'}`}>
              {chainName} {isTestnet && '(Testnet)'}
            </span>
          </div>
          {contracts?.RWAProjectNFT && (
            <a
              href={`${explorerUrl}/address/${contracts.RWAProjectNFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1"
            >
              View Contract
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Wrong Chain Warning */}
      {isWrongChain && (
        <div className="bg-orange-500/10 border-b border-orange-500/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-orange-400">⚠️</span>
              <span className="text-orange-400 text-sm">
                Your wallet is connected to a different network
              </span>
            </div>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isSwitching && (
                <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              )}
              Switch to {chainName}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Investment Opportunities</h1>
            <p className="text-gray-400">
              Discover tokenized real-world assets on {chainName}
            </p>
          </div>
          <Link
            href="/create"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'active', 'funded', 'ended'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {/* Archived filter - only show if there are archived projects */}
              {archivedCount > 0 && (
                <button
                  onClick={() => setFilter('archived')}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    filter === 'archived'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                  }`}
                >
                  📦 Archived ({archivedCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-400 mb-6">
          Showing {filteredProjects.length} of {projects.length - archivedCount} projects on {chainName}
          {archivedCount > 0 && filter !== 'archived' && (
            <span className="text-gray-500"> ({archivedCount} archived)</span>
          )}
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading projects from {chainName}...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Projects</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => loadProjects()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">{filter === 'archived' ? '📦' : '📭'}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {filter === 'archived' 
                ? 'No Archived Projects' 
                : projects.length === 0 
                  ? `No Projects on ${chainName}` 
                  : 'No Matching Projects'}
            </h2>
            <p className="text-gray-400 mb-6">
              {filter === 'archived'
                ? 'Cancelled projects with all funds refunded will appear here.'
                : projects.length === 0
                  ? `Be the first to create a tokenized investment opportunity on ${chainName}!`
                  : 'Try adjusting your search or filters.'}
            </p>
            {projects.length === 0 && (
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create First Project
              </Link>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id.toString()} 
                project={project} 
                chainName={chainName}
                isTestnet={isTestnet}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
