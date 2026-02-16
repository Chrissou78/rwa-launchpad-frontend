'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  Briefcase,
  Shield,
  Clock,
  Globe,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Coins,
  Lock,
  Users,
  BarChart3
} from 'lucide-react';

export default function TradePage() {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Escrow Protection",
      description: "All trades are secured through smart contract escrow. Funds are only released when both parties confirm."
    },
    {
      icon: <Coins className="w-8 h-8" />,
      title: "Stablecoin Settlement",
      description: "Trade using USDC and USDT for stable, predictable settlements without crypto volatility."
    },
    {
      icon: <FileCheck className="w-8 h-8" />,
      title: "Document Verification",
      description: "Upload and verify trade documents on-chain. Invoices, bills of lading, and certificates."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Cross-Border Trading",
      description: "Execute international trade deals without traditional banking delays and fees."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Faster Settlement",
      description: "Reduce settlement times from weeks to minutes with blockchain-based transfers."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Verified Counterparties",
      description: "All traders are KYC verified, ensuring you're dealing with legitimate businesses."
    }
  ];

  const useCases = [
    "Import/Export Trade Finance",
    "Commodity Trading",
    "Invoice Factoring",
    "Supply Chain Payments",
    "Letter of Credit Alternatives",
    "Cross-Border B2B Payments"
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-sm mb-6">
            <Clock className="w-4 h-4 mr-2" />
            Coming Soon
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            B2B Trade Platform
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Secure, escrow-protected trade settlement using stablecoins. 
            Execute international B2B transactions with full transparency and reduced risk.
          </p>
          
          <div className="inline-flex items-center px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400">
            <Lock className="w-5 h-5 mr-2" />
            Platform Under Development
          </div>
        </div>

        {/* Features Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Platform Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6"
              >
                <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400 inline-block mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Will Work */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            How It Will Work
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Create Trade", description: "Initiate a trade agreement with terms, documents, and payment details" },
              { step: "2", title: "Escrow Deposit", description: "Buyer deposits stablecoins into secure smart contract escrow" },
              { step: "3", title: "Fulfill & Verify", description: "Seller fulfills order, uploads proof, buyer verifies delivery" },
              { step: "4", title: "Settlement", description: "Funds released to seller automatically upon confirmation" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Use Cases
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{useCase}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Interested in Early Access?
            </h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              We're building the future of B2B trade settlement. Join our waitlist to be notified when the platform launches.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/tokenise"
                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition inline-flex items-center justify-center"
              >
                Explore Tokenisation <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="/crowdfunding"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                View Crowdfunding
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
