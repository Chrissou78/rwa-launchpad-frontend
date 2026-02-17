'use client';

import React, { useState, useRef } from 'react';
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
  Wallet,
  Play, Pause, Volume2, VolumeX
} from 'lucide-react';

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

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

  const toggleVideoPlay = () => {
  if (videoRef.current) {
    if (isVideoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsVideoPlaying(!isVideoPlaying);
  }
};

const toggleVideoMute = () => {
  if (videoRef.current) {
    videoRef.current.muted = !isVideoMuted;
    setIsVideoMuted(!isVideoMuted);
  }
};

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

      {/* Video Section - What is RWA Tokenization? */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <Play className="h-4 w-4 mr-2" />
              Video Explainer
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What is RWA Tokenization?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Learn how real-world assets are transformed into digital tokens on the blockchain
            </p>
          </div>

          {/* Video Container - Centered and Constrained */}
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-800 shadow-2xl shadow-blue-500/10 border border-gray-700/50">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                src="/video/whatisrwa.mp4"
                poster="/video/whatisrwa-poster.jpg"
                muted={isVideoMuted}
                playsInline
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              />
              
              {/* Play Overlay */}
              {!isVideoPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity hover:bg-black/30"
                  onClick={toggleVideoPlay}
                >
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50 transition-transform hover:scale-110">
                    <Play className="h-8 w-8 text-white ml-1" fill="white" />
                  </div>
                </div>
              )}

              {/* Video Controls */}
              <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${isVideoPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleVideoPlay}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {isVideoPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={toggleVideoMute}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {isVideoMuted ? (
                      <VolumeX className="h-5 w-5 text-white" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Points Below Video */}
          <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">2 min</div>
              <div className="text-sm text-gray-400">Quick Overview</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">Simple</div>
              <div className="text-sm text-gray-400">Easy to Understand</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">Complete</div>
              <div className="text-sm text-gray-400">Full Process Explained</div>
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
      {/* What Are You Looking For Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What Are You Looking For?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Whether you're an entrepreneur, established business, or investor, 
              RWA Experts provides comprehensive support for your tokenization journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Technical Solution */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-400/50 transition-all duration-300 group">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Technical Solution</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need smart contracts, token infrastructure, or blockchain integration? 
                Our technical team builds secure, compliant solutions tailored to your needs.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Smart contract development
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  ERC-3643 compliant tokens
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Custom blockchain solutions
                </li>
              </ul>
            </div>

            {/* Marketing & GTM */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300 group">
              <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Marketing & GTM</h3>
              <p className="text-gray-400 text-sm mb-4">
                Ready to launch but need market visibility? We help you reach the right 
                investors and build a compelling go-to-market strategy.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Investor outreach campaigns
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Token launch strategy
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Community building
                </li>
              </ul>
            </div>

            {/* Partnerships & Contacts */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 group">
              <div className="p-3 bg-green-500/20 rounded-xl text-green-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Partnerships & Contacts</h3>
              <p className="text-gray-400 text-sm mb-4">
                Looking to connect with key players in the RWA ecosystem? 
                We facilitate introductions to partners, exchanges, and service providers.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Exchange partnerships
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Custody & legal partners
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Industry network access
                </li>
              </ul>
            </div>

            {/* Team Building */}
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-500/30 rounded-2xl p-6 hover:border-orange-400/50 transition-all duration-300 group">
              <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Team Building</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need to assemble a team for your tokenization project? 
                We connect you with vetted blockchain developers, legal experts, and advisors.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Blockchain developers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Legal & compliance experts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  Advisory board members
                </li>
              </ul>
            </div>

            {/* Funding */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Funding</h3>
              <p className="text-gray-400 text-sm mb-4">
                Ready to raise capital for your project? Launch a compliant security 
                token offering and access our global network of verified investors.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Security token offerings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Investor introductions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Milestone-based escrow
                </li>
              </ul>
            </div>

            {/* All of the Above */}
            <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 border border-pink-500/30 rounded-2xl p-6 hover:border-pink-400/50 transition-all duration-300 group">
              <div className="p-3 bg-pink-500/20 rounded-xl text-pink-400 inline-block mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Full Service Package</h3>
              <p className="text-gray-400 text-sm mb-4">
                Need comprehensive support? RWA Experts offers end-to-end solutions 
                combining all services to take your project from idea to launch.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Complete project management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Dedicated success manager
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400" />
                  Priority support & guidance
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-6">
              Not sure what you need? Let's discuss your project and find the right solution.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
            >
              Let's talk <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
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
