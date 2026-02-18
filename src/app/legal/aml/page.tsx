// src/app/legal/aml/page.tsx
'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';

export default function AMLPolicyPage() {
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
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Anti-Money Laundering Policy</h1>
              <p className="text-gray-400">Last updated: February 18, 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-gray max-w-none">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
            <p className="text-gray-300 text-sm">
              RWA Experts is committed to preventing money laundering, terrorist financing, and other 
              financial crimes. This policy outlines our procedures and controls to ensure compliance 
              with applicable anti-money laundering (AML) regulations.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Policy Statement</h2>
            <p className="text-gray-400 mb-4">
              RWA Experts maintains a comprehensive Anti-Money Laundering (AML) and Counter-Terrorist 
              Financing (CTF) program designed to:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Prevent the use of our platform for money laundering or terrorist financing</li>
              <li>Comply with all applicable AML/CTF laws and regulations</li>
              <li>Identify and report suspicious activities to relevant authorities</li>
              <li>Maintain appropriate records for regulatory purposes</li>
              <li>Provide ongoing training to our staff</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Know Your Customer (KYC) Procedures</h2>
            
            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">2.1 Customer Identification</h3>
            <p className="text-gray-400 mb-4">
              We verify the identity of all customers before they can participate in investment activities. 
              Our KYC process includes:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Collection of government-issued identification documents</li>
              <li>Verification of name, date of birth, and address</li>
              <li>Biometric verification (where applicable)</li>
              <li>Document authenticity checks</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">2.2 KYC Tiers</h3>
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">🥉</span>
                <div>
                  <h4 className="text-white font-medium">Bronze Tier</h4>
                  <p className="text-gray-400 text-sm">Basic identity verification - Government ID, selfie verification</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">🥈</span>
                <div>
                  <h4 className="text-white font-medium">Silver Tier</h4>
                  <p className="text-gray-400 text-sm">Enhanced verification - Proof of address, additional documentation</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <h4 className="text-white font-medium">Gold Tier</h4>
                  <p className="text-gray-400 text-sm">Full verification - Source of funds, accredited investor status</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <h4 className="text-white font-medium">Diamond Tier</h4>
                  <p className="text-gray-400 text-sm">Institutional verification - Corporate documentation, beneficial ownership</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3">2.3 Enhanced Due Diligence</h3>
            <p className="text-gray-400 mb-4">
              We apply enhanced due diligence (EDD) for:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Politically Exposed Persons (PEPs) and their associates</li>
              <li>Customers from high-risk jurisdictions</li>
              <li>Complex ownership structures</li>
              <li>Unusually large transactions</li>
              <li>Customers with adverse media findings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Sanctions Screening</h2>
            <p className="text-gray-400 mb-4">
              We screen all customers against global sanctions lists, including:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>OFAC (Office of Foreign Assets Control) - United States</li>
              <li>UN Security Council Sanctions List</li>
              <li>EU Consolidated Sanctions List</li>
              <li>UK HM Treasury Sanctions List</li>
              <li>Other relevant national and international sanctions lists</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Screening is performed at onboarding and on an ongoing basis. Users identified on 
              sanctions lists are prohibited from using our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Transaction Monitoring</h2>
            <p className="text-gray-400 mb-4">
              We maintain systems to monitor transactions for suspicious activity, including:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Unusual transaction patterns or volumes</li>
              <li>Transactions inconsistent with customer profile</li>
              <li>Rapid movement of funds</li>
              <li>Structured transactions to avoid reporting thresholds</li>
              <li>Transactions involving high-risk jurisdictions</li>
              <li>Blockchain analytics for cryptocurrency transactions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Suspicious Activity Reporting</h2>
            <p className="text-gray-400 mb-4">
              When suspicious activity is detected, we:
            </p>
            <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-4">
              <li>Document the suspicious activity</li>
              <li>Escalate to our Compliance Officer for review</li>
              <li>File Suspicious Activity Reports (SARs) with relevant authorities as required</li>
              <li>Maintain confidentiality of SAR filings</li>
              <li>Take appropriate action, which may include account suspension</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Record Keeping</h2>
            <p className="text-gray-400 mb-4">
              We maintain records in accordance with regulatory requirements:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Customer identification records - minimum 5 years after relationship ends</li>
              <li>Transaction records - minimum 5 years from date of transaction</li>
              <li>Suspicious activity reports - as required by applicable regulations</li>
              <li>Training records and policy documentation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Restricted Jurisdictions</h2>
            <p className="text-gray-400 mb-4">
              We do not provide services to residents of the following jurisdictions:
            </p>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <ul className="list-disc list-inside text-gray-400 space-y-1 text-sm">
                <li>North Korea (DPRK)</li>
                <li>Iran</li>
                <li>Syria</li>
                <li>Cuba</li>
                <li>Crimea region of Ukraine</li>
                <li>Other jurisdictions as designated by applicable sanctions regimes</li>
              </ul>
            </div>
            <p className="text-gray-400 mt-4">
              Additional restrictions may apply based on regulatory requirements and risk assessments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Staff Training</h2>
            <p className="text-gray-400 mb-4">
              All staff members receive AML/CTF training that covers:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Recognition of suspicious activities and red flags</li>
              <li>KYC procedures and requirements</li>
              <li>Sanctions compliance</li>
              <li>Reporting procedures</li>
              <li>Record-keeping requirements</li>
              <li>Legal obligations and consequences of non-compliance</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Training is provided upon joining and refreshed annually.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Compliance Officer</h2>
            <p className="text-gray-400 mb-4">
              Our designated Compliance Officer is responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Oversight of the AML/CTF program</li>
              <li>Reviewing and approving suspicious activity reports</li>
              <li>Liaison with regulatory authorities</li>
              <li>Policy updates and program improvements</li>
              <li>Staff training coordination</li>
              <li>Handling AML-related inquiries</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Cooperation with Authorities</h2>
            <p className="text-gray-400">
              RWA Experts cooperates fully with law enforcement and regulatory authorities in the 
              investigation of suspected money laundering, terrorist financing, or other financial 
              crimes. We respond promptly to lawful requests for information while protecting 
              customer privacy to the extent permitted by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">11. Policy Review</h2>
            <p className="text-gray-400">
              This AML Policy is reviewed and updated at least annually, or more frequently when 
              required by regulatory changes or identified risks. Updates are communicated to all 
              relevant staff members.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">12. Contact</h2>
            <p className="text-gray-400 mb-4">
              For questions about our AML program or to report suspicious activity:
            </p>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">Compliance Officer</p>
              <p className="text-gray-300">Email: compliance@rwaexperts.com</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}