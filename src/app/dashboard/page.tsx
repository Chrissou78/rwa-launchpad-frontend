'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, ZERO_ADDRESS } from '@/config/contracts';

interface Investment {
  projectId: bigint;
  projectName: string;
  amount: bigint;
  tokenBalance: bigint;
  currentValue: bigint;
  roi: number;
  pendingDividends: bigint;
}

interface DashboardStats {
  totalInvested: bigint;
  totalValue: bigint;
  totalReturns: bigint;
  totalDividends: bigint;
  pendingClaims: bigint;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!publicClient || !address) return;

      try {
        // Check KYC status
        try {
          const verified = await publicClient.readContract({
            address: CONTRACTS.IdentityRegistry as `0x${string}`,
            abi: [{ name: 'isVerified', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] }],
            functionName: 'isVerified',
            args: [address],
          });
          setKycStatus(verified ? 'approved' : 'none');
        } catch {
          setKycStatus('none');
        }

        // Get user's projects
        const userProjects = await publicClient.readContract({
          address: CONTRACTS.RWAProjectNFT as `0x${string}`,
          abi: [{ name: 'getProjectsByOwner', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256[]' }] }],
          functionName: 'getProjectsByOwner',
          args: [address],
        }) as bigint[];

        // Load each project's investment details
        const investmentPromises = userProjects.map(async (projectId) => {
          const project = await publicClient.readContract({
            address: CONTRACTS.RWAProjectNFT as `0x${string}`,
            abi: [{ name: 'getProject', type: 'function', stateMutability: 'view', inputs: [{ name: 'projectId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'owner', type: 'address' }, { name: 'metadataURI', type: 'string' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'minInvestment', type: 'uint256' }, { name: 'maxInvestment', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'createdAt', type: 'uint256' }, { name: 'investorCount', type: 'uint256' }, { name: 'cancelled', type: 'bool' }] }] }],
            functionName: 'getProject',
            args: [projectId],
          }) as any;

          // Get user's token balance
          let tokenBalance = 0n;
          let investmentAmount = 0n;
          
          if (project.securityToken !== ZERO_ADDRESS) {
            try {
              tokenBalance = await publicClient.readContract({
                address: project.securityToken as `0x${string}`,
                abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }],
                functionName: 'balanceOf',
                args: [address],
              }) as bigint;
            } catch {}
          }

          if (project.escrowVault !== ZERO_ADDRESS) {
            try {
              investmentAmount = await publicClient.readContract({
                address: project.escrowVault as `0x${string}`,
                abi: [{ name: 'getInvestment', type: 'function', stateMutability: 'view', inputs: [{ name: 'investor', type: 'address' }], outputs: [{ type: 'uint256' }] }],
                functionName: 'getInvestment',
                args: [address],
              }) as bigint;
            } catch {}
          }

          // Calculate ROI (simplified)
          const currentValue = tokenBalance; // In reality, multiply by current token price
          const roi = investmentAmount > 0n 
            ? Number(((currentValue - investmentAmount) * 10000n) / investmentAmount) / 100
            : 0;

          return {
            projectId,
            projectName: `Project #${projectId}`,
            amount: investmentAmount,
            tokenBalance,
            currentValue,
            roi,
            pendingDividends: 0n, // Load from DividendDistributor
          } as Investment;
        });

        const loadedInvestments = await Promise.all(investmentPromises);
        setInvestments(loadedInvestments.filter(i => i.amount > 0n || i.tokenBalance > 0n));

        // Calculate stats
        const totalInvested = loadedInvestments.reduce((sum, i) => sum + i.amount, 0n);
        const totalValue = loadedInvestments.reduce((sum, i) => sum + i.currentValue, 0n);
        const totalDividends = loadedInvestments.reduce((sum, i) => sum + i.pendingDividends, 0n);

        setStats({
          totalInvested,
          totalValue,
          totalReturns: totalValue - totalInvested,
          totalDividends,
          pendingClaims: totalDividends,
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [publicClient, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-gray-600">Connect your wallet to view your dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

        {/* KYC Banner */}
        {kycStatus !== 'approved' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-yellow-800">KYC Verification Required</h3>
                <p className="text-yellow-700 text-sm">Complete verification to invest in projects</p>
              </div>
              <Link
                href="/profile/kyc"
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Verify Now
              </Link>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <span className="text-sm text-gray-500">Total Invested</span>
              <p className="text-2xl font-bold">${formatEther(stats.totalInvested)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <span className="text-sm text-gray-500">Current Value</span>
              <p className="text-2xl font-bold text-blue-600">${formatEther(stats.totalValue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <span className="text-sm text-gray-500">Total Returns</span>
              <p className={`text-2xl font-bold ${stats.totalReturns >= 0n ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalReturns >= 0n ? '+' : ''}{formatEther(stats.totalReturns)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <span className="text-sm text-gray-500">Pending Dividends</span>
              <p className="text-2xl font-bold text-purple-600">${formatEther(stats.pendingClaims)}</p>
              {stats.pendingClaims > 0n && (
                <button className="mt-2 text-sm text-purple-600 hover:underline">
                  Claim All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Investments Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Investments</h2>
          </div>
          
          {investments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">You haven't made any investments yet</p>
              <Link
                href="/projects"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Browse Projects
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dividends</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {investments.map((inv) => (
                  <tr key={inv.projectId.toString()} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${inv.projectId}`} className="text-blue-600 hover:underline font-medium">
                        {inv.projectName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">${formatEther(inv.amount)}</td>
                    <td className="px-6 py-4">{formatEther(inv.tokenBalance)}</td>
                    <td className="px-6 py-4">${formatEther(inv.currentValue)}</td>
                    <td className="px-6 py-4">
                      <span className={inv.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {inv.roi >= 0 ? '+' : ''}{inv.roi.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {inv.pendingDividends > 0n ? (
                        <span className="text-purple-600">${formatEther(inv.pendingDividends)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {inv.pendingDividends > 0n && (
                        <button className="text-sm text-purple-600 hover:underline">
                          Claim
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
