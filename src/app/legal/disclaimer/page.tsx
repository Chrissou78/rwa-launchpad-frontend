// src/app/legal/disclaimer/page.tsx
'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function DisclaimerPage() {
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
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Risk Disclaimer</h1>
              <p className="text-gray-400">Last updated: February 18, 2026</p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Important Risk Warning</h2>
              <p className="text-gray-300">
                Investing in tokenized assets involves significant risks. You may lose some or all of your 
                invested capital. Only invest money you can afford to lose. This is not financial advice.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. General Risk Warning</h2>
            <p className="text-gray-400 mb-4">
              Before using RWA Experts platform, you should carefully consider the following risks 
              associated with tokenized asset investments:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>The value of your investment can go down as well as up</li>
              <li>Past performance is not a reliable indicator of future results</li>
              <li>You may not get back the amount you originally invested</li>
              <li>Tokenized assets are a relatively new and evolving asset class</li>
              <li>Regulatory frameworks are still developing and may change</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Market Risks</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-400 mb-2">Volatility Risk</h3>
                <p className="text-gray-400 text-sm">
                  Tokenized asset prices can be highly volatile and may experience sudden and significant 
                  price movements. Market conditions, sentiment, and external factors can cause rapid 
                  value changes.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-400 mb-2">Liquidity Risk</h3>
                <p className="text-gray-400 text-sm">
                  There may be limited liquidity for certain tokenized assets. You may not be able to 
                  sell your tokens when desired, or may need to accept a lower price to find a buyer. 
                  Secondary markets may have low trading volumes.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-400 mb-2">Valuation Risk</h3>
                <p className="text-gray-400 text-sm">
                  The valuation of underlying assets may be difficult to determine accurately. 
                  Asset valuations may differ from market prices and may not reflect true market value.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Technology Risks</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-400 mb-2">Smart Contract Risk</h3>
                <p className="text-gray-400 text-sm">
                  Smart contracts may contain bugs, vulnerabilities, or errors that could result in 
                  loss of funds. While we conduct audits, no smart contract can be guaranteed to be 
                  completely secure.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-400 mb-2">Blockchain Risk</h3>
                <p className="text-gray-400 text-sm">
                  Blockchain networks may experience congestion, forks, attacks, or technical issues. 
                  Network upgrades could impact token functionality. Transaction finality depends on 
                  network conditions.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-400 mb-2">Wallet Security Risk</h3>
                <p className="text-gray-400 text-sm">
                  You are responsible for securing your wallet and private keys. Loss of access to 
                  your wallet or theft of private keys could result in permanent loss of your assets. 
                  We cannot recover lost private keys.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-400 mb-2">Platform Risk</h3>
                <p className="text-gray-400 text-sm">
                  Our platform may experience downtime, errors, or security incidents. While we 
                  implement industry-standard security measures, no system is completely secure. 
                  Cyber attacks could impact platform availability.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Regulatory Risks</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-purple-400 mb-2">Legal and Regulatory Changes</h3>
                <p className="text-gray-400 text-sm">
                  Laws and regulations governing tokenized assets are evolving. Changes in regulations 
                  could affect the legality, transferability, or value of your tokens. Some jurisdictions 
                  may prohibit or restrict tokenized asset investments.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-purple-400 mb-2">Tax Risk</h3>
                <p className="text-gray-400 text-sm">
                  Tax treatment of tokenized assets varies by jurisdiction and may change. You are 
                  responsible for understanding and complying with your tax obligations. Consult a 
                  tax professional for advice.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-purple-400 mb-2">Compliance Risk</h3>
                <p className="text-gray-400 text-sm">
                  Token transfers may be restricted based on regulatory requirements and investor 
                  eligibility. Changes in your KYC status or jurisdiction could affect your ability 
                  to hold or transfer tokens.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Asset-Specific Risks</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Real Estate Risks</h3>
                <p className="text-gray-400 text-sm">
                  Property values can decline due to market conditions, location factors, or property 
                  condition. Rental income may vary. Properties may require maintenance or face 
                  regulatory issues.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Business Equity Risks</h3>
                <p className="text-gray-400 text-sm">
                  Businesses may underperform, face competition, or fail entirely. Dividends are not 
                  guaranteed. Minority shareholders may have limited influence over business decisions.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Commodity Risks</h3>
                <p className="text-gray-400 text-sm">
                  Commodity prices are affected by global supply and demand, geopolitical events, 
                  weather, and economic conditions. Storage and custody involve additional risks and costs.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Counterparty Risks</h2>
            <p className="text-gray-400 mb-4">
              Your investments may be affected by the actions or failures of various parties:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li><strong className="text-gray-300">Issuer Risk:</strong> Asset issuers may default, mismanage assets, or fail to meet obligations</li>
              <li><strong className="text-gray-300">Custodian Risk:</strong> Third-party custodians may face operational or financial difficulties</li>
              <li><strong className="text-gray-300">Service Provider Risk:</strong> Failure of key service providers could impact token operations</li>
              <li><strong className="text-gray-300">Fraud Risk:</strong> Despite our due diligence, fraudulent projects may exist</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. No Investment Advice</h2>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-gray-300">
                <strong>Important:</strong> Nothing on this platform constitutes investment, financial, 
                legal, or tax advice. Information provided is for educational and informational purposes 
                only. You should conduct your own research and consult with qualified professionals 
                before making any investment decisions.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Investor Suitability</h2>
            <p className="text-gray-400 mb-4">
              Tokenized asset investments may not be suitable for all investors. You should only invest if you:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 ml-4">
              <li>Have sufficient knowledge and experience to evaluate the risks</li>
              <li>Can afford to lose your entire investment</li>
              <li>Have a long-term investment horizon</li>
              <li>Understand the nature of tokenized securities</li>
              <li>Have considered diversification in your investment portfolio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Acknowledgment</h2>
            <p className="text-gray-400">
              By using the RWA Experts platform, you acknowledge that you have read, understood, 
              and accepted the risks described in this disclaimer. You confirm that you are making 
              investment decisions based on your own judgment and at your own risk.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}