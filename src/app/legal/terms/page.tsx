// src/app/legal/terms/page.tsx
'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
              <p className="text-gray-400">Last updated: February 18, 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-gray max-w-none">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
            <p className="text-gray-300 text-sm">
              Please read these Terms of Service ("Terms", "Terms of Service") carefully before using 
              the RWA Experts platform (the "Service") operated by RWA Experts Ltd ("us", "we", or "our").
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-400 mb-4">
              By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
              with any part of the terms, then you may not access the Service.
            </p>
            <p className="text-gray-400">
              These Terms apply to all visitors, users, and others who access or use the Service. By using 
              the Service, you represent that you are at least 18 years of age and have the legal capacity 
              to enter into these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-400 mb-4">
              RWA Experts provides a blockchain-based platform for:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Tokenization of real-world assets</li>
              <li>Crowdfunding and investment opportunities</li>
              <li>Trading of tokenized securities</li>
              <li>Identity verification (KYC) services</li>
              <li>Asset management and compliance tools</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="text-gray-400 mb-4">
              To access certain features of the Service, you must connect a compatible cryptocurrency wallet. 
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Maintaining the security of your wallet and private keys</li>
              <li>All activities that occur under your wallet address</li>
              <li>Ensuring your wallet address is not used for any illegal activities</li>
              <li>Completing required identity verification (KYC) procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Eligibility and KYC Requirements</h2>
            <p className="text-gray-400 mb-4">
              To participate in investment activities on our platform, you must:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
              <li>Complete our Know Your Customer (KYC) verification process</li>
              <li>Not be a resident of any sanctioned or restricted jurisdiction</li>
              <li>Not be listed on any sanctions list or designated as a Politically Exposed Person (PEP)</li>
              <li>Comply with all applicable laws in your jurisdiction</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Investment Risks</h2>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-medium mb-2">Important Risk Warning</p>
              <p className="text-gray-400 text-sm">
                Investing in tokenized assets involves significant risks. You may lose some or all of your 
                investment. Past performance is not indicative of future results.
              </p>
            </div>
            <p className="text-gray-400 mb-4">
              By using our Service, you acknowledge and accept the following risks:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Market volatility and price fluctuations</li>
              <li>Liquidity risks - you may not be able to sell your tokens when desired</li>
              <li>Regulatory risks - changes in laws may affect your investments</li>
              <li>Technology risks - smart contract vulnerabilities, blockchain issues</li>
              <li>Counterparty risks - default by issuers or other parties</li>
              <li>Operational risks - platform downtime, security breaches</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Fees and Payments</h2>
            <p className="text-gray-400 mb-4">
              The following fees may apply to your use of the Service:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Platform fees on token transfers and trades (0.1%)</li>
              <li>Tokenization fees for asset tokenization services</li>
              <li>Escrow fees for trade escrow services (1%)</li>
              <li>Dividend distribution fees (0.5%)</li>
              <li>Blockchain network fees (gas fees)</li>
            </ul>
            <p className="text-gray-400 mt-4">
              All fees are subject to change with reasonable notice. Current fee schedules are available 
              on our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Prohibited Activities</h2>
            <p className="text-gray-400 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Engage in money laundering, terrorist financing, or other illegal activities</li>
              <li>Manipulate markets or engage in fraudulent activities</li>
              <li>Circumvent KYC/AML requirements</li>
              <li>Use the platform from restricted jurisdictions</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use automated systems or bots without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Intellectual Property</h2>
            <p className="text-gray-400">
              The Service and its original content, features, and functionality are owned by RWA Experts 
              and are protected by international copyright, trademark, patent, trade secret, and other 
              intellectual property laws. You may not copy, modify, distribute, or create derivative 
              works without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-400 mb-4">
              To the maximum extent permitted by law, RWA Experts shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Loss of profits, data, or other intangible losses</li>
              <li>Investment losses or decreased value of tokens</li>
              <li>Unauthorized access to your wallet or data</li>
              <li>Service interruptions or errors</li>
              <li>Actions of third parties using the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Indemnification</h2>
            <p className="text-gray-400">
              You agree to indemnify, defend, and hold harmless RWA Experts and its officers, directors, 
              employees, agents, and affiliates from and against any claims, liabilities, damages, losses, 
              and expenses arising out of or related to your use of the Service, violation of these Terms, 
              or violation of any rights of a third party.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">11. Dispute Resolution</h2>
            <p className="text-gray-400 mb-4">
              Any disputes arising from these Terms or your use of the Service shall be resolved through:
            </p>
            <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-4">
              <li>Good faith negotiations between the parties</li>
              <li>Mediation by a mutually agreed mediator</li>
              <li>Binding arbitration in accordance with applicable arbitration rules</li>
            </ol>
            <p className="text-gray-400 mt-4">
              You agree to waive any right to participate in class action lawsuits against RWA Experts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">12. Governing Law</h2>
            <p className="text-gray-400">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which RWA Experts is incorporated, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">13. Changes to Terms</h2>
            <p className="text-gray-400">
              We reserve the right to modify or replace these Terms at any time. Material changes will be 
              notified via email or platform announcement at least 30 days before taking effect. Your 
              continued use of the Service after changes become effective constitutes acceptance of the 
              revised Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">14. Contact Information</h2>
            <p className="text-gray-400 mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">Email: legal@rwaexperts.com</p>
              <p className="text-gray-300">Address: [Company Address]</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}