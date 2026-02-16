'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@/components/ConnectButton';
import { useKYC } from '@/contexts/KYCContext';
import {
  Coins,
  Building2,
  Package,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Clock,
  Globe,
  Zap,
  Users,
  BarChart3,
  Lock,
  Send,
  AlertCircle,
  Briefcase,
  Factory,
  Gem,
  Music,
  Car,
  Wheat,
  Fuel
} from 'lucide-react';

export default function TokenisePage() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { kycData } = useKYC();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'request'>('overview');
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    assetType: '',
    assetDescription: '',
    estimatedValue: '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    useCase: '',
    additionalInfo: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const isGoldOrHigher = kycData.tier === 'Gold' || kycData.tier === 'Diamond';

  const assetTypes = [
    { value: 'company_equity', label: 'Company Equity / Shares', icon: <Building2 className="w-5 h-5" /> },
    { value: 'real_estate', label: 'Real Estate Property', icon: <Building2 className="w-5 h-5" /> },
    { value: 'commodity', label: 'Commodities (Gold, Silver, etc.)', icon: <Gem className="w-5 h-5" /> },
    { value: 'product_inventory', label: 'Product Inventory', icon: <Package className="w-5 h-5" /> },
    { value: 'intellectual_property', label: 'Intellectual Property / Patents', icon: <FileText className="w-5 h-5" /> },
    { value: 'revenue_stream', label: 'Revenue Streams / Royalties', icon: <Music className="w-5 h-5" /> },
    { value: 'equipment', label: 'Equipment / Machinery', icon: <Factory className="w-5 h-5" /> },
    { value: 'vehicles', label: 'Vehicles / Fleet', icon: <Car className="w-5 h-5" /> },
    { value: 'agricultural', label: 'Agricultural Assets', icon: <Wheat className="w-5 h-5" /> },
    { value: 'energy', label: 'Energy Assets', icon: <Fuel className="w-5 h-5" /> },
    { value: 'other', label: 'Other', icon: <Coins className="w-5 h-5" /> },
  ];

  const useCases = [
    { value: 'ownership_tracking', label: 'Ownership Tracking & Management' },
    { value: 'fractional_ownership', label: 'Fractional Ownership (No Fundraising)' },
    { value: 'loyalty_program', label: 'Customer Loyalty Program' },
    { value: 'supply_chain', label: 'Supply Chain Tracking' },
    { value: 'employee_equity', label: 'Employee Equity Distribution' },
    { value: 'asset_backed', label: 'Asset-Backed Token' },
    { value: 'membership', label: 'Membership / Access Token' },
    { value: 'trade_settlement', label: 'B2B Trade Settlement' },
    { value: 'other', label: 'Other' },
  ];

  const benefits = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Ownership",
      description: "Immutable blockchain records ensure transparent and tamper-proof ownership tracking."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Transferability",
      description: "Transfer ownership instantly to anyone worldwide without intermediaries."
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Exchange Listing",
      description: "Option to list your tokens on our exchange for secondary market trading."
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automated Compliance",
      description: "Built-in compliance rules, transfer restrictions, and investor eligibility checks."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Stakeholder Management",
      description: "Easily manage token holders, distributions, and corporate actions."
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Full Control",
      description: "You retain full control of your assets. We provide the infrastructure."
    }
  ];

  const process = [
    {
      step: "1",
      title: "Submit Request",
      description: "Fill out the tokenization request form with your asset details and requirements."
    },
    {
      step: "2",
      title: "Admin Review",
      description: "Our team reviews your submission, verifies documentation, and assesses feasibility."
    },
    {
      step: "3",
      title: "Legal Structure",
      description: "We help structure the token to comply with regulations in your jurisdiction."
    },
    {
      step: "4",
      title: "Token Creation",
      description: "Smart contracts are deployed and your tokens are minted on the blockchain."
    },
    {
      step: "5",
      title: "Management Dashboard",
      description: "Access your dashboard to manage tokens, track ownership, and handle distributions."
    }
  ];

  const pricing = [
    {
      name: "Token Creation",
      price: "0.5%",
      description: "Of total asset value (min $500)",
      features: [
        "Smart contract deployment",
        "ERC-3643 compliant token",
        "Compliance module setup",
        "Initial token minting"
      ]
    },
    {
      name: "Platform Fee",
      price: "0.1%",
      description: "On token transfers",
      features: [
        "Transfer processing",
        "Compliance verification",
        "Audit trail maintenance",
        "24/7 availability"
      ]
    },
    {
      name: "Exchange Listing",
      price: "Custom",
      description: "Optional secondary market",
      features: [
        "Exchange listing",
        "Order book trading",
        "Market maker support",
        "Global investor access"
      ]
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send to backend / smart contract
    console.log('Tokenisation request:', { ...formData, walletAddress: address });
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-6">
            <Coins className="w-4 h-4 mr-2" />
            Custom Asset Tokenization
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tokenise Your Assets
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Transform your company, products, or assets into digital tokens. 
            No fundraising required—just create, manage, and optionally trade your tokens on our platform.
          </p>
        </div>

        {/* Gold KYC Requirement Notice */}
        {!isGoldOrHigher && (
          <div className="mb-8 p-4 bg-yellow-900/30 border border-yellow-600 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">Gold KYC Required</h3>
                <p className="text-yellow-200/80 text-sm mb-3">
                  To tokenize assets on our platform, you need to complete Gold tier KYC verification. 
                  This ensures compliance and protects all parties involved.
                </p>
                <Link
                  href="/kyc"
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Complete KYC Verification <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'request'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Request Tokenization
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Benefits Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Why Tokenize With Us?
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 inline-block mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-400 text-sm">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Process Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                How It Works
              </h2>
              <div className="relative">
                {/* Connection line */}
                <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {process.map((item, index) => (
                    <div key={index} className="relative text-center">
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4 relative z-10">
                          {item.step}
                        </div>
                        <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Asset Types Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                What Can You Tokenize?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assetTypes.map((asset, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center gap-3 hover:border-gray-600 transition"
                  >
                    <div className="text-blue-400">{asset.icon}</div>
                    <span className="text-gray-300 text-sm">{asset.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Transparent Pricing
              </h2>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {pricing.map((tier, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6"
                  >
                    <h3 className="text-white font-semibold mb-2">{tier.name}</h3>
                    <div className="text-3xl font-bold text-blue-400 mb-1">{tier.price}</div>
                    <p className="text-gray-500 text-sm mb-6">{tier.description}</p>
                    <ul className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-400">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="text-center">
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Ready to Tokenize Your Assets?
                </h2>
                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                  Submit your tokenization request and our team will guide you through the process.
                </p>
                {!isConnected ? (
                  <button
                    onClick={openConnectModal}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center mx-auto cursor-pointer"
                  >
                    <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
                  </button>
                ) : isGoldOrHigher ? (
                  <button
                    onClick={() => setActiveTab('request')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center mx-auto"
                  >
                    Submit Request <ArrowRight className="ml-2 w-5 h-5" />
                  </button>
                ) : (
                  <Link
                    href="/kyc"
                    className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition inline-flex items-center"
                  >
                    Complete Gold KYC First <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                )}
              </div>
            </section>
          </>
        ) : (
          /* Request Form Tab */
          <section>
            {!isConnected ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">Please connect your wallet to submit a tokenization request.</p>
                <button
                  onClick={openConnectModal}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition cursor-pointer"
                >
                  Connect Wallet
                </button>
              </div>
            ) : !isGoldOrHigher ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Gold KYC Required</h3>
                <p className="text-gray-400 mb-6">You need Gold tier KYC verification to submit tokenization requests.</p>
                <Link
                  href="/kyc"
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition inline-flex items-center"
                >
                  Complete KYC <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400 mb-6">
                  Thank you for your tokenization request. Our team will review your submission and contact you within 2-3 business days.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        companyName: '',
                        contactName: '',
                        email: '',
                        phone: '',
                        website: '',
                        assetType: '',
                        assetDescription: '',
                        estimatedValue: '',
                        tokenName: '',
                        tokenSymbol: '',
                        totalSupply: '',
                        useCase: '',
                        additionalInfo: ''
                      });
                    }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    Submit Another Request
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                    Company Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Your Company Ltd."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Contact Name *</label>
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-purple-400" />
                    Asset Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Asset Type *</label>
                      <select
                        name="assetType"
                        value={formData.assetType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select asset type...</option>
                        {assetTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Asset Description *</label>
                      <textarea
                        name="assetDescription"
                        value={formData.assetDescription}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Describe the asset you want to tokenize, including its current status, location, and any relevant details..."
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Estimated Value (USD) *</label>
                        <input
                          type="text"
                          name="estimatedValue"
                          value={formData.estimatedValue}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          placeholder="$1,000,000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Use Case *</label>
                        <select
                          name="useCase"
                          value={formData.useCase}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select use case...</option>
                          {useCases.map((uc) => (
                            <option key={uc.value} value={uc.value}>
                              {uc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Coins className="w-5 h-5 mr-2 text-green-400" />
                    Token Configuration (Optional)
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    If you have preferences for your token, fill these in. Otherwise, our team will help you decide.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Name</label>
                      <input
                        type="text"
                        name="tokenName"
                        value={formData.tokenName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="My Asset Token"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                      <input
                        type="text"
                        name="tokenSymbol"
                        value={formData.tokenSymbol}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="MAT"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Total Supply</label>
                      <input
                        type="text"
                        name="totalSupply"
                        value={formData.totalSupply}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="1,000,000"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-yellow-400" />
                    Additional Information
                  </h3>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Any additional information, questions, or specific requirements..."
                  />
                </div>

                {/* Wallet Info */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">Connected Wallet:</span>
                    </div>
                    <span className="text-white font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center"
                >
                  <Send className="mr-2 w-5 h-5" />
                  Submit Tokenization Request
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  By submitting, you agree to our terms and conditions. Our team will review your request 
                  and contact you within 2-3 business days.
                </p>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
