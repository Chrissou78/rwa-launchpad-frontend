// src/app/admin/offchain/OffChainPayments.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { RWAEscrowVaultABI } from '@/config/abis';
import { Project } from '../constants';
import { ZERO_ADDRESS } from '@/config/contracts';
import { formatUSD } from '../helpers';

interface OffChainPaymentsProps {
  projects: Project[];
  onRefresh: () => void;
}

export default function OffChainPayments({ projects, onRefresh }: OffChainPaymentsProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [investorAddress, setInvestorAddress] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Off-chain payment recorded successfully!' });
      setInvestorAddress('');
      setAmountUSD('');
      setPaymentReference('');
      onRefresh();
      resetTx();
    }
  }, [txSuccess, onRefresh, resetTx]);

  const activeProjects = projects.filter(p => p.status !== 6 && p.status !== 7 && p.escrowVault !== ZERO_ADDRESS);

  const handleRecordPayment = async () => {
    if (!selectedProject || !investorAddress || !amountUSD || !paymentReference) return;
    if (!isAddress(investorAddress)) {
      setResult({ success: false, message: 'Invalid investor address' });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const amountWithDecimals = BigInt(Math.floor(parseFloat(amountUSD) * 1e6));

      writeContract({
        address: selectedProject.escrowVault as `0x${string}`,
        abi: RWAEscrowVaultABI,
        functionName: 'recordOffChainInvestment',
        args: [
          BigInt(selectedProject.id),
          investorAddress as `0x${string}`,
          amountWithDecimals,
          paymentReference,
        ],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to record payment' });
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Off-Chain Payments</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Record Swipe / Card Payment</h3>
        <p className="text-gray-400 text-sm mb-6">
          Record off-chain payments (Swipe, card, wire transfer). The investor will receive security tokens but funds are managed externally.
        </p>

        {(processing || txLoading) && (
          <div className="p-4 rounded-lg bg-blue-900/50 text-blue-400 mb-4">
            Processing transaction... Please confirm in your wallet.
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg mb-4 ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {result.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Select Project</label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = activeProjects.find(p => p.id === Number(e.target.value));
                setSelectedProject(project || null);
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select a project...</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.name} ({formatUSD(p.totalRaised)} / {formatUSD(p.fundingGoal)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Investor Wallet Address</label>
            <input
              type="text"
              value={investorAddress}
              onChange={(e) => setInvestorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            {investorAddress && !isAddress(investorAddress) && (
              <p className="text-red-400 text-sm mt-1">Invalid address format</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount (USD)</label>
            <input
              type="number"
              value={amountUSD}
              onChange={(e) => setAmountUSD(e.target.value)}
              placeholder="1000.00"
              min="0"
              step="0.01"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Payment Reference</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="SWIPE-12345 or transaction ID"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          <button
            onClick={handleRecordPayment}
            disabled={!selectedProject || !investorAddress || !isAddress(investorAddress) || !amountUSD || !paymentReference || processing || txLoading}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
          >
            {processing || txLoading ? 'Processing...' : 'Record Off-Chain Payment'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
        <h4 className="text-yellow-400 font-medium mb-2">Important Notes</h4>
        <ul className="text-yellow-200/80 text-sm space-y-1">
          <li>• Off-chain payments are tracked separately from on-chain funds</li>
          <li>• Security tokens will be minted to the investor&apos;s wallet</li>
          <li>• Fund release for off-chain amounts must be handled manually</li>
          <li>• Always verify payment confirmation before recording</li>
        </ul>
      </div>
    </div>
  );
}
