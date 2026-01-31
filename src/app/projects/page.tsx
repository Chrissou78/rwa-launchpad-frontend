'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import Header  from '@/components/Header';
import { CONTRACTS } from '@/config/contracts';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const RWAProjectNFTABI = [
  {
    name: 'totalProjects',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'securityToken', type: 'address' },
          { name: 'escrowVault', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'investorCount', type: 'uint256' },
          { name: 'cancelled', type: 'bool' },
        ],
      },
    ],
  },
] as const;

const RWASecurityTokenABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

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
  investorCount: bigint;
  cancelled: boolean;
  metadata?: ProjectMetadata;
  tokenName?: string;
  tokenSymbol?: string;
}

const STATUS_LABELS = ['Draft', 'Active', 'Funded', 'Completed', 'Cancelled'];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Helper to format USDC amounts (6 decimals)
const formatUSDC = (amount: bigint): string => {
  return (Number(amount) / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

// Helper to format USD amounts (no decimals)
const formatUSD = (amount: bigint): string => {
  return Number(amount).toLocaleString();
};

function ProjectCard({ project }: { project: Project }) {
  const progress = project.fundingGoal > 0n
    ? Number((project.totalRaised * 100n) / project.fundingGoal)
    : 0;

  const deadline = new Date(Number(project.deadline) * 1000);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const displayName = project.metadata?.name || project.tokenName || `Project #${project.id}`;

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-blue-500/10 group">
        {/* Banner/Image */}
        <div className="h-40 bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative">
          {project.metadata?.image ? (
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
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              project.status === 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              project.status === 2 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              project.status === 3 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
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

          {/* ROI Badge */}
          {project.metadata?.attributes?.projected_roi && (
            <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-sm text-green-400 font-medium">
                📈 Projected ROI: {project.metadata.attributes.projected_roi}%
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Raised</span>
              <span className="text-white font-medium">
                ${formatUSDC(project.totalRaised)} 
                <span className="text-gray-500"> / ${formatUSD(project.fundingGoal)}</span>
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">{progress.toFixed(1)}% funded</div>
          </div>

          {/* Footer Stats */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {Number(project.investorCount)} investors
            </div>
            <div className={`text-sm ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
              {isExpired ? 'Ended' : `${daysLeft} days left`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'funded' | 'ended'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        const total = await publicClient.readContract({
          address: CONTRACTS.RWAProjectNFT as `0x${string}`,
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
              address: CONTRACTS.RWAProjectNFT as `0x${string}`,
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
              investorCount: projectData.investorCount,
              cancelled: projectData.cancelled,
            };

            // Load metadata
            if (project.metadataURI) {
              try {
                let url = project.metadataURI;
                if (url.startsWith('ipfs://')) {
                  url = `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
                }
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
                if (res.ok) project.metadata = await res.json();
              } catch {}
            }

            // Load token info
            if (project.securityToken && project.securityToken !== ZERO_ADDRESS) {
              try {
                const [name, symbol] = await Promise.all([
                  publicClient.readContract({ address: project.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'name' }),
                  publicClient.readContract({ address: project.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'symbol' }),
                ]);
                project.tokenName = name as string;
                project.tokenSymbol = symbol as string;
              } catch {}
            }

            loadedProjects.push(project);
          } catch {}
        }

        setProjects(loadedProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (filter === 'active' && p.status !== 1) return false;
    if (filter === 'funded' && p.status !== 2) return false;
    if (filter === 'ended' && (p.status !== 3 && p.status !== 4)) return false;

    if (search) {
      const s = search.toLowerCase();
      const matchesName = p.metadata?.name?.toLowerCase().includes(s);
      const matchesSymbol = p.tokenSymbol?.toLowerCase().includes(s);
      const matchesDesc = p.metadata?.description?.toLowerCase().includes(s);
      if (!matchesName && !matchesSymbol && !matchesDesc) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Investment Opportunities</h1>
            <p className="text-gray-400">Discover tokenized real-world assets</p>
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
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-400 mb-6">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading projects...</p>
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
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {projects.length === 0 ? 'No Projects Yet' : 'No Matching Projects'}
            </h2>
            <p className="text-gray-400 mb-6">
              {projects.length === 0
                ? 'Be the first to create a tokenized investment opportunity!'
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
              <ProjectCard key={project.id.toString()} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
