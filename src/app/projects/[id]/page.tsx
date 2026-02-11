// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits, Address } from 'viem';
import { polygonAmoy } from 'viem/chains';

// Constants
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const RPC_URL = 'https://rpc-amoy.polygon.technology';
const EXPLORER_URL = 'https://amoy.polygonscan.com';

// Token definitions
const TOKENS = {
  USDC: {
    address: '0xEd589B57e559874A5202a0FB82406c46A2116675',
    symbol: 'USDC',
    decimals: 6,
  },
  USDT: {
    address: '0xfa86C7c30840694293a5c997f399d00A4eD3cDD8',
    symbol: 'USDT',
    decimals: 6,
  },
} as const;

// ABIs
const ERC20ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const RWAProjectNFTABI = [
  {
    inputs: [{ name: 'projectId', type: 'uint256' }],
    name: 'getProject',
    outputs: [
      {
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
          { name: 'compliance', type: 'address' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const EscrowVaultABI = [
  {
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'investWithToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'projectId', type: 'uint256' }],
    name: 'getProjectFunding',
    outputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'fundingGoal', type: 'uint256' },
      { name: 'totalRaised', type: 'uint256' },
      { name: 'minInvestment', type: 'uint256' },
      { name: 'maxInvestment', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'fundingComplete', type: 'bool' },
      { name: 'refundsEnabled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'projectId', type: 'uint256' }],
    name: 'claimRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const SecurityTokenABI = [
  {
    inputs: [],
    name: 'identityRegistry',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const IdentityRegistryABI = [
  {
    inputs: [{ name: 'userAddress', type: 'address' }],
    name: 'isVerified',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses
const CONTRACTS = {
  RWAProjectNFT: '0x4497e4EA43C1A1Cd2B719fF0E4cea376364c1315',
};

// Public client
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(RPC_URL),
});

// Types
interface ProjectData {
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
  compliance: string;
}

interface ProjectMetadata {
  name: string;
  description: string;
  image: string;
  category: string;
  location: string;
  expectedReturns: string;
  documents?: Array<{ name: string; url: string }>;
}

interface InvestModalProps {
  project: ProjectData;
  projectName: string;
  effectiveMaxInvestment: number;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

// Helper functions
const getStatusText = (status: number): string => {
  const statuses = ['Pending', 'Active', 'Active', 'Funded', 'Cancelled', 'Completed'];
  return statuses[status] || 'Unknown';
};

const getStatusColor = (status: number): string => {
  const colors: Record<number, string> = {
    0: 'bg-yellow-500',
    1: 'bg-blue-500',
    2: 'bg-green-500',
    3: 'bg-purple-500',
    4: 'bg-red-500',
    5: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
};

const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// InvestModal Component
function InvestModal({ project, projectName, effectiveMaxInvestment, onClose, onSuccess }: InvestModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState(TOKENS.USDC);
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [step, setStep] = useState<'input' | 'approving' | 'investing' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');

  const amountInWei = amount ? parseUnits(amount, token.decimals) : 0n;
  const needsApproval = allowance < amountInWei;
  const amountNum = Number(amount) || 0;
  const balanceNum = Number(formatUnits(balance, token.decimals));
  const minInvestment = Number(project.minInvestment) / 1e6;

  const isValidAmount =
    amountNum >= minInvestment &&
    amountNum <= effectiveMaxInvestment &&
    amountNum <= balanceNum &&
    amountNum > 0;

  // Wagmi hooks for transactions
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
    isError: isApproveError,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: invest,
    data: investHash,
    isPending: isInvesting,
    isError: isInvestError,
    error: investError,
  } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: investSuccess } = useWaitForTransactionReceipt({ hash: investHash });

  // Debug logging
  useEffect(() => {
    console.log('=== INVEST MODAL DEBUG ===');
    console.log('Allowance:', allowance.toString());
    console.log('AmountInWei:', amountInWei.toString());
    console.log('Needs approval:', needsApproval);
    console.log('Step:', step);
    console.log('Escrow vault:', project.escrowVault);
    console.log('========================');
  }, [allowance, amountInWei, needsApproval, step, project.escrowVault]);

  // Load balances with fresh client - depends on project.escrowVault
  useEffect(() => {
    const loadBalances = async () => {
      if (!address) return;

      try {
        // Create fresh client to bypass any caching
        const freshClient = createPublicClient({
          chain: polygonAmoy,
          transport: http(RPC_URL),
        });

        const [bal, allow] = await Promise.all([
          freshClient.readContract({
            address: token.address as Address,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          freshClient.readContract({
            address: token.address as Address,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [address, project.escrowVault as Address],
          }),
        ]);

        console.log('Fresh Balance:', bal?.toString());
        console.log('Fresh Allowance:', allow?.toString());

        setBalance((bal as bigint) || 0n);
        setAllowance((allow as bigint) || 0n);
      } catch (error) {
        console.error('Failed to load balances:', error);
      }
    };

    loadBalances();
  }, [address, token, project.escrowVault]);

  // Refresh allowance after approval success
  useEffect(() => {
    const refreshAfterApproval = async () => {
      if (approveSuccess && address) {
        try {
          const freshClient = createPublicClient({
            chain: polygonAmoy,
            transport: http(RPC_URL),
          });

          const newAllowance = await freshClient.readContract({
            address: token.address as Address,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [address, project.escrowVault as Address],
          });

          console.log('Allowance after approval:', newAllowance?.toString());
          setAllowance((newAllowance as bigint) || 0n);
          setStep('input'); // Go back to input so user can click Invest
        } catch (error) {
          console.error('Failed to refresh allowance:', error);
          setAllowance(amountInWei);
          setStep('input');
        }
      }
    };

    refreshAfterApproval();
  }, [approveSuccess, address, token.address, project.escrowVault, amountInWei]);

  // Handle invest success
  useEffect(() => {
    if (investSuccess) {
      setStep('success');
      onSuccess(amountNum);
    }
  }, [investSuccess, amountNum, onSuccess]);

  // Handle errors
  useEffect(() => {
    if (isApproveError) {
      setStep('error');
      setErrorMessage(approveError?.message || 'Approval failed');
    }
    if (isInvestError) {
      setStep('error');
      setErrorMessage(investError?.message || 'Investment failed');
    }
  }, [isApproveError, isInvestError, approveError, investError]);

  const handleApprove = () => {
    setStep('approving');
    approve({
      address: token.address as Address,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [project.escrowVault as Address, amountInWei],
    });
  };

  const handleInvest = () => {
    console.log('=== INVEST CALL ===');
    console.log('Project escrowVault:', project.escrowVault);
    console.log('Token address:', token.address);
    console.log('Amount in Wei:', amountInWei.toString());
    console.log('Project ID:', project.id.toString());

    setStep('investing');
    invest({
      address: project.escrowVault as Address,
      abi: EscrowVaultABI,
      functionName: 'investWithToken',
      args: [project.id, token.address as Address, amountInWei],
    });
  };

  const handleSetMax = () => {
    const maxAmount = Math.min(effectiveMaxInvestment, balanceNum);
    setAmount(maxAmount.toString());
  };

  const handleSetMin = () => {
    setAmount(minInvestment.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Invest in {projectName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {step === 'success' ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-white mb-2">Investment Successful!</h3>
            <p className="text-gray-400 mb-6">
              You invested {formatCurrency(amountNum)} in {projectName}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
            >
              Close
            </button>
          </div>
        ) : step === 'error' ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h3 className="text-xl font-bold text-white mb-2">Transaction Failed</h3>
            <p className="text-gray-400 mb-6 text-sm break-all">{errorMessage}</p>
            <button
              onClick={() => {
                setStep('input');
                setErrorMessage('');
              }}
              className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Debug Info Box */}
            <div className="bg-gray-900 p-3 rounded-lg mb-4 text-xs font-mono text-gray-400">
              <div>Allowance: {allowance.toString()}</div>
              <div>Amount: {amountInWei.toString()}</div>
              <div>Needs approval: {needsApproval ? 'Yes' : 'No'}</div>
              <div>Step: {step}</div>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Payment Token</label>
              <div className="flex gap-2">
                {Object.values(TOKENS).map((t) => (
                  <button
                    key={t.symbol}
                    onClick={() => setToken(t)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      token.symbol === t.symbol
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={handleSetMin}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                  >
                    Min
                  </button>
                  <button
                    onClick={handleSetMax}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500"
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Min: {formatCurrency(minInvestment)}</span>
                <span>Max: {formatCurrency(effectiveMaxInvestment)}</span>
              </div>
            </div>

            {/* Balance Display */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Your {token.symbol} Balance:</span>
                <span className="text-white font-medium">{formatCurrency(balanceNum)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={!isValidAmount || isApproving}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isValidAmount && !isApproving
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isApproving ? 'Approving...' : `Approve ${token.symbol}`}
              </button>
            ) : (
              <button
                onClick={handleInvest}
                disabled={!isValidAmount || isInvesting}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isValidAmount && !isInvesting
                    ? 'bg-blue-500 text-white hover:bg-blue-400'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isInvesting ? 'Processing...' : `Invest ${formatCurrency(amountNum)}`}
              </button>
            )}

            {/* Validation Messages */}
            {amount && !isValidAmount && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {amountNum < minInvestment && `Minimum investment is ${formatCurrency(minInvestment)}`}
                {amountNum > effectiveMaxInvestment && `Maximum investment is ${formatCurrency(effectiveMaxInvestment)}`}
                {amountNum > balanceNum && `Insufficient ${token.symbol} balance`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// KYC Warning Component
function KYCWarning() {
  return (
    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="text-yellow-500 text-2xl">⚠️</div>
        <div>
          <h3 className="text-yellow-400 font-semibold text-lg mb-2">KYC Verification Required</h3>
          <p className="text-gray-300 mb-4">
            You need to complete KYC verification before investing in this project. This is required for regulatory compliance.
          </p>
          <Link
            href="/identity"
            className="inline-block px-6 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Complete KYC Verification →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main Page Content Component
function ProjectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [pendingInvestment, setPendingInvestment] = useState(0);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // KYC State
  const [isKYCVerified, setIsKYCVerified] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);

  const projectId = params.id as string;

  // Check for payment success from URL
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      const timer = setTimeout(() => setShowPaymentSuccess(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Load project data
  const loadData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const projectData = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT as Address,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      });

      setProject(projectData as ProjectData);

      // Load metadata
      if ((projectData as ProjectData).metadataURI) {
        try {
          const metadataResponse = await fetch((projectData as ProjectData).metadataURI, {
            signal: AbortSignal.timeout(10000),
          });
          if (metadataResponse.ok) {
            const metadataJson = await metadataResponse.json();
            setMetadata(metadataJson);
          }
        } catch (metaError) {
          console.error('Failed to load metadata:', metaError);
        }
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KYC Check - gets IdentityRegistry from project's security token
  useEffect(() => {
    const checkKYC = async () => {
      if (!address || !project?.securityToken || project.securityToken === ZERO_ADDRESS) {
        setKycLoading(false);
        setIsKYCVerified(false);
        return;
      }

      try {
        // Get the IdentityRegistry address from the project's security token
        const identityRegistryAddress = await publicClient.readContract({
          address: project.securityToken as Address,
          abi: SecurityTokenABI,
          functionName: 'identityRegistry',
        });

        console.log('Project security token:', project.securityToken);
        console.log('Identity Registry:', identityRegistryAddress);

        if (!identityRegistryAddress || identityRegistryAddress === ZERO_ADDRESS) {
          console.log('No identity registry found');
          setIsKYCVerified(false);
          setKycLoading(false);
          return;
        }

        // Check if user is verified in that registry
        const verified = await publicClient.readContract({
          address: identityRegistryAddress as Address,
          abi: IdentityRegistryABI,
          functionName: 'isVerified',
          args: [address],
        });

        console.log('KYC verified:', verified);
        setIsKYCVerified(verified as boolean);
      } catch (err) {
        console.error('KYC check failed:', err);
        setIsKYCVerified(false);
      } finally {
        setKycLoading(false);
      }
    };

    checkKYC();
  }, [address, project?.securityToken]);

  // Handle investment success with optimistic UI and polling
  const handleInvestmentSuccess = useCallback(
    (amountInvested: number) => {
      setShowInvestModal(false);
      setPendingInvestment((prev) => prev + amountInvested);

      // Start background polling to sync with blockchain
      const expectedTotal = (Number(project?.totalRaised || 0n) / 1e6) + pendingInvestment + amountInvested;

      let attempts = 0;
      const maxAttempts = 30;

      const pollBlockchain = async () => {
        attempts++;
        try {
          const freshProject = await publicClient.readContract({
            address: CONTRACTS.RWAProjectNFT as Address,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(projectId)],
          });

          const onChainTotal = Number((freshProject as ProjectData).totalRaised) / 1e6;

          if (onChainTotal >= expectedTotal || attempts >= maxAttempts) {
            setPendingInvestment(0);
            loadData();
            return;
          }

          setTimeout(pollBlockchain, 1000);
        } catch (err) {
          console.error('Polling error:', err);
          if (attempts >= maxAttempts) {
            setPendingInvestment(0);
            loadData();
          } else {
            setTimeout(pollBlockchain, 1000);
          }
        }
      };

      // Start polling after 2 second delay
      setTimeout(pollBlockchain, 2000);
    },
    [project?.totalRaised, pendingInvestment, projectId, loadData]
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Project not found'}</p>
          <Link href="/projects" className="text-blue-500 hover:underline">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Calculate values
  const fundingGoalUSD = Number(project.fundingGoal) / 1e6;
  const onChainRaisedUSD = Number(project.totalRaised) / 1e6;
  const totalRaisedUSD = onChainRaisedUSD + pendingInvestment;
  const remainingCapacity = Math.max(0, fundingGoalUSD - totalRaisedUSD);
  const progressPercent = Math.min(100, (totalRaisedUSD / fundingGoalUSD) * 100);
  const isExpired = Number(project.deadline) * 1000 < Date.now();
  const effectiveMaxInvestment = Math.min(Number(project.maxInvestment) / 1e6, remainingCapacity);

  // Can invest check includes KYC verification
  const canInvest = project.status === 2 && !isExpired && remainingCapacity > 0 && isKYCVerified;
  const showKYCWarning = !kycLoading && !isKYCVerified && isConnected && project.status === 2 && !isExpired && remainingCapacity > 0;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Payment Success Banner */}
        {showPaymentSuccess && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="text-green-400 font-medium">Payment Successful!</p>
                <p className="text-gray-400 text-sm">Your investment is being processed and will appear shortly.</p>
              </div>
            </div>
          </div>
        )}

        {/* Back Link */}
        <Link href="/projects" className="text-blue-500 hover:underline mb-6 inline-block">
          ← Back to Projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Project Image */}
            {metadata?.image && (
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={metadata.image}
                  alt={metadata?.name || 'Project'}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Project Title & Status */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {metadata?.name || `Project #${project.id.toString()}`}
                </h1>
                {metadata?.category && (
                  <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    {metadata.category}
                  </span>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(project.status)}`}>
                {getStatusText(project.status)}
              </span>
            </div>

            {/* Description */}
            {metadata?.description && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-3">About</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{metadata.description}</p>
              </div>
            )}

            {/* Project Details */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Project Details</h2>
              <div className="grid grid-cols-2 gap-4">
                {metadata?.location && (
                  <div>
                    <p className="text-gray-400 text-sm">Location</p>
                    <p className="text-white">{metadata.location}</p>
                  </div>
                )}
                {metadata?.expectedReturns && (
                  <div>
                    <p className="text-gray-400 text-sm">Expected Returns</p>
                    <p className="text-white">{metadata.expectedReturns}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-sm">Deadline</p>
                  <p className="text-white">{formatDate(project.deadline)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Min Investment</p>
                  <p className="text-white">{formatCurrency(Number(project.minInvestment) / 1e6)}</p>
                </div>
              </div>
            </div>

            {/* Contract Links */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Contracts</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Project NFT</span>
                  <a
                    href={`${EXPLORER_URL}/address/${CONTRACTS.RWAProjectNFT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-mono"
                  >
                    {CONTRACTS.RWAProjectNFT.slice(0, 8)}...{CONTRACTS.RWAProjectNFT.slice(-6)}
                  </a>
                </div>
                {project.securityToken !== ZERO_ADDRESS && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Security Token</span>
                    <a
                      href={`${EXPLORER_URL}/address/${project.securityToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-mono"
                    >
                      {project.securityToken.slice(0, 8)}...{project.securityToken.slice(-6)}
                    </a>
                  </div>
                )}
                {project.escrowVault !== ZERO_ADDRESS && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Escrow Vault</span>
                    <a
                      href={`${EXPLORER_URL}/address/${project.escrowVault}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-mono"
                    >
                      {project.escrowVault.slice(0, 8)}...{project.escrowVault.slice(-6)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Funding Progress */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Funding Progress</h2>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Raised</span>
                  <span className="text-white font-medium">{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Raised</span>
                  <span className="text-white font-medium">
                    {formatCurrency(totalRaisedUSD)}
                    {pendingInvestment > 0 && (
                      <span className="text-yellow-500 text-xs ml-1">(+{formatCurrency(pendingInvestment)} pending)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Funding Goal</span>
                  <span className="text-white font-medium">{formatCurrency(fundingGoalUSD)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-white font-medium">{formatCurrency(remainingCapacity)}</span>
                </div>
              </div>
            </div>

            {/* KYC Warning */}
            {showKYCWarning && <KYCWarning />}

            {/* Investment Section */}
            {canInvest && isConnected && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Invest Now</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Investment range: {formatCurrency(Number(project.minInvestment) / 1e6)} - {formatCurrency(effectiveMaxInvestment)}
                </p>
                <button
                  onClick={() => setShowInvestModal(true)}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors"
                >
                  Invest with Crypto
                </button>
              </div>
            )}

            {/* Connect Wallet Prompt */}
            {!isConnected && project.status === 2 && !isExpired && remainingCapacity > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <p className="text-gray-400 text-center">Connect your wallet to invest in this project</p>
              </div>
            )}

            {/* Project Owner */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-3">Project Owner</h2>
              <a
                href={`${EXPLORER_URL}/address/${project.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-mono text-sm break-all"
              >
                {project.owner}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Invest Modal */}
      {showInvestModal && (
        <InvestModal
          project={project}
          projectName={metadata?.name || `Project #${project.id.toString()}`}
          effectiveMaxInvestment={effectiveMaxInvestment}
          onClose={() => setShowInvestModal(false)}
          onSuccess={handleInvestmentSuccess}
        />
      )}
    </div>
  );
}

// Main Export with Suspense
export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
