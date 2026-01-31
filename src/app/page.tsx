'use client';

import { Header } from '@/components/Header';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { 
  Wallet, 
  Building2, 
  Shield, 
  TrendingUp, 
  Users, 
  FileCheck 
} from 'lucide-react';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Tokenize Real World Assets
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
                Launch compliant security tokens for real estate, commodities, and other 
                real-world assets on Polygon. Built with ERC-3643 standard for 
                institutional-grade compliance.
              </p>
              
              {!isConnected ? (
                <div className="flex justify-center">
                  <div className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg">
                    Connect Wallet to Get Started
                  </div>
                </div>
              ) : (
                <div className="flex justify-center space-x-4">
                  <Link
                    href="/projects"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg"
                  >
                    View Projects
                  </Link>
                  <Link
                    href="/create"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg text-lg"
                  >
                    Create Project
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Platform Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-500" />}
              title="ERC-3643 Compliant"
              description="Built on the institutional security token standard with identity verification and transfer restrictions."
            />
            <FeatureCard
              icon={<Building2 className="w-8 h-8 text-green-500" />}
              title="Real Estate Tokenization"
              description="Tokenize commercial and residential properties with fractional ownership."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-purple-500" />}
              title="Investor Management"
              description="KYC/AML compliance with on-chain identity registry and claim verification."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8 text-yellow-500" />}
              title="Dividend Distribution"
              description="Automated dividend payments based on token holdings and snapshots."
            />
            <FeatureCard
              icon={<FileCheck className="w-8 h-8 text-red-500" />}
              title="Compliance Modules"
              description="Country restrictions, max balance limits, lockup periods, and accreditation checks."
            />
            <FeatureCard
              icon={<Wallet className="w-8 h-8 text-indigo-500" />}
              title="Escrow & Milestones"
              description="Secure fund management with milestone-based releases."
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatCard value="$0" label="Total Value Locked" />
              <StatCard value="0" label="Projects Launched" />
              <StatCard value="0" label="Verified Investors" />
              <StatCard value="Amoy" label="Network" />
            </div>
          </div>
        </div>

        {/* Testnet Notice */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-yellow-500 font-semibold mr-2">⚠️ Testnet:</span>
              <span className="text-yellow-200">
                This application is running on Polygon Amoy testnet. Get test MATIC from the{' '}
                <a 
                  href="https://faucet.polygon.technology/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-100"
                >
                  Polygon Faucet
                </a>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}
