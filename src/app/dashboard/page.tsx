// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { formatEther, formatUnits, Address } from 'viem';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import Header from '@/components/Header';

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

// Minimal ABIs for contract reads
const IdentityRegistryABI = [
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

const ProjectNFTABI = [
  {
    name: 'getProjectsByOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'owner', type: 'address' },
        { name: 'metadataURI', type: 'string' },
        { name: 'fundingGoal', type: 'uint256' },
        { name: 'totalRaised', type: 'uint256' },
        { name: 'minInvestment', type: 'uint256' },
        { name: 'maxInvestment', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'securityToken', type: 'address' },
        { name: 'escrowVault', type: 'address' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'investorCount', type: 'uint256' },
        { name: 'cancelled', type: 'bool' },
      ],
    }],
  },
  {
    name: 'totalProjects',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const TokenABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const EscrowABI = [
  {
    name: 'getInvestment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'investor', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
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

  // Dynamic contract addresses
  const identityRegistryAddress = contracts?.IdentityRegistry as Address | undefined;
  const projectNFTAddress = contracts?.RWAProjectNFT as Address | undefined;

  // Check if on wrong chain
  const isWrongChain = useMemo(() => {
    if (!isConnected) return false;
    return walletChainId !== chainId;
  }, [isConnected, walletChainId, chainId]);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [loading, setLoading] = useState(true);

  // Network switch handler
  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchToChain]);

  // Format currency helper
  const formatUSDC = (value: bigint) => {
    return parseFloat(formatUnits(value, 6)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    async function loadDashboard() {
      if (!publicClient || !address || !isDeployed || isWrongChain) {
        setLoading(false);
        return;
      }

      try {
        // Check KYC status
        if (identityRegistryAddress) {
          try {
            const verified = await publicClient.readContract({
              address: identityRegistryAddress,
              abi: IdentityRegistryABI,
              functionName: 'isVerified',
              args: [address],
            });
            setKycStatus(verified ? 'approved' : 'none');
          } catch {
            setKycStatus('none');
          }
        }

        // Get all projects and find user's investments
        if (!projectNFTAddress) {
          setLoading(false);
          return;
        }

        // Get total projects count
        let totalProjects: bigint;
        try {
          totalProjects = await publicClient.readContract({
            address: projectNFTAddress,
            abi: ProjectNFTABI,
            functionName: 'totalProjects',
          }) as bigint;
        } catch {
          totalProjects = 0n;
        }

        const loadedInvestments: Investment[] = [];

        // Check each project for user's investment
        for (let i = 1n; i <= totalProjects; i++) {
          try {
            const project = await publicClient.readContract({
              address: projectNFTAddress,
              abi: ProjectNFTABI,
              functionName: 'getProject',
              args: [i],
            }) as any;

            // Get user's token balance
            let tokenBalance = 0n;
            let investmentAmount = 0n;

            if (project.securityToken && project.securityToken !== ZERO_ADDRESS) {
              try {
                tokenBalance = await publicClient.readContract({
                  address: project.securityToken as Address,
                  abi: TokenABI,
                  functionName: 'balanceOf',
                  args: [address],
                }) as bigint;
              } catch {}
            }

            if (project.escrowVault && project.escrowVault !== ZERO_ADDRESS) {
              try {
                investmentAmount = await publicClient.readContract({
                  address: project.escrowVault as Address,
                  abi: EscrowABI,
                  functionName: 'getInvestment',
                  args: [address],
                }) as bigint;
              } catch {}
            }

            // Only add if user has investment or tokens
            if (investmentAmount > 0n || tokenBalance > 0n) {
              // Calculate ROI (simplified)
              const currentValue = tokenBalance; // In reality, multiply by current token price
              const roi = investmentAmount > 0n
                ? Number(((currentValue - investmentAmount) * 10000n) / investmentAmount) / 100
                : 0;

              loadedInvestments.push({
                projectId: i,
                projectName: `Project #${i}`,
                amount: investmentAmount,
                tokenBalance,
                currentValue,
                roi,
                pendingDividends: 0n, // Load from DividendDistributor if available
              });
            }
          } catch (error) {
            console.error(`Error loading project ${i}:`, error);
          }
        }

        setInvestments(loadedInvestments);

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
  }, [publicClient, address, isDeployed, isWrongChain, identityRegistryAddress, projectNFTAddress]);

  // Get deployed chains for network switcher
  const deployedChains = getDeployedChains();

  // Network badge component
  const NetworkBadge = () => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-600">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );

  // Network not supported view
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Not Supported</h2>
            <p className="text-gray-600 mb-6">
              The Dashboard is not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {chain.name}
                  {chain.testnet && (
                    <span className="text-xs bg-yellow-400/20 text-yellow-100 px-1.5 py-0.5 rounded">
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

  // Not connected view
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-16">
          <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Connect Wallet</h1>
            <p className="text-gray-600">Connect your wallet to view your dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Wrong Network</h2>
            <p className="text-gray-600 mb-6">
              Please switch to {chainName} to view your dashboard
            </p>
            <button
              onClick={() => handleSwitchNetwork()}
              disabled={isSwitching}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {isSwitching ? 'Switching...' : `Switch to ${chainName}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading view
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard on {chainName}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600 mt-1">Track your investments and returns</p>
            </div>
            <div className="flex items-center gap-4">
              <NetworkBadge />
              {explorerUrl && (
                <a
                  href={`${explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Wallet →
                </a>
              )}
            </div>
          </div>

          {/* KYC Banner */}
          {kycStatus !== 'approved' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-yellow-800">KYC Verification Required</h3>
                    <p className="text-yellow-700 text-sm">Complete verification on {chainName} to invest in projects</p>
                  </div>
                </div>
                <Link
                  href="/kyc"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
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
                <p className="text-2xl font-bold text-gray-900">${formatUSDC(stats.totalInvested)}</p>
                <span className="text-xs text-gray-400">USDC on {chainName}</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <span className="text-sm text-gray-500">Current Value</span>
                <p className="text-2xl font-bold text-blue-600">${formatUSDC(stats.totalValue)}</p>
                <span className="text-xs text-gray-400">Estimated value</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <span className="text-sm text-gray-500">Total Returns</span>
                <p className={`text-2xl font-bold ${stats.totalReturns >= 0n ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalReturns >= 0n ? '+' : ''}${formatUSDC(stats.totalReturns)}
                </p>
                <span className="text-xs text-gray-400">Since investment</span>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <span className="text-sm text-gray-500">Pending Dividends</span>
                <p className="text-2xl font-bold text-purple-600">${formatUSDC(stats.pendingClaims)}</p>
                {stats.pendingClaims > 0n && (
                  <button className="mt-2 text-sm text-purple-600 hover:underline">
                    Claim All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Network Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <div>
                  <p className="font-medium text-gray-900">Connected to {chainName}</p>
                  <p className="text-sm text-gray-600">
                    Gas paid in {nativeCurrency?.symbol || 'Native Token'}
                    {isTestnet && ' • Testnet funds only'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deployedChains.length > 1 && (
                  <div className="text-sm text-gray-500">
                    Also available on:{' '}
                    {deployedChains
                      .filter((c) => c.id !== chainId)
                      .slice(0, 2)
                      .map((c) => c.name)
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Investments Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">My Investments</h2>
              <span className="text-sm text-gray-500">{investments.length} positions on {chainName}</span>
            </div>

            {investments.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 mb-4">You haven't made any investments on {chainName} yet</p>
                <Link
                  href="/projects"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Projects
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ROI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dividends
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {investments.map((inv) => (
                      <tr key={inv.projectId.toString()} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/projects/${inv.projectId}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {inv.projectName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-gray-900">${formatUSDC(inv.amount)}</td>
                        <td className="px-6 py-4 text-gray-900">
                          {parseFloat(formatUnits(inv.tokenBalance, 18)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-900">${formatUSDC(inv.currentValue)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-medium ${
                              inv.roi >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {inv.roi >= 0 ? '+' : ''}
                            {inv.roi.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {inv.pendingDividends > 0n ? (
                            <span className="text-purple-600 font-medium">
                              ${formatUSDC(inv.pendingDividends)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {inv.pendingDividends > 0n && (
                              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                Claim
                              </button>
                            )}
                            {explorerUrl && (
                              <a
                                href={`${explorerUrl}/address/${address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-400 hover:text-gray-600"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/projects"
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Browse Projects</h3>
                  <p className="text-sm text-gray-500">Find new investment opportunities</p>
                </div>
              </div>
            </Link>

            <Link
              href="/kyc"
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">KYC Verification</h3>
                  <p className="text-sm text-gray-500">
                    {kycStatus === 'approved' ? 'Verified' : 'Complete your verification'}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/identity"
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Identity Registry</h3>
                  <p className="text-sm text-gray-500">View your on-chain identity</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
