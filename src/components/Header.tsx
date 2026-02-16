// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './ConnectButton';
import { useAccount } from 'wagmi';
import { useKYC, getTierInfo, KYCTier } from '@/contexts/KYCContext';
import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// KYC Badge Component (unchanged - keeping as is)
function KYCBadge() {
  const { kycData, tierInfo, formatLimit, tierLimits } = useKYC();
  const [showDropdown, setShowDropdown] = useState(false);

  if (kycData.isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-600 rounded-full" />
        <div className="w-16 h-4 bg-gray-600 rounded" />
      </div>
    );
  }

  const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(kycData.status);
  const isRejected = kycData.status === 'Rejected';
  const isExpired = kycData.status === 'Expired';
  const isApproved = kycData.status === 'Approved';
  const isDiamond = kycData.tier === 'Diamond';

  const displayLimit = (value: number) => {
    if (isDiamond) return '∞';
    return formatLimit(value);
  };

  const getStatusStyle = () => {
    if (isPending) return 'bg-yellow-900/30 border-yellow-600 text-yellow-400';
    if (isRejected) return 'bg-red-900/30 border-red-600 text-red-400';
    if (isExpired) return 'bg-orange-900/30 border-orange-600 text-orange-400';
    if (isApproved && kycData.tier !== 'None') {
      return `${tierInfo.bgColor} ${tierInfo.borderColor} ${tierInfo.color}`;
    }
    return 'bg-gray-800 border-gray-600 text-gray-400';
  };

  const getStatusIcon = () => {
    if (isPending) return '⏳';
    if (isRejected) return '❌';
    if (isExpired) return '⚠️';
    if (isApproved && kycData.tier !== 'None') return tierInfo.icon;
    return '🔒';
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending';
    if (isRejected) return 'Rejected';
    if (isExpired) return 'Expired';
    if (isApproved && kycData.tier !== 'None') return tierInfo.label;
    return 'Verify';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 ${getStatusStyle()}`}
      >
        <span className="text-sm">{getStatusIcon()}</span>
        <span className="text-sm font-medium">{getStatusLabel()}</span>
        {isApproved && kycData.tier !== 'None' && (
          <span className="text-xs opacity-70">
            {displayLimit(kycData.remainingLimit)}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className={`px-4 py-3 ${tierInfo.bgColor} border-b border-gray-700`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getStatusIcon()}</span>
              <div>
                <div className={`font-semibold ${tierInfo.color}`}>
                  {isApproved ? `${tierInfo.label} Tier` : getStatusLabel()}
                </div>
                <div className="text-xs text-gray-400">
                  {isApproved ? 'KYC Verified' : 'Identity Verification'}
                </div>
              </div>
            </div>
          </div>

          {isApproved && kycData.tier !== 'None' && (
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Investment Limits</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tier Limit</span>
                  <span className="text-white">
                    {isDiamond ? (
                      <span className="text-cyan-400">∞ Unlimited</span>
                    ) : (
                      formatLimit(kycData.investmentLimit)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Used</span>
                  <span className="text-gray-300">{formatLimit(kycData.usedLimit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-green-400 font-medium">
                    {isDiamond ? (
                      <span className="text-cyan-400">∞ Unlimited</span>
                    ) : (
                      formatLimit(kycData.remainingLimit)
                    )}
                  </span>
                </div>
                {!isDiamond && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${tierInfo.color.replace('text-', 'bg-')} transition-all`}
                        style={{ 
                          width: `${Math.min(100, (kycData.usedLimit / kycData.investmentLimit) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isApproved && kycData.tier !== 'Diamond' && (
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Upgrade Available</div>
              <div className="flex items-center gap-2 text-sm">
                <span className={tierInfo.color}>{tierInfo.icon}</span>
                <span className="text-gray-400">→</span>
                <span className={getTierInfo(getNextTier(kycData.tier)).color}>
                  {getTierInfo(getNextTier(kycData.tier)).icon}
                </span>
                <span className="text-gray-300">
                  {getTierInfo(getNextTier(kycData.tier)).label}
                </span>
              </div>
            </div>
          )}

          <div className="p-3">
            <Link
              href="/kyc"
              className="block w-full px-4 py-2 text-center text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isApproved ? 'Manage KYC' : isPending ? 'View Status' : 'Start Verification'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextTier(current: KYCTier): KYCTier {
  const tiers: KYCTier[] = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  const currentIndex = tiers.indexOf(current);
  return tiers[Math.min(currentIndex + 1, tiers.length - 1)];
}

// Dropdown Menu Component with proper hover handling
function DropdownMenu({ 
  label, 
  items, 
  isActive 
}: { 
  label: string; 
  items: { href: string; label: string; description?: string }[];
  isActive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-1 py-2 transition-colors ${
          isActive ? 'text-white' : 'text-gray-300 hover:text-white'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 pt-2 z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();

  // Determine current section
  const isLandingPage = pathname === '/';
  const isAboutSection = pathname.startsWith('/about');
  const isTokeniseSection = pathname.startsWith('/tokenise');
  const isCrowdfundingSection = ['/crowdfunding', '/projects', '/create', '/exchange', '/project'].some(
    path => pathname.startsWith(path)
  );
  const isTradeSection = pathname.startsWith('/trade');
  const isKycPage = pathname === '/kyc';
  const isAdminSection = pathname.startsWith('/admin');

  // About dropdown items
  const aboutItems = [
    { href: '/about/company', label: 'Company', description: 'Our mission and vision' },
    { href: '/about/team', label: 'Team', description: 'Meet our experts' },
  ];

  // Tokenisation dropdown items for landing page
  const tokenisationItems = [
    { href: '/tokenise', label: 'Tokenise Your Asset', description: 'Create & manage digital assets' },
    { href: '/crowdfunding', label: 'Crowdfunding', description: 'Raise funds for your project' },
    { href: '/trade', label: 'Trade Platform', description: 'B2B trade with escrow (Coming soon)' },
  ];

  // Crowdfunding sub-navigation items
  const crowdfundingItems = [
    { href: '/create', label: 'Create Project' },
    { href: '/projects', label: 'Projects' },
    { href: '/exchange', label: 'Exchange' },
  ];

  // Determine which navigation to show
  const showLandingNav = isLandingPage || isAboutSection || isKycPage || isAdminSection || isTokeniseSection || isTradeSection;

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <span className="text-xl font-bold text-white">RWA Experts</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {showLandingNav && !isCrowdfundingSection ? (
              // Landing Page / About / KYC / Admin / Tokenise Navigation
              <>
                <DropdownMenu 
                  label="About" 
                  items={aboutItems}
                  isActive={isAboutSection}
                />
                <DropdownMenu 
                  label="Tokenisation" 
                  items={tokenisationItems}
                  isActive={isTokeniseSection || isCrowdfundingSection || isTradeSection}
                />
                <Link 
                  href="/kyc" 
                  className={`transition-colors ${
                    isKycPage ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Identity
                </Link>
                {isConnected && (
                  <Link 
                    href="/admin" 
                    className={`transition-colors ${
                      isAdminSection ? 'text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : (
              // Crowdfunding Section Navigation
              <>
                <Link 
                  href="/create" 
                  className={`transition-colors ${
                    pathname === '/create' ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Create Project
                </Link>
                <Link 
                  href="/projects" 
                  className={`transition-colors ${
                    pathname === '/projects' || pathname.startsWith('/project/') 
                      ? 'text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Projects
                </Link>
                <Link 
                  href="/exchange" 
                  className={`transition-colors ${
                    pathname === '/exchange' ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Exchange
                </Link>
                <Link 
                  href="/kyc" 
                  className={`transition-colors ${
                    pathname === '/kyc' ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Identity
                </Link>
                {isConnected && (
                  <Link 
                    href="/admin" 
                    className={`transition-colors ${
                      pathname.startsWith('/admin') ? 'text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Side: KYC Badge + Connect Button */}
          <div className="flex items-center gap-3">
            {isConnected && <KYCBadge />}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}