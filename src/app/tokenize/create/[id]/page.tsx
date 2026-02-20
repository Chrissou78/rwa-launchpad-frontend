// src/app/tokenize/create/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  payment_status: string;
  payment_amount?: number;
  payment_tx_hash?: string;
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
  { id: 3, name: 'Options', icon: Settings },
  { id: 4, name: 'Review & Deploy', icon: Send }
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
    getDeployedChains
  } = useChainConfig();

  // Derive contract addresses from chain config
  const factoryAddress = useMemo(() => 
    contracts?.RWATokenizationFactory as Address | undefined,
    [contracts]
  );

  const usdcAddress = useMemo(() => 
    contracts?.USDC as Address | undefined,
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
    escrowFee: BigInt(0),
    dividendFee: BigInt(0)
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
    if (!applicationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tokenization/${applicationId}`);
      if (!response.ok) throw new Error('Failed to load application');
      
      const data = await response.json();
      
      if (data.status !== 'approved' || data.payment_status !== 'paid') {
        setError('This application must be approved and paid before creating tokens');
        return;
      }
      
      setApplication(data);
      
      // Pre-fill form with application data
      setFormData(prev => ({
        ...prev,
        tokenName: data.asset_name || '',
        tokenSymbol: (data.asset_name || '').substring(0, 4).toUpperCase(),
        description: data.asset_description || '',
        fundingGoal: String(data.estimated_value || 100000)
      }));
      
    } catch (err) {
      console.error('Error loading application:', err);
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  // Load contract fees
  const loadFees = useCallback(async () => {
    if (!publicClient || !factoryAddress || !isDeployed) return;
    
    try {
      const [bundleFee, escrowFee, dividendFee] = await Promise.all([
        publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'bundleFee'
        }),
        publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'escrowFee'
        }),
        publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'dividendFee'
        })
      ]);
      
      setContractFees({ bundleFee, escrowFee, dividendFee });
    } catch (err) {
      console.error('Error loading fees:', err);
      // Use default fees from config
      if (fees) {
        setContractFees({
          bundleFee: BigInt(fees.TOKENIZATION_FEE || 0),
          escrowFee: BigInt(fees.ESCROW_FEE || 0),
          dividendFee: BigInt(fees.DIVIDEND_FEE || 0)
        });
      }
    }
  }, [publicClient, factoryAddress, isDeployed, fees]);

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
    loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    if (txReceipt?.status === 'success') {
      handleDeploymentSuccess();
    }
  }, [txReceipt]);

  // Calculate total fee
  const totalFee = useMemo(() => {
    let fee = contractFees.bundleFee;
    if (formData.useEscrow) fee += contractFees.escrowFee;
    if (formData.addDividends) fee += contractFees.dividendFee;
    return fee;
  }, [contractFees, formData.useEscrow, formData.addDividends]);

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

  // Handle deployment success
  const handleDeploymentSuccess = async () => {
    if (!txReceipt || !application) return;
    
    try {
      // Parse deployment events from receipt
      // This would need to be adjusted based on actual event structure
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
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
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
        if (formData.useEscrow) {
          return !!(formData.fundingGoal && formData.fundingDeadline);
        }
        return true;
      case 4:
        return !hasInsufficientBalance && isStepValid(1) && isStepValid(3);
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
    const deployedChains = getDeployedChains();
    
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <Globe className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
          <p className="text-gray-400 mb-6">
            Token creation is not available on {chainName}. Please switch to a supported network.
          </p>
          <div className="space-y-2">
            {deployedChains.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleSwitchNetwork(chain.chainId)}
                disabled={isSwitching}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Switch to {chain.name}
                {chain.isTestnet && (
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

          {/* Step 3: Options */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Deployment Options</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-900/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.useEscrow}
                    onChange={(e) => handleInputChange('useEscrow', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-white font-medium">Enable Escrow</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Deploy with an escrow contract for milestone-based fund release. 
                      Additional fee: ${formatUnits(contractFees.escrowFee, 6)} USDC
                    </p>
                  </div>
                </label>
                
                {formData.useEscrow && (
                  <div className="ml-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-2">Funding Goal (USDC) *</label>
                      <input
                        type="number"
                        value={formData.fundingGoal}
                        onChange={(e) => handleInputChange('fundingGoal', e.target.value)}
                        placeholder="100000"
                        min="1000"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-2">Funding Deadline *</label>
                      <input
                        type="date"
                        value={formData.fundingDeadline}
                        onChange={(e) => handleInputChange('fundingDeadline', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
                
                <label className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-900/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.addDividends}
                    onChange={(e) => handleInputChange('addDividends', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-white font-medium">Add Dividend Module</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Enable dividend distribution to token holders. 
                      Additional fee: ${formatUnits(contractFees.dividendFee, 6)} USDC
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Review & Deploy */}
          {currentStep === 4 && (
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
              </div>
              
              {/* Fee Summary */}
              <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Fees</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Base Deployment Fee</span>
                    <span className="text-white">${formatUnits(contractFees.bundleFee, 6)} USDC</span>
                  </div>
                  
                  {formData.useEscrow && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Escrow Fee</span>
                      <span className="text-white">${formatUnits(contractFees.escrowFee, 6)} USDC</span>
                    </div>
                  )}
                  
                  {formData.addDividends && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Dividend Module Fee</span>
                      <span className="text-white">${formatUnits(contractFees.dividendFee, 6)} USDC</span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-gray-700 flex justify-between">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-white font-medium">${formattedTotalFee} USDC</span>
                  </div>
                </div>
                
                {/* Balance Info */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your USDC Balance</span>
                    <span className={hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}>
                      ${formatUnits(usdcBalance, 6)} USDC
                    </span>
                  </div>
                  
                  {hasInsufficientBalance && (
                    <div className="mt-2 bg-red-500/20 border border-red-500 rounded-lg p-3">
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Insufficient USDC balance. You need at least ${formattedTotalFee} USDC.
                      </p>
                    </div>
                  )}
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
                      {deploymentStatus === 'approving' ? (
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                      ) : ['deploying', 'success'].includes(deploymentStatus) ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={deploymentStatus === 'approving' ? 'text-white' : 'text-gray-400'}>
                        Approving USDC transfer
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
                        View transaction on {chainName.includes('Avalanche') ? 'SnowTrace' : 'Explorer'}
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
            
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                disabled={!isStepValid(currentStep)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors"
              >
                Next
              </button>
            ) : needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={hasInsufficientBalance || isDeploying || !isStepValid(4)}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                {isWritePending || isConfirming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    Approve USDC
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={hasInsufficientBalance || isDeploying || !isStepValid(4)}
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
