// src/components/Header.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './ConnectButton';
import { useAccount } from 'wagmi';
import { useKYC, getTierInfo, KYCTier } from '@/contexts/KYCContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { ChainSelectorModal } from './ui/ChainSelectorModal';

// KYC Badge Component
function KYCBadge() {
  const { kycData, tierInfo, formatLimit } = useKYC();
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
        <span className="text-sm font-medium hidden sm:inline">{getStatusLabel()}</span>
        {isApproved && kycData.tier !== 'None' && (
          <span className="text-xs opacity-70 hidden md:inline">
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

// Mobile Menu Item with dropdown support
function MobileDropdown({ 
  label, 
  items,
  onItemClick
}: { 
  label: string; 
  items: { href: string; label: string; description?: string }[];
  onItemClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className="flex items-center justify-between w-full py-2 text-gray-300 hover:text-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 mt-1 space-y-1 border-l border-gray-700">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-gray-400 hover:text-white transition-colors"
              onClick={onItemClick}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  
  // Use the admin hook instead of hardcoded addresses
  const { isAdmin, isSuperAdmin, isLoading: isAdminLoading } = useAdmin();

  // Determine current section for active states
  const isAboutSection = pathname.startsWith('/about') || pathname === '/contact';
  const isLetsStartSection = pathname.startsWith('/tokenize') || pathname.startsWith('/crowdfunding') || pathname.startsWith('/trade');
  const isPlatformSection = pathname === '/exchange' || pathname === '/projects' || pathname.startsWith('/project/') || pathname === '/create' || pathname === '/kyc';

  // Menu items
  const aboutItems = [
    { href: '/about/company', label: 'Company', description: 'Our mission and vision' },
    { href: '/about/team', label: 'Team', description: 'Meet our experts' },
    { href: '/about/rwa-tokenization', label: 'What is RWA Tokenization?', description: 'Learn about asset tokenization' },
    { href: '/contact', label: 'Contact', description: 'Get in touch with us' },
  ];

  const letsStartItems = [
    { href: '/tokenize', label: 'Tokenize Assets', description: 'Create & manage digital assets' },
    { href: '/crowdfunding', label: 'Raise Funds', description: 'Launch a crowdfunding campaign' },
    { href: '/trade', label: 'Trade', description: 'B2B trade platform (Coming soon)' },
  ];

  const platformItems = [
    { href: '/exchange', label: 'Exchange', description: 'Trade tokenized assets' },
    { href: '/projects', label: 'Projects', description: 'Browse all projects' },
    { href: '/create', label: 'Create Project', description: 'Launch your project' },
    { href: '/kyc', label: 'Identity (KYC)', description: 'Verify your identity' },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logoRWA.png" 
                alt="RWA Experts" 
                width={50}
                height={50}
                className="object-contain"
              />
              <span className="text-xl font-bold text-white hidden sm:inline">RWA Experts</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <DropdownMenu 
                label="About" 
                items={aboutItems}
                isActive={isAboutSection}
              />
              <DropdownMenu 
                label="Let's Start" 
                items={letsStartItems}
                isActive={isLetsStartSection}
              />
              <DropdownMenu 
                label="Platform" 
                items={platformItems}
                isActive={isPlatformSection}
              />
              {/* Admin link - only visible to admins (from database) */}
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className={`flex items-center gap-1 transition-colors ${
                    pathname.startsWith('/admin') ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Admin
                  {isSuperAdmin && (
                    <span className="text-yellow-400 text-xs">★</span>
                  )}
                </Link>
              )}
            </nav>

            {/* Right Side: Chain Badge + KYC Badge + Connect Button + Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* KYC Badge - only when connected */}
              {isConnected && <KYCBadge />}
              
              {/* Connect Button */}
              <ConnectButton />
              
              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-800">
              <nav className="space-y-2">
                <MobileDropdown 
                  label="About" 
                  items={aboutItems}
                  onItemClick={() => setMobileMenuOpen(false)}
                />
                <MobileDropdown 
                  label="Let's Start" 
                  items={letsStartItems}
                  onItemClick={() => setMobileMenuOpen(false)}
                />
                <MobileDropdown 
                  label="Platform" 
                  items={platformItems}
                  onItemClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Network Selector in Mobile Menu */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setChainModalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full py-2 text-gray-300 hover:text-white transition-colors"
                >
                  <span>🔗</span>
                  Switch Network
                </button>
                
                {/* Admin link - only visible to admins */}
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                    {isSuperAdmin && (
                      <span className="text-yellow-400 text-xs">★ Super</span>
                    )}
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Chain Selector Modal */}
      <ChainSelectorModal 
        isOpen={chainModalOpen} 
        onClose={() => setChainModalOpen(false)} 
      />
    </>
  );
}
