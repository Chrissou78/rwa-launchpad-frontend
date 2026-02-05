'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import Header from '@/components/Header';
import Link from 'next/link';
import { CONTRACTS } from '@/config/contracts';

const PROJECT_NFT = CONTRACTS.RWAProjectNFT;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Status mapping (0-7)
const STATUS_NAMES: Record<number, string> = {
  0: 'Draft',
  1: 'Pending',
  2: 'Active',
  3: 'Funded',
  4: 'In Progress',
  5: 'Completed',
  6: 'Cancelled',
  7: 'Failed',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-500/20 text-gray-400',
  1: 'bg-yellow-500/20 text-yellow-400',
  2: 'bg-blue-500/20 text-blue-400',
  3: 'bg-green-500/20 text-green-400',
  4: 'bg-purple-500/20 text-purple-400',
  5: 'bg-emerald-500/20 text-emerald-400',
  6: 'bg-red-500/20 text-red-400',
  7: 'bg-orange-500/20 text-orange-400',
};

const projectNftAbi = [
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
          { name: 'completedAt', type: 'uint256' },
          { name: 'transferable', type: 'bool' },
        ],
      },
    ],
  },
] as const;

const escrowAbi = [
  {
    name: 'refundsEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalDeposited',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface Project {
  id: number;
  owner: string;
  metadataURI: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  minInvestment: bigint;
  maxInvestment: bigint;
  deadline: number;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: number;
  refundsEnabled?: boolean;
}

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

// Helper to convert IPFS URLs
const convertIPFSUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
  }
  return url;
};

// Format USD from raw value (no decimals for fundingGoal)
const formatUSD = (value: bigint): string => {
  return '$' + Number(value).toLocaleString();
};

// Format USDC (6 decimals)
const formatUSDC = (value: bigint): string => {
  return '$' + (Number(value) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AdminProjectsPage() {
  const { isConnected } = useAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  // Modal states
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  
  // Action states
  const [processing, setProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [result, setResult] = useState<any>(null);

  const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const total = await client.readContract({
        address: PROJECT_NFT as `0x${string}`,
        abi: projectNftAbi,
        functionName: 'totalProjects',
      }) as bigint;

      const projectList: Project[] = [];

      for (let i = 1; i <= Number(total); i++) {
        const data = await client.readContract({
          address: PROJECT_NFT as `0x${string}`,
          abi: projectNftAbi,
          functionName: 'getProject',
          args: [BigInt(i)],
        }) as any;

        let refundsEnabled = false;
        if (data.escrowVault && data.escrowVault !== ZERO_ADDRESS) {
          try {
            refundsEnabled = await client.readContract({
              address: data.escrowVault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'refundsEnabled',
            }) as boolean;
          } catch (e) {
            console.error('Error checking refunds for project', i, e);
          }
        }

        projectList.push({
          id: i,
          owner: data.owner,
          metadataURI: data.metadataURI,
          fundingGoal: data.fundingGoal,
          totalRaised: data.totalRaised,
          minInvestment: data.minInvestment,
          maxInvestment: data.maxInvestment,
          deadline: Number(data.deadline),
          status: Number(data.status),
          securityToken: data.securityToken,
          escrowVault: data.escrowVault,
          createdAt: Number(data.createdAt),
          refundsEnabled,
        });
      }

      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (metadataURI: string) => {
    try {
      const url = convertIPFSUrl(metadataURI);
      const response = await fetch(url);
      const data = await response.json();
      setProjectMetadata(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setProjectMetadata(null);
    }
  };

  const openDetailModal = async (project: Project) => {
    setSelectedProject(project);
    setProjectMetadata(null);
    setShowDetailModal(true);
    setResult(null);
    if (project.metadataURI) {
      await fetchMetadata(project.metadataURI);
    }
  };

  const openCancelModal = (project: Project) => {
    setSelectedProject(project);
    setCancelReason('Project cancelled by admin');
    setShowCancelModal(true);
    setResult(null);
  };

  const openRefundModal = (project: Project) => {
    setSelectedProject(project);
    setShowRefundModal(true);
    setResult(null);
  };

  const handleActivate = async () => {
    if (!selectedProject) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedProject) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          enableRefunds: true,
        }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleEnableRefunds = async () => {
    if (!selectedProject) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  // Filter projects
  const activeStatuses = [0, 1, 2, 3, 4]; // Draft, Pending, Active, Funded, In Progress
  const archivedStatuses = [5, 6, 7]; // Completed, Cancelled, Failed
  
  const activeProjects = projects.filter(p => activeStatuses.includes(p.status));
  const archivedProjects = projects.filter(p => archivedStatuses.includes(p.status));
  const displayedProjects = showArchived ? archivedProjects : activeProjects;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400">Please connect your wallet to access admin features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Project Management</h1>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Back to Admin
          </Link>
        </div>

        {/* Toggle Active/Archived */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              !showArchived 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Active Projects ({activeProjects.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              showArchived 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Archived ({archivedProjects.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading projects...</p>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-xl">
            <p className="text-gray-400">
              {showArchived ? 'No archived projects' : 'No active projects'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Raised</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Goal</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Deadline</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 text-white font-mono">#{project.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                        {STATUS_NAMES[project.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{formatUSDC(project.totalRaised)}</td>
                    <td className="px-6 py-4 text-gray-400">{formatUSD(project.fundingGoal)}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(project.deadline * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {/* View Details button for all */}
                        <button
                          onClick={() => openDetailModal(project)}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition"
                        >
                          View
                        </button>

                        {/* Active projects: Cancel button */}
                        {activeStatuses.includes(project.status) && (
                          <button
                            onClick={() => openCancelModal(project)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Archived with funds: Refund button */}
                        {archivedStatuses.includes(project.status) && 
                         project.totalRaised > 0n && 
                         !project.refundsEnabled && (
                          <button
                            onClick={() => openRefundModal(project)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition"
                          >
                            Enable Refunds
                          </button>
                        )}

                        {/* Show refund status */}
                        {project.refundsEnabled && (
                          <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg">
                            Refunds Enabled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedProject && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-8">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Project #{selectedProject.id}
                  </h2>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedProject.status]}`}>
                    {STATUS_NAMES[selectedProject.status]}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white transition p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Metadata */}
              {projectMetadata ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {projectMetadata.name || 'Unnamed Project'}
                  </h3>
                  {projectMetadata.image && (
                    <img 
                      src={convertIPFSUrl(projectMetadata.image)} 
                      alt={projectMetadata.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  {projectMetadata.description && (
                    <p className="text-gray-400 text-sm mb-4">{projectMetadata.description}</p>
                  )}
                  {projectMetadata.attributes && projectMetadata.attributes.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {projectMetadata.attributes.map((attr, i) => (
                        <div key={i} className="bg-gray-700 rounded-lg p-2">
                          <p className="text-gray-400 text-xs">{attr.trait_type}</p>
                          <p className="text-white text-sm">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedProject.metadataURI ? (
                <div className="mb-6 text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-400 text-sm mt-2">Loading metadata...</p>
                </div>
              ) : null}

              {/* On-chain Data */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Funding Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Funding Goal</p>
                    <p className="text-white text-lg font-bold">{formatUSD(selectedProject.fundingGoal)}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Raised</p>
                    <p className="text-white text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Min Investment</p>
                    <p className="text-white">{formatUSDC(selectedProject.minInvestment)}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Max Investment</p>
                    <p className="text-white">{formatUSDC(selectedProject.maxInvestment)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Deadline</p>
                    <p className="text-white">{new Date(selectedProject.deadline * 1000).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Created</p>
                    <p className="text-white">{new Date(selectedProject.createdAt * 1000).toLocaleString()}</p>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mt-6">Contracts</h4>
                <div className="space-y-2">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Owner</p>
                    <p className="text-white font-mono text-sm break-all">{selectedProject.owner}</p>
                  </div>
                  {selectedProject.securityToken !== ZERO_ADDRESS && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Security Token</p>
                      <a 
                        href={`https://amoy.polygonscan.com/address/${selectedProject.securityToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-mono text-sm break-all hover:underline"
                      >
                        {selectedProject.securityToken}
                      </a>
                    </div>
                  )}
                  {selectedProject.escrowVault !== ZERO_ADDRESS && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Escrow Vault</p>
                      <a 
                        href={`https://amoy.polygonscan.com/address/${selectedProject.escrowVault}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 font-mono text-sm break-all hover:underline"
                      >
                        {selectedProject.escrowVault}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Result message */}
              {result && (
                <div className={`mb-4 rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  {result.success ? (
                    <p className="text-green-400">{result.message || 'Action completed successfully!'}</p>
                  ) : (
                    <p className="text-red-400">{result.error}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Close
                </button>

                {/* Pending: Activate button */}
                {selectedProject.status === 1 && (
                  <button
                    onClick={handleActivate}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {processing ? 'Activating...' : 'Activate Project'}
                  </button>
                )}

                {/* Active statuses: Cancel button */}
                {[0, 1, 2, 3, 4].includes(selectedProject.status) && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openCancelModal(selectedProject);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    Cancel Project
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedProject && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-4">
                Cancel Project #{selectedProject.id}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total Raised</p>
                  <p className="text-white text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Cancellation Reason</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="Enter reason..."
                  />
                </div>

                <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <span className="text-yellow-500">⚠️</span>
                  <div>
                    <p className="text-yellow-400 font-medium">Warning</p>
                    <p className="text-yellow-400/80 text-sm">
                      This will cancel the project and enable refunds for all investors. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {result && (
                  <div className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    {result.success ? (
                      <div>
                        <p className="text-green-400 font-medium">Project Cancelled Successfully!</p>
                        {result.transactions?.map((tx: any, i: number) => (
                          <p key={i} className="text-green-400/60 text-xs mt-1 font-mono">
                            {tx.action}: {tx.hash?.slice(0, 10)}...
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-red-400">{result.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Close
                </button>
                {!result?.success && (
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {processing ? 'Processing...' : 'Confirm Cancel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && selectedProject && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold text-white mb-4">
                Enable Refunds - Project #{selectedProject.id}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total to Refund</p>
                  <p className="text-white text-lg font-bold">{formatUSDC(selectedProject.totalRaised)}</p>
                </div>

                <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <span className="text-blue-500">ℹ️</span>
                  <div>
                    <p className="text-blue-400 font-medium">Information</p>
                    <p className="text-blue-400/80 text-sm">
                      This will enable investors to claim their refunds from the escrow vault.
                    </p>
                  </div>
                </div>

                {result && (
                  <div className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    {result.success ? (
                      <p className="text-green-400 font-medium">Refunds Enabled Successfully!</p>
                    ) : (
                      <p className="text-red-400">{result.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Close
                </button>
                {!result?.success && (
                  <button
                    onClick={handleEnableRefunds}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {processing ? 'Processing...' : 'Enable Refunds'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
