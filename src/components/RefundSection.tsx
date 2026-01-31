'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';

const escrowAbi = parseAbi([
  'function claimRefund(uint256)',
  'function getInvestorDetails(uint256, address) view returns (uint256 amount, uint256 amountUSD, uint256 tokensMinted, bool refunded)',
  'function getProjectFunding(uint256) view returns (tuple(uint256 projectId, uint256 fundingGoal, uint256 totalRaised, uint256 totalReleased, uint256 deadline, address paymentToken, bool fundingComplete, bool refundsEnabled, uint256 currentMilestone, uint256 minInvestment, uint256 maxInvestment, address projectOwner, address securityToken))',
]);

interface RefundSectionProps {
  projectId: number;
  escrowVault: string;
  projectStatus: number; // 4 = Cancelled, 5 = Failed
  investorDetails?: {
    amount: bigint;
    amountUSD: bigint;
    tokensMinted: bigint;
    refunded: boolean;
  };
  refundsEnabled: boolean;
}

export default function RefundSection({
  projectId,
  escrowVault,
  projectStatus,
  investorDetails,
  refundsEnabled,
}: RefundSectionProps) {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const canClaim = 
    isConnected &&
    refundsEnabled &&
    investorDetails &&
    investorDetails.amountUSD > 0n &&
    !investorDetails.refunded;

  const handleClaimRefund = async () => {
    setError(null);

    try {
      writeContract({
        address: escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'claimRefund',
        args: [BigInt(projectId)],
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Don't show if project is not cancelled/failed
  if (projectStatus !== 4 && projectStatus !== 5) {
    return null;
  }

  // Don't show if user has no investment
  if (!investorDetails || investorDetails.amountUSD === 0n) {
    return null;
  }

  const investedAmount = Number(investorDetails.amountUSD) / 1e6;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mt-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-lg font-bold text-red-400">Project Cancelled</h3>
          <p className="text-red-400/80 text-sm">
            This project has been cancelled. You can claim a refund for your investment.
          </p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Your Investment</p>
            <p className="text-white text-xl font-bold">${investedAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Status</p>
            <p className={`text-xl font-bold ${investorDetails.refunded ? 'text-green-400' : 'text-yellow-400'}`}>
              {investorDetails.refunded ? 'Refunded' : 'Pending Claim'}
            </p>
          </div>
        </div>
      </div>

      {investorDetails.refunded ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400 flex items-center gap-2">
            <span>✓</span>
            Your refund has been processed successfully.
          </p>
        </div>
      ) : !refundsEnabled ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-400">
            Refunds are not yet enabled for this project. Please check back later.
          </p>
        </div>
      ) : (
        <>
          {isSuccess ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-medium">Refund Claimed Successfully!</p>
              <p className="text-green-400/80 text-sm mt-1">
                Your funds have been returned to your wallet.
              </p>
              {hash && (
                <a
                  href={`https://amoy.polygonscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400/60 text-xs mt-2 inline-block hover:underline"
                >
                  View transaction →
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handleClaimRefund}
              disabled={!canClaim || isPending || isConfirming}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              {isPending || isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  {isPending ? 'Confirm in Wallet...' : 'Processing...'}
                </span>
              ) : (
                `Claim Refund ($${investedAmount.toLocaleString()})`
              )}
            </button>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
