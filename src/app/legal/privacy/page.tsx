// src/app/legal/privacy/page.tsx
'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
              <p className="text-gray-400">Last updated: February 18, 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-gray max-w-none">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
            <p className="text-gray-300 text-sm">
              This Privacy Policy describes how RWA Experts ("we", "us", or "our") collects, uses, 
              and shares information about you when you use our platform and services.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">1.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Identity Information:</strong> Full name, date of birth, nationality, government ID documents</li>
              <li><strong className="text-gray-300">Contact Information:</strong> Email address, phone number, mailing address</li>
              <li><strong className="text-gray-300">Financial Information:</strong> Bank account details, tax identification numbers</li>
              <li><strong className="text-gray-300">Business Information:</strong> Company name, registration documents, beneficial ownership</li>
              <li><strong className="text-gray-300">KYC Documents:</strong> Proof of identity, proof of address, source of funds documentation</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">1.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Wallet Information:</strong> Public wallet addresses, transaction history on the blockchain</li>
              <li><strong className="text-gray-300">Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong className="text-gray-300">Usage Information:</strong> Pages visited, features used, time spent on platform</li>
              <li><strong className="text-gray-300">Cookies and Tracking:</strong> Session data, preferences, analytics data</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">1.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Identity verification providers (KYC services)</li>
              <li>Sanctions and PEP screening databases</li>
              <li>Credit reference agencies</li>
              <li>Blockchain analytics providers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-400 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Comply with legal and regulatory requirements (KYC/AML)</li>
              <li>Communicate with you about products, services, and events</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent security incidents</li>
              <li>Personalize and improve your experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Legal Basis for Processing (GDPR)</h2>
            <p className="text-gray-400 mb-4">We process your personal data based on:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Contract:</strong> Processing necessary to provide our services to you</li>
              <li><strong className="text-gray-300">Legal Obligation:</strong> Processing required to comply with KYC/AML regulations</li>
              <li><strong className="text-gray-300">Legitimate Interests:</strong> Processing for fraud prevention and platform security</li>
              <li><strong className="text-gray-300">Consent:</strong> Processing for marketing communications (where required)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Information Sharing</h2>
            <p className="text-gray-400 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Service Providers:</strong> KYC verification services, payment processors, cloud hosting</li>
              <li><strong className="text-gray-300">Regulatory Authorities:</strong> When required by law or regulation</li>
              <li><strong className="text-gray-300">Business Partners:</strong> With your consent, for joint offerings</li>
              <li><strong className="text-gray-300">Legal Proceedings:</strong> To respond to legal process or protect rights</li>
              <li><strong className="text-gray-300">Corporate Transactions:</strong> In connection with mergers or acquisitions</li>
            </ul>
            <p className="text-gray-400 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Data Retention</h2>
            <p className="text-gray-400 mb-4">We retain your information for as long as necessary to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Provide our services to you</li>
              <li>Comply with legal and regulatory requirements (typically 5-7 years for financial records)</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Protect against fraud and abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-400 mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-gray-300">Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong className="text-gray-300">Erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong className="text-gray-300">Portability:</strong> Receive your data in a structured format</li>
              <li><strong className="text-gray-300">Restriction:</strong> Limit how we process your data</li>
              <li><strong className="text-gray-300">Objection:</strong> Object to certain processing activities</li>
              <li><strong className="text-gray-300">Withdraw Consent:</strong> Where processing is based on consent</li>
            </ul>
            <p className="text-gray-400 mt-4">
              To exercise these rights, contact us at privacy@rwaexperts.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. International Data Transfers</h2>
            <p className="text-gray-400">
              Your information may be transferred to and processed in countries other than your country 
              of residence. We ensure appropriate safeguards are in place, including Standard Contractual 
              Clauses approved by the European Commission, where applicable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Security</h2>
            <p className="text-gray-400 mb-4">
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments and audits</li>
              <li>Employee training on data protection</li>
              <li>Incident response procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Children's Privacy</h2>
            <p className="text-gray-400">
              Our Service is not directed to children under 18. We do not knowingly collect personal 
              information from children. If we learn we have collected information from a child, we 
              will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-400">
              We may update this Privacy Policy from time to time. We will notify you of material changes 
              by posting the new policy on this page and updating the "Last updated" date. We encourage 
              you to review this policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p className="text-gray-400 mb-4">
              For questions about this Privacy Policy or to exercise your rights:
            </p>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">Data Protection Officer</p>
              <p className="text-gray-300">Email: privacy@rwaexperts.com</p>
              <p className="text-gray-300">Address: [Company Address]</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}