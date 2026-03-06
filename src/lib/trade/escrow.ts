// src/lib/trade/escrow.ts
import { useCallback, useState } from 'react';
import { 
  useAccount, 
  usePublicClient, 
  useWalletClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits, formatUnits, Address, Abi } from 'viem';

// =============================================================================
// CONTRACT ABI (Simplified for key functions)
// =============================================================================

export const TRADE_ESCROW_ABI = [
  {
    name: 'createDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealId', type: 'string' },
      { name: '_seller', type: 'address' },
      { name: '_paymentToken', type: 'address' },
      { name: '_totalAmount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'addMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealIndex', type: 'uint256' },
      { name: '_name', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_releasePercentage', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'fundDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_dealIndex', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'completeMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
      { name: '_documentHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'approveMilestone',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealIndex', type: 'uint256' },
      { name: '_milestoneIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'initiateDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealIndex', type: 'uint256' },
      { name: '_reason', type: 'string' },
      { name: '_claimedAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'cancelDeal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dealIndex', type: 'uint256' },
      { name: '_reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getDeal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_dealIndex', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'dealId', type: 'string' },
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'paymentToken', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'depositedAmount', type: 'uint256' },
          { name: 'releasedAmount', type: 'uint256' },
          { name: 'refundedAmount', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'fundedAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
          { name: 'disputeDeadline', type: 'uint256' },
          { name: 'buyerKycVerified', type: 'bool' },
          { name: 'sellerKycVerified', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getDealMilestones',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_dealIndex', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'releasePercentage', type: 'uint256' },
          { name: 'releaseAmount', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'documentHash', type: 'bytes32' },
          { name: 'completedAt', type: 'uint256' },
          { name: 'releasedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getDealByDealId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_dealId', type: 'string' }],
    outputs: [
      { name: '', type: 'tuple', components: [] }, // Simplified
      { name: '', type: 'uint256' },
    ],
  },
  {
    name: 'dealIdToIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ERC20 ABI for token approvals
export const ERC20_ABI = [
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
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// =============================================================================
// TYPES
// =============================================================================

export interface EscrowDeal {
  dealId: string;
  buyer: Address;
  seller: Address;
  paymentToken: Address;
  totalAmount: bigint;
  depositedAmount: bigint;
  releasedAmount: bigint;
  refundedAmount: bigint;
  status: number;
  createdAt: bigint;
  fundedAt: bigint;
  completedAt: bigint;
  disputeDeadline: bigint;
  buyerKycVerified: boolean;
  sellerKycVerified: boolean;
}

export interface EscrowMilestone {
  name: string;
  description: string;
  releasePercentage: bigint;
  releaseAmount: bigint;
  status: number;
  documentHash: `0x${string}`;
  completedAt: bigint;
  releasedAt: bigint;
}

export enum DealStatus {
  Created = 0,
  Funded = 1,
  InProgress = 2,
  Completed = 3,
  Disputed = 4,
  Cancelled = 5,
  Refunded = 6,
}

export enum MilestoneStatus {
  Pending = 0,
  InProgress = 1,
  AwaitingApproval = 2,
  Approved = 3,
  Released = 4,
  Disputed = 5,
  Failed = 6,
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export const ESCROW_CONTRACTS: Record<number, Address> = {
  1: '0x0000000000000000000000000000000000000000', // Mainnet (deploy and update)
  43114: '0x0000000000000000000000000000000000000000', // Avax
  42161: '0x0000000000000000000000000000000000000000', // Arbitrum
  11155111: '0x0000000000000000000000000000000000000000', // Sepolia testnet
};

export const TOKEN_ADDRESSES: Record<string, Record<number, Address>> = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    43114: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    43114: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
};

// =============================================================================
// HOOKS
// =============================================================================

export function useEscrowContract(chainId?: number) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, chain } = useAccount();
  
  const activeChainId = chainId || chain?.id || 1;
  const escrowAddress = ESCROW_CONTRACTS[activeChainId];

  // Read deal by index
  const readDeal = useCallback(async (dealIndex: bigint): Promise<EscrowDeal | null> => {
    if (!publicClient || !escrowAddress) return null;
    
    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'getDeal',
        args: [dealIndex],
      });
      
      return result as unknown as EscrowDeal;
    } catch (error) {
      console.error('Error reading deal:', error);
      return null;
    }
  }, [publicClient, escrowAddress]);

  // Read deal milestones
  const readMilestones = useCallback(async (dealIndex: bigint): Promise<EscrowMilestone[]> => {
    if (!publicClient || !escrowAddress) return [];
    
    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'getDealMilestones',
        args: [dealIndex],
      });
      
      return result as unknown as EscrowMilestone[];
    } catch (error) {
      console.error('Error reading milestones:', error);
      return [];
    }
  }, [publicClient, escrowAddress]);

  // Get deal index by deal ID
  const getDealIndex = useCallback(async (dealId: string): Promise<bigint | null> => {
    if (!publicClient || !escrowAddress) return null;
    
    try {
      const result = await publicClient.readContract({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'dealIdToIndex',
        args: [dealId],
      });
      
      return result as bigint;
    } catch (error) {
      console.error('Error getting deal index:', error);
      return null;
    }
  }, [publicClient, escrowAddress]);

  return {
    escrowAddress,
    readDeal,
    readMilestones,
    getDealIndex,
    publicClient,
    walletClient,
    address,
    chainId: activeChainId,
  };
}

export function useCreateDeal() {
  const { escrowAddress, address, chainId } = useEscrowContract();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDeal = useCallback(async ({
    dealId,
    seller,
    paymentToken,
    totalAmount,
    tokenDecimals = 6,
  }: {
    dealId: string;
    seller: Address;
    paymentToken: Address;
    totalAmount: number;
    tokenDecimals?: number;
  }) => {
    if (!escrowAddress || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountInWei = parseUnits(totalAmount.toString(), tokenDecimals);

      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'createDeal',
        args: [dealId, seller, paymentToken, amountInWei],
      });

      return hash;
    } catch (err: any) {
      const message = err.message || 'Failed to create deal';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [escrowAddress, address, writeContractAsync]);

  return { createDeal, isLoading, error };
}

export function useFundDeal() {
  const { escrowAddress, address, chainId } = useEscrowContract();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'approving' | 'funding'>('idle');

  const fundDeal = useCallback(async ({
    dealIndex,
    paymentToken,
    amount,
    tokenDecimals = 6,
  }: {
    dealIndex: bigint;
    paymentToken: Address;
    amount: number;
    tokenDecimals?: number;
  }) => {
    if (!escrowAddress || !address || !publicClient) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountInWei = parseUnits(amount.toString(), tokenDecimals);
      
      // Add platform fee (0.5%)
      const platformFee = (amountInWei * BigInt(50)) / BigInt(10000);
      const totalAmount = amountInWei + platformFee;

      // Check allowance
      const allowance = await publicClient.readContract({
        address: paymentToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, escrowAddress],
      });

      // Approve if needed
      if (allowance < totalAmount) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: paymentToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [escrowAddress, totalAmount],
        });

        // Wait for approval
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Fund the deal
      setStep('funding');
      const fundHash = await writeContractAsync({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'fundDeal',
        args: [dealIndex],
      });

      setStep('idle');
      return fundHash;
    } catch (err: any) {
      const message = err.message || 'Failed to fund deal';
      setError(message);
      setStep('idle');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [escrowAddress, address, publicClient, writeContractAsync]);

  return { fundDeal, isLoading, error, step };
}

export function useApproveMilestone() {
  const { escrowAddress, address } = useEscrowContract();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveMilestone = useCallback(async ({
    dealIndex,
    milestoneIndex,
  }: {
    dealIndex: bigint;
    milestoneIndex: bigint;
  }) => {
    if (!escrowAddress || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'approveMilestone',
        args: [dealIndex, milestoneIndex],
      });

      return hash;
    } catch (err: any) {
      const message = err.message || 'Failed to approve milestone';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [escrowAddress, address, writeContractAsync]);

  return { approveMilestone, isLoading, error };
}

export function useCompleteMilestone() {
  const { escrowAddress, address } = useEscrowContract();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeMilestone = useCallback(async ({
    dealIndex,
    milestoneIndex,
    documentHash,
  }: {
    dealIndex: bigint;
    milestoneIndex: bigint;
    documentHash: `0x${string}`;
  }) => {
    if (!escrowAddress || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'completeMilestone',
        args: [dealIndex, milestoneIndex, documentHash],
      });

      return hash;
    } catch (err: any) {
      const message = err.message || 'Failed to complete milestone';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [escrowAddress, address, writeContractAsync]);

  return { completeMilestone, isLoading, error };
}

export function useInitiateDispute() {
  const { escrowAddress, address } = useEscrowContract();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateDispute = useCallback(async ({
    dealIndex,
    reason,
    claimedAmount,
    tokenDecimals = 6,
  }: {
    dealIndex: bigint;
    reason: string;
    claimedAmount: number;
    tokenDecimals?: number;
  }) => {
    if (!escrowAddress || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountInWei = parseUnits(claimedAmount.toString(), tokenDecimals);

      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: TRADE_ESCROW_ABI,
        functionName: 'initiateDispute',
        args: [dealIndex, reason, amountInWei],
      });

      return hash;
    } catch (err: any) {
      const message = err.message || 'Failed to initiate dispute';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [escrowAddress, address, writeContractAsync]);

  return { initiateDispute, isLoading, error };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatTokenAmount(amount: bigint, decimals: number = 6): string {
  return formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string | number, decimals: number = 6): bigint {
  return parseUnits(amount.toString(), decimals);
}

export function getDealStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    [DealStatus.Created]: 'Created',
    [DealStatus.Funded]: 'Funded',
    [DealStatus.InProgress]: 'In Progress',
    [DealStatus.Completed]: 'Completed',
    [DealStatus.Disputed]: 'Disputed',
    [DealStatus.Cancelled]: 'Cancelled',
    [DealStatus.Refunded]: 'Refunded',
  };
  return labels[status] || 'Unknown';
}

export function getMilestoneStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    [MilestoneStatus.Pending]: 'Pending',
    [MilestoneStatus.InProgress]: 'In Progress',
    [MilestoneStatus.AwaitingApproval]: 'Awaiting Approval',
    [MilestoneStatus.Approved]: 'Approved',
    [MilestoneStatus.Released]: 'Released',
    [MilestoneStatus.Disputed]: 'Disputed',
    [MilestoneStatus.Failed]: 'Failed',
  };
  return labels[status] || 'Unknown';
}
