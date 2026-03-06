// src/app/crowdfunding/CrowdfundingClient.tsx
'use client';

import { useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount, useChainId } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useConnectModal } from '../../components/ConnectButton';
import Link from 'next/link';
import {
  Wallet,
  Building2,
  Shield,
  TrendingUp,
  Users,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Coins,
  Target,
  Globe,
  AlertTriangle,
} from 'lucide-react';

export default function CrowdfundingClient() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { openConnectModal } = useConnectModal();

  // Multichain config
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    faucetUrl,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains,
  } = useChainConfig();

  // Check if on wrong chain
  const isWrongChain = useMemo(() => {
    if (!isConnected) return false;
    return walletChainId !== chainId;
  }, [isConnected, walletChainId, chainId]);

  // Network switch handler
  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchToChain]);

  const howItWorks = [
    {
      step: "1",
      title: "Complete KYC",
      description: "Verify your identity to become an eligible investor. Different tiers unlock different investment opportunities.",
      icon: <FileCheck className="w-6 h-6" />
    },
    {
      step: "2",
      title: "Browse Projects",
      description: "Explore curated tokenized real-world asset projects across various categories - real estate, energy, commodities, and more.",
      icon: <Target className="w-6 h-6" />
    },
    {
      step: "3",
      title: "Invest with Crypto",
      description: "Purchase security tokens using USDC or USDT. Your investment is secured in an escrow smart contract.",
      icon: <Coins className="w-6 h-6" />
    },
    {
      step: "4",
      title: "Receive Tokens",
      description: "Once the project reaches its funding goal, receive your security tokens representing fractional ownership.",
      icon: <Wallet className="w-6 h-6" />
    },
    {
      step: "5",
      title: "Earn Returns",
      description: "Receive automated dividend distributions, and trade your tokens on the secondary market when available.",
      icon: <TrendingUp className="w-6 h-6" />
    }
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-blue-500" />,
      title: "ERC-3643 Compliant",
      description: "Built on the institutional security token standard with identity verification and transfer restrictions for regulatory compliance."
    },
    {
      icon: <Building2 className="w-8 h-8 text-green-500" />,
      title: "Real Estate Tokenization",
      description: "Tokenize commercial and residential properties with fractional ownership, enabling investment from as little as $100."
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Investor Management",
      description: "KYC/AML compliance with on-chain identity registry. Claim verification ensures only eligible investors participate."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-yellow-500" />,
      title: "Dividend Distribution",
      description: "Automated dividend payments based on token holdings. Smart contracts ensure transparent, instant payouts to all holders."
    },
    {
      icon: <FileCheck className="w-8 h-8 text-red-500" />,
      title: "Compliance Modules",
      description: "Country restrictions, max balance limits, lockup periods, and accreditation checks built into every token."
    },
    {
      icon: <Wallet className="w-8 h-8 text-indigo-500" />,
      title: "Escrow & Milestones",
      description: "Secure fund management with milestone-based releases. Investor funds are protected until project milestones are met."
    }
  ];

  const investorBenefits = [
    "Access fractional ownership in premium real-world assets",
    "Diversify portfolio across multiple asset classes",
    "Receive automated dividend distributions",
    "Trade tokens on secondary market",
    "Full transparency with blockchain-verified ownership",
    "Lower minimum investment thresholds"
  ];

  const issuerBenefits = [
    "Access global investor base",
    "Reduce capital raising costs",
    "Automate compliance and distributions",
    "Milestone-based fund releases",
    "Built-in investor management",
    "Secondary market liquidity"
  ];

  // Network badge component
  const NetworkBadge = () => (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-300">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );

  // Available networks component
  const AvailableNetworks = () => (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      <span className="text-sm text-gray-500">Available on:</span>
      {deployedChains.map((chain) => (
        <button
          key={chain.id}
          onClick={() => handleSwitchNetwork(chain.id)}
          disabled={isSwitching || chain.id === chainId}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors ${
            chain.id === chainId
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${chain.testnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
          {chain.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main>
        {/* Wrong Chain Banner */}
        {isConnected && isWrongChain && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span className="text-yellow-200">
                    Please switch to {chainName} to access all features
                  </span>
                </div>
                <button
                  onClick={() => handleSwitchNetwork()}
                  disabled={isSwitching}
                  className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-medium rounded-lg text-sm transition-colors"
                >
                  {isSwitching ? 'Switching...' : `Switch to ${chainName}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              {/* Breadcrumb */}
              <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
                <Link href="/" className="hover:text-blue-400">Home</Link>
                <span className="mx-2">/</span>
                <span className="text-blue-400">Crowdfunding</span>
              </div>

              {/* Network Badge */}
              <div className="flex justify-center mb-6">
                <NetworkBadge />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Tokenized Asset Crowdfunding
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
                Invest in institutional-grade real-world assets through compliant security tokens. 
                Built on ERC-3643 standard for complete regulatory compliance. 
                From real estate to commodities, access opportunities previously reserved for the wealthy.
              </p>

              {!isConnected ? (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={openConnectModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg cursor-pointer transition-colors flex items-center justify-center"
                  >
                    <Wallet className="mr-2 w-5 h-5" /> Connect Wallet to Invest
                  </button>
                  <Link
                    href="/kyc"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg text-lg flex items-center justify-center"
                  >
                    <FileCheck className="mr-2 w-5 h-5" /> Complete KYC First
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/projects"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg flex items-center justify-center"
                  >
                    View Projects <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link
                    href="/create"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg text-lg"
                  >
                    Create Project
                  </Link>
                </div>
              )}

              {/* Available Networks */}
              {deployedChains.length > 1 && <AvailableNetworks />}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-gray-800/50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              From identity verification to receiving dividends, here's your journey as an investor.
            </p>

            <div className="relative">
              {/* Connection line */}
              <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {howItWorks.map((item, index) => (
                  <div key={index} className="relative text-center">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                        {item.step}
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 inline-block mb-3">
                        {item.icon}
                      </div>
                      <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Investor Benefits */}
              <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-green-500/10 rounded-lg text-green-400 mr-4">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">For Investors</h3>
                </div>
                <ul className="space-y-4">
                  {investorBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/projects"
                  className="mt-6 inline-flex items-center text-green-400 hover:text-green-300"
                >
                  Browse Investment Opportunities <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>

              {/* Issuer Benefits */}
              <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 mr-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">For Issuers</h3>
                </div>
                <ul className="space-y-4">
                  {issuerBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/create"
                  className="mt-6 inline-flex items-center text-blue-400 hover:text-blue-300"
                >
                  Launch Your Project <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Platform Features
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Enterprise-grade infrastructure for compliant security token offerings.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatCard value="$0" label="Total Value Locked" />
              <StatCard value="0" label="Projects Launched" />
              <StatCard value="0" label="Verified Investors" />
              <StatCard 
                value={chainName} 
                label="Current Network" 
                badge={isTestnet ? 'Testnet' : 'Mainnet'}
                badgeColor={isTestnet ? 'yellow' : 'green'}
              />
            </div>
          </div>
        </div>

        {/* Supported Networks Section */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              Supported Networks
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Our platform is deployed across multiple blockchain networks for maximum accessibility.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className={`p-4 rounded-xl border transition-all ${
                    chain.id === chainId
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Globe className="w-5 h-5" />
                    <span className="font-semibold">{chain.name}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${chain.testnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-sm text-gray-400">
                      {chain.testnet ? 'Testnet' : 'Mainnet'}
                    </span>
                  </div>
                  {chain.id === chainId && (
                    <div className="mt-2 text-xs text-blue-400">Currently Connected</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KYC Tiers */}
        <div className="py-16 bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              KYC Verification Tiers
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Different verification levels unlock different investment capabilities.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-2xl mb-2">🥉</div>
                <h3 className="text-lg font-semibold text-white mb-2">Bronze</h3>
                <p className="text-gray-400 text-sm mb-4">Basic verification</p>
                <ul className="text-sm text-gray-500 space-y-2">
                  <li>• View all projects</li>
                  <li>• Limited investment amounts</li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-yellow-500/50">
                <div className="text-2xl mb-2">🥈</div>
                <h3 className="text-lg font-semibold text-white mb-2">Silver</h3>
                <p className="text-gray-400 text-sm mb-4">Enhanced verification</p>
                <ul className="text-sm text-gray-500 space-y-2">
                  <li>• Higher investment limits</li>
                  <li>• Access to more projects</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-xl p-6 border border-yellow-500">
                <div className="text-2xl mb-2">🥇</div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Gold</h3>
                <p className="text-gray-400 text-sm mb-4">Full verification</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Unlimited investments</li>
                  <li>• Create projects</li>
                  <li>• Custom tokenization</li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/kyc"
                className="inline-flex items-center px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition"
              >
                Complete KYC Verification <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Testnet Notice - Only show if on testnet */}
        {isTestnet && faucetUrl && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
              <div className="flex items-center flex-wrap gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500 font-semibold">Testnet Mode:</span>
                <span className="text-yellow-200">
                  You're currently on {chainName}. Get test {nativeCurrency?.symbol || 'tokens'} from the{' '}
                  <a
                    href={faucetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-100"
                  >
                    {chainName} Faucet
                  </a>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Network Info Footer */}
        <div className="bg-gray-900 border-t border-gray-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-gray-400">Connected to {chainName}</span>
                </div>
                {nativeCurrency && (
                  <span className="text-gray-500 text-sm">
                    Gas: {nativeCurrency.symbol}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Block Explorer →
                  </a>
                )}
                {faucetUrl && isTestnet && (
                  <a
                    href={faucetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Get Test Tokens →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  value, 
  label, 
  badge, 
  badgeColor = 'gray' 
}: { 
  value: string; 
  label: string;
  badge?: string;
  badgeColor?: 'yellow' | 'green' | 'gray';
}) {
  const badgeColors = {
    yellow: 'bg-yellow-500/20 text-yellow-400',
    green: 'bg-green-500/20 text-green-400',
    gray: 'bg-gray-700 text-gray-400',
  };

  return (
    <div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-gray-400">{label}</div>
      {badge && (
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${badgeColors[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
