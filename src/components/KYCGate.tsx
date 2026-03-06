'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useKYC, KYCTier, getTierInfo, meetsMinimumTier } from '@/contexts/KYCContext';

interface KYCGateProps {
  children: ReactNode;
  requiredTier?: KYCTier;
  requireApproved?: boolean;
  action?: string; // Description of what the user is trying to do
}

export default function KYCGate({ 
  children, 
  requiredTier = 'Bronze',
  requireApproved = true,
  action = 'access this feature'
}: KYCGateProps) {
  const { isConnected } = useAccount();
  const { kycData, tierInfo } = useKYC();

  // Not connected - show connect prompt
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400 text-center mb-6">
          Please connect your wallet to {action}.
        </p>
      </div>
    );
  }

  // Loading KYC status
  if (kycData.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Checking KYC status...</p>
      </div>
    );
  }

  // KYC not approved
  if (requireApproved && kycData.status !== 'Approved') {
    const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(kycData.status);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">
            {isPending ? '⏳' : kycData.status === 'Rejected' ? '❌' : '🔒'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isPending ? 'Verification In Progress' : 
             kycData.status === 'Rejected' ? 'Verification Failed' :
             'KYC Required'}
          </h2>
          <p className="text-gray-400 mb-6">
            {isPending 
              ? `Your KYC verification is being processed. Please wait for approval to ${action}.`
              : kycData.status === 'Rejected'
              ? `Your KYC application was rejected. Please resubmit with correct information to ${action}.`
              : `You need to complete KYC verification to ${action}.`
            }
          </p>
          <Link
            href="/kyc"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {isPending ? 'View Status' : 'Start Verification'}
          </Link>
        </div>
      </div>
    );
  }

  // Check tier requirement
  if (!meetsMinimumTier(kycData.tier, requiredTier)) {
    const requiredTierInfo = getTierInfo(requiredTier);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-4xl">{tierInfo.icon}</span>
            <span className="text-2xl text-gray-500">→</span>
            <span className="text-4xl">{requiredTierInfo.icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {requiredTierInfo.label} Tier Required
          </h2>
          <p className="text-gray-400 mb-4">
            You need <span className={requiredTierInfo.color}>{requiredTierInfo.label}</span> tier 
            or higher to {action}.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-500 mb-2">Your Current Tier</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{tierInfo.icon}</span>
              <span className={`text-xl font-bold ${tierInfo.color}`}>{tierInfo.label}</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Limit: {tierInfo.limit}
            </div>
          </div>
          <Link
            href="/kyc"
            className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all"
          >
            Upgrade to {requiredTierInfo.label}
          </Link>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}
