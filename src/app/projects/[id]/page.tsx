'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWriteContract } from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { Header } from '@/components/Header';
import { CONTRACTS as DEPLOYED_CONTRACTS, EXPLORER_URL } from '@/config/contracts';

// ============================================
// PUBLIC CLIENT
// ============================================
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

// ============================================
// CONTRACT ADDRESSES
// ============================================
const CONTRACTS = {
  RWAProjectNFT: getAddress(DEPLOYED_CONTRACTS.RWAProjectNFT),
  EscrowVault: getAddress(DEPLOYED_CONTRACTS.EscrowVault),
};

// ============================================
// TOKEN CONFIGURATION - STABLECOINS ONLY
// Decimals are read from contract, not hardcoded
// ============================================
const TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: getAddress(DEPLOYED_CONTRACTS.USDC),
    icon: '💵',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: getAddress(DEPLOYED_CONTRACTS.USDT),
    icon: '💲',
  },
} as const;

type TokenKey = keyof typeof TOKENS;

// ============================================
// ABIs
// ============================================
const RWAProjectNFTABI = [
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
  {
    name: 'totalProjects',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const EscrowVaultABI = [
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
    name: 'getInvestorAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_investor', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getInvestorDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_investor', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'amountUSD', type: 'uint256' },
      { name: 'tokensMinted', type: 'uint256' },
      { name: 'refunded', type: 'bool' },
    ],
  },
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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ============================================
// TYPES
// ============================================
interface ProjectData {
  id: number;
  owner: string;
  metadataURI: string;
  fundingGoal: number;
  totalRaised: number;
  minInvestment: number;
  maxInvestment: number;
  deadline: bigint;
  status: number;
  securityToken: string;
  escrowVault: string;
  createdAt: bigint;
  usdDecimals: number;
  tokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  };
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Record<string, any>;
  };
}

interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ============================================
// INVEST MODAL COMPONENT
// ============================================
interface InvestModalProps {
  project: ProjectData;
  onClose: () => void;
  onSuccess: () => void;
}

const InvestModal = ({ project, onClose, onSuccess }: InvestModalProps) => {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [selectedToken, setSelectedToken] = useState<TokenKey>('USDC');
  const [investAmount, setInvestAmount] = useState('');
  const [balances, setBalances] = useState<Record<TokenKey, TokenBalance>>({
    USDC: { raw: BigInt(0), formatted: '0', decimals: 0 },
    USDT: { raw: BigInt(0), formatted: '0', decimals: 0 },
  });
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'approving' | 'investing' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Load balances AND decimals from contract
  useEffect(() => {
    const loadBalances = async () => {
      if (!address) return;
      
      const newBalances: Record<TokenKey, TokenBalance> = {} as Record<TokenKey, TokenBalance>;
      
      for (const [key, token] of Object.entries(TOKENS)) {
        try {
          // Read decimals from contract - NOT hardcoded
          const decimals = await publicClient.readContract({
            address: token.address,
            abi: ERC20ABI,
            functionName: 'decimals',
          });
          
          // Read balance
          const balance = await publicClient.readContract({
            address: token.address,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
          });
          
          console.log(`${key}: decimals=${decimals}, raw balance=${balance.toString()}, formatted=${formatUnits(balance, Number(decimals))}`);
          
          newBalances[key as TokenKey] = {
            raw: balance,
            formatted: formatUnits(balance, Number(decimals)),
            decimals: Number(decimals),
          };
        } catch (err) {
          console.error(`Error loading ${key}:`, err);
          newBalances[key as TokenKey] = {
            raw: BigInt(0),
            formatted: '0',
            decimals: 0,
          };
        }
      }
      
      setBalances(newBalances);
      setBalancesLoaded(true);
    };
    
    loadBalances();
  }, [address]);

  // Investment calculations - project values are already converted to numbers
  const investAmountNum = parseFloat(investAmount) || 0;
  const minInvestmentUSD = project.minInvestment;
  const maxInvestmentUSD = project.maxInvestment;
  const fundingGoal = project.fundingGoal;
  
  // For stablecoins: 1 token = $1, so amount needed = investAmountNum
  const requiredTokenAmount = investAmountNum;
  const userBalanceNum = parseFloat(balances[selectedToken].formatted) || 0;
  const hasEnoughBalance = userBalanceNum >= requiredTokenAmount;
  const isValidAmount = investAmountNum >= minInvestmentUSD && investAmountNum <= maxInvestmentUSD;
  const ownershipShare = fundingGoal > 0 ? (investAmountNum / fundingGoal) * 100 : 0;

  const handleInvest = async () => {
    if (!address) return;
    
    const escrowVaultAddress = CONTRACTS.EscrowVault;
    
    setIsLoading(true);
    setError(null);
    setStep('approving');
    
    try {
      const token = TOKENS[selectedToken];
      const tokenAddress = token.address;
      
      // Use decimals from balances state (read from contract)
      const tokenDecimals = balances[selectedToken].decimals;
      
      if (tokenDecimals === 0) {
        throw new Error('Token decimals not loaded. Please wait and try again.');
      }
      
      // For stablecoins, investment amount in USD = token amount (1:1)
      const amountInTokenUnits = parseUnits(investAmountNum.toFixed(tokenDecimals), tokenDecimals);
      const projectIdBigInt = BigInt(project.id);
      
      console.log('Investment details:', {
        projectId: projectIdBigInt.toString(),
        token: selectedToken,
        tokenAddress,
        decimals: tokenDecimals,
        amount: amountInTokenUnits.toString(),
        escrowVault: escrowVaultAddress,
      });
      
      // Step 1: Check allowance
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, escrowVaultAddress],
      });
      
      console.log('Current allowance:', currentAllowance.toString());
      
      // Step 2: Approve if needed
      if (currentAllowance < amountInTokenUnits) {
        console.log('Approving tokens...');
        
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [escrowVaultAddress, amountInTokenUnits],
        });
        
        console.log('Approval tx:', approveHash);
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        
        if (approveReceipt.status === 'reverted') {
          throw new Error('Approval transaction failed');
        }
        
        console.log('Approval confirmed');
      }
      
      // Step 3: Invest with token
      setStep('investing');
      console.log('Calling investWithToken...');
      
      const investHash = await writeContractAsync({
        address: escrowVaultAddress,
        abi: EscrowVaultABI,
        functionName: 'investWithToken',
        args: [projectIdBigInt, tokenAddress, amountInTokenUnits],
      });
      
      console.log('Investment tx:', investHash);
      setTxHash(investHash);
      setStep('confirming');
      
      const investReceipt = await publicClient.waitForTransactionReceipt({ hash: investHash });
      
      // Check if transaction was successful
      if (investReceipt.status === 'reverted') {
        throw new Error('Investment transaction reverted on-chain. Please check if you are KYC verified and the project is accepting investments.');
      }
      
      console.log('Investment confirmed! Status:', investReceipt.status);
      
      setStep('success');
      
      // Refresh data after delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (err: any) {
      console.error('Investment error:', err);
      
      // Parse error message for better user feedback
      let errorMessage = err.message || 'Investment failed';
      
      if (errorMessage.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (errorMessage.includes('reverted')) {
        errorMessage = 'Transaction failed. Possible reasons: not KYC verified, token not accepted, or exceeds investment limits.';
      }
      
      setError(errorMessage);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Invest in Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {step === 'input' && (
          <>
            {/* Loading state */}
            {!balancesLoaded ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-400">Loading token balances...</p>
              </div>
            ) : (
              <>
                {/* Token Selection */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Select Stablecoin</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TOKENS) as TokenKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedToken(key)}
                        className={`p-3 rounded-lg border ${
                          selectedToken === key
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TOKENS[key].icon}</span>
                          <div className="text-left">
                            <div className="text-white font-medium">{TOKENS[key].symbol}</div>
                            <div className="text-xs text-gray-400">
                              {formatNumber(parseFloat(balances[key].formatted))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Investment Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      placeholder={`Min: $${minInvestmentUSD}`}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-8 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Min: {formatUSD(minInvestmentUSD)}</span>
                    <span>Max: {formatUSD(maxInvestmentUSD)}</span>
                  </div>
                </div>

                {/* Summary */}
                {investAmountNum > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">You Pay</span>
                      <span className="text-white">
                        {formatNumber(requiredTokenAmount)} {selectedToken}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">USD Value</span>
                      <span className="text-white">{formatUSD(investAmountNum)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ownership Share</span>
                      <span className="text-green-400">≈ {ownershipShare.toFixed(4)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Security Tokens</span>
                      <span className="text-white">
                        {formatNumber(investAmountNum)} {project.tokenInfo?.symbol || 'Tokens'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Validation Messages */}
                {investAmountNum > 0 && !hasEnoughBalance && (
                  <div className="text-red-400 text-sm mb-4">
                    Insufficient {selectedToken} balance. You have {formatNumber(parseFloat(balances[selectedToken].formatted))} {selectedToken}
                  </div>
                )}

                {investAmountNum > 0 && investAmountNum < minInvestmentUSD && (
                  <div className="text-yellow-400 text-sm mb-4">
                    Minimum investment is {formatUSD(minInvestmentUSD)}
                  </div>
                )}

                {/* Invest Button */}
                <button
                  onClick={handleInvest}
                  disabled={!isValidAmount || !hasEnoughBalance || isLoading}
                  className={`w-full py-3 rounded-lg font-semibold ${
                    isValidAmount && hasEnoughBalance
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {!address
                    ? 'Connect Wallet'
                    : !hasEnoughBalance
                    ? `Insufficient ${selectedToken}`
                    : !isValidAmount
                    ? 'Enter Valid Amount'
                    : `Invest ${formatUSD(investAmountNum)}`}
                </button>
              </>
            )}
          </>
        )}

        {/* Loading States */}
        {step === 'approving' && (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white">Approving {selectedToken}...</p>
            <p className="text-gray-400 text-sm">Please confirm in your wallet</p>
          </div>
        )}

        {step === 'investing' && (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white">Processing Investment...</p>
            <p className="text-gray-400 text-sm">Please confirm in your wallet</p>
          </div>
        )}

        {step === 'confirming' && (
          <div className="text-center py-8">
            <div className="animate-pulse w-12 h-12 bg-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              ⏳
            </div>
            <p className="text-white">Confirming Transaction...</p>
            {txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm hover:underline"
              >
                View on Explorer
              </a>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
              ✓
            </div>
            <p className="text-white text-lg font-semibold">Investment Successful!</p>
            <p className="text-gray-400 text-sm mb-4">
              You invested {formatUSD(investAmountNum)} in this project
            </p>
            {txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                View Transaction
              </a>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
              ✗
            </div>
            <p className="text-white text-lg font-semibold">Investment Failed</p>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => {
                setStep('input');
                setError(null);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { address, isConnected } = useAccount();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [userInvestment, setUserInvestment] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading project ID:', projectId);
      
      // Read USD decimals from USDC contract (reference stablecoin)
      const usdDecimals = await publicClient.readContract({
        address: TOKENS.USDC.address,
        abi: ERC20ABI,
        functionName: 'decimals',
      });
      
      console.log('USD decimals from USDC contract:', usdDecimals);
      const divisor = Math.pow(10, Number(usdDecimals));
      
      // Load project data from NFT contract
      const data = await publicClient.readContract({
        address: CONTRACTS.RWAProjectNFT,
        abi: RWAProjectNFTABI,
        functionName: 'getProject',
        args: [BigInt(projectId)],
      });
      
      console.log('Raw project data from NFT:', data);
      
      // Load funding data from EscrowVault for accurate funding info
      let escrowFunding: any = null;
      try {
        escrowFunding = await publicClient.readContract({
          address: CONTRACTS.EscrowVault,
          abi: EscrowVaultABI,
          functionName: 'getProjectFunding',
          args: [BigInt(projectId)],
        });
        console.log('Raw escrow funding data:', escrowFunding);
      } catch (err) {
        console.log('Could not load escrow funding data:', err);
      }
      
      // Use escrow data if available (more accurate), otherwise fall back to NFT data
      const fundingGoalRaw = escrowFunding ? escrowFunding.fundingGoal : data.fundingGoal;
      const totalRaisedRaw = escrowFunding ? escrowFunding.totalRaised : data.totalRaised;
      const minInvestmentRaw = escrowFunding ? escrowFunding.minInvestment : data.minInvestment;
      const maxInvestmentRaw = escrowFunding ? escrowFunding.maxInvestment : data.maxInvestment;
      
      console.log('Raw values:', {
        fundingGoal: fundingGoalRaw.toString(),
        totalRaised: totalRaisedRaw.toString(),
        minInvestment: minInvestmentRaw.toString(),
        maxInvestment: maxInvestmentRaw.toString(),
        divisor,
      });
      
      const projectData: ProjectData = {
        id: Number(data.id),
        owner: data.owner,
        metadataURI: data.metadataURI,
        fundingGoal: Number(fundingGoalRaw) / divisor,
        totalRaised: Number(totalRaisedRaw) / divisor,
        minInvestment: Number(minInvestmentRaw) / divisor,
        maxInvestment: Number(maxInvestmentRaw) / divisor,
        deadline: data.deadline,
        status: data.status,
        securityToken: escrowFunding?.securityToken || data.securityToken,
        escrowVault: data.escrowVault,
        createdAt: data.createdAt,
        usdDecimals: Number(usdDecimals),
      };
      
      console.log('Converted project data:', projectData);
      
      // Load token info if security token exists
      const tokenAddress = projectData.securityToken;
      if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          const [name, symbol, tokenDecimals, totalSupply] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: RWASecurityTokenABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: RWASecurityTokenABI,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: RWASecurityTokenABI,
              functionName: 'decimals',
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: RWASecurityTokenABI,
              functionName: 'totalSupply',
            }),
          ]);
          
          projectData.tokenInfo = {
            name: name as string,
            symbol: symbol as string,
            decimals: Number(tokenDecimals),
            totalSupply: totalSupply as bigint,
          };
        } catch (err) {
          console.log('Could not load token info:', err);
        }
      }
      
      // Load user investment from escrow vault
      if (address) {
        try {
          const investment = await publicClient.readContract({
            address: CONTRACTS.EscrowVault,
            abi: EscrowVaultABI,
            functionName: 'getInvestorAmount',
            args: [BigInt(projectId), address],
          });
          setUserInvestment(investment);
          console.log('User investment (raw):', investment.toString());
        } catch (err) {
          console.log('Could not load user investment:', err);
          setUserInvestment(BigInt(0));
        }
      }
      
      setProject(projectData);
      
    } catch (err: any) {
      console.error('Error loading project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, address]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Project</h2>
            <p className="text-gray-300">{error || 'Project not found'}</p>
            <Link href="/projects" className="text-blue-400 hover:underline mt-4 inline-block">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Values are already converted to proper numbers in loadProject
  const fundingGoal = project.fundingGoal;
  const totalRaised = project.totalRaised;
  const minInvestment = project.minInvestment;
  const maxInvestment = project.maxInvestment;
  const progress = fundingGoal > 0 ? Math.min((totalRaised / fundingGoal) * 100, 100) : 0;
  const deadline = new Date(Number(project.deadline) * 1000);
  
  // Allow investment for Pending (1) or Active (2) status
  const isActive = (project.status === 1 || project.status === 2) && deadline > new Date();
  
  // User investment uses same decimals as USD (from USDC)
  const divisor = Math.pow(10, project.usdDecimals);
  const userInvestmentUSD = Number(userInvestment) / divisor;

  const statusLabels: Record<number, string> = {
    0: 'Draft',
    1: 'Pending',
    2: 'Active',
    3: 'Funded',
    4: 'In Progress',
    5: 'Completed',
    6: 'Cancelled',
    7: 'Failed',
  };

  const statusColors: Record<number, string> = {
    0: 'bg-gray-500',
    1: 'bg-yellow-500',
    2: 'bg-green-500',
    3: 'bg-blue-500',
    4: 'bg-purple-500',
    5: 'bg-green-600',
    6: 'bg-red-500',
    7: 'bg-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/projects" className="text-blue-400 hover:underline mb-6 inline-block">
          ← Back to Projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {project.metadata?.name || project.tokenInfo?.name || `Project #${project.id}`}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm text-white ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </div>
                {project.tokenInfo && (
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">Token Symbol</div>
                    <div className="text-white font-mono text-lg">{project.tokenInfo.symbol}</div>
                  </div>
                )}
              </div>
              
              <p className="text-gray-300 mb-6">
                {project.metadata?.description || 'No description available'}
              </p>

              {/* Funding Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Funding Progress</span>
                  <span className="text-white">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{formatUSD(totalRaised)} raised</span>
                  <span className="text-gray-400">Goal: {formatUSD(fundingGoal)}</span>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Project Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Min Investment</div>
                  <div className="text-white font-semibold">{formatUSD(minInvestment)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Max Investment</div>
                  <div className="text-white font-semibold">{formatUSD(maxInvestment)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Deadline</div>
                  <div className="text-white font-semibold">{deadline.toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Project Owner</div>
                  <a
                    href={`${EXPLORER_URL}/address/${project.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                  </a>
                </div>
              </div>
            </div>

            {/* Smart Contracts */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Smart Contracts</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Security Token</span>
                  <a
                    href={`${EXPLORER_URL}/address/${project.securityToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    {project.securityToken.slice(0, 10)}...{project.securityToken.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Escrow Vault</span>
                  <a
                    href={`${EXPLORER_URL}/address/${CONTRACTS.EscrowVault}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono text-sm"
                  >
                    {CONTRACTS.EscrowVault.slice(0, 10)}...{CONTRACTS.EscrowVault.slice(-8)}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investment Card */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Invest Now</h2>
              
              {userInvestmentUSD > 0 && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <div className="text-green-400 text-sm">Your Investment</div>
                  <div className="text-white text-xl font-bold">{formatUSD(userInvestmentUSD)}</div>
                </div>
              )}
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Accepted</span>
                  <span className="text-white">USDC, USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Investment</span>
                  <span className="text-white">{formatUSD(minInvestment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Deadline</span>
                  <span className="text-white">{deadline.toLocaleDateString()}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowInvestModal(true)}
                disabled={!isConnected || !isActive}
                className={`w-full py-3 rounded-lg font-semibold ${
                  isConnected && isActive
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {!isConnected
                  ? 'Connect Wallet to Invest'
                  : !isActive
                  ? 'Investment Closed'
                  : 'Invest with Stablecoin'}
              </button>
              
              {/* Accepted Currencies */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-2xl">💵</span>
                  <span className="text-sm">USDC</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-2xl">💲</span>
                  <span className="text-sm">USDT</span>
                </div>
              </div>
            </div>

            {/* Token Info */}
            {project.tokenInfo && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-4">Security Token</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white">{project.tokenInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Symbol</span>
                    <span className="text-white font-mono">{project.tokenInfo.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Supply</span>
                    <span className="text-white">
                      {formatNumber(Number(formatUnits(project.tokenInfo.totalSupply, project.tokenInfo.decimals)))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Invest Modal */}
      {showInvestModal && project && (
        <InvestModal
          project={project}
          onClose={() => setShowInvestModal(false)}
          onSuccess={() => {
            setShowInvestModal(false);
            loadProject();
          }}
        />
      )}
    </div>
  );
}
