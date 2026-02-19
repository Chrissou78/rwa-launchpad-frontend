'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, keccak256, toBytes } from 'viem';
import { CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';
import Header from '@/components/Header';

export default function DebugKYCPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearLogs = () => setLogs([]);

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
      
      if (!publicClient) {
        log('ERROR: No public client');
        return;
      }

      try {
        const fee = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
          abi: KYCManagerABI,
          functionName: 'kycFee',
        });
        log(`KYC Fee: ${fee} wei (${Number(fee) / 1e18} POL)`);
      } catch (e: any) {
        log(`ERROR kycFee: ${e.message}`);
      }

      try {
        const feeRecipient = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
          address: CONTRACTS.KYCManager as `0x${string}`,
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
          address: CONTRACTS.KYCManager as `0x${string}`,
          abi: KYCManagerABI,
          functionName: 'paused',
        });
        log(`Contract paused: ${paused}`);
      } catch (e: any) {
        log(`ERROR paused: ${e.message}`);
      }

      try {
        const submission = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
        
        if (sub.status === 0 && sub.investor !== '0x0000000000000000000000000000000000000000') {
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
      
      if (!publicClient) {
        log('ERROR: No public client');
        return;
      }

      const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
      
      const implAddress = await publicClient.getStorageAt({
        address: CONTRACTS.KYCManager as `0x${string}`,
        slot: implSlot as `0x${string}`,
      });
      
      log(`Implementation slot raw: ${implAddress}`);
      
      const implAddr = '0x' + implAddress?.slice(-40);
      log(`Implementation address: ${implAddr}`);
      
      const code = await publicClient.getCode({ address: implAddr as `0x${string}` });
      log(`Implementation has code: ${code && code.length > 2 ? 'YES' : 'NO'}`);
      log(`Code size: ${code ? (code.length - 2) / 2 : 0} bytes`);

      const proxyCode = await publicClient.getCode({ address: CONTRACTS.KYCManager as `0x${string}` });
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
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      log('Setting KYC fee to 0...');

      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setKYCFee',
        args: [0n],
      });

      log(`TX SENT! Hash: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

      if (receipt?.status === 'success') {
        const fee = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      const newRecipient = '0x000000000000000000000000000000000000dEaD';
      log(`Setting fee recipient to: ${newRecipient}`);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setFeeRecipient',
        args: [newRecipient],
      });

      log(`TX SENT! Hash: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

      if (receipt?.status === 'success') {
        const recipient = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
      
      if (!publicClient || !address) {
        log('ERROR: No client or address');
        return;
      }

      const fee = await publicClient.readContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'kycFee',
      });
      log(`Contract KYC Fee: ${fee} wei (${Number(fee) / 1e18} POL)`);

      const testLevel = 1;
      const testDocHash = keccak256(toBytes(`test-${address}-${Date.now()}`));
      const testCountryCode = 250;

      log(`Level: ${testLevel}`);
      log(`DocHash: ${testDocHash}`);
      log(`CountryCode: ${testCountryCode}`);
      log(`Sending value: ${fee} wei`);

      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
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
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client or address');
        return;
      }

      const fee = await publicClient.readContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'kycFee',
      });
      log(`Using fee: ${fee} wei (${Number(fee) / 1e18} POL)`);

      const testLevel = 1;
      const testDocHash = keccak256(toBytes(`test-${address}-${Date.now()}`));
      const testCountryCode = 250;

      log(`Level: ${testLevel}`);
      log(`DocHash: ${testDocHash}`);
      log(`CountryCode: ${testCountryCode}`);
      log('Sending transaction...');

      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'submitKYC',
        args: [testLevel, testDocHash, testCountryCode],
        value: fee as bigint,
      });

      log(`TX SENT! Hash: ${hash}`);
      log(`View: https://testnet.snowtrace.io//tx/${hash}`);
      
      log('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('🎉 KYC SUBMITTED SUCCESSFULLY!');
        
        const submission = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
      log('=== RESET FEE TO 0.05 POL ===');
      
      if (!walletClient || !publicClient) {
        log('ERROR: No wallet client');
        return;
      }

      const newFee = parseEther('0.05');
      log(`Setting KYC fee to: ${newFee} wei (0.05 POL)`);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setKYCFee',
        args: [newFee],
      });

      log(`TX SENT! Hash: ${hash}`);
      
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
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      // First check current status
      const submission = await publicClient.readContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
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
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'approveKYC',
        args: [address, 1],
      });

      log(`TX SENT! Hash: ${hash}`);
      log(`View: https://testnet.snowtrace.io//tx/${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('🎉 KYC APPROVED!');
        
        const newSubmission = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      // First check current status
      const submission = await publicClient.readContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
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
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'rejectKYC',
        args: [address, 'Testing - reset submission'],
      });

      log(`TX SENT! Hash: ${hash}`);
      log(`View: https://testnet.snowtrace.io//tx/${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS ✓' : 'FAILED ✗'}`);

      if (receipt?.status === 'success') {
        log('KYC Rejected - you can now submit again');
        
        const newSubmission = await publicClient.readContract({
          address: CONTRACTS.KYCManager as `0x${string}`,
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
      
      if (!walletClient || !publicClient || !address) {
        log('ERROR: No wallet client');
        return;
      }

      log(`Setting fee recipient to: ${address}`);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setFeeRecipient',
        args: [address],
      });

      log(`TX SENT! Hash: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      log(`TX Status: ${receipt?.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error: any) {
      log(`FAILED: ${error.shortMessage || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">KYC Debug Page</h1>
        
        {!isConnected ? (
          <p className="text-yellow-400">Please connect your wallet</p>
        ) : (
          <>
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <p><strong>Wallet:</strong> {address}</p>
              <p><strong>Contract:</strong> {CONTRACTS.KYCManager}</p>
            </div>

            {/* Diagnostics */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-blue-400">Diagnostics</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={testQuickCheck}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  0. Quick Check
                </button>
                <button
                  onClick={checkImplementation}
                  disabled={isLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  1. Check UUPS Impl
                </button>
                <button
                  onClick={decodeErrorSelector}
                  disabled={isLoading}
                  className="px-6 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  7. Decode Errors
                </button>
              </div>
            </div>

            {/* KYC Management */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-green-400">KYC Management (Admin)</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={approveOwnKYC}
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  8. Approve Own KYC
                </button>
                <button
                  onClick={rejectOwnKYC}
                  disabled={isLoading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  9. Reject Own KYC
                </button>
              </div>
            </div>

            {/* Fee Settings */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-yellow-400">Fee Settings (Admin)</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={setFeeToZero}
                  disabled={isLoading}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  2. Set Fee to Zero
                </button>
                <button
                  onClick={setFeeRecipient}
                  disabled={isLoading}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  3. Fee Recipient → Dead
                </button>
                <button
                  onClick={resetFee}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded-lg font-semibold"
                >
                  6. Reset Fee to 0.05
                </button>
                <button
                  onClick={resetFeeRecipient}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded-lg font-semibold"
                >
                  10. Fee Recipient → Self
                </button>
              </div>
            </div>

            {/* Test Submit */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2 text-purple-400">Test Submit</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={testSimulateSubmit}
                  disabled={isLoading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  4. Simulate Submit
                </button>
                <button
                  onClick={testActualSubmit}
                  disabled={isLoading}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 rounded-lg font-semibold"
                >
                  5. Actual Submit
                </button>
              </div>
            </div>

            {/* Clear */}
            <div className="mb-8">
              <button
                onClick={clearLogs}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
              >
                Clear Logs
              </button>
            </div>

            {/* Logs */}
            <div className="bg-black rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
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
