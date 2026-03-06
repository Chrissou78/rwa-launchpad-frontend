// src/app/admin/settings/FactorySettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { isAddress, formatEther, parseEther } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import {
  Settings,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Globe,
  Lock,
  Unlock,
  DollarSign,
  Code,
  Shield,
  Network
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface ImplementationAddresses {
  securityToken: string;
  escrowVault: string;
  compliance: string;
  identityRegistry: string;
  dividendDistributor: string;
  maxBalanceModule: string;
  lockupModule: string;
}

interface FactoryData {
  owner: string;
  paused: boolean;
  requireApproval: boolean;
  creationFee: bigint;
  platformFeeBps: bigint;
  platformFeeRecipient: string;
  projectNFT: string;
  defaultPriceFeed: string;
  projectCounter: bigint;
  implementations: ImplementationAddresses;
}

// ============================================
// NETWORK BADGE COMPONENT
// ============================================

function NetworkBadge({ 
  chainName, 
  isTestnet 
}: { 
  chainName: string; 
  isTestnet: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
      <span className="text-sm text-gray-300">{chainName}</span>
      {isTestnet && (
        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
          Testnet
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FactorySettings() {
  // Chain configuration
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  const publicClient = usePublicClient();
  const currencySymbol = nativeCurrency?.symbol || 'ETH';

  // Factory contract address
  const factoryAddress = contracts?.RWALaunchpadFactory as `0x${string}` | undefined;

  const [factoryData, setFactoryData] = useState<FactoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'implementations' | 'fees' | 'access'>('status');

  // Form states
  const [newCreationFee, setNewCreationFee] = useState('');
  const [newPlatformFeeBps, setNewPlatformFeeBps] = useState('');
  const [newFeeRecipient, setNewFeeRecipient] = useState('');
  const [newProjectNFT, setNewProjectNFT] = useState('');
  const [newPriceFeed, setNewPriceFeed] = useState('');
  const [newDeployerAddress, setNewDeployerAddress] = useState('');
  const [newDeployerApproval, setNewDeployerApproval] = useState(true);

  // Implementation updates
  const [newSecurityToken, setNewSecurityToken] = useState('');
  const [newEscrowVault, setNewEscrowVault] = useState('');
  const [newCompliance, setNewCompliance] = useState('');
  const [newIdentityRegistry, setNewIdentityRegistry] = useState('');
  const [newDividendDistributor, setNewDividendDistributor] = useState('');
  const [newMaxBalanceModule, setNewMaxBalanceModule] = useState('');
  const [newLockupModule, setNewLockupModule] = useState('');

  const { writeContractAsync, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  // Helper functions
  const getExplorerAddressUrl = (address: string) => {
    return explorerUrl ? `${explorerUrl}/address/${address}` : '#';
  };

  const getExplorerTxUrl = (hash: string) => {
    return explorerUrl ? `${explorerUrl}/tx/${hash}` : '#';
  };

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    if (switchToChain) {
      await switchToChain(targetChainId);
    }
  };

  useEffect(() => {
    fetchFactoryData();
  }, [chainId, factoryAddress, publicClient]);

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: `Transaction successful on ${chainName}!` });
      fetchFactoryData();
      resetTx();
    }
  }, [txSuccess, chainName]);

  const fetchFactoryData = async () => {
    if (!factoryAddress || !publicClient) {
      setLoading(false);
      setFactoryData(null);
      return;
    }

    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        owner,
        paused,
        requireApproval,
        creationFee,
        platformFeeBps,
        platformFeeRecipient,
        projectNFT,
        defaultPriceFeed,
        projectCounter,
      ] = await Promise.all([
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'owner' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'paused' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'requireApproval' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'creationFee' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'platformFeeBps' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'platformFeeRecipient' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'projectNFT' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'defaultPriceFeed' }).catch(() => ZERO_ADDRESS),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'projectCounter' }),
      ]);

      // Fetch implementations
      const implementations = await publicClient.readContract({
        address: factoryAddress,
        abi: [{
          inputs: [],
          name: 'getImplementations',
          outputs: [{
            components: [
              { name: 'securityToken', type: 'address' },
              { name: 'escrowVault', type: 'address' },
              { name: 'compliance', type: 'address' },
              { name: 'identityRegistry', type: 'address' },
              { name: 'dividendDistributor', type: 'address' },
              { name: 'maxBalanceModule', type: 'address' },
              { name: 'lockupModule', type: 'address' },
            ],
            type: 'tuple'
          }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'getImplementations',
      }) as ImplementationAddresses;

      setFactoryData({
        owner: owner as string,
        paused: paused as boolean,
        requireApproval: requireApproval as boolean,
        creationFee: creationFee as bigint,
        platformFeeBps: platformFeeBps as bigint,
        platformFeeRecipient: platformFeeRecipient as string,
        projectNFT: projectNFT as string,
        defaultPriceFeed: defaultPriceFeed as string,
        projectCounter: projectCounter as bigint,
        implementations,
      });
    } catch (error) {
      console.error(`[${chainName}] Error fetching factory data:`, error);
      setResult({ success: false, message: `Failed to load factory data on ${chainName}` });
      setFactoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const executeTransaction = async (functionName: string, args: any[], successMessage: string) => {
    if (!factoryAddress) {
      setResult({ success: false, message: 'Factory contract not configured' });
      return;
    }

    setProcessing(true);
    setResult(null);
    try {
      await writeContractAsync({
        address: factoryAddress,
        abi: RWALaunchpadFactoryABI,
        functionName,
        args,
      });
      setResult({ success: true, message: `${successMessage} on ${chainName}` });
    } catch (error: any) {
      console.error(`[${chainName}] Transaction failed:`, error);
      setResult({ success: false, message: error.shortMessage || error.message || 'Transaction failed' });
      setProcessing(false);
    }
  };

  // Action handlers
  const handlePause = () => executeTransaction('pause', [], 'Factory paused');
  const handleUnpause = () => executeTransaction('unpause', [], 'Factory unpaused');
  const handleSetRequireApproval = (value: boolean) => executeTransaction('setRequireApproval', [value], `Approval requirement ${value ? 'enabled' : 'disabled'}`);
  const handleSetCreationFee = () => executeTransaction('setCreationFee', [parseEther(newCreationFee || '0')], 'Creation fee updated');
  const handleSetPlatformFeeBps = () => executeTransaction('setPlatformFeeBps', [BigInt(newPlatformFeeBps || '0')], 'Platform fee updated');
  const handleSetFeeRecipient = () => executeTransaction('setPlatformFeeRecipient', [newFeeRecipient], 'Fee recipient updated');
  const handleSetProjectNFT = () => executeTransaction('setProjectNFT', [newProjectNFT], 'Project NFT updated');
  const handleSetPriceFeed = () => executeTransaction('setDefaultPriceFeed', [newPriceFeed], 'Price feed updated');
  const handleSetDeployerApproval = () => executeTransaction('setDeployerApproval', [newDeployerAddress, newDeployerApproval], `Deployer ${newDeployerApproval ? 'approved' : 'revoked'}`);

  // Implementation handlers
  const handleSetSecurityToken = () => executeTransaction('setSecurityTokenImplementation', [newSecurityToken], 'SecurityToken implementation updated');
  const handleSetEscrowVault = () => executeTransaction('setEscrowVaultImplementation', [newEscrowVault], 'EscrowVault implementation updated');
  const handleSetCompliance = () => executeTransaction('setComplianceImplementation', [newCompliance], 'Compliance implementation updated');
  const handleSetIdentityRegistry = () => executeTransaction('setIdentityRegistry', [newIdentityRegistry], 'IdentityRegistry updated');
  const handleSetDividendDistributor = () => executeTransaction('setDividendDistributorImplementation', [newDividendDistributor], 'DividendDistributor implementation updated');
  const handleSetMaxBalanceModule = () => executeTransaction('setMaxBalanceModuleImplementation', [newMaxBalanceModule], 'MaxBalanceModule implementation updated');
  const handleSetLockupModule = () => executeTransaction('setLockupModuleImplementation', [newLockupModule], 'LockupModule implementation updated');

  // Address Display Component
  const AddressDisplay = ({ label, address, warning }: { label: string; address: string; warning?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-gray-400">{label}</span>
      {address && address !== ZERO_ADDRESS ? (
        <a 
          href={getExplorerAddressUrl(address)} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-400 font-mono text-xs hover:underline flex items-center gap-1"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className={warning ? 'text-red-400' : 'text-yellow-400'}>
          {warning ? '❌ Not Set' : 'Not Set'}
        </span>
      )}
    </div>
  );

  // Input with Button Component
  const InputWithButton = ({ 
    label, placeholder, value, setValue, onClick, buttonText, disabled 
  }: { 
    label: string; placeholder: string; value: string; setValue: (v: string) => void; onClick: () => void; buttonText: string; disabled?: boolean 
  }) => (
    <div className="space-y-2">
      <label className="block text-gray-400 text-sm">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm font-mono"
        />
        <button
          onClick={onClick}
          disabled={disabled || processing || !value}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm whitespace-nowrap flex items-center gap-2"
        >
          {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : buttonText}
        </button>
      </div>
    </div>
  );

  // Not deployed state
  if (!factoryAddress) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-400" />
            Factory Settings
          </h2>
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
        </div>

        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Factory Not Deployed</h3>
          <p className="text-gray-400 mb-6">
            RWALaunchpadFactory contract is not configured for {chainName}.
          </p>
          
          {deployedChains.length > 0 && (
            <div>
              <p className="text-gray-500 text-sm mb-3">Switch to a network with factory deployed:</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {deployedChains
                  .filter(chain => chain.id !== chainId)
                  .map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleSwitchNetwork(chain.id)}
                      disabled={isSwitching}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {isSwitching ? <RefreshCw className="w-4 h-4 animate-spin" /> : chain.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-400" />
            Factory Settings
          </h2>
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
          <p className="text-gray-500 text-center mt-4">Loading factory data from {chainName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-400" />
          Factory Settings
        </h2>
        <div className="flex items-center gap-3">
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
          <button 
            onClick={fetchFactoryData} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Network Switcher */}
      {deployedChains.length > 1 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300">Manage factory on:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={chain.id === chainId || isSwitching}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chain.id === chainId
                      ? 'bg-blue-500/20 text-blue-400 cursor-default'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {isSwitching ? <RefreshCw className="w-3 h-3 animate-spin" /> : chain.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          result.success 
            ? 'bg-green-900/50 border border-green-500 text-green-400' 
            : 'bg-red-900/50 border border-red-500 text-red-400'
        }`}>
          {result.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{result.message}</span>
          {txHash && explorerUrl && (
            <a 
              href={getExplorerTxUrl(txHash)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 underline flex items-center gap-1"
            >
              View TX <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Quick Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl ${factoryData?.paused ? 'bg-red-900/30 border border-red-500' : 'bg-green-900/30 border border-green-500'}`}>
          <p className="text-gray-400 text-sm">Status</p>
          <p className={`text-xl font-bold ${factoryData?.paused ? 'text-red-400' : 'text-green-400'}`}>
            {factoryData?.paused ? '⏸️ PAUSED' : '✅ ACTIVE'}
          </p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Projects</p>
          <p className="text-xl font-bold text-white">{factoryData?.projectCounter?.toString() || '0'}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Creation Fee</p>
          <p className="text-xl font-bold text-white">{formatEther(factoryData?.creationFee || 0n)} {currencySymbol}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Platform Fee</p>
          <p className="text-xl font-bold text-white">{Number(factoryData?.platformFeeBps || 0) / 100}%</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Network</p>
          <p className="text-xl font-bold text-white truncate">{chainName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
        {([
          { key: 'status', label: 'Status', icon: Settings },
          { key: 'implementations', label: 'Implementations', icon: Code },
          { key: 'fees', label: 'Fees', icon: DollarSign },
          { key: 'access', label: 'Access', icon: Shield },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Contract Status on {chainName}
            </h3>
            
            {/* Pause Controls */}
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-white font-medium">Pause Status</p>
                  <p className="text-gray-400 text-sm">When paused, no new projects can be deployed on {chainName}</p>
                </div>
                <div className="flex gap-2">
                  {factoryData?.paused ? (
                    <button
                      onClick={handleUnpause}
                      disabled={processing}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
                    >
                      {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      UNPAUSE
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      disabled={processing}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
                    >
                      {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                      PAUSE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Key Addresses */}
            <div>
              <h4 className="text-white font-medium mb-3">Key Addresses</h4>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <AddressDisplay label="Owner" address={factoryData?.owner || ''} />
                <AddressDisplay label="Project NFT" address={factoryData?.projectNFT || ''} warning={!factoryData?.projectNFT || factoryData.projectNFT === ZERO_ADDRESS} />
                <AddressDisplay label="Fee Recipient" address={factoryData?.platformFeeRecipient || ''} />
                <AddressDisplay label="Price Feed" address={factoryData?.defaultPriceFeed || ''} />
              </div>
            </div>

            {/* Update ProjectNFT */}
            <InputWithButton
              label="Update Project NFT Address"
              placeholder="0x..."
              value={newProjectNFT}
              setValue={setNewProjectNFT}
              onClick={handleSetProjectNFT}
              buttonText="Update"
              disabled={!isAddress(newProjectNFT)}
            />

            {/* Update Price Feed */}
            <InputWithButton
              label="Update Default Price Feed"
              placeholder="0x..."
              value={newPriceFeed}
              setValue={setNewPriceFeed}
              onClick={handleSetPriceFeed}
              buttonText="Update"
              disabled={!isAddress(newPriceFeed)}
            />
          </div>
        )}

        {/* IMPLEMENTATIONS TAB */}
        {activeTab === 'implementations' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-400" />
              Implementation Contracts on {chainName}
            </h3>
            <p className="text-gray-400 text-sm">These are the base contracts used when deploying new projects on {chainName}.</p>

            {/* Current Implementations */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Current Implementations</h4>
              <AddressDisplay label="SecurityToken" address={factoryData?.implementations?.securityToken || ''} warning />
              <AddressDisplay label="EscrowVault" address={factoryData?.implementations?.escrowVault || ''} warning />
              <AddressDisplay label="Compliance" address={factoryData?.implementations?.compliance || ''} warning />
              <AddressDisplay label="IdentityRegistry" address={factoryData?.implementations?.identityRegistry || ''} warning />
              <AddressDisplay label="DividendDistributor" address={factoryData?.implementations?.dividendDistributor || ''} />
              <AddressDisplay label="MaxBalanceModule" address={factoryData?.implementations?.maxBalanceModule || ''} />
              <AddressDisplay label="LockupModule" address={factoryData?.implementations?.lockupModule || ''} />
            </div>

            {/* Update Forms */}
            <div className="grid gap-4">
              <InputWithButton label="SecurityToken Implementation" placeholder="0x..." value={newSecurityToken} setValue={setNewSecurityToken} onClick={handleSetSecurityToken} buttonText="Update" disabled={!isAddress(newSecurityToken)} />
              <InputWithButton label="EscrowVault Implementation" placeholder="0x..." value={newEscrowVault} setValue={setNewEscrowVault} onClick={handleSetEscrowVault} buttonText="Update" disabled={!isAddress(newEscrowVault)} />
              <InputWithButton label="Compliance Implementation" placeholder="0x..." value={newCompliance} setValue={setNewCompliance} onClick={handleSetCompliance} buttonText="Update" disabled={!isAddress(newCompliance)} />
              <InputWithButton label="IdentityRegistry" placeholder="0x..." value={newIdentityRegistry} setValue={setNewIdentityRegistry} onClick={handleSetIdentityRegistry} buttonText="Update" disabled={!isAddress(newIdentityRegistry)} />
              <InputWithButton label="DividendDistributor Implementation" placeholder="0x..." value={newDividendDistributor} setValue={setNewDividendDistributor} onClick={handleSetDividendDistributor} buttonText="Update" disabled={!isAddress(newDividendDistributor)} />
              <InputWithButton label="MaxBalanceModule Implementation" placeholder="0x..." value={newMaxBalanceModule} setValue={setNewMaxBalanceModule} onClick={handleSetMaxBalanceModule} buttonText="Update" disabled={!isAddress(newMaxBalanceModule)} />
              <InputWithButton label="LockupModule Implementation" placeholder="0x..." value={newLockupModule} setValue={setNewLockupModule} onClick={handleSetLockupModule} buttonText="Update" disabled={!isAddress(newLockupModule)} />
            </div>
          </div>
        )}

        {/* FEES TAB */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Fee Configuration on {chainName}
            </h3>

            {/* Current Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Creation Fee</p>
                <p className="text-2xl font-bold text-white">{formatEther(factoryData?.creationFee || 0n)} {currencySymbol}</p>
                <p className="text-gray-500 text-xs">Paid when deploying a new project</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Platform Fee</p>
                <p className="text-2xl font-bold text-white">{Number(factoryData?.platformFeeBps || 0) / 100}%</p>
                <p className="text-gray-500 text-xs">{factoryData?.platformFeeBps?.toString() || '0'} basis points</p>
              </div>
            </div>

            {/* Fee Recipient */}
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">Fee Recipient</p>
              {explorerUrl ? (
                <a 
                  href={getExplorerAddressUrl(factoryData?.platformFeeRecipient || '')} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-400 font-mono text-sm hover:underline flex items-center gap-1"
                >
                  {factoryData?.platformFeeRecipient}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-white font-mono text-sm">{factoryData?.platformFeeRecipient}</p>
              )}
            </div>

            {/* Update Forms */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-gray-400 text-sm">Creation Fee (in {currencySymbol})</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    value={newCreationFee}
                    onChange={(e) => setNewCreationFee(e.target.value)}
                    placeholder="0.1"
                    className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                  />
                  <button
                    onClick={handleSetCreationFee}
                    disabled={processing || !newCreationFee}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-gray-400 text-sm">Platform Fee (basis points, 100 = 1%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newPlatformFeeBps}
                    onChange={(e) => setNewPlatformFeeBps(e.target.value)}
                    placeholder="250"
                    className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                  />
                  <button
                    onClick={handleSetPlatformFeeBps}
                    disabled={processing || !newPlatformFeeBps}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
                <p className="text-gray-500 text-xs">Current: {Number(factoryData?.platformFeeBps || 0)} bps = {Number(factoryData?.platformFeeBps || 0) / 100}%</p>
              </div>

              <InputWithButton
                label="Fee Recipient Address"
                placeholder="0x..."
                value={newFeeRecipient}
                setValue={setNewFeeRecipient}
                onClick={handleSetFeeRecipient}
                buttonText="Update"
                disabled={!isAddress(newFeeRecipient)}
              />
            </div>
          </div>
        )}

        {/* ACCESS TAB */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              Access Control on {chainName}
            </h3>

            {/* Approval Requirement */}
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-white font-medium">Require Deployer Approval</p>
                  <p className="text-gray-400 text-sm">
                    {factoryData?.requireApproval 
                      ? `Only approved addresses can deploy projects on ${chainName}` 
                      : `Anyone can deploy projects on ${chainName}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    factoryData?.requireApproval 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {factoryData?.requireApproval ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {factoryData?.requireApproval ? 'Restricted' : 'Open'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleSetRequireApproval(true)}
                  disabled={processing || factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Enable Approval
                </button>
                <button
                  onClick={() => handleSetRequireApproval(false)}
                  disabled={processing || !factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Disable (Open)
                </button>
              </div>
            </div>

            {/* Manage Deployer Approval */}
            <div className="p-4 bg-gray-700/50 rounded-lg space-y-4">
              <h4 className="text-white font-medium">Manage Deployer Approval</h4>
              <div className="space-y-2">
                <label className="block text-gray-400 text-sm">Deployer Address</label>
                <input
                  type="text"
                  value={newDeployerAddress}
                  onChange={(e) => setNewDeployerAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNewDeployerApproval(true); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => { setNewDeployerApproval(false); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network Info Footer */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4 text-gray-500 flex-wrap">
            <span>Network: <span className="text-gray-300">{chainName}</span></span>
            <span>•</span>
            <span>Chain ID: <span className="text-gray-300">{chainId}</span></span>
            <span>•</span>
            <span>Currency: <span className="text-gray-300">{currencySymbol}</span></span>
            <span>•</span>
            <span>Factory: <span className="text-gray-300 font-mono text-xs">{factoryAddress?.slice(0, 10)}...</span></span>
          </div>
          {explorerUrl && (
            <a
              href={getExplorerAddressUrl(factoryAddress || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Factory Contract
            </a>
          )}
        </div>
      </div>

      {/* Processing Overlay */}
      {(processing || txLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl text-center border border-gray-700">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Processing transaction on {chainName}...</p>
            {txHash && explorerUrl && (
              <a 
                href={getExplorerTxUrl(txHash)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 text-sm hover:underline flex items-center justify-center gap-1 mt-2"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
