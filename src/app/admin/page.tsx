// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, formatEther, parseEther, isAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const OFFCHAIN_PAYMENT = '0x0000000000000000000000000000000000000001';

// ABIs
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
    name: 'getProjectFunding',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
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
    name: 'transactionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'collectedTransactionFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getMilestones',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
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
    name: 'getProjectTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getTokenBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_token', type: 'address' },
    ],
    outputs: [
      { name: 'deposited', type: 'uint256' },
      { name: 'released', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
  {
    name: 'enableRefunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'approveMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'rejectMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
      { name: '_reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'releaseMilestoneFunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }, { name: '_milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setMilestoneStatus',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
      { name: '_status', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'recordOffChainInvestment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_investor', type: 'address' },
      { name: '_amountUSD', type: 'uint256' },
      { name: '_paymentReference', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'setFundingComplete',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_complete', type: 'bool' },
    ],
    outputs: [],
  },
] as const;


const kycManagerAbi = [
  {
    name: 'getKYCStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'pending', type: 'uint256' },
      { name: 'approved', type: 'uint256' },
      { name: 'rejected', type: 'uint256' },
    ],
  },
] as const;

const getTokenSymbol = (address: string): string => {
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS) return 'POL';
  if (lower === OFFCHAIN_PAYMENT) return 'OFF-CHAIN';
  if (lower === CONTRACTS.USDC.toLowerCase()) return 'USDC';
  if (lower === CONTRACTS.USDT.toLowerCase()) return 'USDT';
  return 'TOKEN';
};

const getTokenDecimals = (address: string): number => {
  const lower = address.toLowerCase();
  if (lower === ZERO_ADDRESS) return 18; // POL
  return 6; // USDC, USDT, OFF-CHAIN
};

const formatTokenAmount = (amount: bigint, tokenAddress: string): string => {
  const decimals = getTokenDecimals(tokenAddress);
  const value = Number(amount) / Math.pow(10, decimals);
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${getTokenSymbol(tokenAddress)}`;
};

const IdentityRegistryABI = [
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'registerIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'userAddress', type: 'address' },
      { name: 'identityContract', type: 'address' },
      { name: 'country', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;

const RWALaunchpadFactoryABI = [
  {
    name: 'identityRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setIdentityRegistry',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newRegistry_', type: 'address' }],
    outputs: [],
  },
  {
    name: 'nativePriceFeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'defaultStablecoins',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const;

const RWASecurityTokenABI = [
  {
    name: 'identityRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Status mappings
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
  0: 'bg-gray-500',
  1: 'bg-yellow-500',
  2: 'bg-green-500',
  3: 'bg-blue-500',
  4: 'bg-purple-500',
  5: 'bg-emerald-500',
  6: 'bg-red-500',
  7: 'bg-red-700',
};

// FIXED: Correct milestone status mapping matching contract enum
const MILESTONE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'bg-gray-500' },
  1: { label: 'Submitted', color: 'bg-yellow-500' },
  2: { label: 'Approved', color: 'bg-green-500' },
  3: { label: 'Rejected', color: 'bg-red-500' },
  4: { label: 'Disputed', color: 'bg-orange-500' },
  5: { label: 'Released', color: 'bg-blue-500' },
};

type AdminTab = 'overview' | 'projects' | 'offchain' | 'kyc' | 'identity' | 'factory' | 'settings';


interface Project {
  id: number;
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
  name?: string;
  refundsEnabled?: boolean;
}

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

interface TokenBalance {
  token: string;
  symbol: string;
  deposited: bigint;
  released: bigint;
  available: bigint;
}

interface VaultSettings {
  address: string;
  transactionFee: bigint;
  collectedFees: bigint;
  feeRecipient: string;
  error?: string;
}

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology'),
});

// Helper functions
const formatUSD = (amount: bigint): string => {
  const value = Number(amount) / 1e6;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const convertIPFSUrl = (url: string): string => {
  if (url?.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
};

const getExplorerUrl = (address: string, type: 'address' | 'tx' = 'address') => {
  return `${EXPLORER_URL}/${type}/${address}`;
};

// ==================== OFF-CHAIN PAYMENTS COMPONENT ====================
function OffChainPayments({ projects, onRefresh }: { projects: Project[]; onRefresh: () => void }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [investorAddress, setInvestorAddress] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Off-chain payment recorded successfully!' });
      setInvestorAddress('');
      setAmountUSD('');
      setPaymentReference('');
      onRefresh();
      resetTx();
    }
  }, [txSuccess, onRefresh, resetTx]);

  const activeProjects = projects.filter(p => p.status !== 6 && p.status !== 7 && p.escrowVault !== ZERO_ADDRESS);

  const handleRecordPayment = async () => {
    if (!selectedProject || !investorAddress || !amountUSD || !paymentReference) return;
    if (!isAddress(investorAddress)) {
      setResult({ success: false, message: 'Invalid investor address' });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // Convert USD amount to 6 decimals
      const amountWithDecimals = BigInt(Math.floor(parseFloat(amountUSD) * 1e6));

      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'recordOffChainInvestment',
        args: [
          BigInt(selectedProject.id),
          investorAddress as `0x${string}`,
          amountWithDecimals,
          paymentReference,
        ],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to record payment' });
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Off-Chain Payments</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Record Swipe / Card Payment</h3>
        <p className="text-gray-400 text-sm mb-6">
          Record off-chain payments (Swipe, card, wire transfer). The investor will receive security tokens but funds are managed externally.
        </p>

        {(processing || txLoading) && (
          <div className="p-4 rounded-lg bg-blue-900/50 text-blue-400 mb-4">
            Processing transaction... Please confirm in your wallet.
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg mb-4 ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {result.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Select Project</label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = activeProjects.find(p => p.id === Number(e.target.value));
                setSelectedProject(project || null);
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select a project...</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.name} ({formatUSD(p.totalRaised)} / {formatUSD(p.fundingGoal)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Investor Wallet Address</label>
            <input
              type="text"
              value={investorAddress}
              onChange={(e) => setInvestorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            {investorAddress && !isAddress(investorAddress) && (
              <p className="text-red-400 text-sm mt-1">Invalid address format</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount (USD)</label>
            <input
              type="number"
              value={amountUSD}
              onChange={(e) => setAmountUSD(e.target.value)}
              placeholder="1000.00"
              min="0"
              step="0.01"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Payment Reference</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="SWIPE-12345 or transaction ID"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          <button
            onClick={handleRecordPayment}
            disabled={!selectedProject || !investorAddress || !isAddress(investorAddress) || !amountUSD || !paymentReference || processing || txLoading}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
          >
            {processing || txLoading ? 'Processing...' : 'Record Off-Chain Payment'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
        <h4 className="text-yellow-400 font-medium mb-2">Important Notes</h4>
        <ul className="text-yellow-200/80 text-sm space-y-1">
          <li>• Off-chain payments are tracked separately from on-chain funds</li>
          <li>• Security tokens will be minted to the investor&apos;s wallet</li>
          <li>• Fund release for off-chain amounts must be handled manually</li>
          <li>• Always verify payment confirmation before recording</li>
        </ul>
      </div>
    </div>
  );
}

// ==================== OVERVIEW COMPONENT ====================
function AdminOverview({ 
  projects, 
  kycStats, 
  setActiveTab 
}: { 
  projects: Project[]; 
  kycStats: { total: number; pending: number; approved: number; rejected: number };
  setActiveTab: (tab: AdminTab) => void;
}) {
  const activeProjects = projects.filter(p => p.status === 2).length;
  const fundedProjects = projects.filter(p => p.status >= 3 && p.status <= 5).length;
  const totalRaised = projects.reduce((sum, p) => sum + p.totalRaised, 0n);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <p className="text-gray-400 text-sm">Total Projects</p>
          <p className="text-3xl font-bold text-white">{projects.length}</p>
          <p className="text-sm text-green-400">{activeProjects} active</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('projects')}
        >
          <p className="text-gray-400 text-sm">Funded Projects</p>
          <p className="text-3xl font-bold text-white">{fundedProjects}</p>
          <p className="text-sm text-blue-400">In progress or completed</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('kyc')}
        >
          <p className="text-gray-400 text-sm">KYC Submissions</p>
          <p className="text-3xl font-bold text-white">{kycStats.total}</p>
          <p className="text-sm text-yellow-400">{kycStats.pending} pending</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Total Raised</p>
          <p className="text-3xl font-bold text-white">{formatUSD(totalRaised)}</p>
          <p className="text-sm text-purple-400">Across all projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('settings')}
        >
          <h3 className="text-lg font-semibold text-white mb-2">Platform Settings</h3>
          <p className="text-gray-400 text-sm">Configure transaction fees, fee recipient, and withdraw collected fees.</p>
          <p className="text-blue-400 text-sm mt-2">Click to manage →</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setActiveTab('identity')}
        >
          <h3 className="text-lg font-semibold text-white mb-2">Identity Management</h3>
          <p className="text-gray-400 text-sm">Register identities for verified KYC users on project identity registries.</p>
          <p className="text-blue-400 text-sm mt-2">Click to manage →</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
        <div className="space-y-3">
          {projects.slice(0, 5).map(project => (
            <div key={project.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">{project.name || `Project #${project.id}`}</p>
                <p className="text-gray-400 text-sm">{formatUSD(project.totalRaised)} raised</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[project.status]}`}>
                {STATUS_NAMES[project.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== PROJECT MANAGEMENT COMPONENT ====================
function ProjectManagement({ projects, onRefresh }: { projects: Project[]; onRefresh: () => void }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);
  const [escrowFunding, setEscrowFunding] = useState<any>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMilestoneIndex, setStatusMilestoneIndex] = useState<number | null>(null);
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<number>(0);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess && selectedProject) {
      setProcessing(false);
      setResult({ success: true, message: 'Transaction confirmed!' });
      setTimeout(() => {
        loadMilestones();
        loadEscrowFunding();
        onRefresh();
      }, 2000);
      resetTx();
    }
  }, [txSuccess]);

  const loadMilestones = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    
    setMilestonesLoading(true);
    try {
      const data = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'getMilestones',
        args: [BigInt(selectedProject.id)],
      });
      setMilestones(data as Milestone[]);
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, [selectedProject]);

  const loadEscrowFunding = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    
    try {
      const data = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'getProjectFunding',
        args: [BigInt(selectedProject.id)],
      });
      setEscrowFunding(data);
    } catch (error) {
      console.error('Error loading escrow funding:', error);
      setEscrowFunding(null);
    }
  }, [selectedProject]);

  const loadTokenBalances = useCallback(async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    
    try {
      const tokens = await publicClient.readContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'getProjectTokens',
        args: [BigInt(selectedProject.id)],
      });
      
      const balances: TokenBalance[] = [];
      for (const token of tokens as string[]) {
        try {
          const balance = await publicClient.readContract({
            address: selectedProject.escrowVault as `0x${string}`,
            abi: escrowAbi,
            functionName: 'getTokenBalance',
            args: [BigInt(selectedProject.id), token as `0x${string}`],
          });
          const [deposited, released, available] = balance as [bigint, bigint, bigint];
          balances.push({
            token,
            symbol: getTokenSymbol(token),
            deposited,
            released,
            available,
          });
        } catch (e) {
          console.error('Error loading token balance:', e);
        }
      }
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error loading token balances:', error);
      setTokenBalances([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && showDetailModal) {
      loadMilestones();
      loadEscrowFunding();
      loadTokenBalances();
    }
  }, [selectedProject, showDetailModal, loadMilestones, loadEscrowFunding, loadTokenBalances]);

  const openDetailModal = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
    setResult(null);
    setMilestones([]);
    setEscrowFunding(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedProject(null);
    setMilestones([]);
    setEscrowFunding(null);
    setResult(null);
  };

  const handleSetMilestoneStatus = async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS || statusMilestoneIndex === null) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'setMilestoneStatus',
        args: [BigInt(selectedProject.id), BigInt(statusMilestoneIndex), newMilestoneStatus],
      });
      setShowStatusModal(false);
    } catch (error) {
      setResult({ success: false, message: 'Failed to set milestone status' });
      setProcessing(false);
    }
  };

  const openCancelModal = (project: Project) => {
    setSelectedProject(project);
    setShowCancelModal(true);
    setResult(null);
  };

  const openRefundModal = (project: Project) => {
    setSelectedProject(project);
    setShowRefundModal(true);
    setResult(null);
  };

  const handleCancel = async () => {
    if (!selectedProject) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}/cancel`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Project cancelled successfully!' });
        onRefresh();
      } else {
        setResult({ success: false, message: data.error || 'Failed to cancel project' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleEnableRefunds = async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'enableRefunds',
        args: [BigInt(selectedProject.id)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to enable refunds' });
      setProcessing(false);
    }
  };

  const handleApproveMilestone = async (milestoneIndex: number) => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'approveMilestone',
        args: [BigInt(selectedProject.id), BigInt(milestoneIndex)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to approve milestone' });
      setProcessing(false);
    }
  };

  const handleRejectMilestone = async () => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS || selectedMilestoneIndex === null) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'rejectMilestone',
        args: [BigInt(selectedProject.id), BigInt(selectedMilestoneIndex), rejectReason],
      });
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      setResult({ success: false, message: 'Failed to reject milestone' });
      setProcessing(false);
    }
  };

  const handleReleaseFunds = async (milestoneIndex: number) => {
    if (!selectedProject || selectedProject.escrowVault === ZERO_ADDRESS) return;
    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: escrowAbi,
        functionName: 'releaseMilestoneFunds',
        args: [BigInt(selectedProject.id), BigInt(milestoneIndex)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to release funds' });
      setProcessing(false);
    }
  };

  const handleRefreshMilestones = () => {
    loadMilestones();
    loadEscrowFunding();
    loadTokenBalances();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Project Management</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Raised</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Goal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Refunds</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {projects.map(project => (
              <tr key={project.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-4 text-white">#{project.id}</td>
                <td className="px-4 py-4 text-white">{project.name || `Project ${project.id}`}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[project.status]}`}>
                    {STATUS_NAMES[project.status]}
                  </span>
                </td>
                <td className="px-4 py-4 text-white">{formatUSD(project.totalRaised)}</td>
                <td className="px-4 py-4 text-gray-400">{formatUSD(project.fundingGoal)}</td>
                <td className="px-4 py-4">
                  {project.refundsEnabled ? (
                    <span className="text-green-400 text-sm">Enabled</span>
                  ) : (
                    <span className="text-gray-500 text-sm">Disabled</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => openDetailModal(project)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedProject.name || `Project #${selectedProject.id}`}</h3>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[selectedProject.status]}`}>
                    {STATUS_NAMES[selectedProject.status]}
                  </span>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Funding Goal</p>
                  <p className="text-white text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.fundingGoal) : formatUSD(selectedProject.fundingGoal)}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total Raised</p>
                  <p className="text-white text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.totalRaised) : formatUSD(selectedProject.totalRaised)}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Min Investment</p>
                  <p className="text-white text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.minInvestment) : formatUSD(selectedProject.minInvestment)}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Max Investment</p>
                  <p className="text-white text-lg font-semibold">
                    {escrowFunding ? formatUSD(escrowFunding.maxInvestment) : formatUSD(selectedProject.maxInvestment)}
                  </p>
                </div>
              </div>

              {/* Contracts section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Contracts</h4>
                <div className="space-y-2">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Owner</p>
                    <a
                      href={getExplorerUrl(escrowFunding?.projectOwner || selectedProject.owner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-mono text-sm break-all hover:underline"
                    >
                      {escrowFunding?.projectOwner || selectedProject.owner}
                    </a>
                  </div>
                  {selectedProject.securityToken !== ZERO_ADDRESS && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Security Token</p>
                      <a
                        href={getExplorerUrl(selectedProject.securityToken)}
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
                        href={getExplorerUrl(selectedProject.escrowVault)}
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
              {/* Token Balances - V2 Feature */}
              {tokenBalances.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Token Balances</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tokenBalances.map((tb, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">{tb.symbol}</span>
                          {tb.token !== ZERO_ADDRESS && tb.token !== OFFCHAIN_PAYMENT && (
                            <a
                              href={getExplorerUrl(tb.token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 text-xs hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Deposited:</span>
                            <span className="text-white">{formatTokenAmount(tb.deposited, tb.token)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Released:</span>
                            <span className="text-white">{formatTokenAmount(tb.released, tb.token)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Available:</span>
                            <span className="text-green-400 font-medium">{formatTokenAmount(tb.available, tb.token)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* On-Chain vs Off-Chain Breakdown - V2 Feature */}
              {escrowFunding && (escrowFunding.onChainRaisedUSD !== undefined || escrowFunding.offChainRaisedUSD !== undefined) && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Funding Sources</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                      <p className="text-blue-400 text-sm font-medium">On-Chain</p>
                      <p className="text-white text-xl font-bold">
                        {formatUSD(escrowFunding.onChainRaisedUSD || 0n)}
                      </p>
                      <p className="text-gray-400 text-xs">USDC, USDT, POL</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                      <p className="text-purple-400 text-sm font-medium">Off-Chain</p>
                      <p className="text-white text-xl font-bold">
                        {formatUSD(escrowFunding.offChainRaisedUSD || 0n)}
                      </p>
                      <p className="text-gray-400 text-xs">Swipe / Card</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestone Management */}
              {selectedProject.escrowVault !== ZERO_ADDRESS && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Milestone Management</h4>
                    <button
                      onClick={handleRefreshMilestones}
                      disabled={milestonesLoading}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded text-xs text-white"
                    >
                      {milestonesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {milestonesLoading ? (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400">Loading milestones...</p>
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400">No milestones created yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((milestone, index) => {
                        const statusInfo = MILESTONE_STATUS[milestone.status] || { label: 'Unknown', color: 'bg-gray-500' };
                        const percentageDisplay = Number(milestone.percentage) / 100;
                        
                        return (
                          <div key={index} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="text-white font-medium">
                                  {milestone.description || `Milestone ${index + 1}`}
                                </p>
                                <p className="text-gray-400 text-sm">{percentageDisplay}% of funds</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            
                            {milestone.proofURI && (
                              <div className="mb-2">
                                <p className="text-gray-400 text-xs">Proof:</p>
                                <a 
                                  href={convertIPFSUrl(milestone.proofURI)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 text-sm hover:underline break-all"
                                >
                                  {milestone.proofURI}
                                </a>
                              </div>
                            )}
                            
                            {milestone.rejectionReason && (
                              <p className="text-red-400 text-sm mb-2">
                                <span className="font-medium">Rejection reason:</span> {milestone.rejectionReason}
                              </p>
                            )}

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setStatusMilestoneIndex(index);
                                  setNewMilestoneStatus(milestone.status);
                                  setShowStatusModal(true);
                                }}
                                disabled={processing || txLoading}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded text-xs text-white"
                              >
                                Change Status
                              </button>
                              
                              {milestone.status === 1 && (
                                <>
                                  <button
                                    onClick={() => handleApproveMilestone(index)}
                                    disabled={processing || txLoading}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedMilestoneIndex(index);
                                      setShowRejectModal(true);
                                    }}
                                    disabled={processing || txLoading}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-xs text-white"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {milestone.status === 2 && (
                                <button
                                  onClick={() => handleReleaseFunds(index)}
                                  disabled={processing || txLoading}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs text-white"
                                >
                                  Release Funds
                                </button>
                              )}
                              {milestone.status === 5 && (
                                <span className="text-green-400 text-sm">
                                  ✓ Funds released
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(processing || txLoading) && (
                <div className="p-4 rounded-lg bg-blue-900/50 text-blue-400 mb-4">
                  Processing transaction... Please wait and confirm in your wallet.
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Milestone Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Reject Milestone</h3>
            <p className="text-gray-300 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedMilestoneIndex(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectMilestone}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Status Change Modal - ADD after the Reject Milestone Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Change Milestone Status</h3>
            <p className="text-yellow-400 text-sm mb-4">
              ⚠️ Admin override - use with caution
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">New Status</label>
              <select
                value={newMilestoneStatus}
                onChange={(e) => setNewMilestoneStatus(Number(e.target.value))}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value={0}>0 - Pending</option>
                <option value={1}>1 - Submitted</option>
                <option value={2}>2 - Approved</option>
                <option value={3}>3 - Rejected</option>
                <option value={4}>4 - Disputed</option>
                <option value={5}>5 - Released</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusMilestoneIndex(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSetMilestoneStatus}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== KYC MANAGEMENT COMPONENT ====================
function KYCManagementPanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">KYC Management</h2>
      <div className="bg-gray-800 rounded-xl p-6">
        <p className="text-gray-300 mb-4">Manage KYC submissions and verifications.</p>
        <Link 
          href="/admin/kyc"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
        >
          Open KYC Dashboard
        </Link>
      </div>
    </div>
  );
}

// ==================== IDENTITY MANAGEMENT COMPONENT ====================
function IdentityManagement({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [identityContract, setIdentityContract] = useState(ZERO_ADDRESS);
  const [countryCode, setCountryCode] = useState('840');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [identityRegistry, setIdentityRegistry] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Identity registered successfully!' });
      checkVerificationStatus();
      resetTx();
    }
  }, [txSuccess]);

  const projectsWithToken = projects.filter(p => p.securityToken !== ZERO_ADDRESS);

  const loadIdentityRegistry = async (project: Project) => {
    setSelectedProject(project);
    setIdentityRegistry(null);
    setIsVerified(null);
    setResult(null);

    try {
      const registry = await publicClient.readContract({
        address: project.securityToken as `0x${string}`,
        abi: RWASecurityTokenABI,
        functionName: 'identityRegistry',
      });
      setIdentityRegistry(registry as string);
    } catch (error) {
      console.error('Error loading identity registry:', error);
      setResult({ success: false, message: 'Failed to load identity registry' });
    }
  };

  const checkVerificationStatus = async () => {
    if (!identityRegistry || !userAddress || !isAddress(userAddress)) return;

    try {
      const verified = await publicClient.readContract({
        address: identityRegistry as `0x${string}`,
        abi: IdentityRegistryABI,
        functionName: 'isVerified',
        args: [userAddress as `0x${string}`],
      });
      setIsVerified(verified as boolean);
    } catch (error) {
      console.error('Error checking verification:', error);
    }
  };

  useEffect(() => {
    if (identityRegistry && userAddress && isAddress(userAddress)) {
      checkVerificationStatus();
    }
  }, [identityRegistry, userAddress]);

  const handleRegisterIdentity = async () => {
    if (!identityRegistry || !userAddress || !isAddress(userAddress)) return;

    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: identityRegistry as `0x${string}`,
        abi: IdentityRegistryABI,
        functionName: 'registerIdentity',
        args: [userAddress as `0x${string}`, identityContract as `0x${string}`, parseInt(countryCode)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to register identity' });
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Identity Management</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithToken.map(project => (
            <button
              key={project.id}
              onClick={() => loadIdentityRegistry(project)}
              className={`p-4 rounded-lg text-left transition-colors ${
                selectedProject?.id === project.id 
                  ? 'bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <p className="text-white font-medium">{project.name || `Project #${project.id}`}</p>
              <p className="text-gray-400 text-sm">Token: {project.securityToken.slice(0, 10)}...</p>
            </button>
          ))}
        </div>
      </div>

      {selectedProject && identityRegistry && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Register Identity</h3>
          
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <p className="text-gray-400 text-xs">Identity Registry</p>
            <a
              href={getExplorerUrl(identityRegistry)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-mono text-sm break-all hover:underline"
            >
              {identityRegistry}
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">User Address</label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
              {isVerified !== null && (
                <p className={`mt-2 text-sm ${isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isVerified ? '✓ Already verified' : '⚠ Not yet verified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Identity Contract (optional)</label>
              <input
                type="text"
                value={identityContract}
                onChange={(e) => setIdentityContract(e.target.value)}
                placeholder="0x0000..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Country Code</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="840">United States (840)</option>
                <option value="826">United Kingdom (826)</option>
                <option value="276">Germany (276)</option>
                <option value="250">France (250)</option>
                <option value="392">Japan (392)</option>
                <option value="156">China (156)</option>
                <option value="356">India (356)</option>
              </select>
            </div>

            {result && (
              <div className={`p-3 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {result.message}
              </div>
            )}

            <button
              onClick={handleRegisterIdentity}
              disabled={processing || !userAddress || !isAddress(userAddress) || isVerified === true}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
            >
              {processing ? 'Processing...' : 'Register Identity'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FACTORY SETTINGS COMPONENT ====================
function FactorySettings() {
  const [factoryData, setFactoryData] = useState<{
    identityRegistry: string;
    nativePriceFeed: string;
    stablecoins: string[];
  } | null>(null);
  const [newRegistry, setNewRegistry] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    fetchFactoryData();
  }, []);

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Registry updated successfully!' });
      fetchFactoryData();
      resetTx();
    }
  }, [txSuccess]);

  const fetchFactoryData = async () => {
    try {
      const [registry, priceFeed, stablecoins] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
          abi: RWALaunchpadFactoryABI,
          functionName: 'identityRegistry',
        }),
        publicClient.readContract({
          address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
          abi: RWALaunchpadFactoryABI,
          functionName: 'nativePriceFeed',
        }),
        publicClient.readContract({
          address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
          abi: RWALaunchpadFactoryABI,
          functionName: 'defaultStablecoins',
        }),
      ]);
      
      setFactoryData({
        identityRegistry: registry as string,
        nativePriceFeed: priceFeed as string,
        stablecoins: stablecoins as string[],
      });
    } catch (error) {
      console.error('Error fetching factory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistry = async () => {
    if (!newRegistry || !isAddress(newRegistry)) return;

    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
        abi: RWALaunchpadFactoryABI,
        functionName: 'setIdentityRegistry',
        args: [newRegistry as `0x${string}`],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to update registry' });
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Factory Settings</h2>

      {loading ? (
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Identity Registry</h3>
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-xs">Current Registry</p>
              {factoryData?.identityRegistry && factoryData.identityRegistry !== ZERO_ADDRESS ? (
                <a
                  href={getExplorerUrl(factoryData.identityRegistry)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 font-mono text-sm break-all hover:underline"
                >
                  {factoryData.identityRegistry}
                </a>
              ) : (
                <p className="text-yellow-400">Not set</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">New Registry Address</label>
                <input
                  type="text"
                  value={newRegistry}
                  onChange={(e) => setNewRegistry(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              {result && (
                <div className={`p-3 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {result.message}
                </div>
              )}

              <button
                onClick={handleUpdateRegistry}
                disabled={processing || !newRegistry || !isAddress(newRegistry)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
              >
                {processing ? 'Processing...' : 'Update Registry'}
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Feed Configuration</h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-xs">Native Price Feed (POL/USD)</p>
                {factoryData?.nativePriceFeed && factoryData.nativePriceFeed !== ZERO_ADDRESS ? (
                  <a
                    href={getExplorerUrl(factoryData.nativePriceFeed)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-mono text-sm break-all hover:underline"
                  >
                    {factoryData.nativePriceFeed}
                  </a>
                ) : (
                  <p className="text-red-400">Not set - new projects will fail!</p>
                )}
              </div>

              <div className="p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">Default Stablecoins</p>
                {factoryData?.stablecoins && factoryData.stablecoins.length > 0 ? (
                  <div className="space-y-1">
                    {factoryData.stablecoins.map((coin, i) => (
                      <a
                        key={i}
                        href={getExplorerUrl(coin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-400 font-mono text-xs hover:underline"
                      >
                        {coin}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-yellow-400">No stablecoins configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PLATFORM SETTINGS COMPONENT ====================
function PlatformSettings() {
  const [settings, setSettings] = useState<{
    transactionFee: string;
    totalCollectedFees: string;
    feeRecipient: string;
    vaultCount: number;
    vaultDetails: VaultSettings[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  
  const [newFee, setNewFee] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/fee');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data);
        setNewFee(data.transactionFee);
        setNewRecipient(data.feeRecipient);
      } else {
        setResult({ success: false, message: data.error || 'Failed to fetch settings' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error fetching settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSetFee = async () => {
    if (!newFee) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTransactionFee', value: newFee }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Transaction fee updated!', details: data.results });
        setShowFeeModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to update fee' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSetRecipient = async () => {
    if (!newRecipient || !isAddress(newRecipient)) return;
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setFeeRecipient', value: newRecipient }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Fee recipient updated!', details: data.results });
        setShowRecipientModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to update recipient' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawFees = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/settings/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdrawFees' }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: 'Fees withdrawn!', details: data.results });
        setShowWithdrawModal(false);
        fetchSettings();
      } else {
        setResult({ success: false, message: data.error || 'Failed to withdraw fees' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Platform Settings</h2>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          <p>{result.message}</p>
          {result.details && result.details.length > 0 && (
            <ul className="mt-2 text-sm">
              {result.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Transaction Fee</p>
          <p className="text-2xl font-bold text-white">{settings?.transactionFee || '0'} POL</p>
          <button
            onClick={() => setShowFeeModal(true)}
            className="mt-3 text-blue-400 text-sm hover:underline"
          >
            Change Fee →
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Total Collected Fees</p>
          <p className="text-2xl font-bold text-white">{settings?.totalCollectedFees || '0'} POL</p>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!settings?.totalCollectedFees || settings.totalCollectedFees === '0'}
            className="mt-3 text-blue-400 text-sm hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Withdraw Fees →
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Active Escrow Vaults</p>
          <p className="text-2xl font-bold text-white">{settings?.vaultCount || 0}</p>
          <p className="mt-3 text-gray-500 text-sm">Project-specific vaults</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Platform Fee (Investments)</p>
          <p className="text-2xl font-bold text-white">2.5%</p>
          <p className="mt-3 text-gray-500 text-sm">Hardcoded in contract</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fee Recipient</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">Current Recipient</p>
            {settings?.feeRecipient && settings.feeRecipient !== ZERO_ADDRESS ? (
              <a
                href={getExplorerUrl(settings.feeRecipient)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 font-mono text-sm break-all hover:underline"
              >
                {settings.feeRecipient}
              </a>
            ) : (
              <p className="text-yellow-400">Not set</p>
            )}
          </div>
          <button
            onClick={() => setShowRecipientModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
          >
            Change Recipient
          </button>
        </div>
      </div>

      {settings?.vaultDetails && settings.vaultDetails.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Vault Details</h3>
          <div className="space-y-3">
            {settings.vaultDetails.map((vault, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <a
                      href={getExplorerUrl(vault.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-mono text-sm hover:underline"
                    >
                      {vault.address.slice(0, 10)}...{vault.address.slice(-8)}
                    </a>
                    {vault.error && (
                      <p className="text-red-400 text-xs mt-1">{vault.error}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">Fee: {formatEther(vault.transactionFee)} POL</p>
                    <p className="text-gray-400 text-xs">Collected: {formatEther(vault.collectedFees)} POL</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Set Transaction Fee</h3>
            <p className="text-gray-300 mb-4">
              This fee is charged on all investments. Set to 0 to disable.
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Fee Amount (POL)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="0.01"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSetFee}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Update Fee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Set Fee Recipient</h3>
            <p className="text-gray-300 mb-4">
              All platform fees and transaction fees will be sent to this address.
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
              {newRecipient && !isAddress(newRecipient) && (
                <p className="text-red-400 text-sm mt-1">Invalid address format</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecipientModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSetRecipient}
                disabled={processing || !newRecipient || !isAddress(newRecipient)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Update Recipient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Withdraw Collected Fees</h3>
            <p className="text-gray-300 mb-4">
              Withdraw all collected transaction fees to the fee recipient address.
            </p>
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm">Total to withdraw:</p>
              <p className="text-2xl font-bold text-white">{settings?.totalCollectedFees || '0'} POL</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawFees}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white"
              >
                {processing ? 'Processing...' : 'Withdraw All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN ADMIN PAGE ====================
export default function AdminPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [kycStats, setKycStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const totalProjects = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as `0x${string}`,
        abi: projectNftAbi,
        functionName: 'totalProjects',
      });

      const projectPromises = [];
      for (let i = 1; i <= Number(totalProjects); i++) {
        projectPromises.push(
          publicClient.readContract({
            address: CONTRACTS.RWAProjectNFT as `0x${string}`,
            abi: projectNftAbi,
            functionName: 'getProject',
            args: [BigInt(i)],
          })
        );
      }

      const projectData = await Promise.all(projectPromises);
      const formattedProjects: Project[] = [];

      for (const data of projectData) {
        const project = data as any;
        
        // Skip burned projects (owner is zero address)
        if (project.owner === ZERO_ADDRESS) {
          continue;
        }

        let name = `Project #${project.id}`;
        let refundsEnabled = false;

        // Fetch metadata
        if (project.metadataURI) {
          try {
            const metadataUrl = convertIPFSUrl(project.metadataURI);
            const response = await fetch(metadataUrl);
            const metadata = await response.json();
            name = metadata.name || name;
          } catch (e) {
            console.error('Error fetching metadata:', e);
          }
        }

        // Fetch refundsEnabled from escrow
        if (project.escrowVault !== ZERO_ADDRESS) {
          try {
            const fundingData = await publicClient.readContract({
              address: project.escrowVault as `0x${string}`,
              abi: escrowAbi,
              functionName: 'getProjectFunding',
              args: [project.id],
            });
            refundsEnabled = (fundingData as any).refundsEnabled;
          } catch (e) {
            console.error('Error fetching funding data:', e);
          }
        }

        formattedProjects.push({
          id: Number(project.id),
          owner: project.owner,
          metadataURI: project.metadataURI,
          fundingGoal: project.fundingGoal,
          totalRaised: project.totalRaised,
          minInvestment: project.minInvestment,
          maxInvestment: project.maxInvestment,
          deadline: project.deadline,
          status: project.status,
          securityToken: project.securityToken,
          escrowVault: project.escrowVault,
          createdAt: project.createdAt,
          completedAt: project.completedAt,
          transferable: project.transferable,
          name,
          refundsEnabled,
        });
      }

      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  const fetchKYCStats = useCallback(async () => {
    try {
      const stats = await publicClient.readContract({
        address: CONTRACTS.IdentityRegistry as `0x${string}`,
        abi: kycManagerAbi,
        functionName: 'getKYCStats',
      });
      const [total, pending, approved, rejected] = stats as [bigint, bigint, bigint, bigint];
      setKycStats({
        total: Number(total),
        pending: Number(pending),
        approved: Number(approved),
        rejected: Number(rejected),
      });
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
      // KYC stats might not be available, use defaults
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchKYCStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProjects, fetchKYCStats]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Projects' },
    { id: 'offchain', label: 'Off-Chain' },
    { id: 'kyc', label: 'KYC' },
    { id: 'identity', label: 'Identity' },
    { id: 'factory', label: 'Factory' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage projects, KYC, and platform settings</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <AdminOverview projects={projects} kycStats={kycStats} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'projects' && (
              <ProjectManagement projects={projects} onRefresh={fetchProjects} />
            )}
            {activeTab === 'offchain' && (
              <OffChainPayments projects={projects} onRefresh={fetchProjects} />
            )}
            {activeTab === 'kyc' && <KYCManagementPanel />}
            {activeTab === 'identity' && <IdentityManagement projects={projects} />}
            {activeTab === 'factory' && <FactorySettings />}
            {activeTab === 'settings' && <PlatformSettings />}
          </>
        )}
      </div>
    </div>
  );
}
