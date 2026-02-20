// src/components/project/MilestoneManager.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { RWAEscrowVaultABI } from '@/config/abis';
import { useChainConfig } from '@/hooks/useChainConfig';

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
  const publicClient = usePublicClient();
  
  // Multichain config
  const {
    chainId,
    chainName,
    isDeployed,
    nativeCurrency,
    explorerUrl,
    getTxUrl,
  } = useChainConfig();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [fundingData, setFundingData] = useState<FundingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);

  // Form states
  const [newDescription, setNewDescription] = useState('');
  const [newPercentage, setNewPercentage] = useState('');
  const [proofURI, setProofURI] = useState('');

  const { writeContract: addMilestone, data: addHash, error: addError } = useWriteContract();
  const { writeContract: submitMilestone, data: submitHash, error: submitError } = useWriteContract();

  const { isSuccess: addSuccess, isLoading: addPending } = useWaitForTransactionReceipt({ hash: addHash });
  const { isSuccess: submitSuccess, isLoading: submitPending } = useWaitForTransactionReceipt({ hash: submitHash });

  // Validate escrow vault address
  const escrowVaultAddress = useMemo(() => {
    if (!escrowVault || escrowVault === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return escrowVault as Address;
  }, [escrowVault]);

  const loadData = async () => {
    if (!publicClient || !escrowVaultAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [milestonesData, funding] = await Promise.all([
        publicClient.readContract({
          address: escrowVaultAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getMilestones',
          args: [BigInt(projectId)],
        }),
        publicClient.readContract({
          address: escrowVaultAddress,
          abi: RWAEscrowVaultABI,
          functionName: 'getProjectFunding',
          args: [BigInt(projectId)],
        }),
      ]);

      setMilestones(milestonesData as Milestone[]);
      setFundingData(funding as unknown as FundingData);
    } catch (err) {
      console.error('Failed to load milestones:', err);
      setError('Failed to load milestone data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when chain or escrow vault changes
  useEffect(() => {
    if (escrowVaultAddress && publicClient) {
      loadData();
    }
  }, [escrowVaultAddress, projectId, chainId, publicClient]);

  // Reload on successful transactions
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
    if (!escrowVaultAddress) return;
    
    const percentage = Math.round(parseFloat(newPercentage) * 100); // Convert to basis points
    addMilestone({
      address: escrowVaultAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'addMilestone',
      args: [BigInt(projectId), newDescription, BigInt(percentage)],
    });
  };

  const handleSubmitMilestone = () => {
    if (selectedMilestoneIndex === null || !escrowVaultAddress) return;
    
    submitMilestone({
      address: escrowVaultAddress,
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

  // Not deployed state
  if (!isDeployed) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Not Available</h3>
          <p className="text-slate-400">
            Milestone management is not available on {chainName || 'this network'}.
          </p>
        </div>
      </div>
    );
  }

  // No escrow vault
  if (!escrowVaultAddress) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <p className="text-slate-400">No escrow vault configured for this project.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            Retry
          </button>
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
          {chainName && (
            <p className="text-slate-500 text-xs mt-1">
              Network: {chainName}
            </p>
          )}
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

      {/* Escrow Contract Link */}
      {explorerUrl && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Escrow Contract</span>
            <a
              href={`${explorerUrl}/address/${escrowVaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              {escrowVaultAddress.slice(0, 6)}...{escrowVaultAddress.slice(-4)}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

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

      {/* Transaction Status */}
      {(addHash || submitHash) && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
          {addHash && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                {addPending ? 'Adding milestone...' : addSuccess ? 'Milestone added!' : 'Transaction pending'}
              </span>
              <a
                href={getTxUrl(addHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View TX
              </a>
            </div>
          )}
          {submitHash && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                {submitPending ? 'Submitting proof...' : submitSuccess ? 'Proof submitted!' : 'Transaction pending'}
              </span>
              <a
                href={getTxUrl(submitHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View TX
              </a>
            </div>
          )}
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

            {/* Network info */}
            {chainName && (
              <div className="mb-4 p-2 bg-slate-700/50 rounded text-center">
                <span className="text-slate-400 text-sm">Network: </span>
                <span className="text-white text-sm">{chainName}</span>
              </div>
            )}

            {addError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">
                  {addError.message || 'Failed to add milestone'}
                </p>
              </div>
            )}

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

            {/* Network info */}
            {chainName && (
              <div className="mb-4 p-2 bg-slate-700/50 rounded text-center">
                <span className="text-slate-400 text-sm">Network: </span>
                <span className="text-white text-sm">{chainName}</span>
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">
                  {submitError.message || 'Failed to submit proof'}
                </p>
              </div>
            )}

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
