'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { useConnectModal } from '../components/ConnectButton';
import { 
  Building2, 
  Zap, 
  Briefcase, 
  TrendingUp, 
  Coins, 
  Package,
  Clock,
  DollarSign,
  Droplets,
  Globe,
  Shield,
  Scale,
  ChevronRight,
  Users,
  FileCheck,
  Repeat,
  CheckCircle2,
  ArrowRight,
  Wallet
} from 'lucide-react';

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const categories = [
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Energy",
      description: "Tokenize renewable energy projects, solar farms, wind turbines, and energy credits. Enable fractional investment in sustainable infrastructure.",
      examples: ["Solar farm equity", "Wind turbine shares", "Renewable energy credits", "Carbon offset tokens"],
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Building2 className="w-10 h-10" />,
      title: "Real Estate",
      description: "Transform property ownership through fractional tokenization. From luxury apartments to commercial buildings, make real estate accessible to everyone.",
      examples: ["Commercial buildings", "Residential properties", "REITs", "Land development"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Briefcase className="w-10 h-10" />,
      title: "Business Trade",
      description: "Tokenize trade receivables, invoices, and supply chain assets. Unlock working capital and streamline international trade finance.",
      examples: ["Trade receivables", "Invoice financing", "Supply chain assets", "Export credits"],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: "Fund Raising",
      description: "Launch compliant security token offerings (STOs) to raise capital globally. Access institutional and retail investors through regulated channels.",
      examples: ["Equity tokens", "Debt instruments", "Revenue sharing", "Convertible notes"],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Coins className="w-10 h-10" />,
      title: "Dividends Distribution",
      description: "Automate dividend and profit distributions through smart contracts. Ensure transparent, instant payments to all token holders worldwide.",
      examples: ["Automated payouts", "Profit sharing", "Rental income", "Interest payments"],
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: <Package className="w-10 h-10" />,
      title: "Commodities",
      description: "Digitize ownership of precious metals, agricultural products, and raw materials. Trade commodities 24/7 with instant settlement.",
      examples: ["Gold & silver", "Agricultural products", "Oil & gas", "Industrial metals"],
      color: "from-amber-500 to-yellow-500"
    }
  ];

  const advantages = [
    {
      icon: <Clock className="w-7 h-7" />,
      title: "Faster Settlement",
      description: "Traditional markets operate on T+2 settlement cycles. Tokenized assets settle in near real-time, reducing counterparty risk and freeing up capital instantly.",
      stat: "Real-time",
      statLabel: "Settlement"
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title: "Reduced Costs",
      description: "Eliminate intermediaries like banks, brokers, and clearinghouses. Smart contracts automate compliance, payments, and ownership transfers.",
      stat: "Up to 90%",
      statLabel: "Cost Reduction"
    },
    {
      icon: <Droplets className="w-7 h-7" />,
      title: "Enhanced Liquidity",
      description: "Transform illiquid assets into tradeable tokens. Create secondary markets for assets like real estate and private equity.",
      stat: "24/7",
      statLabel: "Trading"
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Global Access",
      description: "Blockchain networks are borderless. Reach investors worldwide without the complexities of traditional cross-border financial systems.",
      stat: "Borderless",
      statLabel: "Investment"
    },
    {
      icon: <Scale className="w-7 h-7" />,
      title: "Legal Frameworks",
      description: "Operate within established regulatory frameworks. Tokenized securities comply with existing securities laws.",
      stat: "Compliant",
      statLabel: "By Design"
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Enhanced Security",
      description: "Blockchain provides immutable ownership records and transparent audit trails. Every transaction is cryptographically secured.",
      stat: "Immutable",
      statLabel: "Records"
    }
  ];

  const marketStats = [
    { value: "$33B+", label: "Tokenized RWA Market" },
    { value: "300%+", label: "3-Year Growth" },
    { value: "$30T", label: "Projected Potential" },
    { value: "24/7", label: "Global Trading" }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            $33+ Billion Market & Growing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Tokenize Real-World Assets
            <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Unlock Global Value
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Transform physical and financial assets into programmable, tradeable digital tokens. 
            From real estate to energy credits, democratize investment access and unlock liquidity 
            through blockchain technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!isConnected ? (
              <button
                onClick={openConnectModal}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link 
                href="/crowdfunding"
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center"
              >
                Launch Crowdfunding <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link 
              href="/tokenize"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition border border-white/20"
            >
              Custom Tokenization
            </Link>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {marketStats.map((stat, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-[128px]"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full filter blur-[128px]"></div>
        </div>
      </section>

      {/* What is Tokenization Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                What is Real-World Asset Tokenization?
              </h2>
              <p className="text-gray-400 mb-6 text-lg">
                Real-world asset (RWA) tokenization is the process of creating a digital representation 
                of physical or financial assets on a blockchain. These tokens act as digital certificates 
                of ownership, creating a bridge between traditional assets and the decentralized economy.
              </p>
              <p className="text-gray-400 mb-8">
                The token reflects the legal rights attached to the underlying asset through an established 
                structure, such as an SPV, trust, or fund vehicle. This isn't just a technological overlay—it's 
                a transformation of how assets are issued, managed, and transacted.
              </p>
              
              <div className="space-y-4">
                {[
                  "Fractional ownership enables smaller investment amounts",
                  "24/7 global trading on blockchain networks",
                  "Smart contracts automate compliance and distributions",
                  "Immutable records eliminate fraud and disputes"
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle2 className="w-6 h-6 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-8 border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-6">Traditional vs Tokenized</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-red-400 font-semibold mb-2">Traditional</div>
                      <div className="text-3xl font-bold text-white">T+2</div>
                      <div className="text-sm text-gray-400">Settlement</div>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="text-green-400 font-semibold mb-2">Tokenized</div>
                      <div className="text-3xl font-bold text-white">Instant</div>
                      <div className="text-sm text-gray-400">Settlement</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-red-400 font-semibold mb-2">Traditional</div>
                      <div className="text-3xl font-bold text-white">$100K+</div>
                      <div className="text-sm text-gray-400">Min Investment</div>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="text-green-400 font-semibold mb-2">Tokenized</div>
                      <div className="text-3xl font-bold text-white">$100</div>
                      <div className="text-sm text-gray-400">Min Investment</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asset Categories Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Asset Categories
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              From energy infrastructure to real estate, discover the wide range of assets 
              that can be tokenized on our platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div 
                key={index}
                className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${category.color} text-white mb-4`}>
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{category.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{category.description}</p>
                <div className="space-y-1">
                  {category.examples.map((example, i) => (
                    <div key={i} className="flex items-center text-xs text-gray-500">
                      <ChevronRight className="w-3 h-3 mr-1 text-blue-400" />
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Tokenize on Blockchain?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Blockchain technology brings unprecedented benefits to asset management, 
              trading, and ownership.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((advantage, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {advantage.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{advantage.stat}</div>
                    <div className="text-xs text-gray-500">{advantage.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{advantage.title}</h3>
                <p className="text-gray-400 text-sm">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Navigation */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Our Services
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              End-to-end tokenization solutions for issuers, investors, and institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company */}
            <Link href="/about/company" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 h-full">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 inline-block mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition">
                  Company
                </h3>
                <p className="text-gray-400 text-sm">
                  Learn about our mission to democratize access to real-world assets through blockchain.
                </p>
              </div>
            </Link>

            {/* Team */}
            <Link href="/about/team" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all duration-300 h-full">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 inline-block mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
                  Team
                </h3>
                <p className="text-gray-400 text-sm">
                  Meet the experts behind our platform—professionals in finance, blockchain, and law.
                </p>
              </div>
            </Link>

            {/* Custom Tokenization */}
            <Link href="/tokenize" className="group">
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400 transition-all duration-300 h-full">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 inline-block mb-4">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition">
                  Want to Tokenize?
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Custom token minting for your specific needs. NFTs, security tokens, and more.
                </p>
                <div className="text-xs text-blue-400">
                  Gold KYC Required • Platform fees apply
                </div>
              </div>
            </Link>

            {/* Crowdfunding */}
            <Link href="/crowdfunding" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all duration-300 h-full">
                <div className="p-3 bg-green-500/10 rounded-lg text-green-400 inline-block mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-400 transition">
                  Crowdfunding
                </h3>
                <p className="text-gray-400 text-sm">
                  Launch or invest in tokenized projects. RWA Experts connects issuers with global investors.
                </p>
              </div>
            </Link>

            {/* KYC */}
            <Link href="/kyc" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-500 transition-all duration-300 h-full">
                <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400 inline-block mb-4">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yellow-400 transition">
                  Identity (KYC)
                </h3>
                <p className="text-gray-400 text-sm">
                  Verify your identity to access investment opportunities. Compliant with global regulations.
                </p>
              </div>
            </Link>

            {/* Exchange */}
            <Link href="/exchange" className="group">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all duration-300 h-full">
                <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 inline-block mb-4">
                  <Repeat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition">
                  Exchange
                </h3>
                <p className="text-gray-400 text-sm">
                  Trade tokenized assets on our compliant secondary market. Instant settlement, global access.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Tokenize Your Assets?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join the $33+ billion tokenized asset market. Whether you're an issuer looking to raise capital 
            or an investor seeking new opportunities, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={openConnectModal}
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition flex items-center cursor-pointer"
              >
                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
              </button>
            ) : (
              <Link 
                href="/crowdfunding"
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition flex items-center"
              >
                Start Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link 
              href="/about/company"
              className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/30"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Testnet Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-yellow-500 font-semibold mr-2">⚠️ Testnet:</span>
            <span className="text-yellow-200">
              This application is running on Polygon Amoy testnet. Get test MATIC from the{' '}
              <a
                href="https://faucet.polygon.technology/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-100"
              >
                Polygon Faucet
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
