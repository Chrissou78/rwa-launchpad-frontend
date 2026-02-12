// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, type Address } from 'viem';
import { polygonAmoy } from 'wagmi/chains';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const OFFCHAIN_PAYMENT = '0x0000000000000000000000000000000000000001';
const USD_DECIMALS = 6;

// Token info for display
const TOKEN_INFO: Record<string, { symbol: string; decimals: number }> = {
  [ZERO_ADDRESS]: { symbol: 'POL', decimals: 18 },
  [OFFCHAIN_PAYMENT]: { symbol: 'OFF-CHAIN', decimals: 6 },
  [CONTRACTS.USDC.toLowerCase()]: { symbol: 'USDC', decimals: 6 },
  [CONTRACTS.USDT.toLowerCase()]: { symbol: 'USDT', decimals: 6 },
};

// Helper functions
const getExplorerUrl = (address: string, type: 'address' | 'tx' = 'address') =>
  `${EXPLORER_URL}/${type}/${address}`;

const formatUSD = (value: bigint | number | string, decimals = USD_DECIMALS): string => {
  try {
    const numValue = typeof value === 'bigint'
      ? Number(formatUnits(value, decimals))
      : typeof value === 'string'
        ? Number(formatUnits(BigInt(value), decimals))
        : value / Math.pow(10, decimals);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch {
    return '$0.00';
  }
};

const formatTokenAmount = (value: bigint, tokenAddress: string): string => {
  const info = TOKEN_INFO[tokenAddress.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 };
  const amount = Number(formatUnits(value, info.decimals));
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${info.symbol}`;
};

const getTokenSymbol = (tokenAddress: string): string => {
  return TOKEN_INFO[tokenAddress.toLowerCase()]?.symbol || 'TOKEN';
};

const convertIPFSUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

// Status mappings
const PROJECT_STATUS = {
  0: { name: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  1: { name: 'Active', color: 'bg-blue-100 text-blue-800' },
  2: { name: 'Funding', color: 'bg-purple-100 text-purple-800' },
  3: { name: 'Funded', color: 'bg-green-100 text-green-800' },
  4: { name: 'Cancelled', color: 'bg-red-100 text-red-800' },
  5: { name: 'Completed', color: 'bg-gray-100 text-gray-800' },
};

const MILESTONE_STATUS = {
  0: { name: 'Pending', color: 'bg-gray-100 text-gray-800' },
  1: { name: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  2: { name: 'Approved', color: 'bg-green-100 text-green-800' },
  3: { name: 'Rejected', color: 'bg-red-100 text-red-800' },
  4: { name: 'Disputed', color: 'bg-orange-100 text-orange-800' },
  5: { name: 'Released', color: 'bg-purple-100 text-purple-800' },
};

// ABIs
const projectNFTAbi = [
  {
    name: 'totalProjects',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'securityToken', type: 'address' },
          { name: 'escrowVault', type: 'address' },
          { name: 'compliance', type: 'address' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

const escrowAbiV2 = [
  {
    name: 'getProjectFunding',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'projectId', type: 'uint256' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'totalReleasedUSD', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'fundingComplete', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'currentMilestone', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'projectOwner', type: 'address' },
          { name: 'securityToken', type: 'address' },
          { name: 'onChainRaisedUSD', type: 'uint256' },
          { name: 'offChainRaisedUSD', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getProjectTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'address[]' }],
  },
  {
    name: 'getTokenBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'token', type: 'address' },
    ],
    outputs: [
      { name: 'deposited', type: 'uint256' },
      { name: 'released', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
  {
    name: 'getMilestoneCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getMilestone',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'description', type: 'string' },
          { name: 'percentage', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'proofURI', type: 'string' },
          { name: 'submittedAt', type: 'uint256' },
          { name: 'approvedAt', type: 'uint256' },
          { name: 'releasedAmountUSD', type: 'uint256' },
          { name: 'rejectionReason', type: 'string' },
          { name: 'disputeRaiser', type: 'address' },
          { name: 'disputeReason', type: 'string' },
        ],
      },
    ],
  },
  {
    name: 'approveMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'rejectMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'releaseMilestoneFunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'enableRefunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setMilestoneStatus',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'status', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'emergencyTokenTransfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'recordOffChainInvestment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'investor', type: 'address' },
      { name: 'amountUSD', type: 'uint256' },
      { name: 'paymentReference', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'setFundingComplete',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'complete', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'transactionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getProjectInvestors',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'address[]' }],
  },
] as const;

const identityRegistryAbi = [
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'registerIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'userAddress', type: 'address' },
      { name: 'identity', type: 'address' },
      { name: 'country', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;

const factoryAbi = [
  {
    name: 'identityRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'nativePriceFeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'maxPriceAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'defaultStablecoins',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'platformFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'creationFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'implementations',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'securityToken', type: 'address' },
          { name: 'escrowVault', type: 'address' },
          { name: 'compliance', type: 'address' },
        ],
      },
    ],
  },
] as const;

// Types
interface Project {
  id: number;
  name: string;
  symbol: string;
  metadataURI: string;
  owner: string;
  securityToken: string;
  escrowVault: string;
  compliance: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  status: number;
  createdAt: number;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

interface EscrowFundingV2 {
  projectId: bigint;
  fundingGoal: bigint;
  totalRaised: bigint;
  totalReleasedUSD: bigint;
  deadline: bigint;
  fundingComplete: boolean;
  refundsEnabled: boolean;
  currentMilestone: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  projectOwner: string;
  securityToken: string;
  onChainRaisedUSD: bigint;
  offChainRaisedUSD: bigint;
}

interface TokenBalanceInfo {
  token: string;
  symbol: string;
  deposited: bigint;
  released: bigint;
  available: bigint;
}

interface Milestone {
  index: number;
  description: string;
  percentage: number;
  status: number;
  proofURI: string;
  submittedAt: number;
  approvedAt: number;
  releasedAmountUSD: bigint;
  rejectionReason: string;
  disputeRaiser: string;
  disputeReason: string;
}

// Main Admin Page Component
export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: polygonAmoy.id });

  const [activeTab, setActiveTab] = useState('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!publicClient) return;

    setLoading(true);
    setError(null);

    try {
      const totalProjects = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as Address,
        abi: projectNFTAbi,
        functionName: 'totalProjects',
      });

      const projectList: Project[] = [];

      for (let i = 1; i <= Number(totalProjects); i++) {
        try {
          const project = await publicClient.readContract({
            address: CONTRACTS.RWAProjectNFT as Address,
            abi: projectNFTAbi,
            functionName: 'getProject',
            args: [BigInt(i)],
          });

          if (project.owner === ZERO_ADDRESS) continue;

          let metadata = {};
          if (project.metadataURI) {
            try {
              const url = convertIPFSUrl(project.metadataURI);
              const res = await fetch(url);
              if (res.ok) {
                metadata = await res.json();
              }
            } catch {
              // Metadata fetch failed
            }
          }

          projectList.push({
            id: i,
            name: project.name,
            symbol: project.symbol,
            metadataURI: project.metadataURI,
            owner: project.owner,
            securityToken: project.securityToken,
            escrowVault: project.escrowVault,
            compliance: project.compliance,
            fundingGoal: project.fundingGoal,
            totalRaised: project.totalRaised,
            status: project.status,
            createdAt: Number(project.createdAt),
            metadata,
          });
        } catch (err) {
          console.error(`Error fetching project ${i}:`, err);
        }
      }

      setProjects(projectList);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    if (isConnected && publicClient) {
      fetchProjects();
    }
  }, [isConnected, publicClient, fetchProjects, refreshKey]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Panel</h1>
          <p className="text-gray-600">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'projects', name: 'Projects' },
    { id: 'offchain', name: 'Off-Chain Payments' },
    { id: 'identity', name: 'Identity Registry' },
    { id: 'factory', name: 'Factory Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={triggerRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Data
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <AdminOverview projects={projects} />}
            {activeTab === 'projects' && (
              <ProjectManagement projects={projects} onRefresh={triggerRefresh} />
            )}
            {activeTab === 'offchain' && (
              <OffChainPayments projects={projects} onRefresh={triggerRefresh} />
            )}
            {activeTab === 'identity' && <IdentityManagement />}
            {activeTab === 'factory' && <FactorySettings />}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Component
function AdminOverview({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter((p) => p.status !== 4);
  const fundedProjects = projects.filter((p) => p.status >= 3 && p.status !== 4);
  const totalRaised = projects.reduce((sum, p) => sum + p.totalRaised, BigInt(0));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{projects.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Projects</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{activeProjects.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Funded Projects</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{fundedProjects.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Raised</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{formatUSD(totalRaised)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {projects.slice(0, 5).map((project) => (
            <div key={project.id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{project.name}</p>
                <p className="text-sm text-gray-500">
                  {formatUSD(project.totalRaised)} / {formatUSD(project.fundingGoal)}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]?.color ||
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]?.name || 'Unknown'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Contract Addresses</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Project NFT:</span>
            <a
              href={getExplorerUrl(CONTRACTS.RWAProjectNFT)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono text-sm"
            >
              {CONTRACTS.RWAProjectNFT}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Factory:</span>
            <a
              href={getExplorerUrl(CONTRACTS.RWALaunchpadFactory)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono text-sm"
            >
              {CONTRACTS.RWALaunchpadFactory}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Identity Registry:</span>
            <a
              href={getExplorerUrl(CONTRACTS.IdentityRegistry)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono text-sm"
            >
              {CONTRACTS.IdentityRegistry}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project Management Component
function ProjectManagement({
  projects,
  onRefresh,
}: {
  projects: Project[];
  onRefresh: () => void;
}) {
  const publicClient = usePublicClient({ chainId: polygonAmoy.id });
  const { writeContract, data: txHash, isPending, reset: resetTx } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [escrowFunding, setEscrowFunding] = useState<EscrowFundingV2 | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceInfo[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMilestoneIndex, setRejectMilestoneIndex] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMilestoneIndex, setStatusMilestoneIndex] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<number>(0);

  useEffect(() => {
    if (txSuccess) {
      setTimeout(() => {
        if (selectedProject) {
          loadProjectDetails(selectedProject);
        }
        onRefresh();
        resetTx();
      }, 2000);
    }
  }, [txSuccess]);

  const loadProjectDetails = async (project: Project) => {
    if (!publicClient || !project.escrowVault || project.escrowVault === ZERO_ADDRESS) return;

    setMilestonesLoading(true);
    setSelectedProject(project);

    try {
      // Load escrow funding data (V2)
      const funding = await publicClient.readContract({
        address: project.escrowVault as Address,
        abi: escrowAbiV2,
        functionName: 'getProjectFunding',
        args: [BigInt(project.id)],
      });

      setEscrowFunding({
        projectId: funding.projectId,
        fundingGoal: funding.fundingGoal,
        totalRaised: funding.totalRaised,
        totalReleasedUSD: funding.totalReleasedUSD,
        deadline: funding.deadline,
        fundingComplete: funding.fundingComplete,
        refundsEnabled: funding.refundsEnabled,
        currentMilestone: funding.currentMilestone,
        minInvestment: funding.minInvestment,
        maxInvestment: funding.maxInvestment,
        projectOwner: funding.projectOwner,
        securityToken: funding.securityToken,
        onChainRaisedUSD: funding.onChainRaisedUSD,
        offChainRaisedUSD: funding.offChainRaisedUSD,
      });

      // Load token balances
      const tokens = await publicClient.readContract({
        address: project.escrowVault as Address,
        abi: escrowAbiV2,
        functionName: 'getProjectTokens',
        args: [BigInt(project.id)],
      });

      const balances: TokenBalanceInfo[] = [];
      for (const token of tokens) {
        const balance = await publicClient.readContract({
          address: project.escrowVault as Address,
          abi: escrowAbiV2,
          functionName: 'getTokenBalance',
          args: [BigInt(project.id), token as Address],
        });

        balances.push({
          token,
          symbol: getTokenSymbol(token),
          deposited: balance[0],
          released: balance[1],
          available: balance[2],
        });
      }
      setTokenBalances(balances);

      // Load milestones
      const count = await publicClient.readContract({
        address: project.escrowVault as Address,
        abi: escrowAbiV2,
        functionName: 'getMilestoneCount',
        args: [BigInt(project.id)],
      });

      const milestoneList: Milestone[] = [];
      for (let i = 0; i < Number(count); i++) {
        const m = await publicClient.readContract({
          address: project.escrowVault as Address,
          abi: escrowAbiV2,
          functionName: 'getMilestone',
          args: [BigInt(project.id), BigInt(i)],
        });

        milestoneList.push({
          index: i,
          description: m.description,
          percentage: Number(m.percentage) / 100,
          status: m.status,
          proofURI: m.proofURI,
          submittedAt: Number(m.submittedAt),
          approvedAt: Number(m.approvedAt),
          releasedAmountUSD: m.releasedAmountUSD,
          rejectionReason: m.rejectionReason,
          disputeRaiser: m.disputeRaiser,
          disputeReason: m.disputeReason,
        });
      }

      setMilestones(milestoneList);
    } catch (err) {
      console.error('Error loading project details:', err);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const handleApproveMilestone = (
    projectId: number,
    milestoneIndex: number,
    escrowVault: string
  ) => {
    writeContract({
      address: escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'approveMilestone',
      args: [BigInt(projectId), BigInt(milestoneIndex)],
    });
  };

  const handleRejectMilestone = () => {
    if (!selectedProject || rejectMilestoneIndex === null || !rejectReason) return;

    writeContract({
      address: selectedProject.escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'rejectMilestone',
      args: [BigInt(selectedProject.id), BigInt(rejectMilestoneIndex), rejectReason],
    });

    setShowRejectModal(false);
    setRejectReason('');
    setRejectMilestoneIndex(null);
  };

  const handleReleaseFunds = (projectId: number, milestoneIndex: number, escrowVault: string) => {
    writeContract({
      address: escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'releaseMilestoneFunds',
      args: [BigInt(projectId), BigInt(milestoneIndex)],
    });
  };

  const handleEnableRefunds = (projectId: number, escrowVault: string) => {
    writeContract({
      address: escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'enableRefunds',
      args: [BigInt(projectId)],
    });
  };

  const handleSetMilestoneStatus = () => {
    if (!selectedProject || statusMilestoneIndex === null) return;

    writeContract({
      address: selectedProject.escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'setMilestoneStatus',
      args: [BigInt(selectedProject.id), BigInt(statusMilestoneIndex), newStatus],
    });

    setShowStatusModal(false);
    setStatusMilestoneIndex(null);
  };

  const handleSetFundingComplete = (projectId: number, escrowVault: string, complete: boolean) => {
    writeContract({
      address: escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'setFundingComplete',
      args: [BigInt(projectId), complete],
    });
  };

  const isProcessing = isPending || txLoading;
  const activeProjects = projects.filter((p) => p.status !== 4);

  return (
    <div className="space-y-6">
      {/* Transaction Status */}
      {(isPending || txLoading) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-700">
              {isPending ? 'Confirm transaction in wallet...' : 'Transaction processing...'}
            </span>
          </div>
        </div>
      )}

      {txSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <span className="text-green-700">Transaction confirmed! Refreshing data...</span>
        </div>
      )}

      {/* Project List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Projects ({activeProjects.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Funding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeProjects.map((project) => {
                const progress =
                  project.fundingGoal > 0
                    ? Number((project.totalRaised * BigInt(100)) / project.fundingGoal)
                    : 0;

                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{project.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.symbol}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]?.color
                        }`}
                      >
                        {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS]?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUSD(project.totalRaised)} / {formatUSD(project.fundingGoal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{progress}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => loadProjectDetails(project)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Project Details */}
      {selectedProject && (
        <div className="bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedProject.name} - Details
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => loadProjectDetails(selectedProject)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                disabled={milestonesLoading}
              >
                {milestonesLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Funding Info */}
            {escrowFunding && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Funding Goal</p>
                    <p className="text-lg font-semibold">{formatUSD(escrowFunding.fundingGoal)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Total Raised</p>
                    <p className="text-lg font-semibold">{formatUSD(escrowFunding.totalRaised)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Total Released</p>
                    <p className="text-lg font-semibold">
                      {formatUSD(escrowFunding.totalReleasedUSD)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-lg font-semibold">
                      {escrowFunding.fundingComplete ? 'Complete' : 'In Progress'}
                      {escrowFunding.refundsEnabled && ' (Refunds)'}
                    </p>
                  </div>
                </div>

                {/* On-chain vs Off-chain breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">On-Chain Raised</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatUSD(escrowFunding.onChainRaisedUSD)}
                    </p>
                    <p className="text-xs text-blue-600">USDC, USDT, POL</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Off-Chain Raised</p>
                    <p className="text-xl font-bold text-purple-800">
                      {formatUSD(escrowFunding.offChainRaisedUSD)}
                    </p>
                    <p className="text-xs text-purple-600">Swipe / Card Payments</p>
                  </div>
                </div>
              </>
            )}

            {/* Token Balances */}
            {tokenBalances.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Token Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tokenBalances.map((tb) => (
                    <div key={tb.token} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{tb.symbol}</span>
                        {tb.token !== OFFCHAIN_PAYMENT && tb.token !== ZERO_ADDRESS && (
                          <a
                            href={getExplorerUrl(tb.token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Deposited:</span>
                          <span>{formatTokenAmount(tb.deposited, tb.token)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Released:</span>
                          <span>{formatTokenAmount(tb.released, tb.token)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-700">Available:</span>
                          <span className="text-green-600">
                            {formatTokenAmount(tb.available, tb.token)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                Milestones ({milestones.length})
              </h3>

              {milestonesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : milestones.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No milestones found</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => {
                    const statusInfo =
                      MILESTONE_STATUS[milestone.status as keyof typeof MILESTONE_STATUS] ||
                      MILESTONE_STATUS[0];

                    return (
                      <div key={milestone.index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Milestone {milestone.index + 1}:{' '}
                              {milestone.description || 'No description'}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {milestone.percentage}% of funds
                              {milestone.releasedAmountUSD > 0 && (
                                <span className="ml-2 text-green-600">
                                  (Released: {formatUSD(milestone.releasedAmountUSD)})
                                </span>
                              )}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.name}
                          </span>
                        </div>

                        {milestone.proofURI && (
                          <p className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Proof:</span>{' '}
                            <a
                              href={milestone.proofURI}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Submission
                            </a>
                          </p>
                        )}

                        {milestone.rejectionReason && (
                          <p className="text-sm text-red-600 mb-3">
                            <span className="font-medium">Rejection Reason:</span>{' '}
                            {milestone.rejectionReason}
                          </p>
                        )}

                        {milestone.submittedAt > 0 && (
                          <p className="text-xs text-gray-500 mb-3">
                            Submitted: {new Date(milestone.submittedAt * 1000).toLocaleString()}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {milestone.status === 1 && (
                            <>
                              <button
                                onClick={() =>
                                  handleApproveMilestone(
                                    selectedProject.id,
                                    milestone.index,
                                    selectedProject.escrowVault
                                  )
                                }
                                disabled={isProcessing}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectMilestoneIndex(milestone.index);
                                  setShowRejectModal(true);
                                }}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {milestone.status === 2 && (
                            <button
                              onClick={() =>
                                handleReleaseFunds(
                                  selectedProject.id,
                                  milestone.index,
                                  selectedProject.escrowVault
                                )
                              }
                              disabled={isProcessing}
                              className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              Release Funds
                            </button>
                          )}

                          {milestone.status === 5 && (
                            <span className="text-green-600 text-sm font-medium">
                              ✓ Funds Released
                            </span>
                          )}

                          {/* Admin: Change Status */}
                          <button
                            onClick={() => {
                              setStatusMilestoneIndex(milestone.index);
                              setNewStatus(milestone.status);
                              setShowStatusModal(true);
                            }}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Change Status
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Project Actions */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Project Actions</h3>
              <div className="flex gap-3 flex-wrap">
                {escrowFunding && !escrowFunding.fundingComplete && (
                  <button
                    onClick={() =>
                      handleSetFundingComplete(
                        selectedProject.id,
                        selectedProject.escrowVault,
                        true
                      )
                    }
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark Funding Complete
                  </button>
                )}

                {escrowFunding && !escrowFunding.refundsEnabled && selectedProject.status < 5 && (
                  <button
                    onClick={() =>
                      handleEnableRefunds(selectedProject.id, selectedProject.escrowVault)
                    }
                    disabled={isProcessing}
                    className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Enable Refunds
                  </button>
                )}

                <a
                  href={getExplorerUrl(selectedProject.escrowVault)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  View Escrow
                </a>

                <a
                  href={getExplorerUrl(selectedProject.securityToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  View Token
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Milestone</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectMilestoneIndex(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectMilestone}
                disabled={!rejectReason || isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Milestone Status</h3>
            <p className="text-sm text-gray-600 mb-4">
              Warning: This is an admin override. Use carefully.
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-3 mb-4"
            >
              <option value={0}>0 - Pending</option>
              <option value={1}>1 - Submitted</option>
              <option value={2}>2 - Approved</option>
              <option value={3}>3 - Rejected</option>
              <option value={4}>4 - Disputed</option>
              <option value={5}>5 - Released</option>
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusMilestoneIndex(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSetMilestoneStatus}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Off-Chain Payments Component
function OffChainPayments({
  projects,
  onRefresh,
}: {
  projects: Project[];
  onRefresh: () => void;
}) {
  const { writeContract, data: txHash, isPending, reset: resetTx } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [investorAddress, setInvestorAddress] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    if (txSuccess) {
      setTimeout(() => {
        setInvestorAddress('');
        setAmountUSD('');
        setPaymentReference('');
        onRefresh();
        resetTx();
      }, 2000);
    }
  }, [txSuccess]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleRecordPayment = () => {
    if (!selectedProject || !investorAddress || !amountUSD || !paymentReference) return;

    // Convert USD amount to 6 decimals
    const amountWithDecimals = BigInt(Math.floor(parseFloat(amountUSD) * 1e6));

    writeContract({
      address: selectedProject.escrowVault as Address,
      abi: escrowAbiV2,
      functionName: 'recordOffChainInvestment',
      args: [
        BigInt(selectedProject.id),
        investorAddress as Address,
        amountWithDecimals,
        paymentReference,
      ],
    });
  };

  const isProcessing = isPending || txLoading;
  const activeProjects = projects.filter((p) => p.status !== 4 && p.status !== 5);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Off-Chain Payment</h2>
        <p className="text-sm text-gray-600 mb-6">
          Use this to record Swipe card payments or other off-chain investments. The investor will
          receive security tokens but no crypto funds will be held in escrow.
        </p>

        {(isPending || txLoading) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-700">
                {isPending ? 'Confirm transaction in wallet...' : 'Recording payment...'}
              </span>
            </div>
          </div>
        )}

        {txSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <span className="text-green-700">Payment recorded successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">Select a project...</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.name} ({formatUSD(p.totalRaised)} / {formatUSD(p.fundingGoal)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Investor Wallet Address
            </label>
            <input
              type="text"
              value={investorAddress}
              onChange={(e) => setInvestorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
            <input
              type="number"
              value={amountUSD}
              onChange={(e) => setAmountUSD(e.target.value)}
              placeholder="1000.00"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Reference
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="SWIPE-12345 or transaction ID"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          <button
            onClick={handleRecordPayment}
            disabled={
              !selectedProjectId || !investorAddress || !amountUSD || !paymentReference || isProcessing
            }
            className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Record Off-Chain Payment'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">Important Notes</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Off-chain payments are tracked separately from on-chain funds</li>
          <li>• Security tokens will be minted to the investor's wallet</li>
          <li>• Fund release for off-chain amounts must be handled manually outside the contract</li>
          <li>• Always verify payment confirmation before recording</li>
        </ul>
      </div>
    </div>
  );
}

// Identity Management Component
function IdentityManagement() {
  const publicClient = usePublicClient({ chainId: polygonAmoy.id });
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [checkAddress, setCheckAddress] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerCountry, setRegisterCountry] = useState('840');

  const handleCheckVerification = async () => {
    if (!publicClient || !checkAddress) return;

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.IdentityRegistry as Address,
        abi: identityRegistryAbi,
        functionName: 'isVerified',
        args: [checkAddress as Address],
      });
      setIsVerified(result);
    } catch (err) {
      console.error('Error checking verification:', err);
      setIsVerified(false);
    }
  };

  const handleRegisterIdentity = () => {
    if (!registerAddress) return;

    writeContract({
      address: CONTRACTS.IdentityRegistry as Address,
      abi: identityRegistryAbi,
      functionName: 'registerIdentity',
      args: [registerAddress as Address, registerAddress as Address, parseInt(registerCountry)],
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity Registry</h2>
        <p className="text-sm text-gray-600 mb-4">
          Contract:{' '}
          <a
            href={getExplorerUrl(CONTRACTS.IdentityRegistry)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-mono"
          >
            {CONTRACTS.IdentityRegistry}
          </a>
        </p>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-medium text-gray-900 mb-3">Check Verification Status</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={checkAddress}
              onChange={(e) => setCheckAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            />
            <button
              onClick={handleCheckVerification}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Check
            </button>
          </div>
          {isVerified !== null && (
            <p className={`mt-3 ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
              {isVerified ? '✓ Address is verified' : '✗ Address is not verified'}
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-medium text-gray-900 mb-3">Register Identity</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={registerAddress}
              onChange={(e) => setRegisterAddress(e.target.value)}
              placeholder="Wallet address to register"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
            <select
              value={registerCountry}
              onChange={(e) => setRegisterCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="840">United States (840)</option>
              <option value="826">United Kingdom (826)</option>
              <option value="276">Germany (276)</option>
              <option value="250">France (250)</option>
              <option value="392">Japan (392)</option>
              <option value="156">China (156)</option>
              <option value="356">India (356)</option>
            </select>
            <button
              onClick={handleRegisterIdentity}
              disabled={!registerAddress || isPending || txLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isPending || txLoading ? 'Processing...' : 'Register Identity'}
            </button>
            {txSuccess && (
              <p className="text-green-600 text-sm">Identity registered successfully!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Factory Settings Component
function FactorySettings() {
  const publicClient = usePublicClient({ chainId: polygonAmoy.id });
  const [settings, setSettings] = useState<{
    identityRegistry: string;
    nativePriceFeed: string;
    maxPriceAge: number;
    stablecoins: string[];
    feeRecipient: string;
    platformFeeBps: number;
    creationFeeBps: number;
    implementations: {
      securityToken: string;
      escrowVault: string;
      compliance: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!publicClient) return;

      try {
        const [
          identityRegistry,
          nativePriceFeed,
          maxPriceAge,
          stablecoins,
          feeRecipient,
          platformFeeBps,
          creationFeeBps,
          implementations,
        ] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'identityRegistry',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'nativePriceFeed',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'maxPriceAge',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'defaultStablecoins',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'feeRecipient',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'platformFeeBps',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'creationFeeBps',
          }),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as Address,
            abi: factoryAbi,
            functionName: 'implementations',
          }),
        ]);

        setSettings({
          identityRegistry: identityRegistry as string,
          nativePriceFeed: nativePriceFeed as string,
          maxPriceAge: Number(maxPriceAge),
          stablecoins: stablecoins as string[],
          feeRecipient: feeRecipient as string,
          platformFeeBps: Number(platformFeeBps),
          creationFeeBps: Number(creationFeeBps),
          implementations: {
            securityToken: (implementations as any).securityToken,
            escrowVault: (implementations as any).escrowVault,
            compliance: (implementations as any).compliance,
          },
        });
      } catch (err) {
        console.error('Error loading factory settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [publicClient]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Factory Configuration</h2>
        <p className="text-sm text-gray-600 mb-6">
          Contract:{' '}
          <a
            href={getExplorerUrl(CONTRACTS.RWALaunchpadFactory)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-mono"
          >
            {CONTRACTS.RWALaunchpadFactory}
          </a>
        </p>

        {settings && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Identity Registry</p>
                <a
                  href={getExplorerUrl(settings.identityRegistry)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-sm break-all"
                >
                  {settings.identityRegistry}
                </a>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Native Price Feed (POL/USD)</p>
                <a
                  href={getExplorerUrl(settings.nativePriceFeed)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-sm break-all"
                >
                  {settings.nativePriceFeed}
                </a>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Max Price Age</p>
                <p className="text-lg font-semibold">{settings.maxPriceAge} seconds</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Fee Recipient</p>
                <a
                  href={getExplorerUrl(settings.feeRecipient)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono text-sm break-all"
                >
                  {settings.feeRecipient}
                </a>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Platform Fee</p>
                <p className="text-lg font-semibold">{settings.platformFeeBps / 100}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Creation Fee</p>
                <p className="text-lg font-semibold">{settings.creationFeeBps / 100}%</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-2">Default Stablecoins</p>
              <div className="space-y-1">
                {settings.stablecoins.map((coin, i) => (
                  <a
                    key={i}
                    href={getExplorerUrl(coin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline font-mono text-sm"
                  >
                    {coin.toLowerCase() === CONTRACTS.USDC.toLowerCase()
                      ? `USDC: ${coin}`
                      : coin.toLowerCase() === CONTRACTS.USDT.toLowerCase()
                      ? `USDT: ${coin}`
                      : coin}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-2">Implementation Contracts</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Token:</span>
                  <a
                    href={getExplorerUrl(settings.implementations.securityToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono"
                  >
                    {settings.implementations.securityToken.slice(0, 10)}...
                    {settings.implementations.securityToken.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Escrow Vault (V2):</span>
                  <a
                    href={getExplorerUrl(settings.implementations.escrowVault)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono"
                  >
                    {settings.implementations.escrowVault.slice(0, 10)}...
                    {settings.implementations.escrowVault.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compliance:</span>
                  <a
                    href={getExplorerUrl(settings.implementations.compliance)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono"
                  >
                    {settings.implementations.compliance.slice(0, 10)}...
                    {settings.implementations.compliance.slice(-8)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
