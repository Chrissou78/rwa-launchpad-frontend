// src/app/debug/kyc/page.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { parseEther, keccak256, toBytes, Address } from 'viem';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import { KYCManagerABI } from '@/config/abis';
import Header from '@/components/Header';

export default function DebugKYCPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const walletChainId = useChainId();
  
  // Multichain config
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    getDeployedChains,
  } = useChainConfig();

  // Dynamic contract address
  const kycManagerAddress = contracts?.KYCManager as Address | undefined;

  // Check if on wrong chain
  const isWrongChain = useMemo(() => {
    if (!isConnected) return false;
    return walletChainId !== chainId;
  }, [isConnected, walletChainId, chainId]);

  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  // Network switch handler
  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchToChain]);

  // Status enum helper
  const getStatusName = (status: number) => {
    const names = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
    return names[status] || `UNKNOWN(${status})`;
  };

  const getLevelName = (level: number) => {
    const names = ['NONE', 'BASIC', 'STANDARD', 'ACCREDITED', 'INSTITUTIONAL'];
    return names[level] || `UNKNOWN(${level})`;
  };

  // 0. Quick Check
  const testQuickCheck = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== QUICK CHECK ===');
      log(`Chain: ${chainName} (${chainId})`);
      log(`Native Currency: ${nativeCurrency?.symbol || 'Unknown'}`);
      
      if (!publicClient) {
        log('ERROR: No public client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      log(`KYCManager: ${kycManagerAddress}`);

      try {
        const fee = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'kycFee',
        });
        log(`KYC Fee: ${fee} wei (${Number(fee) / 1e18} ${nativeCurrency?.symbol || 'NATIVE'})`);
      } catch (e: any) {
        log(`ERROR kycFee: ${e.message}`);
      }

      try {
        const feeRecipient = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'feeRecipient',
        });
        log(`Fee Recipient: ${feeRecipient}`);
        if (feeRecipient === address) {
          log(`⚠️ WARNING: Fee recipient is YOUR wallet`);
        }
      } catch (e: any) {
        log(`ERROR feeRecipient: ${e.message}`);
      }

      try {
        const isBlocked = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'blockedCountries',
          args: [250],
        });
        log(`Country 250 (France) blocked: ${isBlocked}`);
      } catch (e: any) {
        log(`ERROR blockedCountries: ${e.message}`);
      }

      try {
        const paused = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'paused',
        });
        log(`Contract paused: ${paused}`);
      } catch (e: any) {
        log(`ERROR paused: ${e.message}`);
      }

      try {
        const submission = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [address],
        });
        const sub = submission as any;
        log(`Current submission:`);
        log(`  Status: ${sub.status} (${getStatusName(sub.status)})`);
        log(`  Level: ${sub.level} (${getLevelName(sub.level)})`);
        log(`  Investor: ${sub.investor}`);
        log(`  Country: ${sub.countryCode}`);
        log(`  DocHash: ${sub.documentHash || '(empty)'}`);
        
        if (sub.status === 0 && sub.investor !== ZERO_ADDRESS) {
          log(`⚠️ You have a PENDING submission - cannot submit again until approved/rejected`);
        }
      } catch (e: any) {
        log(`ERROR getSubmission: ${e.message}`);
      }

      log('=== DONE ===');
    } catch (error: any) {
      log(`FATAL ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Check UUPS Implementation
  const checkImplementation = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== CHECK UUPS IMPLEMENTATION ===');
      log(`Chain: ${chainName}`);
      
      if (!publicClient) {
        log('ERROR: No public client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
      
      const implAddress = await publicClient.getStorageAt({
        address: kycManagerAddress,
        slot: implSlot as `0x${string}`,
      });
      
      log(`Implementation slot raw: ${implAddress}`);
      
      const implAddr = '0x' + implAddress?.slice(-40);
      log(`Implementation address: ${implAddr}`);
      
      const code = await publicClient.getCode({ address: implAddr as `0x${string}` });
      log(`Implementation has code: ${code && code.length > 2 ? 'YES' : 'NO'}`);
      log(`Code size: ${code ? (code.length - 2) / 2 : 0} bytes`);

      const proxyCode = await publicClient.getCode({ address: kycManagerAddress });
      log(`Proxy code size: ${proxyCode ? (proxyCode.length - 2) / 2 : 0} bytes`);

      log('=== DONE ===');
    } catch (error: any) {
      log(`ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Set Fee to Zero
  const setFeeToZero = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== SET FEE TO ZERO ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      log('Setting KYC fee to 0...');

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'setKYCFee',
        args: [0n],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

      if (receipt?.status === 'success') {
        const fee = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'kycFee',
        });
        log(`New KYC Fee: ${fee} wei`);
      }
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Set Fee Recipient
  const setFeeRecipient = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== SET FEE RECIPIENT ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      const newRecipient = '0x000000000000000000000000000000000000dEaD';
      log(`Setting fee recipient to: ${newRecipient}`);

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'setFeeRecipient',
        args: [newRecipient],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

      if (receipt?.status === 'success') {
        const recipient = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'feeRecipient',
        });
        log(`New Fee Recipient: ${recipient}`);
      }
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Simulate Submit
  const testSimulateSubmit = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== SIMULATE SUBMIT TEST ===');
      log(`Chain: ${chainName}`);
      
      if (!publicClient || !address) {
        log('ERROR: No client or address');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      const fee = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'kycFee',
      });
      log(`Contract KYC Fee: ${fee} wei (${Number(fee) / 1e18} ${nativeCurrency?.symbol || 'NATIVE'})`);

      const testLevel = 1;
      const testDocHash = keccak256(toBytes(`test-${address}-${Date.now()}`));
      const testCountryCode = 250;

      log(`Level: ${testLevel}`);
      log(`DocHash: ${testDocHash}`);
      log(`CountryCode: ${testCountryCode}`);
      log(`Sending value: ${fee} wei`);

      const { request } = await publicClient.simulateContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'submitKYC',
        args: [testLevel, testDocHash, testCountryCode],
        value: fee as bigint,
        account: address,
      });

      log('SIMULATION SUCCESS!');
      log(`Gas estimate: ${request.gas?.toString() || 'unknown'}`);
      
    } catch (error: any) {
      log(`SIMULATION FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Actual Submit
  const testActualSubmit = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== ACTUAL SUBMIT TEST ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client or address');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      const fee = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'kycFee',
      });
      log(`Using fee: ${fee} wei (${Number(fee) / 1e18} ${nativeCurrency?.symbol || 'NATIVE'})`);

      const testLevel = 1;
      const testDocHash = keccak256(toBytes(`test-${address}-${Date.now()}`));
      const testCountryCode = 250;

      log(`Level: ${testLevel}`);
      log(`DocHash: ${testDocHash}`);
      log(`CountryCode: ${testCountryCode}`);
      log('Sending transaction...');

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'submitKYC',
        args: [testLevel, testDocHash, testCountryCode],
        value: fee as bigint,
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }

      log('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('🎉 KYC SUBMITTED SUCCESSFULLY!');
        
        const submission = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [address],
        });
        const sub = submission as any;
        log(`New Status: ${sub.status} (${getStatusName(sub.status)})`);
        log(`New Level: ${sub.level} (${getLevelName(sub.level)})`);
      }
      
    } catch (error: any) {
      log(`SUBMIT FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Reset Fee
  const resetFee = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== RESET FEE ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      const newFee = parseEther('0.05');
      log(`Setting KYC fee to: ${newFee} wei (0.05 ${nativeCurrency?.symbol || 'NATIVE'})`);

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'setKYCFee',
        args: [newFee],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Decode Errors
  const decodeErrorSelector = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== DECODE ERROR SELECTORS ===');
      
      const errors = [
        'InvalidLevel()',
        'AlreadySubmitted()',
        'NotPending()',
        'KYCExpiredError()',
        'KYCNotApproved()',
        'InvestmentLimitExceeded()',
        'CountryBlockedError()',
        'ZeroAddress()',
        'BatchTooLarge()',
        'InsufficientInvestment()',
        'UnauthorizedEscrow()',
        'InsufficientFee()',
        'FeeTransferFailed()',
        'InvalidFeeRecipient()',
        'NoFeesToWithdraw()',
      ];

      for (const error of errors) {
        const selector = keccak256(toBytes(error)).slice(0, 10);
        log(`${selector} = ${error}`);
      }

      log('');
      log('Common error: 0x9fbfc589 = AlreadySubmitted()');
      
    } catch (error: any) {
      log(`ERROR: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Approve Own KYC
  const approveOwnKYC = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== APPROVE OWN KYC ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      // First check current status
      const submission = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [address],
      });
      const sub = submission as any;
      log(`Current Status: ${sub.status} (${getStatusName(sub.status)})`);

      if (sub.status !== 0) {
        log(`ERROR: Can only approve PENDING submissions. Current status is ${getStatusName(sub.status)}`);
        return;
      }

      log(`Approving KYC for: ${address}`);
      log('Level: 1 (BASIC)');

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'approveKYC',
        args: [address, 1],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('🎉 KYC APPROVED!');
        
        const newSubmission = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [address],
        });
        const newSub = newSubmission as any;
        log(`New Status: ${newSub.status} (${getStatusName(newSub.status)})`);
        log(`New Level: ${newSub.level} (${getLevelName(newSub.level)})`);
      }
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Reject Own KYC
  const rejectOwnKYC = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== REJECT OWN KYC ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      // First check current status
      const submission = await publicClient.readContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'getSubmission',
        args: [address],
      });
      const sub = submission as any;
      log(`Current Status: ${sub.status} (${getStatusName(sub.status)})`);

      if (sub.status !== 0) {
        log(`ERROR: Can only reject PENDING submissions. Current status is ${getStatusName(sub.status)}`);
        return;
      }

      log(`Rejecting KYC for: ${address}`);

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'rejectKYC',
        args: [address, 'Testing - reset submission'],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('KYC Rejected - you can now submit again');
        
        const newSubmission = await publicClient.readContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [address],
        });
        const newSub = newSubmission as any;
        log(`New Status: ${newSub.status} (${getStatusName(newSub.status)})`);
      }
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Reset Fee Recipient to self
  const resetFeeRecipient = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      log('=== RESET FEE RECIPIENT TO SELF ===');
      log(`Chain: ${chainName}`);
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      if (!kycManagerAddress) {
        log('ERROR: KYCManager not deployed on this chain');
        return;
      }

      log(`Setting fee recipient to: ${address}`);

      const hash = await walletClient.writeContract({
        address: kycManagerAddress,
        abi: KYCManagerABI,
        functionName: 'setFeeRecipient',
        args: [address],
      });

      log(`TX SENT! Hash: ${hash}`);
      if (explorerUrl) {
        log(`View: ${explorerUrl}/tx/${hash}`);
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get deployed chains for network switcher
  const deployedChains = getDeployedChains();

  // Network not supported view
  if (!isDeployed) {
    return (
      <main className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              KYCManager is not deployed on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {chain.name}
                  {chain.testnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Wrong chain warning component
  const WrongChainWarning = () => (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-500">Wrong Network</p>
            <p className="text-sm text-gray-400">Please switch to {chainName} to use debug tools</p>
          </div>
        </div>
        <button
          onClick={() => handleSwitchNetwork()}
          disabled={isSwitching}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-medium rounded-lg transition-colors"
        >
          {isSwitching ? 'Switching...' : `Switch to ${chainName}`}
        </button>
      </div>
    </div>
  );

  // Network badge component
  const NetworkBadge = () => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-400">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">KYC Debug Page</h1>
            <p className="text-gray-400 mt-1">Test and debug KYC contract functions</p>
          </div>
          <div className="flex items-center gap-4">
            <NetworkBadge />
            {explorerUrl && kycManagerAddress && (
              <a
                href={`${explorerUrl}/address/${kycManagerAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View Contract →
              </a>
            )}
          </div>
        </div>

        {/* Wrong Chain Warning */}
        {isWrongChain && <WrongChainWarning />}
        
        {!isConnected ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-yellow-400 text-lg">Please connect your wallet</p>
          </div>
        ) : (
          <>
            {/* Info Panel */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Wallet</p>
                  <p className="font-mono text-sm">{address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">KYCManager Contract</p>
                  <p className="font-mono text-sm">{kycManagerAddress || 'Not deployed'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Network</p>
                  <p className="text-sm">{chainName} ({chainId})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Native Currency</p>
                  <p className="text-sm">{nativeCurrency?.symbol || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Diagnostics */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-blue-400">Diagnostics</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={testQuickCheck}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  0. Quick Check
                </button>
                <button
                  onClick={checkImplementation}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  1. Check UUPS Impl
                </button>
                <button
                  onClick={decodeErrorSelector}
                  disabled={isLoading}
                  className="px-6 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  7. Decode Errors
                </button>
              </div>
            </div>

            {/* KYC Management */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-green-400">KYC Management (Admin)</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={approveOwnKYC}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  8. Approve Own KYC
                </button>
                <button
                  onClick={rejectOwnKYC}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  9. Reject Own KYC
                </button>
              </div>
            </div>

            {/* Fee Settings */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-yellow-400">Fee Settings (Admin)</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={setFeeToZero}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  2. Set Fee to Zero
                </button>
                <button
                  onClick={setFeeRecipient}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  3. Fee Recipient → Dead
                </button>
                <button
                  onClick={resetFee}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  6. Reset Fee to 0.05
                </button>
                <button
                  onClick={resetFeeRecipient}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  10. Fee Recipient → Self
                </button>
              </div>
            </div>

            {/* Test Submit */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-purple-400">Test Submit</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={testSimulateSubmit}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  4. Simulate Submit
                </button>
                <button
                  onClick={testActualSubmit}
                  disabled={isLoading || isWrongChain}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  5. Actual Submit
                </button>
              </div>
            </div>

            {/* Clear Logs */}
            <div className="mb-8">
              <button
                onClick={clearLogs}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
              >
                Clear Logs
              </button>
            </div>

            {/* Logs Panel */}
            <div className="bg-black rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto border border-gray-800">
              {logs.length === 0 ? (
                <p className="text-gray-500">Click a button to start testing...</p>
              ) : (
                logs.map((logMsg, i) => (
                  <p 
                    key={i} 
                    className={
                      logMsg.includes('ERROR') || logMsg.includes('FAILED') || logMsg.includes('✗')
                        ? 'text-red-400' 
                        : logMsg.includes('SUCCESS') || logMsg.includes('✓') || logMsg.includes('🎉')
                          ? 'text-green-400' 
                          : logMsg.includes('WARNING') || logMsg.includes('⚠️')
                            ? 'text-yellow-400'
                            : logMsg.includes('Chain:') || logMsg.includes('===')
                              ? 'text-blue-400'
                              : 'text-gray-300'
                    }
                  >
                    {logMsg}
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
