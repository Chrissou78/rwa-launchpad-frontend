'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';
import Header from '@/components/Header';
import Link from 'next/link';

const PROJECT_NFT = '0x4497e4EA43C1A1Cd2B719fF0E4cea376364c1315';
const STATUS_NAMES = ['Pending', 'Active', 'Funded', 'Completed', 'Cancelled', 'Failed'];
const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-500/20 text-gray-400',
  1: 'bg-blue-500/20 text-blue-400',
  2: 'bg-green-500/20 text-green-400',
  3: 'bg-purple-500/20 text-purple-400',
  4: 'bg-red-500/20 text-red-400',
  5: 'bg-orange-500/20 text-orange-400',
};

const projectNftAbi = parseAbi([
  'function totalProjects() view returns (uint256)',
  'function getProject(uint256) view returns (tuple(uint256 id, address owner, string metadataURI, uint256 fundingGoal, uint256 totalRaised, uint256 minInvestment, uint256 maxInvestment, uint256 deadline, uint8 status, address securityToken, address escrowVault, uint256 createdAt, uint256 completedAt, bool transferable))',
]);

interface Project {
  id: number;
  owner: string;
  fundingGoal: number;
  totalRaised: number;
  status: number;
  escrowVault: string;
  deadline: number;
}

export default function AdminProjectsPage() {
  const { isConnected } = useAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const client = createPublicClient({
        chain: polygonAmoy,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
      });

      const total = await client.readContract({
        address: PROJECT_NFT,
        abi: projectNftAbi,
        functionName: 'totalProjects',
      }) as bigint;

      const projectList: Project[] = [];

      for (let i = 1; i <= Number(total); i++) {
        const data = await client.readContract({
          address: PROJECT_NFT,
          abi: projectNftAbi,
          functionName: 'getProject',
          args: [BigInt(i)],
        }) as any;

        projectList.push({
          id: i,
          owner: data.owner,
          fundingGoal: Number(data.fundingGoal) / 1e6,
          totalRaised: Number(data.totalRaised) / 1e6,
          status: Number(data.status),
          escrowVault: data.escrowVault,
          deadline: Number(data.deadline),
        });
      }

      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (project: Project) => {
    setSelectedProject(project);
    setCancelReason('Project cancelled by admin');
    setShowCancelModal(true);
    setResult(null);
  };

  const handleCancel = async () => {
    if (!selectedProject) return;

    setCancellingId(selectedProject.id);
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
        // Refresh projects list
        await fetchProjects();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setCancellingId(null);
    }
  };

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

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading projects...</p>
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
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 text-white font-mono">#{project.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                        {STATUS_NAMES[project.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">${project.totalRaised.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-400">${project.fundingGoal.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(project.deadline * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {project.status !== 4 && project.status !== 3 ? (
                        <button
                          onClick={() => openCancelModal(project)}
                          disabled={cancellingId === project.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
                        >
                          {cancellingId === project.id ? 'Cancelling...' : 'Cancel & Refund'}
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {project.status === 4 ? 'Cancelled' : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <p className="text-white text-lg font-bold">
                    ${selectedProject.totalRaised.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Cancellation Reason
                  </label>
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
                      This will cancel the project and enable refunds for all investors.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {result && (
                  <div className={`rounded-lg p-4 ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    {result.success ? (
                      <div>
                        <p className="text-green-400 font-medium">Project Cancelled Successfully!</p>
                        <p className="text-green-400/80 text-sm mt-1">
                          {result.refundsEnabled 
                            ? 'Refunds have been enabled. Investors can now claim their funds.'
                            : result.refundReason}
                        </p>
                        {result.transactions?.map((tx: any, i: number) => (
                          <p key={i} className="text-green-400/60 text-xs mt-1 font-mono">
                            {tx.action}: {tx.hash.slice(0, 10)}...
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
                    disabled={cancellingId !== null}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {cancellingId !== null ? 'Processing...' : 'Confirm Cancel'}
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
