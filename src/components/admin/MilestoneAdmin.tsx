// src/components/admin/MilestoneAdmin.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, Address } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { RWAEscrowVaultABI } from '@/config/abis';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
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

interface MilestoneAdminProps {
  projectId: number;
  escrowVault: string;
  onUpdate?: () => void;
}

export default function MilestoneAdmin({ projectId, escrowVault, onUpdate }: MilestoneAdminProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: reject, data: rejectHash } = useWriteContract();
  const { writeContract: release, data: releaseHash } = useWriteContract();

  const { isSuccess: approveSuccess, isLoading: approvePending } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: rejectSuccess, isLoading: rejectPending } = useWaitForTransactionReceipt({ hash: rejectHash });
  const { isSuccess: releaseSuccess, isLoading: releasePending } = useWaitForTransactionReceipt({ hash: releaseHash });

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const data = await publicClient.readContract({
        address: escrowVault as Address,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [BigInt(projectId)],
      });
      setMilestones(data as Milestone[]);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escrowVault) {
      loadMilestones();
    }
  }, [escrowVault, projectId]);

  useEffect(() => {
    if (approveSuccess || rejectSuccess || releaseSuccess) {
      loadMilestones();
      setShowRejectModal(false);
      setRejectionReason('');
      onUpdate?.();
    }
  }, [approveSuccess, rejectSuccess, releaseSuccess]);

  const handleApprove = (index: number) => {
    approve({
      address: escrowVault as Address,
      abi: RWAEscrowVaultABI,
      functionName: 'approveMilestone',
      args: [BigInt(projectId), BigInt(index)],
    });
  };

  const handleReject = () => {
    if (selectedIndex === null) return;
    reject({
      address: escrowVault as Address,
      abi: RWAEscrowVaultABI,
      functionName: 'rejectMilestone',
      args: [BigInt(projectId), BigInt(selectedIndex), rejectionReason],
    });
  };

  const handleRelease = (index: number) => {
    release({
      address: escrowVault as Address,
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

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No milestones configured for this project
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            </div>

            <div className="flex gap-2">
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
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition"
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
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Reject Milestone</h3>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                placeholder="Explain why this milestone is rejected..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason || rejectPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white rounded-lg"
              >
                {rejectPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
