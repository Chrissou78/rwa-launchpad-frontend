'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  EnvelopeIcon, 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    walletAddress: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const supportOptions = [
    {
      icon: DocumentTextIcon,
      title: 'Documentation',
      description: 'Browse our comprehensive guides and tutorials.',
      link: '/docs',
      linkText: 'View Docs'
    },
    {
      icon: QuestionMarkCircleIcon,
      title: 'FAQ',
      description: 'Find answers to commonly asked questions.',
      link: '/faq',
      linkText: 'View FAQ'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Discord Community',
      description: 'Join our community for real-time help.',
      link: 'https://discord.gg/rwalaunchpad',
      linkText: 'Join Discord',
      external: true
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Support',
      description: 'Direct support within 24 hours.',
      link: 'mailto:support@rwalaunchpad.com',
      linkText: 'support@rwalaunchpad.com'
    }
  ];

  const commonIssues = [
    { title: 'KYC verification is pending', link: '/faq#kyc-pending' },
    { title: 'Transaction failed or stuck', link: '/faq#transaction-failed' },
    { title: 'Cannot connect wallet', link: '/faq#wallet-connection' },
    { title: 'Investment limits explained', link: '/faq#investment-limits' },
    { title: 'How to link additional wallets', link: '/docs/wallet-linking' },
    { title: 'Requesting a data export (GDPR)', link: '/docs/gdpr' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How can we <span className="text-purple-400">help</span>?
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our support team is here to assist you with any questions or issues you may have.
          </p>
        </div>

        {/* Support Options */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {supportOptions.map((option, index) => (
            <a
              key={index}
              href={option.link}
              target={option.external ? '_blank' : undefined}
              rel={option.external ? 'noopener noreferrer' : undefined}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 hover:border-purple-500/50 transition-all group"
            >
              <option.icon className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                {option.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">{option.description}</p>
              <span className="text-purple-400 text-sm font-medium">
                {option.linkText} {option.external ? '↗' : '→'}
              </span>
            </a>
          ))}
        </div>

        {/* Common Issues */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Common Issues</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {commonIssues.map((issue, index) => (
              <Link
                key={index}
                href={issue.link}
                className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors group"
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  {issue.title}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Submit a Support Request
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Fill out the form below and we&apos;ll get back to you within 24 hours.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400 mb-6">
                  We&apos;ve received your message and will respond within 24 hours.
                </p>
                <p className="text-sm text-gray-500">
                  Ticket reference: #{Date.now().toString(36).toUpperCase()}
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      subject: '',
                      category: 'general',
                      walletAddress: '',
                      message: ''
                    });
                  }}
                  className="mt-6 text-purple-400 hover:text-purple-300 font-medium"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="kyc">KYC / Verification Issue</option>
                    <option value="investment">Investment Question</option>
                    <option value="transaction">Transaction Problem</option>
                    <option value="wallet">Wallet Connection Issue</option>
                    <option value="technical">Technical Bug Report</option>
                    <option value="security">Security Concern</option>
                    <option value="gdpr">GDPR / Data Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Address <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono text-sm"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Helps us locate your account if related to a specific wallet
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
                    placeholder="Please describe your question or issue in detail. Include any relevant transaction hashes, error messages, or steps to reproduce the problem."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Response Time Notice */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Average response time: <span className="text-gray-300">4-8 hours</span> during business hours (Mon-Fri, 9AM-6PM UTC)
          </p>
        </div>
      </div>
    </div>
  );
}