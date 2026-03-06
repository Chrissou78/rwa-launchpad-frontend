// src/components/admin/MilestoneAdmin.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
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

interface MilestoneAdminProps {
  projectId: number;
  escrowVault: string;
  onUpdate?: () => void;
}

export default function MilestoneAdmin({ projectId, escrowVault, onUpdate }: MilestoneAdminProps) {
  const publicClient = usePublicClient();
  
  // Multichain config
  const {
    chainId,
    chainName,
    isDeployed,
    explorerUrl,
    getTxUrl,
  } = useChainConfig();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { writeContract: approve, data: approveHash, error: approveError } = useWriteContract();
  const { writeContract: reject, data: rejectHash, error: rejectError } = useWriteContract();
  const { writeContract: release, data: releaseHash, error: releaseError } = useWriteContract();

  const { isSuccess: approveSuccess, isLoading: approvePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: rejectSuccess, isLoading: rejectPending } = useWaitForTransactionReceipt({ hash: rejectHash });
  const { isSuccess: releaseSuccess, isLoading: releasePending } = useWaitForTransactionReceipt({ hash: releaseHash });

  // Validate escrow vault address
  const escrowVaultAddress = useMemo(() => {
    if (!escrowVault || escrowVault === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return escrowVault as Address;
  }, [escrowVault]);

  const loadMilestones = async () => {
    if (!publicClient || !escrowVaultAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await publicClient.readContract({
        address: escrowVaultAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [BigInt(projectId)],
      });
      setMilestones(data as Milestone[]);
    } catch (err) {
      console.error('Failed to load milestones:', err);
      setError('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  // Load milestones when chain or escrow vault changes
  useEffect(() => {
    if (escrowVaultAddress && publicClient) {
      loadMilestones();
    }
  }, [escrowVaultAddress, projectId, chainId, publicClient]);

  // Reload on successful transactions
  useEffect(() => {
    if (approveSuccess || rejectSuccess || releaseSuccess) {
      loadMilestones();
      setShowRejectModal(false);
      setRejectionReason('');
      onUpdate?.();
    }
  }, [approveSuccess, rejectSuccess, releaseSuccess]);

  const handleApprove = (index: number) => {
    if (!escrowVaultAddress) return;
    
    approve({
      address: escrowVaultAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'approveMilestone',
      args: [BigInt(projectId), BigInt(index)],
    });
  };

  const handleReject = () => {
    if (selectedIndex === null || !escrowVaultAddress) return;
    
    reject({
      address: escrowVaultAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'rejectMilestone',
      args: [BigInt(projectId), BigInt(selectedIndex), rejectionReason],
    });
  };

  const handleRelease = (index: number) => {
    if (!escrowVaultAddress) return;
    
    release({
      address: escrowVaultAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'releaseMilestoneFunds',
      args: [BigInt(projectId), BigInt(index)],
    });
  };

  const openRejectModal = (index: number) => {
    setSelectedIndex(index);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Not deployed state
  if (!isDeployed) {
    return (
      <div className="p-4 text-center">
        <div className="text-yellow-400 mb-2">⚠️</div>
        <p className="text-gray-400 text-sm">
          Admin functions not available on {chainName || 'this network'}
        </p>
      </div>
    );
  }

  // No escrow vault
  if (!escrowVaultAddress) {
    return (
      <div className="p-4 text-center text-gray-400">
        No escrow vault configured
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button
          onClick={loadMilestones}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // No milestones
  if (milestones.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No milestones configured for this project
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Network indicator */}
      {chainName && (
        <div className="px-3 py-1.5 bg-gray-700/50 rounded-lg text-center">
          <span className="text-gray-400 text-xs">Network: </span>
          <span className="text-white text-xs">{chainName}</span>
        </div>
      )}

      {/* Escrow contract link */}
      {explorerUrl && (
        <div className="px-3 py-1.5 bg-gray-700/50 rounded-lg flex items-center justify-between">
          <span className="text-gray-400 text-xs">Escrow:</span>
          <a
            href={`${explorerUrl}/address/${escrowVaultAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
          >
            {escrowVaultAddress.slice(0, 6)}...{escrowVaultAddress.slice(-4)}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Transaction status */}
      {(approveHash || rejectHash || releaseHash) && (
        <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          {approveHash && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400">
                {approvePending ? 'Approving...' : approveSuccess ? 'Approved!' : 'Processing...'}
              </span>
              <a href={getTxUrl(approveHash)} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 text-xs">
                View TX
              </a>
            </div>
          )}
          {rejectHash && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400">
                {rejectPending ? 'Rejecting...' : rejectSuccess ? 'Rejected!' : 'Processing...'}
              </span>
              <a href={getTxUrl(rejectHash)} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 text-xs">
                View TX
              </a>
            </div>
          )}
          {releaseHash && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400">
                {releasePending ? 'Releasing...' : releaseSuccess ? 'Released!' : 'Processing...'}
              </span>
              <a href={getTxUrl(releaseHash)} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 text-xs">
                View TX
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error messages */}
      {(approveError || rejectError || releaseError) && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-xs">
            {approveError?.message || rejectError?.message || releaseError?.message || 'Transaction failed'}
          </p>
        </div>
      )}

      {/* Milestones list */}
      {milestones.map((milestone, index) => (
        <div
          key={index}
          className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium">#{index + 1}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${MILESTONE_STATUS[milestone.status]?.color}`}>
                  {MILESTONE_STATUS[milestone.status]?.label}
                </span>
                <span className="text-gray-400 text-sm">
                  {Number(milestone.percentage) / 100}%
                </span>
              </div>
              <p className="text-gray-300 text-sm">{milestone.description}</p>
              
              {milestone.proofURI && (
                <a
                  href={milestone.proofURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
                >
                  View Proof →
                </a>
              )}

              {/* Show rejection reason */}
              {milestone.status === 3 && milestone.rejectionReason && (
                <div className="mt-2 p-2 bg-red-500/10 rounded text-xs">
                  <span className="text-red-400">Rejection: </span>
                  <span className="text-gray-300">{milestone.rejectionReason}</span>
                </div>
              )}

              {/* Show released amount */}
              {milestone.status === 5 && milestone.releasedAmount > 0n && (
                <div className="mt-2 p-2 bg-green-500/10 rounded text-xs">
                  <span className="text-green-400">Released: </span>
                  <span className="text-gray-300">
                    ${(Number(milestone.releasedAmount) / 1e6).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              {/* Submitted: Approve/Reject */}
              {milestone.status === 1 && (
                <>
                  <button
                    onClick={() => handleApprove(index)}
                    disabled={approvePending}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
                  >
                    {approvePending ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => openRejectModal(index)}
                    disabled={rejectPending}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
                  >
                    Reject
                  </button>
                </>
              )}

              {/* Approved: Release */}
              {milestone.status === 2 && (
                <button
                  onClick={() => handleRelease(index)}
                  disabled={releasePending}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
                >
                  {releasePending ? '...' : 'Release Funds'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Reject Modal */}
      {showRejectModal && selectedIndex !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Reject Milestone</h3>

            {/* Network info */}
            {chainName && (
              <div className="mb-4 p-2 bg-gray-700/50 rounded text-center">
                <span className="text-gray-400 text-xs">Network: </span>
                <span className="text-white text-xs">{chainName}</span>
              </div>
            )}

            {/* Milestone info */}
            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-white text-sm font-medium">
                Milestone #{selectedIndex + 1}
              </p>
              <p className="text-gray-400 text-sm">
                {milestones[selectedIndex]?.description}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Reason for Rejection</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                placeholder="Explain why this milestone is being rejected..."
              />
            </div>

            {rejectError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-red-400 text-xs">{rejectError.message}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                {rejectPending ? 'Rejecting...' : 'Reject Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
