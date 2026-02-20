// src/app/admin/components/ProjectContractsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2, 
  Shield, 
  Wallet, 
  FileCheck, 
  Coins, 
  Scale, 
  Lock,
  AlertTriangle,
  Info,
  Clock,
  User,
  Activity
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: number | bigint;
  name?: string;
  securityToken?: string;
  escrowVault?: string;
  status?: number;
  owner?: string;
}

interface DeploymentRecord {
  projectId: bigint;
  securityToken: Address;
  escrowVault: Address;
  compliance: Address;
  dividendDistributor: Address;
  maxBalanceModule: Address;
  lockupModule: Address;
  deployer: Address;
  deployedAt: bigint;
  active: boolean;
}

interface ProjectContractsModalProps {
  project: Project;
  onClose: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
}

function NetworkBadge({ chainName, isTestnet }: NetworkBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isTestnet 
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        : 'bg-green-500/20 text-green-400 border border-green-500/30'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
      {chainName}
      {isTestnet && <span className="opacity-70">(Testnet)</span>}
    </div>
  );
}

interface ContractRowProps {
  label: string;
  address: Address | string | undefined;
  type: 'core' | 'module' | 'info';
  explorerUrl: string;
  icon?: React.ReactNode;
}

function ContractRow({ label, address, type, explorerUrl, icon }: ContractRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isZeroAddress = !address || address === '0x0000000000000000000000000000000000000000';

  const typeStyles = {
    core: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300'
    },
    module: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      label: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300'
    },
    info: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      label: 'text-gray-400',
      badge: 'bg-gray-500/20 text-gray-300'
    }
  };

  const styles = typeStyles[type];

  if (isZeroAddress) {
    return (
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className={styles.label}>{icon}</div>}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${styles.label}`}>{label}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${styles.badge}`}>
                  {type === 'core' ? 'Core' : 'Module'}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">Not deployed</p>
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    );
  }

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 hover:bg-opacity-20 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className={styles.label}>{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${styles.label}`}>{label}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded ${styles.badge}`}>
                {type === 'core' ? 'Core' : 'Module'}
              </span>
            </div>
            <p className="text-white font-mono text-sm mt-1">{truncatedAddress}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <a
            href={`${explorerUrl}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="View on explorer"
          >
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectContractsModal({ project, onClose }: ProjectContractsModalProps) {
  const publicClient = usePublicClient();
  
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed
  } = useChainConfig();

  const factoryAddress = contracts?.RWALaunchpadFactory as Address | undefined;

  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment data
  useEffect(() => {
    const fetchDeployment = async () => {
      if (!publicClient || !factoryAddress) {
        setLoading(false);
        setError('Factory contract not available');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await publicClient.readContract({
          address: factoryAddress,
          abi: RWALaunchpadFactoryABI,
          functionName: 'getDeployment',
          args: [BigInt(project.id)],
        });

        setDeployment(data as DeploymentRecord);
      } catch (err) {
        console.error('Error fetching deployment:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch deployment data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeployment();
  }, [project.id, publicClient, factoryAddress, chainId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Format date
  const formatDate = (timestamp: bigint): string => {
    if (timestamp === 0n) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Truncate address
  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-white">
                  {project.name || `Project #${project.id}`}
                </h3>
                <NetworkBadge chainName={chainName} isTestnet={isTestnet} />
              </div>
              <p className="text-gray-400 text-sm">
                Deployed Contract Addresses on {chainName}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading contracts from {chainName}...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Failed to load deployment</p>
                  <p className="text-red-300/70 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Factory Not Deployed */}
          {!loading && !error && !factoryAddress && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-400 font-medium">Factory not deployed</p>
                  <p className="text-yellow-300/70 text-sm mt-1">
                    The RWALaunchpadFactory contract is not deployed on {chainName}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contract List */}
          {!loading && !error && factoryAddress && (
            <div className="space-y-3">
              {/* Core Contracts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Core Contracts
                </h4>
                <div className="space-y-2">
                  <ContractRow 
                    label="Security Token" 
                    address={deployment?.securityToken || project.securityToken} 
                    type="core"
                    explorerUrl={explorerUrl}
                    icon={<Shield className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Escrow Vault" 
                    address={deployment?.escrowVault || project.escrowVault} 
                    type="core"
                    explorerUrl={explorerUrl}
                    icon={<Wallet className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Module Contracts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Module Contracts
                </h4>
                <div className="space-y-2">
                  <ContractRow 
                    label="Compliance" 
                    address={deployment?.compliance} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<FileCheck className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Dividend Distributor" 
                    address={deployment?.dividendDistributor} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Coins className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Max Balance Module" 
                    address={deployment?.maxBalanceModule} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Scale className="w-4 h-4" />}
                  />
                  <ContractRow 
                    label="Lockup Module" 
                    address={deployment?.lockupModule} 
                    type="module"
                    explorerUrl={explorerUrl}
                    icon={<Lock className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Deployment Info */}
              {deployment && deployment.deployedAt > 0n && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Deployment Information
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Deployer */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Deployed by</p>
                      </div>
                      <a 
                        href={`${explorerUrl}/address/${deployment.deployer}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1"
                      >
                        {truncateAddress(deployment.deployer)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Deployed At */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Deployed at</p>
                      </div>
                      <p className="text-white text-sm">{formatDate(deployment.deployedAt)}</p>
                    </div>

                    {/* Status */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Status</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        deployment.active 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${deployment.active ? 'bg-green-400' : 'bg-red-400'}`} />
                        {deployment.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Network */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-400 text-sm">Network</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">{chainName}</span>
                        {isTestnet && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                            Testnet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Deployment Found */}
              {(!deployment || deployment.deployedAt === 0n) && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-300 font-medium">No deployment record found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      This project may not have been deployed through the factory on {chainName}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-gray-400">
              <span>Chain ID: {chainId}</span>
              <span>•</span>
              <span>Currency: {nativeCurrency?.symbol || 'ETH'}</span>
            </div>
            {factoryAddress && (
              <a
                href={`${explorerUrl}/address/${factoryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Factory: {truncateAddress(factoryAddress)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
