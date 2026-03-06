// src/app/tokenize/create/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  usePublicClient,
  useChainId
} from 'wagmi';
import { formatUnits, parseUnits, Address, zeroAddress } from 'viem';
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Settings,
  Send,
  Wallet,
  Globe,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ERC20ABI } from '@/config/abis';

// Types
interface TokenizationApplication {
  id: string;
  user_address: string;
  asset_type: string;
  asset_name: string;
  asset_description: string;
  estimated_value: number;
  documentation_url?: string;
  status: string;
  // Payment info
  fee_amount?: number;
  fee_currency?: string;
  fee_paid_at?: string;
  fee_tx_hash?: string;
  // Options chosen during application
  needs_escrow?: boolean;
  needs_dividends?: boolean;
  funding_goal?: number;
  funding_deadline?: string;
  // Token details (if pre-filled)
  token_name?: string;
  token_symbol?: string;
  desired_token_supply?: number;
  token_price_estimate?: number;
  created_at: string;
  updated_at: string;
}

interface DeploymentResult {
  nftContract: Address;
  tokenContract: Address;
  escrowContract?: Address;
  dividendModule?: Address;
}

// Factory ABI for tokenization
const FACTORY_ABI = [
  {
    name: 'deployNFTAndToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'tokenURI', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' }
    ],
    outputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenContract', type: 'address' }
    ]
  },
  {
    name: 'deployWithEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'tokenURI', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' },
      { name: 'fundingGoal', type: 'uint256' },
      { name: 'fundingDeadline', type: 'uint256' }
    ],
    outputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenContract', type: 'address' },
      { name: 'escrowContract', type: 'address' }
    ]
  },
  {
    name: 'addDividendModule',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenContract', type: 'address' }
    ],
    outputs: [
      { name: 'dividendModule', type: 'address' }
    ]
  },
  {
    name: 'bundleFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'escrowFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'dividendFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getDeployment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'deploymentId', type: 'uint256' }],
    outputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenContract', type: 'address' },
      { name: 'escrowContract', type: 'address' },
      { name: 'dividendModule', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'createdAt', type: 'uint256' }
    ]
  }
] as const;

// Step definitions
const STEPS = [
  { id: 1, name: 'Token Details', icon: FileText },
  { id: 2, name: 'Media & Files', icon: ImageIcon },
  { id: 3, name: 'Review & Deploy', icon: Send }
];

export default function TokenCreatePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
  const deploymentHandledRef = useRef(false);
  
  // Chain config hook for multichain support
  const {
    chainId,
    chainName,
    contracts,
    fees,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  // Derive contract addresses from chain config
  const factoryAddress = useMemo(() => 
    contracts?.RWATokenizationFactory as Address | undefined,
    [contracts]
  );

  const usdcAddress = useMemo(() => 
    (contracts as any)?.USDC as Address | undefined,
    [contracts]
  );

  const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS as Address | undefined;

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState<TokenizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '1000000',
    pricePerToken: '1',
    description: '',
    imageUrl: '',
    documentUrl: '',
    useEscrow: true,
    fundingGoal: '100000',
    fundingDeadline: '',
    addDividends: false
  });

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'uploading' | 'approving' | 'deploying' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [deployedContracts, setDeployedContracts] = useState<DeploymentResult | null>(null);
  const [metadataUri, setMetadataUri] = useState<string>('');

  // Fee state
  const [contractFees, setContractFees] = useState({
    bundleFee: BigInt(0),
    escrowFeePercent: 0,
    dividendFeePercent: 0
  });

  // Balance state
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [usdcAllowance, setUsdcAllowance] = useState<bigint>(BigInt(0));

  // Transaction receipt
  const { data: txReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash
  });

  // Load application data
  const loadApplication = useCallback(async () => {
    if (!applicationId || !address) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        headers: {
          'x-wallet-address': address
        }
      });
      if (!response.ok) throw new Error('Failed to load application');
      
      const data = await response.json();
      
      // Check status - must be approved AND paid
      if (data.status !== 'approved') {
        setError('This application must be approved before creating tokens');
        return;
      }
      
      if (!data.fee_paid_at && !data.fee_tx_hash) {
        setError('Payment must be completed before creating tokens');
        return;
      }
      
      setApplication(data);
      
      // Pre-fill form with application data
      setFormData(prev => ({
        ...prev,
        tokenName: data.token_name || data.asset_name || '',
        tokenSymbol: data.token_symbol || (data.asset_name || '').substring(0, 4).toUpperCase(),
        totalSupply: String(data.desired_token_supply || 1000000),
        pricePerToken: String(data.token_price_estimate || 1),
        description: data.asset_description || '',
        // Options from application - not editable
        useEscrow: data.needs_escrow || false,
        fundingGoal: String(data.funding_goal || data.estimated_value || 100000),
        fundingDeadline: data.funding_deadline || '',
        addDividends: data.needs_dividends || false
      }));
      
    } catch (err) {
      console.error('Error loading application:', err);
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [applicationId, address]);

  // Load contract fees
  const loadFees = useCallback(async () => {
    // Use default fees - don't try to read from contract since it's not deployed/initialized
    setContractFees({
      bundleFee: BigInt(100000000), // 100 USDC (6 decimals)
      escrowFeePercent: 1,
      dividendFeePercent: 0.5
    });
    
    // Optionally try to read from contract, but don't fail if it doesn't work
    if (!publicClient || !factoryAddress || !isDeployed) return;
    
    try {
      const bundleFee = await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'bundleFee'
      });
      
      setContractFees(prev => ({
        ...prev,
        bundleFee
      }));
    } catch (err) {
      // Contract doesn't have bundleFee or isn't initialized - use defaults
      console.warn('Could not read bundleFee from contract, using defaults');
    }
  }, [publicClient, factoryAddress, isDeployed]);


  // Load USDC balance and allowance
  const loadBalances = useCallback(async () => {
    if (!publicClient || !address || !usdcAddress || !factoryAddress) return;
    
    try {
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({
          address: usdcAddress,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address]
        }),
        publicClient.readContract({
          address: usdcAddress,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [address, factoryAddress]
        })
      ]);
      
      setUsdcBalance(balance as bigint);
      setUsdcAllowance(allowance as bigint);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  }, [publicClient, address, usdcAddress, factoryAddress]);

  // Effects
  useEffect(() => {
  console.log('txReceipt changed:', txReceipt?.status);
}, [txReceipt]);

useEffect(() => {
  console.log('application changed');
}, [application]);

useEffect(() => {
  console.log('contractFees changed');
}, [contractFees]);

useEffect(() => {
  loadApplication();
}, [loadApplication]);

useEffect(() => {
  loadFees();
}, [loadFees]);

useEffect(() => {
  loadBalances();
}, [loadBalances]);

  useEffect(() => {
    // Guard: only run if we have a successful receipt and haven't handled it yet
    if (!txReceipt) return;
    if (txReceipt.status !== 'success') return;
    if (deploymentHandledRef.current) return;
    if (!application) return;
    
    const handleDeploymentSuccess = async () => {
      deploymentHandledRef.current = true;
      
      try {
        // Parse deployment events from receipt
        const deployed: DeploymentResult = {
          nftContract: zeroAddress,
          tokenContract: zeroAddress
        };
        
        // Record deployment via API
        await fetch(`/api/tokenization/${applicationId}/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash,
            chainId,
            contracts: deployed,
            metadataUri
          })
        });
        
        setDeployedContracts(deployed);
        setDeploymentStatus('success');
        
      } catch (err) {
        console.error('Error recording deployment:', err);
        deploymentHandledRef.current = false; // Allow retry on error
      } finally {
        setIsDeploying(false);
      }
    };
    
    handleDeploymentSuccess();
  // Only depend on txReceipt.status to prevent re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txReceipt?.status]);
  // Calculate total fee
  const totalFee = useMemo(() => {
    return contractFees.bundleFee;
  }, [contractFees.bundleFee]);

  const formattedTotalFee = useMemo(() => 
    formatUnits(totalFee, 6),
    [totalFee]
  );

  const hasInsufficientBalance = useMemo(() => 
    usdcBalance < totalFee,
    [usdcBalance, totalFee]
  );

  const needsApproval = useMemo(() => 
    usdcAllowance < totalFee,
    [usdcAllowance, totalFee]
  );

  // File upload handler
  const handleFileUpload = async (file: File, type: 'image' | 'document'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to upload file');
    
    const data = await response.json();
    return data.url;
  };

  // Upload metadata to IPFS
  const uploadMetadata = async (): Promise<string> => {
    const metadata = {
      name: formData.tokenName,
      symbol: formData.tokenSymbol,
      description: formData.description,
      image: formData.imageUrl,
      external_url: formData.documentUrl,
      attributes: [
        { trait_type: 'Total Supply', value: formData.totalSupply },
        { trait_type: 'Price Per Token', value: formData.pricePerToken },
        { trait_type: 'Asset Type', value: application?.asset_type || 'Unknown' },
        { trait_type: 'Chain', value: chainName },
        { trait_type: 'Chain ID', value: chainId.toString() }
      ]
    };
    
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata, type: 'metadata' })
    });
    
    if (!response.ok) throw new Error('Failed to upload metadata');
    
    const data = await response.json();
    return data.url;
  };

  // Handle USDC approval
  const handleApprove = async () => {
    if (!usdcAddress || !factoryAddress) return;
    
    try {
      setDeploymentStatus('approving');
      
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [factoryAddress, totalFee]
      });
      
      setTxHash(hash);
    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve USDC');
      setDeploymentStatus('error');
    }
  };

  // Handle deployment
  const handleDeploy = async () => {
    if (!factoryAddress || !isDeployed) {
      setError('Tokenization factory not available on this network');
      return;
    }
    
    if (isWrongChain) {
      setError('Please switch to the correct network');
      return;
    }
    
    try {
      setIsDeploying(true);
      setDeploymentStatus('uploading');
      setError(null);
      
      // Upload metadata to IPFS
      const tokenUri = await uploadMetadata();
      setMetadataUri(tokenUri);
      
      setDeploymentStatus('deploying');
      
      const totalSupplyWei = parseUnits(formData.totalSupply, 18);
      const pricePerTokenWei = parseUnits(formData.pricePerToken, 6); // USDC decimals
      
      let hash: `0x${string}`;
      
      if (formData.useEscrow) {
        const fundingGoalWei = parseUnits(formData.fundingGoal, 6);
        const deadlineTimestamp = BigInt(Math.floor(new Date(formData.fundingDeadline).getTime() / 1000));
        
        hash = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'deployWithEscrow',
          args: [
            formData.tokenName,
            formData.tokenSymbol,
            tokenUri,
            totalSupplyWei,
            pricePerTokenWei,
            fundingGoalWei,
            deadlineTimestamp
          ]
        });
      } else {
        hash = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'deployNFTAndToken',
          args: [
            formData.tokenName,
            formData.tokenSymbol,
            tokenUri,
            totalSupplyWei,
            pricePerTokenWei
          ]
        });
      }
      
      setTxHash(hash);
      
    } catch (err: any) {
      console.error('Deployment error:', err);
      
      if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
        setError('Transaction was rejected');
      } else if (err.message?.includes('insufficient funds')) {
        setError(`Insufficient ${nativeCurrency} for gas fees`);
      } else {
        setError(err.message || 'Deployment failed');
      }
      
      setDeploymentStatus('error');
      setIsDeploying(false);
    }
  };
  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId as any);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // Form handlers
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const url = await handleFileUpload(file, 'image');
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError('Failed to upload image');
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const url = await handleFileUpload(file, 'document');
      setFormData(prev => ({ ...prev, documentUrl: url }));
    } catch (err) {
      setError('Failed to upload document');
    }
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.tokenName && formData.tokenSymbol && formData.totalSupply && formData.pricePerToken);
      case 2:
        return true; // Media is optional
      case 3:
        return isStepValid(1); // Just need token details to be valid
      default:
        return false;
    }
  };

  // Explorer URL helpers
  const getTxUrl = (hash: string) => `${explorerUrl}/tx/${hash}`;
  const getAddressUrl = (addr: string) => `${explorerUrl}/address/${addr}`;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading application...</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <Wallet className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to create tokens.
          </p>
        </div>
      </div>
    );
  }

  // Network not supported
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <Globe className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
          <p className="text-gray-400 mb-6">
            Token creation is not available on {chainName}. Please switch to a supported network.
          </p>
          <div className="space-y-2">
            {deployedChains.map((chainInfo) => (
              <button
                key={chainInfo.chain.id}
                onClick={() => handleSwitchNetwork(chainInfo.chain.id)}
                disabled={isSwitching}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Switch to {chainInfo.name}
                {chainInfo.testnet && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    Testnet
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wrong Network</h2>
          <p className="text-gray-400 mb-6">
            Please switch to {chainName} to continue.
          </p>
          <button
            onClick={() => handleSwitchNetwork(chainId)}
            disabled={isSwitching}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Switch to {chainName}
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/tokenize"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (deploymentStatus === 'success' && deployedContracts) {
    return (
      <div className="min-h-screen bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">Token Created!</h2>
            <p className="text-gray-400 mb-8">
              Your {formData.tokenName} token has been successfully deployed on {chainName}.
            </p>

            {/* Network Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isTestnet 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {chainName} {isTestnet ? '(Testnet)' : '(Mainnet)'}
              </span>
            </div>

            {/* Deployed Contracts */}
            <div className="bg-gray-900 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Deployed Contracts</h3>
              
              <div className="space-y-3">
                {deployedContracts.nftContract && deployedContracts.nftContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">NFT Contract</span>
                    <a
                      href={getAddressUrl(deployedContracts.nftContract)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm"
                    >
                      {deployedContracts.nftContract.slice(0, 8)}...{deployedContracts.nftContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {deployedContracts.tokenContract && deployedContracts.tokenContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Token Contract</span>
                    <a
                      href={getAddressUrl(deployedContracts.tokenContract)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm"
                    >
                      {deployedContracts.tokenContract.slice(0, 8)}...{deployedContracts.tokenContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {deployedContracts.escrowContract && deployedContracts.escrowContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Escrow Contract</span>
                    <a
                      href={getAddressUrl(deployedContracts.escrowContract)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm"
                    >
                      {deployedContracts.escrowContract.slice(0, 8)}...{deployedContracts.escrowContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {txHash && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Transaction</span>
                    <a
                      href={getTxUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/tokenize`}
                className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors text-center"
              >
                Back to Applications
              </Link>
              <Link
                href={`/crowdfunding`}
                className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors text-center"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/tokenize"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Create Token</h1>
              <p className="text-gray-400 mt-1">
                Deploy your tokenized asset on {chainName}
              </p>
            </div>
            
            {/* Network Badge */}
            <div className={`px-4 py-2 rounded-lg ${
              isTestnet 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">{chainName}</span>
                {isTestnet && <span className="text-xs">(Testnet)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === step.id
                      ? 'bg-purple-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-gray-800 rounded-2xl p-8">
          {/* Step 1: Token Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Token Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 mb-2">Token Name *</label>
                  <input
                    type="text"
                    value={formData.tokenName}
                    onChange={(e) => handleInputChange('tokenName', e.target.value)}
                    placeholder="e.g., Real Estate Token"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Token Symbol *</label>
                  <input
                    type="text"
                    value={formData.tokenSymbol}
                    onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
                    placeholder="e.g., RET"
                    maxLength={8}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Total Supply *</label>
                  <input
                    type="number"
                    value={formData.totalSupply}
                    onChange={(e) => handleInputChange('totalSupply', e.target.value)}
                    placeholder="1000000"
                    min="1"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Price per Token (USDC) *</label>
                  <input
                    type="number"
                    value={formData.pricePerToken}
                    onChange={(e) => handleInputChange('pricePerToken', e.target.value)}
                    placeholder="1.00"
                    min="0.01"
                    step="0.01"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your tokenized asset..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Show selected options (read-only) */}
              <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Selected Features (from application)</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.useEscrow && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                      Escrow Enabled
                    </span>
                  )}
                  {formData.addDividends && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                      Dividends Enabled
                    </span>
                  )}
                  {!formData.useEscrow && !formData.addDividends && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
                      Standard Token
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Media & Files */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Media & Files</h2>
              
              <div>
                <label className="block text-gray-400 mb-2">Token Image</label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                  {formData.imageUrl ? (
                    <div className="space-y-4">
                      <img
                        src={formData.imageUrl}
                        alt="Token"
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                      <button
                        onClick={() => handleInputChange('imageUrl', '')}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Supporting Documents</label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                  {formData.documentUrl ? (
                    <div className="space-y-4">
                      <FileText className="h-12 w-12 text-purple-500 mx-auto" />
                      <a
                        href={formData.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300"
                      >
                        View Document
                      </a>
                      <button
                        onClick={() => handleInputChange('documentUrl', '')}
                        className="block mx-auto text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">Upload supporting documentation</p>
                      <p className="text-gray-500 text-sm">PDF, DOC up to 50MB</p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Deploy (was Step 4) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Review & Deploy</h2>
              
              {/* Summary */}
              <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-medium text-white">Token Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white">{formData.tokenName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Symbol</p>
                    <p className="text-white">{formData.tokenSymbol || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Supply</p>
                    <p className="text-white">{Number(formData.totalSupply).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Price per Token</p>
                    <p className="text-white">${formData.pricePerToken} USDC</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Network</p>
                    <p className="text-white flex items-center gap-2">
                      {chainName}
                      {isTestnet && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                          Testnet
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Features</p>
                    <p className="text-white">
                      {formData.useEscrow ? 'Escrow' : ''}
                      {formData.useEscrow && formData.addDividends ? ', ' : ''}
                      {formData.addDividends ? 'Dividends' : ''}
                      {!formData.useEscrow && !formData.addDividends ? 'Standard' : ''}
                    </p>
                  </div>
                </div>

                {/* Escrow Details if enabled */}
                {formData.useEscrow && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Escrow Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Funding Goal</p>
                        <p className="text-white">${Number(formData.fundingGoal).toLocaleString()} USDC</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Deadline</p>
                        <p className="text-white">{formData.fundingDeadline || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Confirmed Badge */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-green-400 font-medium">Payment Confirmed</p>
                  <p className="text-green-400/70 text-sm">
                    Fee of ${application?.fee_amount?.toLocaleString() || '0'} {application?.fee_currency || 'USDC'} has been paid
                  </p>
                </div>
              </div>
              
              {/* Transaction Status */}
              {(isDeploying || deploymentStatus !== 'idle') && (
                <div className="bg-gray-900 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Deployment Progress</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {deploymentStatus === 'uploading' ? (
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                      ) : deploymentStatus !== 'idle' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={deploymentStatus === 'uploading' ? 'text-white' : 'text-gray-400'}>
                        Uploading metadata to IPFS
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {deploymentStatus === 'deploying' || isConfirming ? (
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                      ) : deploymentStatus === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={deploymentStatus === 'deploying' ? 'text-white' : 'text-gray-400'}>
                        Deploying contracts
                      </span>
                    </div>
                  </div>
                  
                  {txHash && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <a
                        href={getTxUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-2 text-sm"
                      >
                        View transaction on Explorer
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isDeploying}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg text-white font-medium transition-colors"
            >
              Previous
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                disabled={!isStepValid(currentStep)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying || !isStepValid(3)}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                {isDeploying || isWritePending || isConfirming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {deploymentStatus === 'uploading' ? 'Uploading...' : 
                    deploymentStatus === 'deploying' ? 'Deploying...' : 
                    isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Deploy Token
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
