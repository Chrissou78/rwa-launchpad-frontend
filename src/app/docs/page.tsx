'use client';

import Link from 'next/link';
import { 
  BookOpenIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface DocSection {
  icon: typeof BookOpenIcon;
  title: string;
  description: string;
  links: { title: string; href: string }[];
}

const docSections: DocSection[] = [
  {
    icon: BookOpenIcon,
    title: 'Getting Started',
    description: 'Learn the basics of RWA Launchpad',
    links: [
      { title: 'Platform Overview', href: '/docs/overview' },
      { title: 'Creating an Account', href: '/docs/account' },
      { title: 'Connecting Your Wallet', href: '/docs/wallet' },
      { title: 'Quick Start Guide', href: '/docs/quickstart' },
    ]
  },
  {
    icon: ShieldCheckIcon,
    title: 'KYC Verification',
    description: 'Identity verification process and requirements',
    links: [
      { title: 'KYC Levels Explained', href: '/docs/kyc-levels' },
      { title: 'Document Requirements', href: '/docs/kyc-documents' },
      { title: 'Verification Process', href: '/docs/kyc-process' },
      { title: 'Troubleshooting KYC', href: '/docs/kyc-troubleshooting' },
    ]
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Investing',
    description: 'How to invest in tokenized assets',
    links: [
      { title: 'Investment Tiers ($20K / $200K / $2M)', href: '/docs/investment-tiers' },
      { title: 'How to Invest', href: '/docs/how-to-invest' },
      { title: 'Understanding Tokens', href: '/docs/tokens' },
      { title: 'Trading on P2P Market', href: '/docs/p2p-trading' },
    ]
  },
  {
    icon: CodeBracketIcon,
    title: 'For Developers',
    description: 'Technical documentation and API reference',
    links: [
      { title: 'API Overview', href: '/docs/api' },
      { title: 'Smart Contracts', href: '/docs/contracts' },
      { title: 'Webhooks', href: '/docs/webhooks' },
      { title: 'SDK Reference', href: '/docs/sdk' },
    ]
  },
  {
    icon: UserGroupIcon,
    title: 'For Asset Owners',
    description: 'Tokenize and manage your assets',
    links: [
      { title: 'Tokenization Process', href: '/docs/tokenization' },
      { title: 'Legal Requirements', href: '/docs/legal-requirements' },
      { title: 'Asset Management', href: '/docs/asset-management' },
      { title: 'Distribution Options', href: '/docs/distribution' },
    ]
  },
  {
    icon: DocumentTextIcon,
    title: 'Legal & Compliance',
    description: 'Regulatory information and policies',
    links: [
      { title: 'Terms of Service', href: '/legal/terms' },
      { title: 'Privacy Policy', href: '/legal/privacy' },
      { title: 'Regulatory Compliance', href: '/docs/compliance' },
      { title: 'Risk Disclosures', href: '/docs/risks' },
    ]
  },
];

const quickLinks = [
  { title: 'What is tokenization?', href: '/docs/tokenization' },
  { title: 'KYC verification guide', href: '/docs/kyc-process' },
  { title: 'Investment limits by tier', href: '/docs/investment-tiers' },
  { title: 'Supported wallets', href: '/docs/wallet' },
  { title: 'Smart contract addresses', href: '/docs/contracts' },
  { title: 'GDPR & data privacy', href: '/docs/gdpr' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="text-purple-400">Documentation</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to know about using RWA Launchpad, from getting started to advanced features.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors pl-12"
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
              Ctrl+K
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-16">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Popular Topics</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-full text-sm text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {docSections.map((section, index) => (
            <div
              key={index}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 hover:border-purple-500/30 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">{section.description}</p>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-purple-400 text-sm flex items-center gap-2 transition-colors group/link"
                    >
                      <ArrowRightIcon className="w-3 h-3 text-gray-600 group-hover/link:text-purple-400 transition-colors" />
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Investment Tiers Highlight */}
        <div className="mt-16 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Investment Tiers</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
              <div className="text-3xl font-bold text-purple-400 mb-2">$20K</div>
              <div className="text-white font-semibold mb-1">Basic Tier</div>
              <div className="text-gray-400 text-sm">KYC Level 1</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-purple-500/30">
              <div className="text-3xl font-bold text-purple-400 mb-2">$200K</div>
              <div className="text-white font-semibold mb-1">Standard Tier</div>
              <div className="text-gray-400 text-sm">KYC Level 2</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700/50">
              <div className="text-3xl font-bold text-purple-400 mb-2">$2M+</div>
              <div className="text-white font-semibold mb-1">Accredited Tier</div>
              <div className="text-gray-400 text-sm">KYC Level 3</div>
            </div>
          </div>
          <p className="text-center text-gray-400 mt-6">
            <Link href="/docs/investment-tiers" className="text-purple-400 hover:text-purple-300">
              Learn more about investment tiers →
            </Link>
          </p>
        </div>

        {/* Help CTA */}
        <div className="mt-16 text-center bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Can&apos;t find what you&apos;re looking for?</h2>
          <p className="text-gray-400 mb-6">
            Our support team is available to help you with any questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Browse FAQ
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}