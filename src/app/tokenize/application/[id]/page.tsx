// src/app/tokenize/application/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount, useChainId } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Coins,
  AlertCircle,
  Loader2,
  Building2,
  FileText,
  Lock,
  TrendingUp,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Globe,
  Wallet,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <Clock className="w-5 h-5" />,
    description: 'Your application is being reviewed by our team.'
  },
  approved: { 
    label: 'Awaiting Payment', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Your application has been approved. Please complete the payment to proceed.'
  },
  creation_ready: { 
    label: 'Ready to Create', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: <Coins className="w-5 h-5" />,
    description: 'Payment confirmed! You can now create your tokenized asset.'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: 'Your asset has been successfully tokenized.'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <XCircle className="w-5 h-5" />,
    description: 'Your application was not approved. Please contact support for more information.'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: <XCircle className="w-5 h-5" />,
    description: 'This application has been cancelled.'
  },
};

interface Application {
  id: string;
  asset_name: string;
  asset_type: string;
  asset_description: string;
  estimated_value: number;
  fee_amount: number;
  fee_currency: string;
  status: string;
  needs_escrow: boolean;
  needs_dividends: boolean;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  token_name: string;
  token_symbol: string;
  total_supply: string;
  user_address: string;
  created_at: string;
  updated_at: string;
  documents: any;
  token_address?: string;
  nft_address?: string;
  escrow_address?: string;
  deployment_tx_hash?: string;
  chain_id?: number;
}

// Explorer name mapping for different chains
const EXPLORER_NAMES: Record<number, string> = {
  43113: 'SnowTrace',
  43114: 'SnowTrace',
  137: 'PolygonScan',
  80002: 'PolygonScan',
  1: 'Etherscan',
  11155111: 'Etherscan',
  42161: 'Arbiscan',
  8453: 'BaseScan',
  10: 'Optimism Explorer',
  56: 'BscScan',
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const applicationId = params.id as string;

  // Chain config for multichain support
  const {
    chainId,
    chainName,
    explorerUrl,
    isDeployed,
    isTestnet,
    nativeCurrency,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Get the explorer URL for the application's chain (might differ from current chain)
  const getApplicationExplorerUrl = useMemo(() => {
    if (!application?.chain_id) return explorerUrl;
    
    // Map chain IDs to their explorer URLs
    const explorerUrls: Record<number, string> = {
      43113: 'https://testnet.snowtrace.io',
      43114: 'https://snowtrace.io',
      137: 'https://polygonscan.com',
      80002: 'https://amoy.polygonscan.com',
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      10: 'https://optimistic.etherscan.io',
      56: 'https://bscscan.com',
    };
    
    return explorerUrls[application.chain_id] || explorerUrl;
  }, [application?.chain_id, explorerUrl]);

  const explorerName = useMemo(() => {
    const appChainId = application?.chain_id || chainId;
    return EXPLORER_NAMES[appChainId] || 'Explorer';
  }, [application?.chain_id, chainId]);

  useEffect(() => {
    if (address && applicationId) {
      fetchApplication();
    }
  }, [address, applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        headers: { 
          'x-wallet-address': address!,
          'x-chain-id': chainId.toString()
        },
      });

      if (!response.ok) {
        throw new Error('Application not found');
      }

      const data = await response.json();
      setApplication(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this application?')) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/tokenization/${applicationId}/cancel`, {
        method: 'POST',
        headers: { 
          'x-wallet-address': address!,
          'x-chain-id': chainId.toString()
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel application');
      }

      await fetchApplication();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Get chain name for display
  const getChainName = (chainIdNum: number): string => {
    const chainNames: Record<number, string> = {
      43113: 'Avalanche Fuji',
      43114: 'Avalanche',
      137: 'Polygon',
      80002: 'Polygon Amoy',
      1: 'Ethereum',
      11155111: 'Sepolia',
      42161: 'Arbitrum One',
      8453: 'Base',
      10: 'Optimism',
      56: 'BNB Chain',
    };
    return chainNames[chainIdNum] || `Chain ${chainIdNum}`;
  };

  // Parse documents
  const getDocuments = () => {
    if (!application?.documents) return [];
    try {
      const parsed = typeof application.documents === 'string'
        ? JSON.parse(application.documents)
        : application.documents;
      return parsed?.files || (Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view this application.</p>
        </div>
      </div>
    );
  }

  // Network not supported
  if (!isDeployed) {
   
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Globe className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              Tokenization is not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleSwitchNetwork(chain.chainId)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSwitching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {chain.name}
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
      </div>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Wrong Network</h2>
            <p className="text-gray-400 mb-6">
              Please switch to {chainName} to continue.
            </p>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Switch to {chainName}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
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

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending;
  const documents = getDocuments();
  const applicationChainName = application.chain_id ? getChainName(application.chain_id) : chainName;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/tokenize"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Applications
        </Link>

        {/* Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{application.asset_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p className="text-gray-400">
                  Application ID: {application.id}
                </p>
                {/* Network Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  isTestnet 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  <Globe className="w-3 h-3" />
                  {applicationChainName}
                  {isTestnet && ' (Testnet)'}
                </span>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="font-medium">{statusConfig.label}</span>
            </div>
          </div>

          <p className="text-gray-300 mt-4">{statusConfig.description}</p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {application.status === 'approved' && (
              <Link
                href={`/tokenize/pay/${application.id}`}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay ${application.fee_amount} {application.fee_currency}
              </Link>
            )}

            {application.status === 'creation_ready' && (
              <Link
                href={`/tokenize/create/${application.id}`}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <Coins className="w-4 h-4" />
                Create Token
              </Link>
            )}

            {['pending', 'approved'].includes(application.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition inline-flex items-center gap-2 disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Application
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Asset Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Asset Details
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Asset Type</span>
                <p className="text-white">{application.asset_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Estimated Value</span>
                <p className="text-white font-semibold">{formatCurrency(application.estimated_value)}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Description</span>
                <p className="text-gray-300 text-sm">{application.asset_description}</p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Company Info
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-white">{application.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-white">{application.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${application.email}`} className="text-blue-400 hover:underline">
                  {application.email}
                </a>
              </div>
              {application.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-white">{application.phone}</span>
                </div>
              )}
              {application.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <a href={application.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {application.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Fee & Add-ons */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Fee & Add-ons
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Fee</span>
                <span className="text-green-400 font-bold">${application.fee_amount} {application.fee_currency}</span>
              </div>

              <div className="pt-3 border-t border-gray-700 space-y-2">
                <div className="flex items-center gap-2">
                  {application.needs_escrow ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={application.needs_escrow ? 'text-white' : 'text-gray-500'}>
                    Trade Escrow
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {application.needs_dividends ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={application.needs_dividends ? 'text-white' : 'text-gray-500'}>
                    Dividend Distributor
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Token Preferences */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Token Preferences
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Token Name</span>
                <p className="text-white">{application.token_name || 'To be decided'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Symbol</span>
                <p className="text-white font-mono">{application.token_symbol || 'TBD'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Total Supply</span>
                <p className="text-white">{application.total_supply || 'To be decided'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Network</span>
                <p className="text-white flex items-center gap-2">
                  {applicationChainName}
                  {isTestnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Documents ({documents.length})
            </h2>

            <div className="grid gap-2">
              {documents.map((doc: any, idx: number) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition group"
                >
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{doc.name}</p>
                    <p className="text-gray-500 text-xs">{doc.type}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deployment Info (if completed) */}
        {application.status === 'completed' && (application.token_address || application.nft_address) && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Deployment Information
            </h2>

            {/* Deployed Network Info */}
            {application.chain_id && (
              <div className="mb-4 pb-4 border-b border-green-500/20">
                <span className="text-gray-400 text-sm">Deployed Network</span>
                <p className="text-white flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 text-green-400" />
                  {getChainName(application.chain_id)}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {application.token_address && (
                <div>
                  <span className="text-gray-400 text-sm">Token Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                      {application.token_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.token_address!)} 
                      className="text-gray-400 hover:text-white transition"
                      title="Copy address"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.token_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:text-blue-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.nft_address && (
                <div>
                  <span className="text-gray-400 text-sm">NFT Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                      {application.nft_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.nft_address!)} 
                      className="text-gray-400 hover:text-white transition"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.nft_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:text-blue-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.escrow_address && (
                <div>
                  <span className="text-gray-400 text-sm">Escrow Address</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-white bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                      {application.escrow_address}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(application.escrow_address!)} 
                      className="text-gray-400 hover:text-white transition"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={`${getApplicationExplorerUrl}/address/${application.escrow_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:text-blue-300 transition"
                      title={`View on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {application.deployment_tx_hash && (
                <div>
                  <span className="text-gray-400 text-sm">Deployment Transaction</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href={`${getApplicationExplorerUrl}/tx/${application.deployment_tx_hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-2"
                    >
                      <span className="font-mono text-sm">
                        {application.deployment_tx_hash.slice(0, 10)}...{application.deployment_tx_hash.slice(-8)}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Timeline
          </h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Submitted</span>
              <span className="text-white">{formatDate(application.created_at)}</span>
            </div>
            {application.updated_at !== application.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">{formatDate(application.updated_at)}</span>
              </div>
            )}
            {application.chain_id && (
              <div className="flex justify-between pt-2 border-t border-gray-700 mt-2">
                <span className="text-gray-400">Network</span>
                <span className="text-white">{getChainName(application.chain_id)}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
