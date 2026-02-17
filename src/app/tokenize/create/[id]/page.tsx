// src/app/tokenize/create/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { 
  ArrowLeft, Coins, Image as ImageIcon, Lock, Upload, CheckCircle, 
  AlertCircle, Loader2, ExternalLink, Sparkles, FileText, DollarSign, 
  Info, ChevronRight, Package, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';
import { erc20Abi } from 'viem';

// ============ Types ============

interface TokenizationApplication {
  id: string;
  status: string;
  asset_name: string;
  asset_type: string;
  asset_description: string;
  company_name: string;
  estimated_value: number;
  desired_token_supply: number;
  needs_escrow: boolean;
  needs_dividends: boolean;
}

// ============ Constants ============

const FACTORY_ADDRESS = CONTRACTS.RWATokenizationFactory as `0x${string}`;
const USDC_ADDRESS = CONTRACTS.USDC as `0x${string}`;

const FEES = {
  base: 750,        // Project NFT + ERC3643 Token
  escrow: 250,      // Trade escrow
  dividend: 200,    // Dividend distributor
};

const STEPS = [
  { id: 'details', label: 'Token Details' },
  { id: 'media', label: 'Media' },
  { id: 'options', label: 'Options' },
  { id: 'review', label: 'Deploy' },
];

const ASSET_CATEGORIES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'art', label: 'Art & Collectibles' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'business', label: 'Business Equity' },
  { value: 'other', label: 'Other' },
];

// ============ ABI ============

const RWATokenizationFactoryABI = [
  {
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_symbol', type: 'string' },
      { name: '_category', type: 'string' },
      { name: '_tokenSupply', type: 'uint256' },
      { name: '_metadataURI', type: 'string' },
      { name: '_withEscrow', type: 'bool' },
      { name: '_withDividends', type: 'bool' },
    ],
    name: 'tokenizeAsset',
    outputs: [
      { name: 'tokenizationId', type: 'uint256' },
      { name: 'projectId', type: 'uint256' },
      { name: 'securityToken', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_deployer', type: 'address' }],
    name: 'isDeployerApproved',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getFees',
    outputs: [
      { name: '_baseFee', type: 'uint256' },
      { name: '_escrowFee', type: 'uint256' },
      { name: '_dividendFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_withEscrow', type: 'bool' },
      { name: '_withDividends', type: 'bool' },
    ],
    name: 'calculateFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ Component ============

export default function TokenCreationPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const applicationId = params.id as string;

  // State
  const [application, setApplication] = useState<TokenizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: 'real_estate',
    tokenSupply: '',
    description: '',
    
    // Media
    logoUrl: '',
    bannerUrl: '',
    
    // Options
    withEscrow: false,
    withDividends: false,
  });

  // Deployment state
  const [isApproving, setIsApproving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isUploadingMetadata, setIsUploadingMetadata] = useState(false);
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deployedAddresses, setDeployedAddresses] = useState<{
    tokenizationId?: string;
    projectId?: string;
    securityToken?: string;
  }>({});
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Read USDC allowance & balance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, FACTORY_ADDRESS] : undefined,
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: isApproved } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: RWATokenizationFactoryABI,
    functionName: 'isDeployerApproved',
    args: address ? [address] : undefined,
  });

  // Calculate total fee
  const totalFee = FEES.base + 
    (formData.withEscrow ? FEES.escrow : 0) + 
    (formData.withDividends ? FEES.dividend : 0);
  const totalFeeWei = parseUnits(totalFee.toString(), 6);

  // ============ Load Application ============

  const loadApplication = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        headers: { 'x-wallet-address': address },
      });

      if (!response.ok) throw new Error('Application not found');

      const data = await response.json();
      
      if (data.status !== 'creation_ready') {
        setError(`Application not ready for creation. Current status: ${data.status}`);
        return;
      }

      setApplication(data);
      setFormData(prev => ({
        ...prev,
        name: data.asset_name || '',
        symbol: generateSymbol(data.asset_name || ''),
        category: data.asset_type || 'real_estate',
        tokenSupply: data.desired_token_supply?.toString() || '1000000',
        description: data.asset_description || '',
        withEscrow: data.needs_escrow || false,
        withDividends: data.needs_dividends || false,
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [address, applicationId]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  // ============ Helpers ============

  function generateSymbol(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 5) || 'RWA';
  }

  function formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // ============ File Upload ============

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>, 
    field: 'logoUrl' | 'bannerUrl'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, [field]: data.url }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }

  // ============ Metadata Upload ============

  async function uploadMetadata(): Promise<string> {
    const metadata = {
      name: formData.name,
      symbol: formData.symbol,
      description: formData.description,
      image: formData.logoUrl,
      banner: formData.bannerUrl,
      category: formData.category,
      attributes: [
        { trait_type: 'Category', value: formData.category },
        { trait_type: 'Total Supply', value: formData.tokenSupply },
        { trait_type: 'Company', value: application?.company_name },
        { trait_type: 'Estimated Value', value: application?.estimated_value },
        { trait_type: 'Has Escrow', value: formData.withEscrow },
        { trait_type: 'Has Dividends', value: formData.withDividends },
      ],
      created_at: new Date().toISOString(),
    };

    const response = await fetch('/api/upload/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) throw new Error('Failed to upload metadata');
    
    const data = await response.json();
    return data.url;
  }

  // ============ Deploy ============

  async function handleDeploy() {
    if (!application || !address) return;

    try {
      setIsDeploying(true);
      setDeploymentError(null);

      // Check balance
      if (usdcBalance && usdcBalance < totalFeeWei) {
        throw new Error(`Insufficient USDC balance. Need ${formatUSD(totalFee)}`);
      }

      // Approve USDC if needed
      if (!usdcAllowance || usdcAllowance < totalFeeWei) {
        setIsApproving(true);
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [FACTORY_ADDRESS, totalFeeWei],
        });
        
        // Wait a bit for approval to be mined
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refetchAllowance();
        setIsApproving(false);
      }

      // Upload metadata to IPFS
      setIsUploadingMetadata(true);
      const metadataURI = await uploadMetadata();
      setIsUploadingMetadata(false);

      // Deploy via factory
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: RWATokenizationFactoryABI,
        functionName: 'tokenizeAsset',
        args: [
          formData.name,
          formData.symbol,
          formData.category,
          parseUnits(formData.tokenSupply, 18),
          metadataURI,
          formData.withEscrow,
          formData.withDividends,
        ],
      });

      setTxHash(hash);

      // Record deployment in database
      await fetch(`/api/tokenization/${applicationId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          txHash: hash,
          metadataURI,
          name: formData.name,
          symbol: formData.symbol,
          tokenSupply: formData.tokenSupply,
          category: formData.category,
          withEscrow: formData.withEscrow,
          withDividends: formData.withDividends,
        }),
      });

      setDeploymentSuccess(true);

    } catch (err) {
      console.error('Deploy error:', err);
      setDeploymentError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
      setIsApproving(false);
      setIsUploadingMetadata(false);
    }
  }

  // ============ Render: Loading ============

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  // ============ Render: Error ============

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto bg-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
            <p className="text-gray-400 mb-6">{error || 'Application not found'}</p>
            <Link 
              href="/tokenize" 
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Tokenize
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============ Render: Success ============

  if (deploymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Asset Tokenized Successfully!
            </h2>
            <p className="text-gray-400 mb-6">
              Your RWA project and security tokens have been created.
            </p>
            
            {txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
              >
                View Transaction <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* What was created */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-white font-medium mb-3">What was created:</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  Project NFT (RWAProjectNFT)
                </li>
                <li className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-400" />
                  {Number(formData.tokenSupply).toLocaleString()} {formData.symbol} tokens (ERC3643)
                </li>
                {formData.withEscrow && (
                  <li className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400" />
                    Escrow Vault for trading
                  </li>
                )}
                {formData.withDividends && (
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                    Dividend Distributor
                  </li>
                )}
              </ul>
            </div>

            {/* Token Info */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <p className="text-gray-400">Token Name</p>
                  <p className="text-white font-medium">{formData.name}</p>
                </div>
                <div className="text-left">
                  <p className="text-gray-400">Symbol</p>
                  <p className="text-white font-medium">{formData.symbol}</p>
                </div>
                <div className="text-left">
                  <p className="text-gray-400">Total Supply</p>
                  <p className="text-white font-medium">
                    {Number(formData.tokenSupply).toLocaleString()}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-gray-400">Category</p>
                  <p className="text-white font-medium capitalize">
                    {formData.category.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/portfolio"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                View Portfolio
              </Link>
              <Link
                href="/tokenize"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Back to Tokenize
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ Render: Main Form ============

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/tokenize" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Applications
          </Link>
          <h1 className="text-3xl font-bold text-white">Create Your Tokenized Asset</h1>
          <p className="text-gray-400 mt-2">
            Deploy your RWA project with ERC3643 compliant security tokens
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8 gap-1 sm:gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => i < currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm sm:text-base transition-colors ${
                  i === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : i < currentStep 
                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 cursor-pointer' 
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />
              )}
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Error Message */}
          {deploymentError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Deployment Failed</p>
                <p className="text-red-300/70 text-sm mt-1">{deploymentError}</p>
              </div>
            </div>
          )}

          {/* Step 0: Token Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-sm">
                  You're creating a <strong>Project NFT</strong> (representing your asset) and 
                  <strong> ERC3643 security tokens</strong> (fractionalized ownership). 
                  All tokens will be minted to your wallet.
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Token Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Manhattan Office Building"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Symbol *</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={e => setFormData(prev => ({ 
                        ...prev, 
                        symbol: e.target.value.toUpperCase().slice(0, 5) 
                      }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white uppercase focus:border-blue-500 focus:outline-none"
                      placeholder="MOB"
                      maxLength={5}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      {ASSET_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Supply *</label>
                    <input
                      type="number"
                      value={formData.tokenSupply}
                      onChange={e => setFormData(prev => ({ ...prev, tokenSupply: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      placeholder="1000000"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">All tokens minted to your wallet</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Describe your tokenized asset..."
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={!formData.name || !formData.symbol || !formData.tokenSupply}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Media */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-400" />
                  Branding & Media
                </h3>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Logo Image</label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, 'logoUrl')}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Recommended: 400x400px, PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Banner Image</label>
                  <div className="space-y-3">
                    <div className="w-full h-32 bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                      {formData.bannerUrl ? (
                        <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No banner uploaded</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, 'bannerUrl')}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Banner
                    </label>
                    <p className="text-xs text-gray-500">
                      Recommended: 1200x300px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  {formData.bannerUrl && (
                    <div className="h-20 overflow-hidden">
                      <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Coins className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{formData.name || 'Token Name'}</h4>
                      <p className="text-gray-400 text-sm">{formData.symbol || 'SYMBOL'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Options */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Optional Add-ons
                </h3>

                {/* Escrow Option */}
                <label className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.withEscrow}
                    onChange={e => setFormData(prev => ({ ...prev, withEscrow: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-green-400" />
                        Trade Escrow
                      </span>
                      <span className="text-green-400 text-sm font-medium">+{formatUSD(FEES.escrow)}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Enable secure P2P trading with escrow protection. 
                      Buyers and sellers can trade tokens safely with guaranteed settlement.
                    </p>
                  </div>
                </label>

                {/* Dividends Option */}
                <label className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.withDividends}
                    onChange={e => setFormData(prev => ({ ...prev, withDividends: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        Dividend Distributor
                      </span>
                      <span className="text-green-400 text-sm font-medium">+{formatUSD(FEES.dividend)}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Automatically distribute revenue or dividends to all token holders 
                      proportionally based on their holdings.
                    </p>
                  </div>
                </label>
              </div>

              {/* Fee Summary */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Fee Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-300">
                    <span>Base Fee (Project NFT + ERC3643 Token)</span>
                    <span>{formatUSD(FEES.base)}</span>
                  </div>
                  
                  {formData.withEscrow && (
                    <div className="flex justify-between text-gray-300">
                      <span>Trade Escrow</span>
                      <span>{formatUSD(FEES.escrow)}</span>
                    </div>
                  )}
                  
                  {formData.withDividends && (
                    <div className="flex justify-between text-gray-300">
                      <span>Dividend Distributor</span>
                      <span>{formatUSD(FEES.dividend)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-700 pt-3 flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>{formatUSD(totalFee)} USDC</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Review & Deploy <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Deploy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Deployment Summary
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Token Name</p>
                      <p className="text-white font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Symbol</p>
                      <p className="text-white font-medium">{formData.symbol}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Category</p>
                      <p className="text-white font-medium capitalize">
                        {formData.category.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Total Supply</p>
                      <p className="text-white font-medium">
                        {Number(formData.tokenSupply).toLocaleString()} tokens
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Trade Escrow</p>
                      <p className={`font-medium ${formData.withEscrow ? 'text-green-400' : 'text-gray-500'}`}>
                        {formData.withEscrow ? 'Included' : 'Not included'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Dividends</p>
                      <p className={`font-medium ${formData.withDividends ? 'text-green-400' : 'text-gray-500'}`}>
                        {formData.withDividends ? 'Included' : 'Not included'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What You Get */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">What You'll Receive</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <ImageIcon className="w-6 h-6 text-purple-400 mb-2" />
                    <p className="text-white font-medium">Project NFT</p>
                    <p className="text-gray-400 text-sm">RWAProjectNFT representing your asset</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <Coins className="w-6 h-6 text-blue-400 mb-2" />
                    <p className="text-white font-medium">{formData.symbol} Tokens</p>
                    <p className="text-gray-400 text-sm">
                      {Number(formData.tokenSupply).toLocaleString()} ERC3643 tokens
                    </p>
                  </div>
                  {formData.withEscrow && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <Lock className="w-6 h-6 text-green-400 mb-2" />
                      <p className="text-white font-medium">Escrow Vault</p>
                      <p className="text-gray-400 text-sm">Secure P2P trading</p>
                    </div>
                  )}
                  {formData.withDividends && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <TrendingUp className="w-6 h-6 text-yellow-400 mb-2" />
                      <p className="text-white font-medium">Dividend Distributor</p>
                      <p className="text-gray-400 text-sm">Revenue distribution</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fee & Balance */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-medium">Total Fee</p>
                    <p className="text-gray-400 text-sm">
                      Your balance: {usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatUSD(totalFee)} USDC</p>
                </div>
                
                {usdcBalance && usdcBalance < totalFeeWei && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Insufficient USDC balance. Please deposit more USDC to continue.
                    </p>
                  </div>
                )}

                {isApproved === false && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-3">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Your wallet is not approved for deployment. Please contact admin.
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={
                    isDeploying || 
                    isApproved === false || 
                    (usdcBalance !== undefined && usdcBalance < totalFeeWei)
                  }
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Approving USDC...
                    </>
                  ) : isUploadingMetadata ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading Metadata...
                    </>
                  ) : isDeploying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Deploy Asset
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}