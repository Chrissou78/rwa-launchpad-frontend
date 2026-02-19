// src/components/project/MilestoneManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, Address } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { RWAEscrowVaultABI } from '@/config/abis';
import { RPC_URL } from '@/config/contracts';

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
});

const MILESTONE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-gray-500/20 text-gray-400' },
  1: { label: 'Submitted', color: 'bg-yellow-500/20 text-yellow-400' },
  2: { label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  3: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
  4: { label: 'Disputed', color: 'bg-orange-500/20 text-orange-400' },
  5: { label: 'Released', color: 'bg-emerald-500/20 text-emerald-400' },
};

interface Milestone {
  description: string;
  percentage: bigint;
  status: number;
  proofURI: string;
  submittedAt: bigint;
  approvedAt: bigint;
  releasedAmount: bigint;
  rejectionReason: string;
  disputeRaiser: string;
  disputeReason: string;
}

interface FundingData {
  totalRaised: bigint;
  totalReleased: bigint;
  fundingComplete: boolean;
  projectOwner: string;
}

interface MilestoneManagerProps {
  projectId: number;
  escrowVault: string;
  isOwner: boolean;
}

export default function MilestoneManager({ projectId, escrowVault, isOwner }: MilestoneManagerProps) {
  const { address } = useAccount();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [fundingData, setFundingData] = useState<FundingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);

  // Form states
  const [newDescription, setNewDescription] = useState('');
  const [newPercentage, setNewPercentage] = useState('');
  const [proofURI, setProofURI] = useState('');

  const { writeContract: addMilestone, data: addHash } = useWriteContract();
  const { writeContract: submitMilestone, data: submitHash } = useWriteContract();

  const { isSuccess: addSuccess, isLoading: addPending } = useWaitForTransactionReceipt({ hash: addHash });
  const { isSuccess: submitSuccess, isLoading: submitPending } = useWaitForTransactionReceipt({ hash: submitHash });

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [milestonesData, funding] = await Promise.all([
        publicClient.readContract({
          address: escrowVault as Address,
          abi: RWAEscrowVaultABI,
          functionName: 'getMilestones',
          args: [BigInt(projectId)],
        }),
        publicClient.readContract({
          address: escrowVault as Address,
          abi: RWAEscrowVaultABI,
          functionName: 'getProjectFunding',
          args: [BigInt(projectId)],
        }),
      ]);

      setMilestones(milestonesData as Milestone[]);
      setFundingData(funding as unknown as FundingData);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escrowVault) {
      loadData();
    }
  }, [escrowVault, projectId]);

  useEffect(() => {
    if (addSuccess || submitSuccess) {
      loadData();
      setShowAddModal(false);
      setShowSubmitModal(false);
      setNewDescription('');
      setNewPercentage('');
      setProofURI('');
    }
  }, [addSuccess, submitSuccess]);

  const handleAddMilestone = () => {
    const percentage = Math.round(parseFloat(newPercentage) * 100); // Convert to basis points
    addMilestone({
      address: escrowVault as Address,
      abi: RWAEscrowVaultABI,
      functionName: 'addMilestone',
      args: [BigInt(projectId), newDescription, BigInt(percentage)],
    });
  };

  const handleSubmitMilestone = () => {
    if (selectedMilestoneIndex === null) return;
    submitMilestone({
      address: escrowVault as Address,
      abi: RWAEscrowVaultABI,
      functionName: 'submitMilestone',
      args: [BigInt(projectId), BigInt(selectedMilestoneIndex), proofURI],
    });
  };

  const openSubmitModal = (index: number) => {
    setSelectedMilestoneIndex(index);
    setProofURI('');
    setShowSubmitModal(true);
  };

  // Calculate total percentage used
  const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.percentage), 0) / 100;
  const remainingPercentage = 100 - totalPercentage;

  const totalRaisedUSD = fundingData ? Number(fundingData.totalRaised) / 1e6 : 0;
  const totalReleasedUSD = fundingData ? Number(fundingData.totalReleased) / 1e6 : 0;

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Milestone Management</h2>
          <p className="text-slate-400 text-sm mt-1">
            Total Raised: ${totalRaisedUSD.toLocaleString()} | Released: ${totalReleasedUSD.toLocaleString()}
          </p>
        </div>
        {isOwner && remainingPercentage > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            + Add Milestone
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Milestones Configured</span>
          <span className="text-white">{totalPercentage}% / 100%</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
        {remainingPercentage > 0 && (
          <p className="text-yellow-400 text-sm mt-2">
            ⚠️ {remainingPercentage}% remaining - add more milestones to reach 100%
          </p>
        )}
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="text-center py-8 bg-slate-700/30 rounded-lg">
          <p className="text-slate-400 mb-2">No milestones configured yet</p>
          {isOwner && (
            <p className="text-slate-500 text-sm">
              Add milestones to define how funds will be released
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-medium">
                      Milestone {index + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${MILESTONE_STATUS[milestone.status]?.color}`}>
                      {MILESTONE_STATUS[milestone.status]?.label}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {Number(milestone.percentage) / 100}%
                    </span>
                  </div>
                  <p className="text-slate-300">{milestone.description}</p>
                </div>

                {/* Actions based on status */}
                {isOwner && milestone.status === 0 && (
                  <button
                    onClick={() => openSubmitModal(index)}
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition"
                  >
                    Submit Proof
                  </button>
                )}
                {isOwner && milestone.status === 3 && (
                  <button
                    onClick={() => openSubmitModal(index)}
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition"
                  >
                    Resubmit
                  </button>
                )}
              </div>

              {/* Proof URI if submitted */}
              {milestone.proofURI && (
                <div className="mt-2 p-2 bg-slate-800 rounded">
                  <p className="text-slate-400 text-xs mb-1">Proof:</p>
                  <a
                    href={milestone.proofURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm break-all"
                  >
                    {milestone.proofURI}
                  </a>
                </div>
              )}

              {/* Rejection reason if rejected */}
              {milestone.status === 3 && milestone.rejectionReason && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="text-red-400 text-sm">
                    <strong>Rejection Reason:</strong> {milestone.rejectionReason}
                  </p>
                </div>
              )}

              {/* Released amount */}
              {milestone.status === 5 && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
                  <p className="text-green-400 text-sm">
                    Released: ${(Number(milestone.releasedAmount) / 1e6).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add Milestone</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Phase 1 - Initial Development"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Percentage (max {remainingPercentage}%)
                </label>
                <input
                  type="number"
                  value={newPercentage}
                  onChange={(e) => setNewPercentage(e.target.value)}
                  placeholder="e.g., 25"
                  max={remainingPercentage}
                  min={1}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-slate-500 text-xs mt-1">
                  This percentage of total raised funds will be released when milestone is approved
                </p>
              </div>

              <button
                onClick={handleAddMilestone}
                disabled={!newDescription || !newPercentage || parseFloat(newPercentage) > remainingPercentage || addPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {addPending ? 'Adding...' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Proof Modal */}
      {showSubmitModal && selectedMilestoneIndex !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Submit Proof - Milestone {selectedMilestoneIndex + 1}
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300">{milestones[selectedMilestoneIndex]?.description}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {Number(milestones[selectedMilestoneIndex]?.percentage) / 100}% of funds
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Proof URI</label>
                <input
                  type="text"
                  value={proofURI}
                  onChange={(e) => setProofURI(e.target.value)}
                  placeholder="https://... or ipfs://..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Link to documentation, report, or evidence of milestone completion
                </p>
              </div>

              <button
                onClick={handleSubmitMilestone}
                disabled={!proofURI || submitPending}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {submitPending ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
