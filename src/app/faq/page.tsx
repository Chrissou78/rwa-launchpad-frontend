'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'General',
    question: 'What is RWA Launchpad?',
    answer: 'RWA Launchpad is a platform for tokenizing real-world assets, enabling fractional ownership and trading of assets like real estate, commodities, and more on the blockchain.'
  },
  {
    category: 'General',
    question: 'How does tokenization work?',
    answer: 'Tokenization converts ownership rights of real-world assets into digital tokens on a blockchain. Each token represents a fractional share of the underlying asset, making it easier to buy, sell, and trade.'
  },
  {
    category: 'General',
    question: 'Which blockchains do you support?',
    answer: 'We support multiple EVM-compatible chains including Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, and BSC. You can choose the network that best suits your needs.'
  },
  {
    category: 'KYC',
    question: 'Why do I need KYC verification?',
    answer: 'KYC (Know Your Customer) verification is required for regulatory compliance. It helps prevent fraud, money laundering, and ensures a secure platform for all users.'
  },
  {
    category: 'KYC',
    question: 'What are the different KYC levels?',
    answer: 'We have three main KYC tiers: Basic ($20,000 investment limit), Standard ($200,000 investment limit), and Accredited ($2,000,000+ investment limit). Higher tiers require additional documentation such as proof of accreditation.'
  },
  {
    category: 'KYC',
    question: 'How long does KYC verification take?',
    answer: 'Basic verification typically completes within 24-48 hours. Standard verification may take 2-3 business days. Accredited investor verification can take up to 5 business days depending on document review.'
  },
  {
    category: 'KYC',
    question: 'What documents do I need for KYC?',
    answer: 'Basic KYC requires a government-issued ID and proof of address. Standard KYC additionally requires proof of income or bank statements. Accredited status requires documentation proving accredited investor qualifications.'
  },
  {
    category: 'Investment',
    question: 'What is the minimum investment amount?',
    answer: 'Minimum investment amounts vary by project, typically starting at $100. Your maximum investment depends on your KYC tier: Basic ($20,000), Standard ($200,000), or Accredited ($2,000,000+).'
  },
  {
    category: 'Investment',
    question: 'How do I purchase tokens?',
    answer: 'Connect your wallet, complete KYC verification, browse available projects, and click "Invest" on your chosen project. You can pay with supported cryptocurrencies or fiat through our payment partners.'
  },
  {
    category: 'Investment',
    question: 'Can I sell my tokens?',
    answer: 'Yes, you can trade your tokens on our P2P marketplace after any lock-up period ends. Some tokens may also be listed on external exchanges depending on the project.'
  },
  {
    category: 'Investment',
    question: 'What are the fees?',
    answer: 'We charge a small platform fee (typically 1-2%) on investments. There are also blockchain gas fees for on-chain transactions. All fees are transparently displayed before you confirm any transaction.'
  },
  {
    category: 'Security',
    question: 'How is my data protected?',
    answer: 'We use bank-grade AES-256 encryption, secure storage compliant with SOC 2 standards, and follow GDPR regulations. Your personal data is encrypted at rest and in transit, and you can request data export or deletion at any time.'
  },
  {
    category: 'Security',
    question: 'Are my funds safe?',
    answer: 'Yes. We use smart contracts audited by leading security firms, multi-signature wallets for platform funds, and never have custody of your personal crypto assets. You maintain control of your wallet at all times.'
  },
  {
    category: 'Security',
    question: 'What happens if I lose access to my wallet?',
    answer: 'Your tokens are tied to your wallet address. We recommend using a hardware wallet and securely backing up your recovery phrase. We cannot recover lost wallet access, but linked wallets can help maintain your KYC status.'
  },
  {
    category: 'Technical',
    question: 'Which wallets are supported?',
    answer: 'We support MetaMask, WalletConnect-compatible wallets, Coinbase Wallet, Rainbow, and most major Web3 wallets. Hardware wallets like Ledger and Trezor work through MetaMask integration.'
  },
  {
    category: 'Technical',
    question: 'What if a transaction fails?',
    answer: 'Failed transactions are usually due to insufficient gas or network congestion. No funds are deducted for failed transactions (except gas fees already spent). You can retry the transaction with higher gas settings.'
  },
];

const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked <span className="text-purple-400">Questions</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find answers to common questions about RWA Launchpad, tokenization, and investing.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No questions found matching your search.</p>
            </div>
          ) : (
            filteredFAQ.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <span className="text-white font-medium">{item.question}</span>
                  </div>
                  <ChevronDownIcon 
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                      openItems.has(index) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openItems.has(index) && (
                  <div className="px-6 pb-4 text-gray-300 border-t border-gray-700/50 pt-4">
                    {item.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
          <p className="text-gray-400 mb-6">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="/support"
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}