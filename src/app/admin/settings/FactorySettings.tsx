// src/app/admin/settings/FactorySettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, formatEther, parseEther } from 'viem';
import { CONTRACTS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { publicClient } from '../client';
import { ZERO_ADDRESS } from '../constants';
import { getExplorerUrl } from '../helpers';

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

export default function FactorySettings() {
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

  useEffect(() => {
    fetchFactoryData();
  }, []);

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Transaction successful!' });
      fetchFactoryData();
      resetTx();
    }
  }, [txSuccess]);

  const fetchFactoryData = async () => {
    try {
      setLoading(true);
      const factoryAddress = CONTRACTS.RWALaunchpadFactory as `0x${string}`;

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
      console.error('Error fetching factory data:', error);
      setResult({ success: false, message: 'Failed to load factory data' });
    } finally {
      setLoading(false);
    }
  };

  const executeTransaction = async (functionName: string, args: any[], successMessage: string) => {
    setProcessing(true);
    setResult(null);
    try {
      await writeContractAsync({
        address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
        abi: RWALaunchpadFactoryABI,
        functionName,
        args,
      });
      setResult({ success: true, message: successMessage });
    } catch (error: any) {
      console.error('Transaction failed:', error);
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

  const AddressDisplay = ({ label, address, warning }: { label: string; address: string; warning?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-gray-400">{label}</span>
      {address && address !== ZERO_ADDRESS ? (
        <a href={getExplorerUrl(address)} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-mono text-xs hover:underline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </a>
      ) : (
        <span className={warning ? 'text-red-400' : 'text-yellow-400'}>
          {warning ? '❌ Not Set' : 'Not Set'}
        </span>
      )}
    </div>
  );

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
          className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm"
        />
        <button
          onClick={onClick}
          disabled={disabled || processing || !value}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm whitespace-nowrap"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Factory Settings</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Factory Settings</h2>
        <button onClick={fetchFactoryData} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/50 border border-green-500 text-green-400' : 'bg-red-900/50 border border-red-500 text-red-400'}`}>
          {result.message}
          {txHash && (
            <a href={getExplorerUrl(txHash, 'tx')} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
              View TX
            </a>
          )}
        </div>
      )}

      {/* Quick Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${factoryData?.paused ? 'bg-red-900/30 border border-red-500' : 'bg-green-900/30 border border-green-500'}`}>
          <p className="text-gray-400 text-sm">Status</p>
          <p className={`text-xl font-bold ${factoryData?.paused ? 'text-red-400' : 'text-green-400'}`}>
            {factoryData?.paused ? '⏸️ PAUSED' : '✅ ACTIVE'}
          </p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl">
          <p className="text-gray-400 text-sm">Projects Deployed</p>
          <p className="text-xl font-bold text-white">{factoryData?.projectCounter?.toString() || '0'}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl">
          <p className="text-gray-400 text-sm">Creation Fee</p>
          <p className="text-xl font-bold text-white">{formatEther(factoryData?.creationFee || 0n)} POL</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-xl">
          <p className="text-gray-400 text-sm">Platform Fee</p>
          <p className="text-xl font-bold text-white">{Number(factoryData?.platformFeeBps || 0) / 100}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {(['status', 'implementations', 'fees', 'access'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6">
        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Contract Status</h3>
            
            {/* Pause Controls */}
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">Pause Status</p>
                  <p className="text-gray-400 text-sm">When paused, no new projects can be deployed</p>
                </div>
                <div className="flex gap-2">
                  {factoryData?.paused ? (
                    <button
                      onClick={handleUnpause}
                      disabled={processing}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium"
                    >
                      {processing ? '...' : '▶️ UNPAUSE'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      disabled={processing}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white font-medium"
                    >
                      {processing ? '...' : '⏸️ PAUSE'}
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
            <h3 className="text-lg font-semibold text-white">Implementation Contracts</h3>
            <p className="text-gray-400 text-sm">These are the base contracts used when deploying new projects.</p>

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
            <h3 className="text-lg font-semibold text-white">Fee Configuration</h3>

            {/* Current Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Creation Fee</p>
                <p className="text-2xl font-bold text-white">{formatEther(factoryData?.creationFee || 0n)} POL</p>
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
              <a href={getExplorerUrl(factoryData?.platformFeeRecipient || '')} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-mono text-sm hover:underline">
                {factoryData?.platformFeeRecipient}
              </a>
            </div>

            {/* Update Forms */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-gray-400 text-sm">Creation Fee (in POL)</label>
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
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium"
                  >
                    Update
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
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium"
                  >
                    Update
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
            <h3 className="text-lg font-semibold text-white">Access Control</h3>

            {/* Approval Requirement */}
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">Require Deployer Approval</p>
                  <p className="text-gray-400 text-sm">
                    {factoryData?.requireApproval 
                      ? 'Only approved addresses can deploy projects' 
                      : 'Anyone can deploy projects'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${factoryData?.requireApproval ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                    {factoryData?.requireApproval ? 'Restricted' : 'Open'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleSetRequireApproval(true)}
                  disabled={processing || factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg text-white font-medium"
                >
                  Enable Approval
                </button>
                <button
                  onClick={() => handleSetRequireApproval(false)}
                  disabled={processing || !factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium"
                >
                  Disable (Open Access)
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
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNewDeployerApproval(true); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => { setNewDeployerApproval(false); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white font-medium"
                >
                  ❌ Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {(processing || txLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Processing transaction...</p>
            {txHash && (
              <a href={getExplorerUrl(txHash, 'tx')} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                View on Explorer
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
