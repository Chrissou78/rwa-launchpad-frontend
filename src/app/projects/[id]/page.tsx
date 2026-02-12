// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits, formatEther, Address } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';
import Header from '@/components/Header';
import StripeInvestment from '@/components/invest/StripeInvestment';
import { useKYC } from '@/contexts/KYCContext';
import MilestoneManager from '@/components/project/MilestoneManager';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const TOKENS: Record<string, { address: Address; symbol: string; decimals: number }> = {
  USDC: { address: CONTRACTS.USDC as Address, symbol: 'USDC', decimals: 6 },
  USDT: { address: CONTRACTS.USDT as Address, symbol: 'USDT', decimals: 6 },
};

const STATUS_LABELS: Record<number, string> = {
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
  0: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-green-500/20 text-green-400 border-green-500/30',
  4: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  5: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  6: 'bg-red-500/20 text-red-400 border-red-500/30',
  7: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// ============================================================================
// ABIs
// ============================================================================

const RWAProjectNFTABI = [
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: 'project',
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

const EscrowVaultABI = [
  {
    name: 'getProjectFunding',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'projectId', type: 'uint256' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'totalReleased', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'fundingComplete', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'currentMilestone', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'projectOwner', type: 'address' },
          { name: 'securityToken', type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'getInvestorDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'investor', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'amountUSD', type: 'uint256' },
      { name: 'tokensMinted', type: 'uint256' },
      { name: 'refunded', type: 'bool' },
    ],
  },
  {
    name: 'investWithToken',
    type: 'function',
    stateMutability: 'payable', // Changed to payable for transaction fee
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'payable', // Changed to payable for transaction fee
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'transactionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const ERC20ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const RWASecurityTokenABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'identityRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const IdentityRegistryABI = [
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ============================================================================
// TYPES
// ============================================================================

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
}

interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  properties?: {
    category?: string;
    tokenSymbol?: string;
    tokenName?: string;
    investorSharePercent?: number;
    projectedROI?: number;
    roiTimelineMonths?: number;
    platformFeePercent?: number;
  };
  documents?: {
    pitchDeck?: string;
    legalDocs?: string[];
  };
}

interface InvestorDetails {
  deposit: bigint;
  refundsEnabled: boolean;
  tokenBalance: bigint;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatUSD(amount: bigint): string {
  const num = Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatUSDC(amount: bigint): string {
  const num = Number(amount) / 1e6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function convertIPFSUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    if (hash.length >= 46) {
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    return '';
  }
  return url;
}

function isValidIPFSHash(uri: string): boolean {
  if (!uri) return false;
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return hash.length >= 46;
  }
  return uri.startsWith('http');
}

// ============================================================================
// KYC WARNING COMPONENT
// ============================================================================

function KYCWarning() {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <h3 className="text-yellow-400 font-semibold mb-1">KYC Verification Required</h3>
          <p className="text-slate-300 text-sm mb-3">
            Complete KYC verification to invest in this project.
          </p>
          <Link
            href="/kyc"
            className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-medium rounded-lg transition"
          >
            Complete KYC →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INVEST MODAL COMPONENT
// ============================================================================

interface InvestModalProps {
  project: Project;
  projectName: string;
  effectiveMaxInvestment: number;
  onClose: () => void;
  onSuccess: () => void;
  kycRemainingLimit: number;
  kycTier: string;
  transactionFee: bigint;
}

function InvestModal({ 
  project, 
  projectName, 
  effectiveMaxInvestment, 
  onClose, 
  onSuccess, 
  kycRemainingLimit, 
  kycTier,
  transactionFee 
}: InvestModalProps) {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT'>('USDC');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'invest'>('input');
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);

  const token = TOKENS[selectedToken];
  const amountInWei = amount ? parseUnits(amount, token.decimals) : 0n;
  const minInvestment = Number(project.minInvestment);

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: invest, data: investHash } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: investSuccess } = useWaitForTransactionReceipt({ hash: investHash });

  // Load balances and allowance
  useEffect(() => {
    if (!address || !project.escrowVault) return;

    const loadBalances = async () => {
      try {
        console.log('Loading balances for escrow:', project.escrowVault);
        const [bal, allow] = await Promise.all([
          publicClient.readContract({
            address: token.address,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          publicClient.readContract({
            address: token.address,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [address, project.escrowVault as Address],
          }),
        ]);
        console.log('Balance:', bal, 'Allowance:', allow);
        setBalance(bal as bigint);
        setAllowance(allow as bigint);
      } catch (err) {
        console.error('Failed to load balances:', err);
      }
    };

    loadBalances();
  }, [address, selectedToken, token.address, project.escrowVault]);

  // Re-fetch allowance after approval succeeds
  useEffect(() => {
    if (approveSuccess && address && project.escrowVault) {
      const refetchAllowance = async () => {
        try {
          console.log('Refetching allowance after approval...');
          const newAllowance = await publicClient.readContract({
            address: token.address,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [address, project.escrowVault as Address],
          });
          console.log('New allowance after approval:', newAllowance);
          setAllowance(newAllowance as bigint);
          setStep('invest');
        } catch (err) {
          console.error('Failed to refetch allowance:', err);
          setAllowance(amountInWei);
          setStep('invest');
        }
      };
      refetchAllowance();
    }
  }, [approveSuccess, address, token.address, project.escrowVault, amountInWei]);

  // Handle successful investment
  useEffect(() => {
    if (investSuccess) {
      onSuccess();
    }
  }, [investSuccess, onSuccess]);

  const handleApprove = () => {
    console.log('Approving', amountInWei.toString(), 'to escrow:', project.escrowVault);
    setStep('approve');
    approve({
      address: token.address,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [project.escrowVault as Address, amountInWei],
    });
  };

  const handleInvest = () => {
    console.log('Investing with params:', {
      escrowVault: project.escrowVault,
      projectId: project.id.toString(),
      tokenAddress: token.address,
      amountInWei: amountInWei.toString(),
      transactionFee: transactionFee.toString(),
    });
    
    invest({
      address: project.escrowVault as Address,
      abi: EscrowVaultABI,
      functionName: 'investWithToken',
      args: [project.id, token.address, amountInWei],
      value: transactionFee, // Include transaction fee as msg.value
    });
  };

  const needsApproval = allowance < amountInWei;
  const amountNum = Number(amount) || 0;
  const balanceNum = Number(formatUnits(balance, token.decimals));
  
  const isValidAmount =
    amountNum >= minInvestment &&
    amountNum <= effectiveMaxInvestment &&
    amountInWei <= balance;

  const maxUserCanInvest = Math.min(effectiveMaxInvestment, balanceNum);
  const feeInPOL = formatEther(transactionFee);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Invest in {projectName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Payment Token</label>
          <div className="flex gap-2">
            {(['USDC', 'USDT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedToken(t)}
                className={`flex-1 py-2 rounded-lg border ${
                  selectedToken === t
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Investment Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 pr-20 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {selectedToken}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-xs mt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmount(minInvestment.toString())}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-500 rounded text-slate-300 hover:text-white transition"
              >
                Min: ${minInvestment.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => setAmount(effectiveMaxInvestment.toString())}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-500 rounded text-slate-300 hover:text-white transition"
              >
                Max: ${effectiveMaxInvestment.toLocaleString()}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAmount(maxUserCanInvest.toString())}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-green-500 rounded text-slate-300 hover:text-green-400 transition"
              title="Use maximum amount based on your balance"
            >
              Balance: {balanceNum.toLocaleString()}
            </button>
          </div>
        </div>

        {/* Transaction Fee Notice */}
        {transactionFee > 0n && (
          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-purple-400">⛽</span>
                <span className="text-slate-300 text-sm">Transaction Fee</span>
              </div>
              <span className="text-purple-400 font-medium">{feeInPOL} POL</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              This fee is required to process your investment on the blockchain.
            </p>
          </div>
        )}

        {effectiveMaxInvestment < Number(project.maxInvestment) && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              💡 Only ${effectiveMaxInvestment.toLocaleString()} remaining to reach the funding goal.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {step === 'input' && (
            <>
              {needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={!isValidAmount}
                  className="w-full py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold transition"
                >
                  Approve {selectedToken}
                </button>
              ) : (
                <button
                  onClick={handleInvest}
                  disabled={!isValidAmount}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold transition"
                >
                  Invest {amount} {selectedToken}
                  {transactionFee > 0n && (
                    <span className="text-blue-200 text-sm ml-1">(+ {feeInPOL} POL)</span>
                  )}
                </button>
              )}
            </>
          )}

          {step === 'approve' && (
            <div className="text-center py-4">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-300">Approving {selectedToken}...</p>
            </div>
          )}

          {step === 'invest' && (
            <button
              onClick={handleInvest}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              Confirm Investment
              {transactionFee > 0n && (
                <span className="text-blue-200 text-sm ml-1">(+ {feeInPOL} POL)</span>
              )}
            </button>
          )}
        </div>

        {!isValidAmount && amount && (
          <p className="text-red-400 text-sm mt-2 text-center">
            {amountNum < minInvestment
              ? `Minimum investment is $${minInvestment.toLocaleString()}`
              : amountNum > effectiveMaxInvestment
                ? `Maximum investment is $${effectiveMaxInvestment.toLocaleString()}`
                : 'Insufficient balance'}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// REFUND SECTION COMPONENT
// ============================================================================

interface RefundSectionProps {
  project: Project;
  investorDetails: InvestorDetails;
  onRefundSuccess: () => void;
  transactionFee: bigint;
}

function RefundSection({ project, investorDetails, onRefundSuccess, transactionFee }: RefundSectionProps) {
  const { writeContract: claimRefund, data: refundHash } = useWriteContract();
  const { isSuccess: refundSuccess, isLoading: refundPending } = useWaitForTransactionReceipt({
    hash: refundHash,
  });

  useEffect(() => {
    if (refundSuccess) {
      onRefundSuccess();
    }
  }, [refundSuccess, onRefundSuccess]);

  const handleRefund = () => {
    claimRefund({
      address: project.escrowVault as Address,
      abi: EscrowVaultABI,
      functionName: 'claimRefund',
      args: [project.id],
      value: transactionFee, // Include transaction fee
    });
  };

  if (!investorDetails.refundsEnabled || investorDetails.deposit === 0n) {
    return null;
  }

  const feeInPOL = formatEther(transactionFee);

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-red-400 mb-2">Refund Available</h3>
      <p className="text-slate-300 mb-4">
        This project has been cancelled. You can claim a refund of your investment.
      </p>
      {transactionFee > 0n && (
        <p className="text-slate-400 text-sm mb-4">
          Transaction fee: {feeInPOL} POL
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold">
          Your Deposit: {formatUSDC(investorDetails.deposit)}
        </span>
        <button
          onClick={handleRefund}
          disabled={refundPending}
          className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 rounded-lg text-white font-semibold transition"
        >
          {refundPending ? 'Processing...' : `Claim Refund${transactionFee > 0n ? ` (+ ${feeInPOL} POL)` : ''}`}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PROJECT PAGE CONTENT
// ============================================================================

function ProjectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;

  const { address, isConnected } = useAccount();
  const { kycData, tierInfo } = useKYC();

  const [project, setProject] = useState<Project | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ name: string; symbol: string } | null>(null);
  const [investorDetails, setInvestorDetails] = useState<InvestorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'card' | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pendingInvestment, setPendingInvestment] = useState<number>(0);
  const [transactionFee, setTransactionFee] = useState<bigint>(0n);

  const isOwner = project?.owner.toLowerCase() === address?.toLowerCase();

  // Handle payment redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setPaymentSuccess(true);
      window.history.replaceState({}, '', `/projects/${projectId}`);
      setTimeout(() => setPaymentSuccess(false), 10000);
    }
  }, [searchParams, projectId]);

  const loadData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const projectData = (await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as Address,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      })) as Project;

      setProject(projectData);
      setPendingInvestment(0);

      const isCancelledOrFailed = projectData.status === 6 || projectData.status === 7;

      // Load transaction fee from escrow vault
      if (projectData.escrowVault && projectData.escrowVault !== ZERO_ADDRESS) {
        try {
          const fee = await publicClient.readContract({
            address: projectData.escrowVault as Address,
            abi: EscrowVaultABI,
            functionName: 'transactionFee',
          });
          setTransactionFee(fee as bigint);
          console.log('Transaction fee:', formatEther(fee as bigint), 'POL');
        } catch (e) {
          console.error('Failed to load transaction fee:', e);
          setTransactionFee(0n);
        }
      }

      if (!isCancelledOrFailed && projectData.metadataURI && isValidIPFSHash(projectData.metadataURI)) {
        try {
          const metadataUrl = convertIPFSUrl(projectData.metadataURI);
          if (metadataUrl) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(metadataUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              setMetadata(data);
            }
          }
        } catch (e) {
          // Silent fail
        }
      }

      if (
        !isCancelledOrFailed &&
        projectData.securityToken &&
        projectData.securityToken !== ZERO_ADDRESS
      ) {
        try {
          const [name, symbol] = await Promise.all([
            publicClient.readContract({
              address: projectData.securityToken as Address,
              abi: RWASecurityTokenABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: projectData.securityToken as Address,
              abi: RWASecurityTokenABI,
              functionName: 'symbol',
            }),
          ]);
          setTokenInfo({ name: name as string, symbol: symbol as string });
        } catch (e) {
          // Silent fail
        }
      }

      if (projectData.escrowVault && projectData.escrowVault !== ZERO_ADDRESS && address) {
        try {
          const [fundingData, investorData] = await Promise.all([
            publicClient.readContract({
              address: projectData.escrowVault as Address,
              abi: EscrowVaultABI,
              functionName: 'getProjectFunding',
              args: [BigInt(projectId)],
            }),
            publicClient.readContract({
              address: projectData.escrowVault as Address,
              abi: EscrowVaultABI,
              functionName: 'getInvestorDetails',
              args: [BigInt(projectId), address],
            }),
          ]);

          const funding = fundingData as {
            projectId: bigint;
            fundingGoal: bigint;
            totalRaised: bigint;
            totalReleased: bigint;
            deadline: bigint;
            paymentToken: string;
            fundingComplete: boolean;
            refundsEnabled: boolean;
            currentMilestone: bigint;
            minInvestment: bigint;
            maxInvestment: bigint;
            projectOwner: string;
            securityToken: string;
          };

          const [amount, amountUSD, tokensMinted, refunded] = investorData as [bigint, bigint, bigint, boolean];

          let tokenBalance = 0n;
          if (projectData.securityToken && projectData.securityToken !== ZERO_ADDRESS) {
            try {
              tokenBalance = (await publicClient.readContract({
                address: projectData.securityToken as Address,
                abi: RWASecurityTokenABI,
                functionName: 'balanceOf',
                args: [address],
              })) as bigint;
            } catch (e) {
              // Silent fail
            }
          }

          setInvestorDetails({
            deposit: amountUSD,
            refundsEnabled: funding.refundsEnabled,
            tokenBalance,
          });
        } catch (e) {
          // Silent fail
        }
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, address]);

  useEffect(() => {
    if (paymentSuccess) {
      loadData();
    }
  }, [paymentSuccess]);

  const projectName = metadata?.name || tokenInfo?.name || `Project #${projectId}`;
  const description = metadata?.description || 'No description available.';
  const imageUrl = metadata?.image ? convertIPFSUrl(metadata.image) : null;

  const fundingGoalUSD = project ? Number(project.fundingGoal) : 0;
  const onChainRaisedUSD = project ? Number(project.totalRaised) / 1e6 : 0;
  const totalRaisedUSD = onChainRaisedUSD + pendingInvestment;
  const remainingCapacity = Math.max(0, fundingGoalUSD - totalRaisedUSD);
  
  const kycRemainingLimit = kycData.tier === 'Diamond' ? Infinity : kycData.remainingLimit;
  const effectiveMaxInvestment = project 
    ? Math.min(Number(project.maxInvestment), remainingCapacity, kycRemainingLimit) 
    : 0;
  const progress = fundingGoalUSD > 0 ? Math.min((totalRaisedUSD / fundingGoalUSD) * 100, 100) : 0;

  const deadlineDate = project ? new Date(Number(project.deadline) * 1000) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isCancelled = project?.status === 6;
  const isFailed = project?.status === 7;
  
  const isKYCVerified = kycData.status === 'Approved' && kycData.tier !== 'None';
  const kycLoading = kycData.isLoading;
  
  const canInvest = project?.status === 2 && !isExpired && remainingCapacity > 0 && isKYCVerified && kycRemainingLimit > 0;
  const showKYCWarning = !kycLoading && !isKYCVerified && isConnected && project?.status === 2 && !isExpired && remainingCapacity > 0;

  const tokenPrice = 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-slate-400 mb-6">{error || 'This project does not exist.'}</p>
          <Link href="/projects" className="text-blue-400 hover:text-blue-300 transition">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      {/* Payment Success Banner */}
      {paymentSuccess && (
        <div className="bg-green-500/20 border-b border-green-500/30">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="text-green-400 font-semibold">Payment Successful!</p>
              <p className="text-green-300 text-sm">
                Your investment is being processed. Tokens will be minted once the payment is confirmed.
              </p>
            </div>
            <button
              onClick={() => setPaymentSuccess(false)}
              className="text-green-400 hover:text-green-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative">
        {imageUrl ? (
          <div
            className="h-64 md:h-80 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          </div>
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  STATUS_COLORS[project.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}
              >
                {STATUS_LABELS[project.status] || 'Unknown'}
              </span>
              {tokenInfo && (
                <span className="px-3 py-1 bg-slate-700/80 rounded-full text-sm text-slate-300">
                  ${tokenInfo.symbol}
                </span>
              )}
              {metadata?.properties?.category && (
                <span className="px-3 py-1 bg-slate-700/80 rounded-full text-sm text-slate-300">
                  {metadata.properties.category}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{projectName}</h1>
          </div>
        </div>
      </div>

      {/* Cancelled/Failed Banner */}
      {(isCancelled || isFailed) && (
        <div
          className={`${isCancelled ? 'bg-red-500/20 border-red-500/30' : 'bg-orange-500/20 border-orange-500/30'} border-y`}
        >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <p className={`${isCancelled ? 'text-red-400' : 'text-orange-400'} font-semibold`}>
              {isCancelled
                ? 'This project has been cancelled. Investors can claim refunds below.'
                : 'This project has failed to reach its funding goal.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">About</h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{description}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Investment Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Minimum Investment</p>
                  <p className="text-white text-lg font-semibold">{formatUSD(project.minInvestment)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Maximum Investment</p>
                  <p className="text-white text-lg font-semibold">{formatUSD(project.maxInvestment)}</p>
                </div>
                {metadata?.properties?.projectedROI && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Projected ROI</p>
                    <p className="text-green-400 text-lg font-semibold">
                      {metadata.properties.projectedROI}%
                    </p>
                  </div>
                )}
                {metadata?.properties?.roiTimelineMonths && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">ROI Timeline</p>
                    <p className="text-white text-lg font-semibold">
                      {metadata.properties.roiTimelineMonths} months
                    </p>
                  </div>
                )}
                {/* Transaction Fee Info */}
                {transactionFee > 0n && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Transaction Fee</p>
                    <p className="text-purple-400 text-lg font-semibold">
                      {formatEther(transactionFee)} POL
                    </p>
                  </div>
                )}
              </div>
            </div>

            {metadata?.documents && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">Documents</h2>
                <div className="space-y-3">
                  {metadata.documents.pitchDeck && (
                    <a
                      href={convertIPFSUrl(metadata.documents.pitchDeck)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                    >
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-white font-medium">Pitch Deck</p>
                        <p className="text-slate-400 text-sm">View presentation</p>
                      </div>
                    </a>
                  )}
                  {metadata.documents.legalDocs?.map((doc, i) => (
                    <a
                      key={i}
                      href={convertIPFSUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition"
                    >
                      <span className="text-2xl">📑</span>
                      <div>
                        <p className="text-white font-medium">Legal Document {i + 1}</p>
                        <p className="text-slate-400 text-sm">View document</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Smart Contracts</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400">Project NFT</span>
                  <a
                    href={`${EXPLORER_URL}/address/${CONTRACTS.RWAProjectNFT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-mono"
                  >
                    {CONTRACTS.RWAProjectNFT.slice(0, 8)}...{CONTRACTS.RWAProjectNFT.slice(-6)}
                  </a>
                </div>
                {project.securityToken && project.securityToken !== ZERO_ADDRESS && (
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">Security Token</span>
                    <a
                      href={`${EXPLORER_URL}/address/${project.securityToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-mono"
                    >
                      {project.securityToken.slice(0, 8)}...{project.securityToken.slice(-6)}
                    </a>
                  </div>
                )}
                {project.escrowVault && project.escrowVault !== ZERO_ADDRESS && (
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">Escrow Vault</span>
                    <a
                      href={`${EXPLORER_URL}/address/${project.escrowVault}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-mono"
                    >
                      {project.escrowVault.slice(0, 8)}...{project.escrowVault.slice(-6)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {investorDetails && (
              <RefundSection
                project={project}
                investorDetails={investorDetails}
                onRefundSuccess={loadData}
                transactionFee={transactionFee}
              />
            )}
            {project && (project.status === 3 || project.status === 4 || project.status === 5) && (
              <MilestoneManager
                projectId={Number(projectId)}
                escrowVault={project.escrowVault}
                isOwner={isOwner}
              />
            )}
          </div>

          {/* Right Column - Investment Card */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 sticky top-6">
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-slate-400 text-sm">Raised</p>
                    <p className="text-2xl font-bold text-white">
                      ${totalRaisedUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {pendingInvestment > 0 && (
                        <span className="text-sm text-green-400 ml-2">(updating...)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Goal</p>
                    <p className="text-lg font-semibold text-slate-300">{formatUSD(project.fundingGoal)}</p>
                  </div>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-2">{progress.toFixed(1)}% funded</p>
              </div>

              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
                <div className="flex-1">
                  <p className="text-slate-400 text-sm">Time Remaining</p>
                  <p className="text-white font-semibold">
                    {isExpired ? <span className="text-red-400">Ended</span> : `${daysLeft} days left`}
                  </p>
                </div>
                {deadlineDate && (
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Deadline</p>
                    <p className="text-white">
                      {deadlineDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {investorDetails && investorDetails.deposit > 0n && (
                <div className="mb-6 pb-6 border-b border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">Your Investment</p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-400 text-xl font-bold">
                      {formatUSDC(investorDetails.deposit)}
                    </p>
                    {investorDetails.tokenBalance > 0n && (
                      <p className="text-slate-400 text-sm mt-1">
                        {formatUnits(investorDetails.tokenBalance, 18)} tokens
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* KYC Warning */}
              {showKYCWarning && <KYCWarning />}

              {/* KYC Limit Info */}
              {isKYCVerified && isConnected && (
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      {tierInfo.icon} {tierInfo.label} Tier
                    </span>
                    <span className="text-slate-300">
                      {kycData.tier === 'Diamond' ? (
                        <span className="text-cyan-400">∞ Unlimited</span>
                      ) : (
                        `$${kycRemainingLimit.toLocaleString()} remaining`
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Transaction Fee Notice */}
              {transactionFee > 0n && canInvest && isConnected && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-purple-400">⛽</span>
                    <span className="text-slate-300">
                      Transaction fee: <span className="text-purple-400 font-medium">{formatEther(transactionFee)} POL</span>
                    </span>
                  </div>
                </div>
              )}

              {canInvest && isConnected && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm text-center">Choose payment method</p>

                  {!paymentMethod && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('crypto')}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-blue-500 transition"
                      >
                        <span className="text-2xl">💎</span>
                        <span className="text-white font-medium">Crypto</span>
                        <span className="text-slate-400 text-xs">USDC / USDT</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-purple-500 transition"
                      >
                        <span className="text-2xl">💳</span>
                        <span className="text-white font-medium">Card</span>
                        <span className="text-slate-400 text-xs">Visa / Mastercard</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'crypto' && (
                    <>
                      <button
                        onClick={() => setShowInvestModal(true)}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold transition"
                      >
                        Invest with Crypto
                      </button>
                      <button
                        onClick={() => setPaymentMethod(null)}
                        className="w-full text-slate-400 hover:text-white text-sm transition"
                      >
                        ← Choose different method
                      </button>
                    </>
                  )}

                  {paymentMethod === 'card' && (
                    <StripeInvestment
                      projectId={Number(projectId)}
                      projectName={projectName}
                      minInvestment={Number(project.minInvestment)}
                      maxInvestment={effectiveMaxInvestment}
                      tokenPrice={tokenPrice}
                      onSuccess={(amountInvested) => {
                        setPendingInvestment(prev => prev + amountInvested);
                        setPaymentMethod(null);
                        
                        const expectedTotal = totalRaisedUSD + amountInvested;
                        
                        const pollBlockchain = async () => {
                          let attempts = 0;
                          const maxAttempts = 30;
                          
                          const checkTotal = async () => {
                            attempts++;
                            try {
                              const projectData = await publicClient.readContract({
                                address: CONTRACTS.RWAProjectNFT as `0x${string}`,
                                abi: RWAProjectNFTABI,
                                functionName: 'getProject',
                                args: [BigInt(projectId)],
                              }) as Project;
                              
                              const onChainTotal = Number(projectData.totalRaised) / 1e6;
                              
                              if (onChainTotal >= expectedTotal || attempts >= maxAttempts) {
                                setPendingInvestment(0);
                                await loadData();
                              } else {
                                setTimeout(checkTotal, 1000);
                              }
                            } catch (error) {
                              console.error('Polling error:', error);
                              if (attempts >= maxAttempts) {
                                setPendingInvestment(0);
                                await loadData();
                              } else {
                                setTimeout(checkTotal, 1000);
                              }
                            }
                          };
                          
                          setTimeout(checkTotal, 2000);
                        };
                        
                        pollBlockchain();
                      }}
                      onCancel={() => setPaymentMethod(null)}
                    />
                  )}
                </div>
              )}

              {!isConnected && project?.status === 2 && !isExpired && remainingCapacity > 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-400 mb-4">Connect your wallet to invest</p>
                </div>
              )}

              {!canInvest && !isCancelled && !isFailed && !showKYCWarning && (
                <div className="text-center py-4">
                  <p className="text-slate-400">
                    {isExpired ? 'This funding round has ended' : 'Investment not available'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Project Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Project ID</span>
                  <span className="text-white">#{projectId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">
                    {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner</span>
                  <a
                    href={`${EXPLORER_URL}/address/${project.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                  </a>
                </div>
                {metadata?.external_url && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Website</span>
                    <a
                      href={metadata.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Visit →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInvestModal && (
        <InvestModal
          project={project}
          projectName={projectName}
          effectiveMaxInvestment={effectiveMaxInvestment}
          kycRemainingLimit={kycRemainingLimit}
          kycTier={kycData.tier}
          transactionFee={transactionFee}
          onClose={() => setShowInvestModal(false)}
          onSuccess={() => {
            setShowInvestModal(false);
            setPaymentMethod(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900">
          <Header />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
