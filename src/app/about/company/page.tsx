import { EXPLORER_URL, CONTRACTS } from '@/config/contracts';

export default function CompanyPage() {
  const milestones = [
    { year: '2026 Q1', title: 'Foundation', description: 'RWA Launchpad was founded with a vision to democratize real-world asset investments. Core smart contracts developed and audited for security and compliance.' },
    { year: '2026 Q2', title: 'Testnet Launch', description: 'Platform launched on Avax Fuji testnet for community testing.' },
    { year: '2026 Q3', title: 'Mainnet Preparation', description: 'Final audits and preparations for mainnet deployment.' },
    { year: '2026 Q4', title: 'Mainnet Launch', description: 'Full platform launch on Avalanche mainnet with first RWA projects.' },
  ];

  const values = [
    {
      icon: '🔒',
      title: 'Security First',
      description: 'All smart contracts are audited and follow best practices for security. Your investments are protected by battle-tested code.'
    },
    {
      icon: '🌐',
      title: 'Global Access',
      description: 'Anyone, anywhere can participate in real-world asset investments with as little as $100, breaking down traditional barriers.'
    },
    {
      icon: '⚖️',
      title: 'Regulatory Compliance',
      description: 'We work within regulatory frameworks, implementing KYC/AML procedures and security token standards.'
    },
    {
      icon: '🔍',
      title: 'Transparency',
      description: 'All transactions are on-chain and verifiable. Project milestones, fund releases, and token distributions are fully transparent.'
    },
    {
      icon: '🤝',
      title: 'Community Driven',
      description: 'Our platform is built for the community. Token holders participate in governance and platform decisions.'
    },
    {
      icon: '💡',
      title: 'Innovation',
      description: 'We leverage cutting-edge blockchain technology to create new possibilities for asset tokenization and investment.'
    },
  ];

  const stats = [
    { value: '$10M+', label: 'Target AUM' },
    { value: '50+', label: 'Planned Projects' },
    { value: '10K+', label: 'Target Investors' },
    { value: '5+', label: 'Asset Categories' },
  ];

  return (
    <div className="space-y-16">
      {/* Mission Section */}
      <section className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
        <p className="text-xl text-gray-300 leading-relaxed">
          RWA Launchpad is on a mission to bridge the gap between traditional real-world assets 
          and the decentralized finance ecosystem. We believe that everyone should have access 
          to investment opportunities that were previously reserved for institutions and 
          high-net-worth individuals.
        </p>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-800/30 rounded-3xl p-8 border border-gray-700/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What We Do Section */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-8 text-center">What We Do</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-xl font-semibold text-white mb-3">Asset Tokenization</h3>
            <p className="text-gray-400">
              We help project owners tokenize their real-world assets, creating compliant 
              security tokens that represent fractional ownership in properties, businesses, 
              commodities, and more.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-white mb-3">Investment Platform</h3>
            <p className="text-gray-400">
              Our platform connects verified investors with tokenized asset opportunities, 
              enabling investments with cryptocurrency or traditional payment methods through 
              our secure escrow system.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-3">Milestone Management</h3>
            <p className="text-gray-400">
              Projects release funds through milestone-based systems, ensuring accountability 
              and protecting investor interests. Each milestone is verified before funds 
              are released.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-white mb-3">Dividend Distribution</h3>
            <p className="text-gray-400">
              Token holders receive their share of project returns through our automated 
              dividend distribution system, with full transparency and on-chain verification.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Values</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <div 
              key={index}
              className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-colors"
            >
              <div className="text-3xl mb-3">{value.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-gray-400 text-sm">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Journey</h2>
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-blue-500" />
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative flex items-start gap-6">
                  {/* Dot */}
                  <div className="relative z-10 w-16 h-16 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <div className="text-purple-400 text-sm font-medium mb-1">{milestone.year}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{milestone.title}</h3>
                    <p className="text-gray-400">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-3xl p-8 border border-purple-500/20">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Built on Avalanche</h2>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-300 mb-6">
            Our platform is built on Avalanche, a leading Ethereum scaling solution that provides 
            fast, low-cost transactions while maintaining the security of Ethereum. All our 
            smart contracts are open source and verified on-chain.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`${EXPLORER_URL}/address/${CONTRACTS.RWALaunchpadFactory}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
            >
              View Factory Contract →
            </a>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACTS.RWAProjectNFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
            >
              View Project NFT →
            </a>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACTS.KYCManager}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
            >
              View KYC Manager →
            </a>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Want to Learn More?</h2>
        <p className="text-gray-400 mb-6">
          Have questions about our platform or interested in listing your project?
        </p>
        <a
          href="mailto:contact@rwalaunchpad.com"
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Us
        </a>
      </section>
    </div>
  );
}