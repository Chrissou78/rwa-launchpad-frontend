// src/app/about/rwa-tokenization/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  CheckCircle2,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Building2,
  Coins,
  Globe,
  Shield,
  Clock,
  DollarSign,
  Droplets,
  Scale,
  FileCheck,
  Users,
  Repeat,
  ChevronRight,
} from 'lucide-react';

export default function RWATokenizationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8">
            <Coins className="w-4 h-4 mr-2" />
            Understanding RWA Tokenization
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            What is Real-World Asset
            <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Tokenization?
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A comprehensive guide to understanding how physical and financial assets 
            are transformed into digital tokens on the blockchain.
          </p>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-[128px]"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full filter blur-[128px]"></div>
        </div>
      </section>

      {/* Main Explanation Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                The Bridge Between Traditional and Digital Finance
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

      {/* Video Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <Play className="h-4 w-4 mr-2" />
              Video Explainer
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Watch & Learn
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A quick visual guide to understanding RWA tokenization
            </p>
          </div>

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

      {/* Why Tokenize Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Tokenize?
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

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Tokenize Your Assets?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Start your tokenization journey today. Our platform supports a wide range of asset types.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/tokenize"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center"
            >
              Start Tokenizing <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              href="/crowdfunding"
              className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition border border-white/30"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}