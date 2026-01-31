'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useWriteContract } from 'wagmi';
import { createPublicClient, http, parseUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';
import Header from '@/components/Header';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Token config
const TOKENS = {
  USDC: {
    address: CONTRACTS.USDC as `0x${string}`,
    symbol: 'USDC',
    decimals: 6,
  },
  USDT: {
    address: CONTRACTS.USDT as `0x${string}`,
    symbol: 'USDT',
    decimals: 6,
  },
};

// Status mappings - matches contract enum: 0=Pending, 1=Active, 2=Funded, 3=Completed, 4=Cancelled
const STATUS_LABELS = ['Draft', 'Pending', 'Active', 'Funded', 'In Progress', 'Completed', 'Cancelled', 'Failed'];

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-500/20 text-gray-400 border-gray-500/30',      // Draft
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', // Pending
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       // Active
  3: 'bg-green-500/20 text-green-400 border-green-500/30',    // Funded
  4: 'bg-purple-500/20 text-purple-400 border-purple-500/30', // InProgress
  5: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', // Completed
  6: 'bg-red-500/20 text-red-400 border-red-500/30',          // Cancelled
  7: 'bg-red-500/20 text-red-400 border-red-500/30',          // Failed
};

// ABIs
const RWAProjectNFTABI = [
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [{
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
    }],
  },
] as const;

const EscrowVaultABI = [
  {
    name: 'getProjectFunding',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [{
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
    }],
  },
  {
    name: 'getInvestorDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_investor', type: 'address' },
    ],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'amount', type: 'uint256' },
        { name: 'amountUSD', type: 'uint256' },
        { name: 'tokensMinted', type: 'uint256' },
        { name: 'refunded', type: 'bool' },
      ],
    }],
  },
  {
    name: 'investWithToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [],
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
] as const;

const RWASecurityTokenABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

// Types
interface ProjectMetadata {
  name?: string;
  description?: string;
  image?: string;
  documents?: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  attributes?: {
    category?: string;
    projected_roi?: number;
    company_name?: string;
    location?: string;
  };
}

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

interface InvestorDetails {
  amount: bigint;
  amountUSD: bigint;
  tokensMinted: bigint;
  refunded: boolean;
}

// Helpers
const formatUSD = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatUSDC = (amount: bigint): string => {
  const num = Number(amount) / 1e6;
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const convertIPFSUrl = (url: string): string => {
  if (url.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
  }
  return url;
};

// Investment Modal
function InvestModal({
  project,
  escrowVault,
  onClose,
  onSuccess,
}: {
  project: Project;
  escrowVault: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const [step, setStep] = useState<'input' | 'approving' | 'investing' | 'success' | 'error'>('input');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT'>('USDC');
  const [balance, setBalance] = useState<bigint>(0n);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { writeContractAsync } = useWriteContract();

  const token = TOKENS[selectedToken];
  const minInvestment = Number(project.minInvestment);
  const maxInvestment = Number(project.maxInvestment);
  const amountNum = parseFloat(amount) || 0;

  useEffect(() => {
    const loadBalance = async () => {
      if (!address) return;
      try {
        const bal = await publicClient.readContract({
          address: token.address,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        setBalance(bal as bigint);
      } catch (err) {
        console.error('Error loading balance:', err);
      }
    };
    loadBalance();
  }, [address, token.address]);

  const balanceNum = Number(balance) / 1e6;
  const isValidAmount = amountNum >= minInvestment && amountNum <= maxInvestment;
  const hasBalance = amountNum <= balanceNum;

  const handleInvest = async () => {
    if (!address || !amount) return;
    setError('');
    const amountInWei = parseUnits(amount, 6);

    try {
      setStep('approving');
      const allowance = await publicClient.readContract({
        address: token.address,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, escrowVault as `0x${string}`],
      });

      if ((allowance as bigint) < amountInWei) {
        const approveTx = await writeContractAsync({
          address: token.address,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [escrowVault as `0x${string}`, amountInWei],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      setStep('investing');
      const investTx = await writeContractAsync({
        address: escrowVault as `0x${string}`,
        abi: EscrowVaultABI,
        functionName: 'investWithToken',
        args: [project.id, token.address, amountInWei],
      });

      setTxHash(investTx);
      await publicClient.waitForTransactionReceipt({ hash: investTx });
      setStep('success');
      onSuccess();
    } catch (err: any) {
      console.error('Investment error:', err);
      setError(err.shortMessage || err.message || 'Transaction failed');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Invest in Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {step === 'input' && (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Select Token</label>
              <div className="flex gap-2">
                {(['USDC', 'USDT'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedToken(t)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                      selectedToken === t
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:bg-gray-700/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2 text-sm text-gray-400">
              Balance: <span className="text-white font-medium">{balanceNum.toLocaleString()} {selectedToken}</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={minInvestment.toLocaleString()}
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-xl pl-8 pr-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Min: ${minInvestment.toLocaleString()}</span>
                <span>Max: ${maxInvestment.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleInvest}
              disabled={!isValidAmount || !hasBalance}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none"
            >
              {!hasBalance ? 'Insufficient Balance' : !isValidAmount ? 'Enter Valid Amount' : `Invest $${amountNum.toLocaleString()}`}
            </button>
          </>
        )}

        {step === 'approving' && (
          <div className="text-center py-12">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-white text-lg font-medium">Approving {selectedToken}...</p>
            <p className="text-gray-400 mt-2">Please confirm in your wallet</p>
          </div>
        )}

        {step === 'investing' && (
          <div className="text-center py-12">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-white text-lg font-medium">Processing Investment...</p>
            <p className="text-gray-400 mt-2">Please confirm in your wallet</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-2xl font-bold mb-2">Investment Successful!</p>
            <p className="text-gray-400 mb-6">You invested ${amount} in this project</p>
            {txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
              >
                View Transaction
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button onClick={onClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors">
              Close
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white text-xl font-bold mb-2">Transaction Failed</p>
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <button onClick={() => setStep('input')} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Refund Section
function RefundSection({
  projectId,
  escrowVault,
  investorDetails,
  refundsEnabled,
}: {
  projectId: bigint;
  escrowVault: string;
  investorDetails: InvestorDetails | null;
  refundsEnabled: boolean;
}) {
  const { address } = useAccount();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const { writeContractAsync } = useWriteContract();

  if (!investorDetails || investorDetails.amountUSD === 0n) return null;
  
  if (investorDetails.refunded) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Refund Claimed</h3>
        </div>
        <p className="text-gray-400 ml-13">Your investment of {formatUSDC(investorDetails.amountUSD)} has been refunded.</p>
      </div>
    );
  }

  if (!refundsEnabled) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Refunds Pending</h3>
        </div>
        <p className="text-gray-400">Refunds are not yet enabled. Your investment: {formatUSDC(investorDetails.amountUSD)}</p>
      </div>
    );
  }

  const handleClaim = async () => {
    if (!address) return;
    setClaiming(true);
    setError('');

    try {
      const tx = await writeContractAsync({
        address: escrowVault as `0x${string}`,
        abi: EscrowVaultABI,
        functionName: 'claimRefund',
        args: [projectId],
      });
      setTxHash(tx);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setClaimed(true);
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Refund Claimed!</h3>
        </div>
        <p className="text-gray-400 mb-3">{formatUSDC(investorDetails.amountUSD)} has been returned to your wallet.</p>
        {txHash && (
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm inline-flex items-center gap-1">
            View Transaction
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white">Claim Your Refund</h3>
      </div>
      <p className="text-gray-400 mb-4">This project has been cancelled. Claim your investment of {formatUSDC(investorDetails.amountUSD)}.</p>
      {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{error}</p>}
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {claiming ? 'Claiming...' : 'Claim Refund'}
      </button>
    </div>
  );
}

// Main Page
export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { address, isConnected } = useAccount();

  const [project, setProject] = useState<Project | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investorDetails, setInvestorDetails] = useState<InvestorDetails | null>(null);
  const [refundsEnabled, setRefundsEnabled] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const projectData = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as `0x${string}`,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      });

      const p = projectData as unknown as Project;
      setProject(p);

      // Load metadata
      if (p.metadataURI) {
        try {
          const url = convertIPFSUrl(p.metadataURI);
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const meta = await res.json();
            setMetadata(meta);
          }
        } catch (err) {
          console.error('Error loading metadata:', err);
        }
      }

      // Load token info
      if (p.securityToken && p.securityToken !== ZERO_ADDRESS) {
        try {
          const [name, symbol] = await Promise.all([
            publicClient.readContract({ address: p.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'name' }),
            publicClient.readContract({ address: p.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'symbol' }),
          ]);
          setTokenName(name as string);
          setTokenSymbol(symbol as string);
        } catch {}
      }

      // Load escrow data
      if (p.escrowVault && p.escrowVault !== ZERO_ADDRESS) {
        try {
          const funding = await publicClient.readContract({
            address: p.escrowVault as `0x${string}`,
            abi: EscrowVaultABI,
            functionName: 'getProjectFunding',
            args: [BigInt(projectId)],
          });
          setRefundsEnabled((funding as any).refundsEnabled || false);
        } catch {}
      }
    } catch (err: any) {
      console.error('Error loading project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadInvestorDetails = async () => {
    if (!address || !project || !project.escrowVault || project.escrowVault === ZERO_ADDRESS) return;
    try {
      const details = await publicClient.readContract({
        address: project.escrowVault as `0x${string}`,
        abi: EscrowVaultABI,
        functionName: 'getInvestorDetails',
        args: [BigInt(projectId), address],
      });
      setInvestorDetails(details as unknown as InvestorDetails);
    } catch {}
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  useEffect(() => {
    loadInvestorDetails();
  }, [address, project]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-700 rounded w-32"></div>
            <div className="h-64 bg-gray-800 rounded-2xl"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-800 rounded-2xl"></div>
              <div className="h-64 bg-gray-800 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong!</h2>
            <p className="text-gray-400 mb-6">{error || 'Project not found'}</p>
            <Link href="/projects" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // fundingGoal is plain USD, totalRaised is USDC (6 decimals)
  const fundingGoalUSD = Number(project.fundingGoal);
  const totalRaisedUSD = Number(project.totalRaised) / 1e6;
  const progress = fundingGoalUSD > 0 ? (totalRaisedUSD / fundingGoalUSD) * 100 : 0;
  
  const minInvestment = Number(project.minInvestment);
  const maxInvestment = Number(project.maxInvestment);
  
  const isOwner = address && project.owner.toLowerCase() === address.toLowerCase();
  const deadline = new Date(Number(project.deadline) * 1000);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isCancelled = project.status === 6;
  const canInvest = project.status === 2 && !isExpired && !isOwner;

  const displayName = metadata?.name || tokenName || `Project #${projectId}`;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/projects" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </Link>

        {/* Hero Section */}
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
          {metadata?.image ? (
            <Image
              src={convertIPFSUrl(metadata.image)}
              alt={displayName}
              fill
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${STATUS_COLORS[project.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
              {STATUS_LABELS[project.status] || 'Unknown'}
            </span>
          </div>

          {/* Project Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{displayName}</h1>
                <div className="flex items-center gap-3">
                  {tokenSymbol && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                      ${tokenSymbol}
                    </span>
                  )}
                  {metadata?.attributes?.category && (
                    <span className="px-3 py-1 bg-gray-700/80 text-gray-300 rounded-lg text-sm">
                      {metadata.attributes.category}
                    </span>
                  )}
                </div>
              </div>
              {metadata?.attributes?.projected_roi && (
                <div className="hidden md:block px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl">
                  <span className="text-green-400 font-medium">📈 {metadata.attributes.projected_roi}% Projected ROI</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Funding Progress</h2>
                <span className="text-2xl font-bold text-white">{progress.toFixed(1)}%</span>
              </div>
              
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div 
                  className={`h-full transition-all duration-500 ${isCancelled ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} 
                  style={{ width: `${Math.min(progress, 100)}%` }} 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Raised</p>
                  <p className="text-2xl font-bold text-white">{formatUSD(totalRaisedUSD)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Funding Goal</p>
                  <p className="text-2xl font-bold text-white">{formatUSD(fundingGoalUSD)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {metadata?.description && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">About This Project</h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{metadata.description}</p>
              </div>
            )}

            {/* Investment Details */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Investment Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">Min Investment</p>
                  <p className="text-white font-semibold">{formatUSD(minInvestment)}</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">Max Investment</p>
                  <p className="text-white font-semibold">{formatUSD(maxInvestment)}</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">Deadline</p>
                  <p className="text-white font-semibold">{deadline.toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">Time Left</p>
                  <p className={`font-semibold ${isCancelled ? 'text-red-400' : isExpired ? 'text-orange-400' : 'text-white'}`}>
                    {isCancelled ? 'Cancelled' : isExpired ? 'Ended' : `${daysLeft} days`}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents */}
            {metadata?.documents && metadata.documents.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
                <div className="space-y-3">
                  {metadata.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={convertIPFSUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{doc.name}</p>
                          {doc.type && <p className="text-gray-400 text-sm">{doc.type}</p>}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Refund Section */}
            {isCancelled && project.escrowVault !== ZERO_ADDRESS && (
              <RefundSection
                projectId={project.id}
                escrowVault={project.escrowVault}
                investorDetails={investorDetails}
                refundsEnabled={refundsEnabled}
              />
            )}

            {/* Smart Contracts */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Smart Contracts</h2>
              <div className="space-y-3">
                {project.securityToken && project.securityToken !== ZERO_ADDRESS && (
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-purple-400 text-sm">🔐</span>
                      </div>
                      <span className="text-gray-300">Security Token</span>
                    </div>
                    <a
                      href={`${EXPLORER_URL}/address/${project.securityToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-mono text-sm hover:text-blue-300 flex items-center gap-1"
                    >
                      {project.securityToken.slice(0, 6)}...{project.securityToken.slice(-4)}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
                {project.escrowVault && project.escrowVault !== ZERO_ADDRESS && (
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 text-sm">🏦</span>
                      </div>
                      <span className="text-gray-300">Escrow Vault</span>
                    </div>
                    <a
                      href={`${EXPLORER_URL}/address/${project.escrowVault}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-mono text-sm hover:text-blue-300 flex items-center gap-1"
                    >
                      {project.escrowVault.slice(0, 6)}...{project.escrowVault.slice(-4)}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invest Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Invest Now</h2>

              {!isConnected ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Connect your wallet to invest</p>
                </div>
              ) : isOwner ? (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                  <p className="text-blue-400">You are the project owner</p>
                </div>
              ) : isCancelled ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <p className="text-red-400">This project has been cancelled</p>
                </div>
              ) : isExpired ? (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                  <p className="text-orange-400">Investment period has ended</p>
                </div>
              ) : project.status !== 1 ? (
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-gray-400">Not accepting investments</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowInvestModal(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25"
                >
                  Invest Now
                </button>
              )}

              {/* Your Investment */}
              {investorDetails && investorDetails.amountUSD > 0n && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Your Investment</span>
                    {investorDetails.refunded && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Refunded</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">{formatUSDC(investorDetails.amountUSD)}</p>
                </div>
              )}
            </div>

            {/* Accepted Tokens */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Accepted Tokens</h2>
              <div className="space-y-3">
                {Object.entries(TOKENS).map(([key, token]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-400 text-xs font-bold">{token.symbol.charAt(0)}</span>
                      </div>
                      <span className="text-white font-medium">{token.symbol}</span>
                    </div>
                    <a
                      href={`${EXPLORER_URL}/address/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:text-blue-300"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Owner */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Project Owner</h2>
              <a
                href={`${EXPLORER_URL}/address/${project.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{project.owner.slice(2, 4).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-sm truncate">{project.owner}</p>
                  <p className="text-gray-400 text-xs">View on Explorer</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Investment Modal */}
      {showInvestModal && project && project.escrowVault !== ZERO_ADDRESS && (
        <InvestModal
          project={project}
          escrowVault={project.escrowVault}
          onClose={() => setShowInvestModal(false)}
          onSuccess={() => { loadData(); loadInvestorDetails(); }}
        />
      )}
    </div>
  );
}
