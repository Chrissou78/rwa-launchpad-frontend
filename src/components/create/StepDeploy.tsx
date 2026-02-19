// src/components/create/StepDeploy.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEventLogs } from 'viem';
import { ProjectData } from '@/app/create/page';
import { EXPLORER_URL, CONTRACTS, CHAIN_ID } from '@/config/contracts';
import { RWALaunchpadFactoryABI, RWAProjectNFTABI } from '@/config/abis';

interface Props {
  data: ProjectData;
  uploadedUrls?: {
    logo?: string;
    banner?: string;
    pitchDeck?: string;
    legalDocs: string[];
  };
  onBack: () => void;
}

interface DeployedContracts {
  projectId: bigint;
  securityToken: string;
  escrowVault: string;
  compliance: string;
  nftTokenId: bigint;
}

type DeployStatus = 'idle' | 'connecting' | 'uploading' | 'waitingWallet' | 'confirming' | 'verifying' | 'success' | 'error';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export function StepDeploy({ data, uploadedUrls, onBack }: Props) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, isPending: isConnectPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  
  const [status, setStatus] = useState<DeployStatus>('idle');
  const [error, setError] = useState<string>('');
  const [metadataUri, setMetadataUri] = useState<string>('');
  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [creationFee, setCreationFee] = useState<bigint>(0n);
  const [verificationStatus, setVerificationStatus] = useState({
    securityToken: 'pending' as 'pending' | 'success' | 'failed',
    escrowVault: 'pending' as 'pending' | 'success' | 'failed',
    compliance: 'pending' as 'pending' | 'success' | 'failed',
  });

  const { 
    writeContractAsync,
    error: writeError, 
    isPending: isWritePending,
    reset: resetWrite 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isReceiptError,
    error: receiptError,
    data: receipt 
  } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  // Check if on correct network
  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  // Fetch creation fee on mount
  useEffect(() => {
    const fetchCreationFee = async () => {
      if (!publicClient || !CONTRACTS.RWALaunchpadFactory) return;
      try {
        const fee = await publicClient.readContract({
          address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
          abi: RWALaunchpadFactoryABI,
          functionName: 'creationFee',
        });
        setCreationFee(fee as bigint);
      } catch (err) {
        console.error('Failed to fetch creation fee:', err);
      }
    };
    fetchCreationFee();
  }, [publicClient]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      console.error('Connection error:', connectError);
      setError(`Connection failed: ${connectError.message}`);
      setStatus('error');
    }
  }, [connectError]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError);
      setError(extractErrorMessage(writeError));
      setStatus('error');
    }
  }, [writeError]);

  // Handle receipt errors
  useEffect(() => {
    if (isReceiptError && receiptError) {
      console.error('Receipt error:', receiptError);
      setError(extractErrorMessage(receiptError));
      setStatus('error');
    }
  }, [isReceiptError, receiptError]);

  // Update status when confirming
  useEffect(() => {
    if (isConfirming && txHash) {
      setStatus('confirming');
    }
  }, [isConfirming, txHash]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && receipt) {
      console.log('Transaction confirmed:', receipt);
      parseDeploymentEvents();
    }
  }, [isSuccess, receipt]);

  const extractErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    
    if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
      return 'Transaction rejected by user';
    }
    
    if (error.message?.includes('execution reverted')) {
      const match = error.message.match(/reason="([^"]+)"/);
      if (match) return match[1];
      return 'Contract execution failed. Please check parameters.';
    }

    if (error.message?.includes('InsufficientFee')) {
      return `Insufficient fee. Required: ${creationFee > 0n ? (Number(creationFee) / 1e18).toFixed(4) : '0'} POL`;
    }

    if (error.message?.includes('InvalidDeadline')) {
      return 'Invalid deadline. Must be at least minimum required days.';
    }

    if (error.message?.includes('InvalidFee')) {
      return 'Invalid funding goal. Must meet minimum requirement.';
    }

    if (error.shortMessage) return error.shortMessage;
    if (error.cause?.message) return error.cause.message;
    
    return error.message || 'Transaction failed';
  };

  const parseDeploymentEvents = async () => {
    if (!receipt) return;

    try {
      console.log('Parsing', receipt.logs.length, 'logs');

      // Parse ProjectDeployed event from factory
      const factoryLogs = parseEventLogs({
        abi: RWALaunchpadFactoryABI,
        logs: receipt.logs.filter(log => 
          log.address.toLowerCase() === CONTRACTS.RWALaunchpadFactory?.toLowerCase()
        ),
        eventName: 'ProjectDeployed',
      });

      // Parse NFT Transfer event (mint)
      const nftLogs = parseEventLogs({
        abi: RWAProjectNFTABI,
        logs: receipt.logs.filter(log => 
          log.address.toLowerCase() === CONTRACTS.RWAProjectNFT?.toLowerCase()
        ),
        eventName: 'Transfer',
      });

      if (factoryLogs.length > 0) {
        const event = factoryLogs[0];
        
        // Find NFT mint event (from zero address)
        const nftMint = nftLogs.find(log => 
          log.args.from?.toLowerCase() === ZERO_ADDRESS.toLowerCase()
        );

        const contracts: DeployedContracts = {
          projectId: event.args.projectId,
          securityToken: event.args.securityToken,
          escrowVault: event.args.escrowVault,
          compliance: event.args.compliance,
          nftTokenId: nftMint?.args.tokenId || event.args.projectId,
        };

        console.log('Deployed contracts:', contracts);
        setDeployedContracts(contracts);
        
        setStatus('verifying');
        await verifyContracts(contracts);
        setStatus('success');
      } else {
        console.warn('No ProjectDeployed event found in logs');
        // Still mark as success since tx confirmed
        setStatus('success');
      }
    } catch (err) {
      console.error('Error parsing events:', err);
      // Still mark as success since tx confirmed
      setStatus('success');
    }
  };

  const verifyContracts = async (contracts: DeployedContracts) => {
    const verify = async (addr: string, type: 'securityToken' | 'escrowVault' | 'compliance') => {
      try {
        const res = await fetch('/api/verify-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: addr, 
            contractType: type, 
            projectId: contracts.projectId.toString() 
          }),
        });
        const result = await res.json();
        setVerificationStatus(prev => ({ 
          ...prev, 
          [type]: result.success ? 'success' : 'failed' 
        }));
      } catch {
        setVerificationStatus(prev => ({ ...prev, [type]: 'failed' }));
      }
    };

    await Promise.allSettled([
      verify(contracts.securityToken, 'securityToken'),
      verify(contracts.escrowVault, 'escrowVault'),
      verify(contracts.compliance, 'compliance'),
    ]);
  };

  const handleConnect = async () => {
    try {
      setStatus('connecting');
      setError('');
      connect({ connector: injected() });
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setStatus('error');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      switchChain({ chainId: CHAIN_ID });
    } catch (err: any) {
      setError(`Failed to switch network: ${err.message}`);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected || !address) {
      handleConnect();
      return;
    }

    if (isWrongNetwork) {
      handleSwitchNetwork();
      return;
    }

    if (!CONTRACTS.RWALaunchpadFactory) {
      setError('RWALaunchpadFactory contract not configured');
      setStatus('error');
      return;
    }

    try {
      setError('');
      resetWrite();
      setTxHash(undefined);
      setStatus('uploading');

      // Create metadata object
      const metadata = {
        name: data.projectName,
        description: data.description,
        image: uploadedUrls?.banner || uploadedUrls?.logo || '',
        external_url: data.website || '',
        attributes: {
          category: data.category,
          projected_roi: data.projectedROI,
          company_name: data.companyName,
          jurisdiction: data.jurisdiction,
        },
        properties: {
          funding_goal: data.amountToRaise,
          token_name: data.tokenName,
          token_symbol: data.tokenSymbol,
          total_supply: data.totalSupply,
          roi_timeline_months: data.roiTimelineMonths,
          revenue_model: data.revenueModel,
          investor_share_percent: data.investorSharePercent,
        },
        documents: [] as Array<{ name: string; url: string; type: string }>,
      };

      // Add uploaded documents
      if (uploadedUrls?.logo) {
        metadata.image = uploadedUrls.logo;
      }
      if (uploadedUrls?.pitchDeck) {
        metadata.documents.push({
          name: 'Pitch Deck',
          url: uploadedUrls.pitchDeck,
          type: 'PDF',
        });
      }
      if (uploadedUrls?.legalDocs && uploadedUrls.legalDocs.length > 0) {
        uploadedUrls.legalDocs.forEach((url, index) => {
          metadata.documents.push({
            name: `Legal Document ${index + 1}`,
            url: url,
            type: 'PDF',
          });
        });
      }

      console.log('Uploading metadata to IPFS:', metadata);

      // Upload metadata to IPFS
      const ipfsResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!ipfsResponse.ok) {
        const ipfsError = await ipfsResponse.json();
        throw new Error(ipfsError.error || 'Failed to upload metadata to IPFS');
      }

      const ipfsResult = await ipfsResponse.json();
      const uri = ipfsResult.ipfsUri;
      setMetadataUri(uri);
      console.log('Metadata uploaded to IPFS:', uri);

      setStatus('waitingWallet');

      // Prepare deployment parameters
      const maxSupply = BigInt(data.totalSupply) * BigInt(10 ** 18);
      const fundingGoal = BigInt(data.amountToRaise);
      const deadlineDays = BigInt(30); // 30 days default

      console.log('Deploying project with params:', {
        name: data.tokenName,
        symbol: data.tokenSymbol,
        category: data.category,
        maxSupply: maxSupply.toString(),
        fundingGoal: fundingGoal.toString(),
        deadlineDays: deadlineDays.toString(),
        metadataUri: uri,
        creationFee: creationFee.toString(),
      });

console.log('=== PRE-DEPLOY DIAGNOSTICS ===');
const factoryAddress = CONTRACTS.RWALaunchpadFactory as `0x${string}`;

// Check contract has code
const code = await publicClient!.getBytecode({ address: factoryAddress });
console.log('Contract has code:', !!code && code !== '0x');

// Read the ERC1967 implementation slot directly
const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const implStorage = await publicClient!.getStorageAt({
  address: factoryAddress,
  slot: implementationSlot as `0x${string}`,
});
console.log('Implementation address from storage:', implStorage);

// Try basic reads one by one
try {
  const owner = await publicClient!.readContract({
    address: factoryAddress,
    abi: [{ inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" }],
    functionName: 'owner',
  });
  console.log('Owner:', owner);
} catch (e: any) {
  console.error('owner() failed:', e.message);
}

try {
  const fee = await publicClient!.readContract({
    address: factoryAddress,
    abi: [{ inputs: [], name: "creationFee", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: 'creationFee',
  });
  console.log('Creation fee:', fee);
} catch (e: any) {
  console.error('creationFee() failed:', e.message);
}

try {
  const paused = await publicClient!.readContract({
    address: factoryAddress,
    abi: [{ inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" }],
    functionName: 'paused',
  });
  console.log('Paused:', paused);
} catch (e: any) {
  console.error('paused() failed:', e.message);
}

try {
  const requireApproval = await publicClient!.readContract({
    address: factoryAddress,
    abi: [{ inputs: [], name: "requireApproval", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" }],
    functionName: 'requireApproval',
  });
  console.log('Require approval:', requireApproval);
} catch (e: any) {
  console.error('requireApproval() failed:', e.message);
}

      // Call deployProject on factory
      const hash = await writeContractAsync({
        address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
        abi: RWALaunchpadFactoryABI,
        functionName: 'deployProject',
        args: [
          data.tokenName,           // _name
          data.tokenSymbol,         // _symbol
          ZERO_ADDRESS,             // unused address param
          data.category,            // _category
          maxSupply,                // _maxSupply
          fundingGoal,              // _fundingGoal
          deadlineDays,             // _deadlineDays
          uri,                      // _metadataUri
        ],
        value: creationFee,
      });

      console.log('Transaction submitted:', hash);
      setTxHash(hash);
      setStatus('confirming');

    } catch (err: any) {
      console.error('Deploy error:', err);
      setError(extractErrorMessage(err));
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setError('');
    setTxHash(undefined);
    setDeployedContracts(null);
    setVerificationStatus({
      securityToken: 'pending',
      escrowVault: 'pending',
      compliance: 'pending',
    });
    resetWrite();
  };

  // Loading states
  const isLoading = isConnecting || isConnectPending || status === 'connecting';

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Deploy Your Project</h2>
        <p className="text-gray-400">Deploy your ERC-3643 Security Token on Avalanche Fuji</p>
      </div>

      {/* Not Connected */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
          <p className="text-yellow-400 mb-4">Connect your wallet to deploy</p>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-medium rounded-lg"
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          <p className="text-gray-500 text-sm mt-4">
            Need testnet AVAX?{' '}
            <a href="https://core.app/tools/testnet-faucet" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              Get from faucet
            </a>
          </p>
        </div>
      )}

      {/* Wrong Network */}
      {isConnected && isWrongNetwork && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 text-center">
          <p className="text-orange-400 mb-4">Please switch to Avalanche Fuji network</p>
          <button
            onClick={handleSwitchNetwork}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded-lg"
          >
            Switch Network
          </button>
        </div>
      )}

      {/* Connected & Correct Network */}
      {isConnected && !isWrongNetwork && (
        <>
          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Deployment Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Project:</span> <span className="text-white">{data.projectName}</span></div>
              <div><span className="text-gray-400">Token:</span> <span className="text-white">{data.tokenName} ({data.tokenSymbol})</span></div>
              <div><span className="text-gray-400">Category:</span> <span className="text-white">{data.category}</span></div>
              <div><span className="text-gray-400">Supply:</span> <span className="text-white">{data.totalSupply?.toLocaleString()} tokens</span></div>
              <div><span className="text-gray-400">Goal:</span> <span className="text-white">${data.amountToRaise?.toLocaleString()}</span></div>
              <div><span className="text-gray-400">Deadline:</span> <span className="text-white">30 days</span></div>
              <div><span className="text-gray-400">Wallet:</span> <span className="text-white font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span></div>
              <div><span className="text-gray-400">Network:</span> <span className="text-green-400">Avalanche Fuji ✓</span></div>
            </div>
            {creationFee > 0n && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <span className="text-yellow-400 text-sm">
                  Creation Fee: {(Number(creationFee) / 1e18).toFixed(4)} POL
                </span>
              </div>
            )}
          </div>

          {/* What will be deployed */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contracts to be Deployed</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Security Token (ERC-3643)</span>
                <span className="text-gray-500">- Your tokenized asset</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Escrow Vault</span>
                <span className="text-gray-500">- Holds investor funds</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Modular Compliance</span>
                <span className="text-gray-500">- Regulatory controls</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Dividend Distributor</span>
                <span className="text-gray-500">- Revenue sharing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Max Balance Module</span>
                <span className="text-gray-500">- Investment limits</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Lockup Module</span>
                <span className="text-gray-500">- Token vesting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">●</span>
                <span className="text-gray-300">Project NFT</span>
                <span className="text-gray-500">- Ownership proof (minted to you)</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          {['uploading', 'waitingWallet', 'confirming', 'verifying'].includes(status) && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Deployment Progress</h3>
              <div className="space-y-3">
                <Step label="Upload metadata to IPFS" done={status !== 'uploading'} active={status === 'uploading'} />
                <Step label="Confirm in wallet" done={['confirming', 'verifying', 'success'].includes(status)} active={status === 'waitingWallet'} />
                <Step label="Deploy contracts on-chain" done={['verifying', 'success'].includes(status)} active={status === 'confirming'} />
                <Step label="Verify on SnowTrace" done={status === 'success'} active={status === 'verifying'} />
              </div>
              {txHash && (
                <div className="mt-4 p-3 bg-gray-900 rounded text-sm">
                  <span className="text-gray-400">Tx: </span>
                  <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-mono">
                    {txHash.slice(0, 14)}...{txHash.slice(-10)}
                  </a>
                  {status === 'confirming' && (
                    <span className="text-yellow-400 ml-2 animate-pulse">Waiting for confirmation...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {status === 'success' && deployedContracts && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-xl font-bold text-green-400">Project Deployed Successfully!</h3>
                <p className="text-gray-400 mt-2">All contracts have been deployed and configured</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">🖼️ Your Project NFT</h4>
                <p className="text-gray-400 text-sm">Token ID: <span className="text-white font-bold">#{deployedContracts.nftTokenId.toString()}</span></p>
                <p className="text-gray-400 text-sm">Owner: <span className="text-white font-mono text-xs">{address}</span></p>
                <a 
                  href={`${EXPLORER_URL}/token/${CONTRACTS.RWAProjectNFT}?a=${deployedContracts.nftTokenId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-400 hover:underline text-sm mt-2 inline-block"
                >
                  View NFT on SnowTrace →
                </a>
              </div>

              <div className="space-y-2">
                <h4 className="text-white font-medium">Deployed Contracts</h4>
                <ContractRow label="Security Token" address={deployedContracts.securityToken} status={verificationStatus.securityToken} />
                <ContractRow label="Escrow Vault" address={deployedContracts.escrowVault} status={verificationStatus.escrowVault} />
                <ContractRow label="Compliance" address={deployedContracts.compliance} status={verificationStatus.compliance} />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">📋 Next Steps</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Configure country restrictions in compliance module</li>
                  <li>• Set investment limits per investor tier</li>
                  <li>• Add project milestones in escrow vault</li>
                  <li>• Submit for platform review to activate fundraising</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <a href={`/projects/${deployedContracts.nftTokenId}`} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg font-medium">
                  View Project
                </a>
                <button onClick={handleReset} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">
                  Create Another
                </button>
              </div>
            </div>
          )}

          {/* Success without parsed events */}
          {status === 'success' && !deployedContracts && txHash && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-xl font-bold text-green-400">Transaction Confirmed!</h3>
                <p className="text-gray-400 mt-2">Your project has been deployed successfully</p>
              </div>

              <div className="p-3 bg-gray-900 rounded text-sm">
                <span className="text-gray-400">Transaction: </span>
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-mono">
                  {txHash}
                </a>
              </div>

              <div className="flex gap-4">
                <a href="/projects" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg font-medium">
                  View All Projects
                </a>
                <button onClick={handleReset} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">
                  Create Another
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-red-400 font-medium mb-2">Deployment Failed</h3>
              <p className="text-gray-300 text-sm mb-4 bg-gray-900 p-3 rounded font-mono overflow-auto max-h-24">{error}</p>
              <div className="flex gap-3">
                <button onClick={handleReset} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Try Again
                </button>
                <button onClick={() => disconnect()} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}

          {/* Deploy Button */}
          {status === 'idle' && (
            <div className="flex gap-4">
              <button onClick={onBack} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">
                Back
              </button>
              <button 
                onClick={handleDeploy} 
                disabled={!data.tokenName || !data.tokenSymbol || data.amountToRaise < 10000}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                Deploy Project {creationFee > 0n ? `(${(Number(creationFee) / 1e18).toFixed(4)} POL)` : ''}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Step({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        done ? 'bg-green-500 text-white' : 
        active ? 'bg-purple-500 text-white animate-pulse' : 
        'bg-gray-700 text-gray-500'
      }`}>
        {done ? '✓' : active ? '•' : '○'}
      </div>
      <span className={done ? 'text-green-400' : active ? 'text-white' : 'text-gray-500'}>{label}</span>
      {active && <span className="text-gray-500 text-sm animate-pulse">Processing...</span>}
    </div>
  );
}

function ContractRow({ label, address, status }: { label: string; address: string; status: 'pending' | 'success' | 'failed' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <div>
        <span className="text-gray-400 text-sm">{label}</span>
       <a 
          href={`${EXPLORER_URL}/address/${address}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block text-purple-400 hover:underline font-mono text-xs"
        >
          {address}
        </a>
      </div>
      <span title={status === 'success' ? 'Verified' : status === 'failed' ? 'Verification pending' : 'Verifying...'}>
        {status === 'success' ? '✅' : status === 'failed' ? '⚠️' : '⏳'}
      </span>
    </div>
  );
}

const addMilestonesToEscrow = async (projectId: bigint, escrowAddress: string) => {
  const escrowContract = getContract({
    address: escrowAddress as `0x${string}`,
    abi: ESCROW_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  for (let i = 0; i < data.milestones.length; i++) {
    const milestone = data.milestones[i];
    const targetTimestamp = Math.floor(new Date(milestone.targetDate).getTime() / 1000);
    
    // Calculate amount in wei (assuming 18 decimals for USD representation)
    const amountWei = parseUnits(milestone.amountUSD.toString(), 18);
    
    const tx = await escrowContract.write.addMilestone([
      projectId,
      milestone.title,
      milestone.description,
      amountWei,
      targetTimestamp,
    ]);
    
    await publicClient.waitForTransactionReceipt({ hash: tx });
    
    setProgress(`Added milestone ${i + 1}/${data.milestones.length}: ${milestone.title}`);
  }
};

export default StepDeploy;

