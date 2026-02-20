'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient
} from 'wagmi';
import { parseUnits, formatEther, decodeEventLog, type Hash, type Address } from 'viem';
import type { ProjectData } from '@/types/project';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWALaunchpadFactoryABI, RWAProjectNFTABI } from '@/config/abis';


type DeployStatus = 
  | 'idle' 
  | 'connecting' 
  | 'uploading' 
  | 'waitingWallet' 
  | 'confirming' 
  | 'verifying' 
  | 'success' 
  | 'error';

interface DeployedContracts {
  projectId: bigint;
  securityToken: Address;
  escrowVault: Address;
  compliance: Address;
  nftTokenId?: bigint;
}

interface StepDeployProps {
  projectData: ProjectData;
  onBack: () => void;
  onSuccess?: (contracts: DeployedContracts) => void;
}

export function StepDeploy({ projectData, onBack, onSuccess }: StepDeployProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  // Multichain config
  const { 
    chainId: currentChainId,
    chainName,
    contracts,
    fees,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains,
    getTxUrl,
    getAddressUrl
  } = useChainConfig();

  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<DeployStatus>('idle');
  const [error, setError] = useState<string>('');
  const [metadataUri, setMetadataUri] = useState<string>('');
  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [creationFee, setCreationFee] = useState<bigint>(BigInt(0));
  const [verificationStatus, setVerificationStatus] = useState<Record<string, 'pending' | 'success' | 'failed'>>({});

  // Watch for transaction receipt
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch creation fee when chain changes
  useEffect(() => {
    async function fetchCreationFee() {
      if (!publicClient || !contracts?.RWALaunchpadFactory || !isDeployed) return;
      
      try {
        const fee = await publicClient.readContract({
          address: contracts.RWALaunchpadFactory as Address,
          abi: RWALaunchpadFactoryABI,
          functionName: 'creationFee',
        }) as bigint;
        setCreationFee(fee);
      } catch (err) {
        console.error('Failed to fetch creation fee:', err);
        // Fallback to config fees if available
        if (fees?.CREATION_FEE) {
          setCreationFee(BigInt(fees.CREATION_FEE));
        }
      }
    }
    
    fetchCreationFee();
  }, [publicClient, contracts, fees, isDeployed, currentChainId]);

  // Handle transaction receipt
  useEffect(() => {
    if (receipt && status === 'confirming') {
      parseDeploymentEvents(receipt);
    }
  }, [receipt, status]);

  const parseDeploymentEvents = async (txReceipt: typeof receipt) => {
    if (!txReceipt || !contracts) return;

    try {
      setStatus('verifying');
      
      let deployedData: DeployedContracts | null = null;

      // Parse ProjectDeployed event from factory
      for (const log of txReceipt.logs) {
        try {
          if (log.address.toLowerCase() === contracts.RWALaunchpadFactory?.toLowerCase()) {
            const decoded = decodeEventLog({
              abi: RWALaunchpadFactoryABI,
              data: log.data,
              topics: log.topics,
            });
            
            if (decoded.eventName === 'ProjectDeployed') {
              const args = decoded.args as {
                projectId: bigint;
                securityToken: Address;
                escrowVault: Address;
                compliance: Address;
                deployer: Address;
              };
              
              deployedData = {
                projectId: args.projectId,
                securityToken: args.securityToken,
                escrowVault: args.escrowVault,
                compliance: args.compliance,
              };
            }
          }
        } catch {
          // Not the event we're looking for
        }
      }

      // Parse NFT Transfer event
      for (const log of txReceipt.logs) {
        try {
          if (log.address.toLowerCase() === contracts.RWAProjectNFT?.toLowerCase()) {
            const decoded = decodeEventLog({
              abi: RWAProjectNFTABI,
              data: log.data,
              topics: log.topics,
            });
            
            if (decoded.eventName === 'Transfer' && deployedData) {
              const args = decoded.args as { tokenId: bigint };
              deployedData.nftTokenId = args.tokenId;
            }
          }
        } catch {
          // Not the event we're looking for
        }
      }

      if (deployedData) {
        setDeployedContracts(deployedData);
        await verifyContracts(deployedData);
        setStatus('success');
        onSuccess?.(deployedData);
      } else {
        throw new Error('Failed to parse deployment events');
      }
    } catch (err) {
      console.error('Failed to parse deployment events:', err);
      setError('Deployment succeeded but failed to parse events. Check the transaction on the explorer.');
      setStatus('error');
    }
  };

  const verifyContracts = async (deployed: DeployedContracts) => {
    const contractsToVerify = [
      { name: 'securityToken', address: deployed.securityToken },
      { name: 'escrowVault', address: deployed.escrowVault },
      { name: 'compliance', address: deployed.compliance },
    ];

    for (const contract of contractsToVerify) {
      setVerificationStatus(prev => ({ ...prev, [contract.name]: 'pending' }));
      
      try {
        const response = await fetch('/api/verify-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: contract.address,
            chainId: currentChainId,
          }),
        });

        if (response.ok) {
          setVerificationStatus(prev => ({ ...prev, [contract.name]: 'success' }));
        } else {
          setVerificationStatus(prev => ({ ...prev, [contract.name]: 'failed' }));
        }
      } catch {
        setVerificationStatus(prev => ({ ...prev, [contract.name]: 'failed' }));
      }
    }
  };

  const handleConnect = useCallback(() => {
    setStatus('connecting');
    const injected = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    if (injected) {
      connect(
        { connector: injected },
        {
          onSuccess: () => setStatus('idle'),
          onError: (err) => {
            setError(err.message);
            setStatus('error');
          },
        }
      );
    }
  }, [connect, connectors]);

  const handleSwitchNetwork = useCallback(async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
      setError('Failed to switch network. Please switch manually in your wallet.');
    }
  }, [switchToChain]);

  const handleDeploy = async () => {
    if (!isConnected || !address) {
      handleConnect();
      return;
    }

    if (!isDeployed || !contracts) {
      setError(`Contracts are not deployed on ${chainName}. Please switch to a supported network.`);
      setStatus('error');
      return;
    }

    try {
      setStatus('uploading');
      setError('');

      // Build metadata object
      const metadata = {
        name: projectData.projectName,
        description: projectData.description,
        image: projectData.coverImage || '',
        external_url: projectData.website || '',
        attributes: [
          { trait_type: 'Category', value: projectData.category },
          { trait_type: 'Token Symbol', value: projectData.tokenSymbol },
          { trait_type: 'Total Supply', value: projectData.totalSupply?.toString() },
          { trait_type: 'Funding Goal', value: projectData.amountToRaise?.toString() },
          { trait_type: 'Location', value: projectData.location || 'Global' },
        ],
        properties: {
          tokenName: projectData.tokenName,
          tokenSymbol: projectData.tokenSymbol,
          category: projectData.category,
          totalSupply: projectData.totalSupply,
          fundingGoal: projectData.amountToRaise,
          documents: projectData.documents || [],
          images: projectData.images || [],
          milestones: projectData.milestones || [],
        },
      };

      // Upload to IPFS
      const ipfsResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!ipfsResponse.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const { uri } = await ipfsResponse.json();
      setMetadataUri(uri);

      setStatus('waitingWallet');

      // Prepare deployment parameters
      const tokenName = projectData.tokenName || projectData.projectName;
      const tokenSymbol = projectData.tokenSymbol || 'RWA';
      const category = projectData.category || 'real-estate';
      const maxSupply = parseUnits(projectData.totalSupply?.toString() || '1000000', 18);
      const fundingGoal = parseUnits(projectData.amountToRaise?.toString() || '100000', 6); // USDC decimals
      const deadlineDays = 30;

      // Execute deployment
      const hash = await writeContractAsync({
        address: contracts.RWALaunchpadFactory as Address,
        abi: RWALaunchpadFactoryABI,
        functionName: 'createProject',
        args: [
          tokenName,
          tokenSymbol,
          ZERO_ADDRESS as Address, // issuer (will be set to deployer)
          category,
          maxSupply,
          fundingGoal,
          BigInt(deadlineDays),
          uri,
        ],
        value: creationFee,
      });

      setTxHash(hash);
      setStatus('confirming');
    } catch (err: unknown) {
      console.error('Deployment failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        setError('Transaction was rejected. Please try again.');
      } else if (errorMessage.includes('insufficient funds')) {
        setError(`Insufficient ${nativeCurrency} balance. Please add funds to your wallet.`);
      } else {
        setError(errorMessage);
      }
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setError('');
    setTxHash(undefined);
    setDeployedContracts(null);
    setMetadataUri('');
    setVerificationStatus({});
  };

  // Render: Not connected
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your wallet to deploy your RWA project on the blockchain.
          </p>
          <button
            onClick={handleConnect}
            disabled={status === 'connecting'}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Render: Wrong network or not deployed
  if (!isDeployed) {
    const firstDeployedChain = deployedChains[0];
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-yellow-800 dark:text-yellow-200">
            Network Not Supported
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-6">
            {chainName ? (
              <>Contracts are not yet deployed on <strong>{chainName}</strong>.</>
            ) : (
              <>Please connect to a supported network.</>
            )}
          </p>
          
          {firstDeployedChain && (
            <button
              onClick={() => handleSwitchNetwork(firstDeployedChain.id)}
              disabled={isSwitching}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              {isSwitching ? 'Switching...' : `Switch to ${firstDeployedChain.name}`}
            </button>
          )}

          {deployedChains.length > 1 && (
            <div className="mt-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">Or choose another network:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {deployedChains.slice(1).map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => handleSwitchNetwork(chain.id)}
                    disabled={isSwitching}
                    className="px-4 py-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm hover:bg-yellow-200 dark:hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {chain.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render: Success
  if (status === 'success' && deployedContracts) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Deployment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your RWA project has been deployed to {chainName}.
            </p>
          </div>

          {/* NFT Token ID */}
          {deployedContracts.nftTokenId !== undefined && (
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">Project NFT Token ID</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  #{deployedContracts.nftTokenId.toString()}
                </span>
                <a
                  href={`${explorerUrl}/token/${contracts?.RWAProjectNFT}?a=${deployedContracts.nftTokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          )}

          {/* Deployed Contracts */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Deployed Contracts</h3>
            
            <ContractRow
              label="Security Token"
              address={deployedContracts.securityToken}
              explorerUrl={explorerUrl}
              verificationStatus={verificationStatus.securityToken}
            />
            <ContractRow
              label="Escrow Vault"
              address={deployedContracts.escrowVault}
              explorerUrl={explorerUrl}
              verificationStatus={verificationStatus.escrowVault}
            />
            <ContractRow
              label="Compliance"
              address={deployedContracts.compliance}
              explorerUrl={explorerUrl}
              verificationStatus={verificationStatus.compliance}
            />
          </div>

          {/* Transaction Link */}
          {txHash && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transaction Hash</p>
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm font-mono break-all"
              >
                {txHash}
              </a>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Next Steps</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>✓ Complete KYC verification to enable trading</li>
              <li>✓ Configure escrow milestones for fund release</li>
              <li>✓ Share your project with potential investors</li>
              <li>✓ Monitor investment progress on the dashboard</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = `/projects/${deployedContracts.projectId}`}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              View Project
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Error
  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Deployment Failed</h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => disconnect()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Main deployment form
  const canDeploy = 
    projectData.tokenName && 
    projectData.tokenSymbol && 
    (projectData.amountToRaise || 0) >= 10000;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Deploy Your Project</h2>

        {/* Network Info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Network</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">{chainName}</span>
              {isTestnet && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                  Testnet
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Wallet</span>
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>

        {/* Deployment Summary */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Deployment Summary</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Project Name</p>
              <p className="font-semibold dark:text-white">{projectData.projectName}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Token</p>
              <p className="font-semibold dark:text-white">{projectData.tokenName} ({projectData.tokenSymbol})</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Category</p>
              <p className="font-semibold dark:text-white capitalize">{projectData.category}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Supply</p>
              <p className="font-semibold dark:text-white">{projectData.totalSupply?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Funding Goal</p>
              <p className="font-semibold dark:text-white">${projectData.amountToRaise?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Creation Fee</p>
              <p className="font-semibold dark:text-white">
                {formatEther(creationFee)} {nativeCurrency}
              </p>
            </div>
          </div>
        </div>

        {/* Contracts to Deploy */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Contracts to Deploy</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Security Token (ERC-3643 compliant)</li>
            <li>• Escrow Vault (milestone-based fund release)</li>
            <li>• Modular Compliance (transfer restrictions)</li>
            <li>• Dividend Distributor (profit sharing)</li>
            <li>• Project NFT (ownership certificate)</li>
          </ul>
        </div>

        {/* Progress Steps */}
        {status !== 'idle' && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Progress</h4>
            <div className="space-y-2">
              <ProgressStep
                label="Upload metadata to IPFS"
                status={
                  status === 'uploading' ? 'active' :
                  ['waitingWallet', 'confirming', 'verifying', 'success'].includes(status) ? 'complete' :
                  'pending'
                }
              />
              <ProgressStep
                label="Confirm transaction in wallet"
                status={
                  status === 'waitingWallet' ? 'active' :
                  ['confirming', 'verifying', 'success'].includes(status) ? 'complete' :
                  'pending'
                }
              />
              <ProgressStep
                label="Deploy contracts on-chain"
                status={
                  status === 'confirming' ? 'active' :
                  ['verifying', 'success'].includes(status) ? 'complete' :
                  'pending'
                }
              />
              <ProgressStep
                label="Verify on block explorer"
                status={
                  status === 'verifying' ? 'active' :
                  status === 'success' ? 'complete' :
                  'pending'
                }
              />
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && status === 'confirming' && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transaction submitted</p>
            <a
              href={getTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm font-mono break-all"
            >
              {txHash}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={status !== 'idle'}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleDeploy}
            disabled={!canDeploy || status !== 'idle'}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {status === 'idle' ? (
              `Deploy on ${chainName}`
            ) : status === 'uploading' ? (
              'Uploading to IPFS...'
            ) : status === 'waitingWallet' ? (
              'Confirm in Wallet...'
            ) : status === 'confirming' ? (
              'Deploying...'
            ) : (
              'Processing...'
            )}
          </button>
        </div>

        {/* Validation Errors */}
        {!canDeploy && (
          <p className="text-sm text-red-600 mt-4">
            {!projectData.tokenName && 'Token name is required. '}
            {!projectData.tokenSymbol && 'Token symbol is required. '}
            {(projectData.amountToRaise || 0) < 10000 && 'Minimum funding goal is $10,000.'}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper Components

function ContractRow({ 
  label, 
  address, 
  explorerUrl,
  verificationStatus 
}: { 
  label: string; 
  address: Address; 
  explorerUrl: string;
  verificationStatus?: 'pending' | 'success' | 'failed';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {verificationStatus === 'pending' && (
          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
        {verificationStatus === 'success' && (
          <span className="text-green-500 text-sm">✓ Verified</span>
        )}
        {verificationStatus === 'failed' && (
          <span className="text-yellow-500 text-sm">⚠ Not verified</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-primary-600 hover:text-primary-700"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </a>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function ProgressStep({ 
  label, 
  status 
}: { 
  label: string; 
  status: 'pending' | 'active' | 'complete';
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center
        ${status === 'complete' ? 'bg-green-500' : ''}
        ${status === 'active' ? 'bg-primary-500' : ''}
        ${status === 'pending' ? 'bg-gray-300 dark:bg-gray-600' : ''}
      `}>
        {status === 'complete' && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'active' && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {status === 'pending' && (
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
        )}
      </div>
      <span className={`
        text-sm
        ${status === 'complete' ? 'text-green-600 dark:text-green-400' : ''}
        ${status === 'active' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}
        ${status === 'pending' ? 'text-gray-500 dark:text-gray-400' : ''}
      `}>
        {label}
      </span>
    </div>
  );
}
