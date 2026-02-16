import Link from 'next/link';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

interface Advisor {
  name: string;
  role: string;
  company: string;
  image: string;
}

export default function TeamPage() {
  const teamMembers: TeamMember[] = [
    {
      name: 'Alex Thompson',
      role: 'CEO & Co-Founder',
      image: '/team/alex.jpg',
      bio: '10+ years in fintech and blockchain. Previously led product at a major DeFi protocol. Passionate about democratizing finance.',
      social: {
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
      }
    },
    {
      name: 'Sarah Chen',
      role: 'CTO & Co-Founder',
      image: '/team/sarah.jpg',
      bio: 'Former senior engineer at Ethereum Foundation. Expert in smart contract security and tokenization standards.',
      social: {
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
        github: 'https://github.com',
      }
    },
    {
      name: 'Michael Roberts',
      role: 'Head of Legal & Compliance',
      image: '/team/michael.jpg',
      bio: 'Securities attorney with 15 years experience. Specialized in digital assets regulation and cross-border compliance.',
      social: {
        linkedin: 'https://linkedin.com',
      }
    },
    {
      name: 'Emily Zhang',
      role: 'Head of Product',
      image: '/team/emily.jpg',
      bio: 'Product leader with experience at major crypto exchanges. Focused on creating intuitive user experiences.',
      social: {
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
      }
    },
    {
      name: 'David Kim',
      role: 'Lead Smart Contract Developer',
      image: '/team/david.jpg',
      bio: 'Solidity expert with contributions to multiple DeFi protocols. Security-first development approach.',
      social: {
        github: 'https://github.com',
        linkedin: 'https://linkedin.com',
      }
    },
    {
      name: 'Lisa Martinez',
      role: 'Head of Business Development',
      image: '/team/lisa.jpg',
      bio: 'Built partnerships at leading real estate and investment platforms. Expert in asset tokenization deals.',
      social: {
        twitter: 'https://twitter.com',
        linkedin: 'https://linkedin.com',
      }
    },
  ];

  const advisors: Advisor[] = [
    {
      name: 'Dr. James Wilson',
      role: 'Blockchain Advisor',
      company: 'Stanford University',
      image: '/team/advisor1.jpg',
    },
    {
      name: 'Amanda Foster',
      role: 'Legal Advisor',
      company: 'Foster & Associates',
      image: '/team/advisor2.jpg',
    },
    {
      name: 'Robert Chang',
      role: 'Investment Advisor',
      company: 'Sequoia Capital',
      image: '/team/advisor3.jpg',
    },
  ];

  const openPositions = [
    { title: 'Senior Frontend Developer', type: 'Engineering', location: 'Remote' },
    { title: 'Smart Contract Auditor', type: 'Security', location: 'Remote' },
    { title: 'Community Manager', type: 'Marketing', location: 'Remote' },
    { title: 'Business Development Manager', type: 'Business', location: 'Remote / NYC' },
  ];

  return (
    <div className="space-y-16">
      {/* Team Introduction */}
      <section className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-6">Meet Our Team</h2>
        <p className="text-xl text-gray-300">
          We're a diverse team of blockchain engineers, finance experts, and legal professionals 
          united by our mission to make real-world asset investments accessible to everyone.
        </p>
      </section>

      {/* Core Team */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Leadership Team</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {teamMembers.map((member, index) => (
            <div 
              key={index}
              className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all group"
            >
              {/* Image */}
              <div className="aspect-square bg-gradient-to-br from-purple-900/50 to-blue-900/50 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-6xl">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                {/* Uncomment when you have actual images */}
                {/* <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                /> */}
              </div>
              
              {/* Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-1">{member.name}</h3>
                <p className="text-purple-400 text-sm font-medium mb-3">{member.role}</p>
                <p className="text-gray-400 text-sm mb-4">{member.bio}</p>
                
                {/* Social Links */}
                {member.social && (
                  <div className="flex gap-3">
                    {member.social.twitter && (
                      <a 
                        href={member.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {member.social.linkedin && (
                      <a 
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                    {member.social.github && (
                      <a 
                        href={member.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advisors */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Advisors</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {advisors.map((advisor, index) => (
            <div 
              key={index}
              className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 text-center"
            >
              {/* Avatar */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-2xl font-bold text-white">
                {advisor.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h3 className="text-lg font-semibold text-white">{advisor.name}</h3>
              <p className="text-purple-400 text-sm">{advisor.role}</p>
              <p className="text-gray-500 text-sm">{advisor.company}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team Values */}
      <section className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-3xl p-8 border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">How We Work</h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-3">🌍</div>
            <h3 className="font-semibold text-white mb-2">Remote First</h3>
            <p className="text-gray-400 text-sm">Our team works from around the globe, united by shared goals.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="font-semibold text-white mb-2">Move Fast</h3>
            <p className="text-gray-400 text-sm">We ship quickly while maintaining high quality standards.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔓</div>
            <h3 className="font-semibold text-white mb-2">Open Source</h3>
            <p className="text-gray-400 text-sm">Transparency in code and operations is core to our values.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-semibold text-white mb-2">Collaborative</h3>
            <p className="text-gray-400 text-sm">We believe the best ideas come from diverse perspectives.</p>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section>
        <div className="bg-gray-800/50 rounded-3xl p-8 border border-gray-700/50 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Join Our Team</h2>
            <p className="text-gray-400">
              We're always looking for talented individuals who share our passion for 
              democratizing finance through blockchain technology.
            </p>
          </div>

          {/* Open Positions */}
          <div className="space-y-4 mb-8">
            {openPositions.map((position, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-white">{position.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">{position.type}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-400">{position.location}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
                  Apply
                </button>
              </div>
            ))}
          </div>

          {/* General Application */}
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              Don't see a position that fits? We'd still love to hear from you.
            </p>
            <a
              href="mailto:careers@rwalaunchpad.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send General Application
            </a>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-white mb-4">Connect With Us</h2>
        <div className="flex justify-center gap-4">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
            </svg>
          </a>
          <a
            href="https://telegram.org"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a
            href="https://medium.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}