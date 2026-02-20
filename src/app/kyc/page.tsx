// src/app/kyc/page.tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import LivenessCheck from '@/components/LivenessCheck';
import { DOCUMENT_TYPES } from '@/lib/documentValidation';
import { useKYCForm } from '@/hooks/useKYCForm';
import { useChainConfig } from '@/hooks/useChainConfig';
import { useChainId, useAccount } from 'wagmi';
import {
  OCRProgressBar,
  ErrorDisplay,
  DragDropZone,
  DocumentTypeSelector,
  DocumentCaptureCard,
  ValidationResultDisplay,
  MobileCamera,
} from '@/components/kyc/KYCComponents';
import {
  TIER_NAMES,
  STATUS_NAMES,
  REJECTION_REASONS,
  MAX_TIER_INDEX,
  isMobileDevice,
} from '@/types/kyc';

// Reusable component for showing already-verified items
const VerifiedBadge = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
    <div className="flex items-center gap-2 text-green-400">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">{title}</span>
    </div>
    <p className="text-sm text-gray-400 mt-1">{description}</p>
  </div>
);

// Network indicator component
const NetworkIndicator = ({ 
  chainName, 
  isTestnet, 
  nativeCurrency,
  explorerUrl,
  contractAddress
}: { 
  chainName: string; 
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
  contractAddress?: string;
}) => (
  <div className={`rounded-xl p-4 mb-6 border ${
    isTestnet 
      ? 'bg-yellow-500/10 border-yellow-500/30' 
      : 'bg-green-500/10 border-green-500/30'
  }`}>
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
        <div>
          <span className={`font-medium ${isTestnet ? 'text-yellow-400' : 'text-green-400'}`}>
            {chainName}
          </span>
          {isTestnet && (
            <span className="ml-2 text-xs text-yellow-400/70">(Testnet)</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Gas: <span className="text-white">{nativeCurrency}</span>
        </span>
        {contractAddress && (
          <a
            href={`${explorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            View Contract
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  </div>
);

export default function KYCPage() {
  const form = useKYCForm();
  const isMobile = isMobileDevice();
  
  // Wagmi hooks for wallet chain detection
  const walletChainId = useChainId();
  const { isConnected } = useAccount();
  
  // Chain config for multichain support
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  // Get KYC manager contract address
  const kycManagerAddress = contracts?.KYCManager;

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // ======================================
  // RENDER HELPERS
  // ======================================

  const renderCurrentTierBanner = () => {
    if (form.effectiveApprovedTier === 0 && !form.isPending) return null;

    const tierConfig = form.TIER_CONFIG[form.effectiveApprovedTier] || form.TIER_CONFIG[0];

    if (form.effectiveApprovedTier === 0 && form.isPending) {
      const pendingTierConfig = form.TIER_CONFIG[form.pendingRequestedTier || 1];
      return (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{pendingTierConfig.icon}</div>
            <div>
              <h2 className="text-xl font-semibold text-yellow-400">
                {pendingTierConfig.name} Application Under Review
              </h2>
              <p className="text-gray-400 mt-1">
                Your application is being processed. This usually takes a few minutes.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl p-6 mb-8 ${tierConfig.bgColor} border ${tierConfig.borderColor}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{tierConfig.icon}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-2xl font-bold ${tierConfig.color}`}>
                  {tierConfig.name} Tier
                </h2>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                  ✓ Verified
                </span>
              </div>
              <p className="text-gray-400 mt-1">
                Investment limit: {tierConfig.limit}
              </p>
              {form.kycData?.expiresAt && (
                <p className="text-gray-500 text-sm mt-1">
                  Expires: {new Date(form.kycData.expiresAt * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {form.effectiveApprovedTier < MAX_TIER_INDEX && !form.isPending && form.upgradeStep === 'select' && (
            <button
              onClick={() => form.handleTierSelect(form.effectiveApprovedTier + 1)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              Upgrade Tier
            </button>
          )}

          {form.isPending && form.pendingRequestedTier && (
            <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Upgrading to {TIER_NAMES[form.pendingRequestedTier]}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPendingBanner = () => {
    if (!form.isPending || !form.pendingRequestedTier) return null;

    const pendingTierConfig = form.TIER_CONFIG[form.pendingRequestedTier];
    const statusName = STATUS_NAMES[form.kycData?.status || 0];

    return (
      <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <svg className="w-6 h-6 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
              {pendingTierConfig.icon} {pendingTierConfig.name} Verification In Progress
            </h3>
            <p className="text-gray-300 mt-1">
              Your application for {pendingTierConfig.name} tier is currently being reviewed.
              Status: <span className="font-medium">{statusName}</span>
            </p>
            {form.effectiveApprovedTier > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                You remain at <span className={form.TIER_CONFIG[form.effectiveApprovedTier].color}>
                  {form.TIER_CONFIG[form.effectiveApprovedTier].name}
                </span> tier during this process.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRejectionBanner = () => {
    if (!form.isRejected) return null;

    const rejectionReason = REJECTION_REASONS[form.kycData?.rejectionReason || 9];
    const attemptedTier = form.kycData?.requestedLevel || 1;
    const attemptedTierConfig = form.TIER_CONFIG[attemptedTier];

    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-red-400">
              {attemptedTierConfig.icon} {attemptedTierConfig.name} Application Rejected
            </h3>
            <p className="text-gray-300 mt-1">
              Reason: <span className="font-medium">{rejectionReason}</span>
            </p>
            {form.wasUpgradeRejected && form.effectiveApprovedTier > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                Your <span className={form.TIER_CONFIG[form.effectiveApprovedTier].color}>
                  {form.TIER_CONFIG[form.effectiveApprovedTier].name}
                </span> tier remains active. You can retry the upgrade.
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => form.handleTierSelect(attemptedTier)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
              >
                Retry Application
              </button>
              {form.effectiveApprovedTier < MAX_TIER_INDEX - 1 && (
                <button
                  onClick={() => form.setUpgradeStep('select')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Choose Different Tier
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTierSelection = () => {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          {form.hasAnyPendingRequest
            ? 'Upgrade In Progress'
            : form.effectiveApprovedTier > 0
              ? 'Upgrade Your Verification'
              : 'Select Verification Tier'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((tierIndex) => {
            const tierConfig = form.TIER_CONFIG[tierIndex];

            const isCurrentApprovedTier = form.effectiveApprovedTier === tierIndex;
            const isCompletedTier = form.effectiveApprovedTier > tierIndex;
            
            // Check if this tier is pending (either initial or upgrade)
            const isPendingThisTier = 
              (form.isPending && form.pendingRequestedTier === tierIndex) || 
              (form.hasPendingUpgrade && form.pendingUpgradeTier === tierIndex);
            
            const isAboveCurrentTier = tierIndex > form.effectiveApprovedTier;
            
            // Can only select if above current tier AND no pending requests at all
            const canSelectThisTier = isAboveCurrentTier && !form.hasAnyPendingRequest;

            return (
              <div
                key={tierIndex}
                className={`relative rounded-2xl p-6 border-2 transition-all flex flex-col h-full ${
                  isCurrentApprovedTier
                    ? `${tierConfig.bgColor} ${tierConfig.borderColor} ring-2 ring-green-500/50`
                    : isPendingThisTier
                    ? `${tierConfig.bgColor} ${tierConfig.borderColor} ring-2 ring-yellow-500/50`
                    : isCompletedTier
                    ? 'bg-gray-800/50 border-gray-600'
                    : canSelectThisTier
                    ? `${tierConfig.bgColor} ${tierConfig.borderColor} hover:ring-2 hover:ring-purple-500/50 cursor-pointer`
                    : 'bg-gray-800/30 border-gray-700 opacity-50'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute -top-3 -right-3">
                  {isCurrentApprovedTier && (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                      ✓ CURRENT
                    </span>
                  )}
                  {isPendingThisTier && (
                    <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full shadow-lg animate-pulse">
                      UNDER REVIEW
                    </span>
                  )}
                  {isCompletedTier && (
                    <span className="px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded-full shadow-lg">
                      ✓ COMPLETED
                    </span>
                  )}
                </div>

                {/* Tier Info */}
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{tierConfig.icon}</div>
                  <h3 className={`text-xl font-bold ${tierConfig.color}`}>
                    {tierConfig.name}
                  </h3>
                  <p className="text-2xl font-bold text-white mt-2">
                    {tierConfig.limit}
                  </p>
                  <p className="text-gray-400 text-sm">investment limit</p>
                </div>

                {/* Requirements */}
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-3">Requirements:</p>
                  <ul className="space-y-2">
                    {tierConfig.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className={isCompletedTier || isCurrentApprovedTier ? 'text-green-400' : tierConfig.color}>
                          {isCompletedTier || isCurrentApprovedTier ? '✓' : '•'}
                        </span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  {isCurrentApprovedTier && (
                    <div className="text-center text-green-400 font-medium py-3">
                      ✓ Your Current Tier
                    </div>
                  )}
                  {isPendingThisTier && (
                    <div className="text-center text-yellow-400 font-medium py-3 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Pending Review
                    </div>
                  )}
                  {isCompletedTier && (
                    <div className="text-center text-gray-500 font-medium py-3">
                      ✓ Completed
                    </div>
                  )}
                  {canSelectThisTier && (
                    <button
                      onClick={() => form.handleTierSelect(tierIndex)}
                      className="w-full py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                    >
                      {form.effectiveApprovedTier > 0 ? `Upgrade to ${tierConfig.name}` : `Get ${tierConfig.name}`}
                    </button>
                  )}
                  {isAboveCurrentTier && form.hasAnyPendingRequest && !isPendingThisTier && (
                    <div className="text-center text-gray-500 font-medium py-3 text-sm">
                      Complete current upgrade first
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderForm = () => {
    const targetTierConfig = form.TIER_CONFIG[form.selectedTier];
    const docConfig = DOCUMENT_TYPES[form.documentType];
    
    // Get requirements with verification status
    const requirementsWithStatus = form.requirementsWithStatus || [];
    const newRequirements = requirementsWithStatus.filter(r => !r.verified);
    const alreadyVerified = requirementsWithStatus.filter(r => r.verified);

    return (
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <div className={`rounded-2xl p-6 mb-8 ${targetTierConfig.bgColor} border ${targetTierConfig.borderColor}`}>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{targetTierConfig.icon}</div>
            <div>
              <h2 className={`text-2xl font-bold ${targetTierConfig.color}`}>
                {form.isUpgrade ? `Upgrade to ${targetTierConfig.name}` : `Apply for ${targetTierConfig.name}`}
              </h2>
              <p className="text-gray-400 mt-1">
                Investment limit: {targetTierConfig.limit}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
            {/* New requirements needed */}
            {newRequirements.length > 0 && (
              <div>
                <p className="text-amber-400 text-sm font-medium mb-2">Required for this {form.isUpgrade ? 'upgrade' : 'tier'}:</p>
                <div className="flex flex-wrap gap-2">
                  {newRequirements.map((req, idx) => (
                    <span key={idx} className="px-3 py-1 bg-amber-500/20 text-amber-300 text-sm rounded-full border border-amber-500/30">
                      {req.requirement}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Already verified from previous tier */}
            {alreadyVerified.length > 0 && (
              <div>
                <p className="text-green-400 text-sm font-medium mb-2">✓ Already verified:</p>
                <div className="flex flex-wrap gap-2">
                  {alreadyVerified.map((req, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full border border-green-500/30">
                      ✓ {req.requirement}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={form.handleBackToSelect}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tier selection
        </button>

        {/* Error display */}
        {(form.formError || form.submissionError) && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400">{form.formError || form.submissionError}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Personal Information Section */}
          {form.upgradeRequirements.needsPersonalInfo && (
            <>
              {form.verifiedDocuments?.idDocument ? (
                <VerifiedBadge
                  title="Personal Information Already Verified"
                  description="Your personal information was verified at a previous tier."
                />
              ) : (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-blue-400">👤</span>
                    Personal Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => form.setFullName(e.target.value)}
                        placeholder="Enter your full legal name"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                      <p className="text-gray-500 text-xs mt-1">As it appears on your ID document</p>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email Address *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => form.setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Date of Birth *</label>
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => form.setDateOfBirth(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Country *</label>
                      <select
                        value={form.countryCode}
                        onChange={(e) => form.setCountryCode(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                        disabled={form.countriesLoading}
                      >
                        <option value={0}>Select your country</option>
                        {form.countries.filter(c => !c.blocked).map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Document Number <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.documentNumber}
                        onChange={(e) => form.setDocumentNumber(e.target.value.toUpperCase())}
                        placeholder="e.g., AB1234567"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Document Expiry Date <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => form.setExpiryDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ID Document Section */}
          {form.upgradeRequirements.needsIdDocument && (
            <>
              {form.verifiedDocuments?.idDocument ? (
                <VerifiedBadge
                  title="ID Document Already Verified"
                  description="Your identity document was verified at a previous tier."
                />
              ) : (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-400">🪪</span>
                    Government-Issued ID *
                  </h3>

                  {/* Info message */}
                  {(!form.fullName.trim() || !form.dateOfBirth || !form.countryCode) && (
                    <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-400 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fill in your personal information above first, then upload your document.
                      </p>
                    </div>
                  )}

                  <DocumentTypeSelector
                    selectedType={form.documentType}
                    onSelect={form.handleDocumentTypeChange}
                  />

                  <div className={`grid gap-4 ${docConfig.requiresBack ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-sm'}`}>
                    <DocumentCaptureCard
                      side="front"
                      preview={form.documentCapture.frontPreview}
                      documentType={form.documentType}
                      isRequired={true}
                      isValidating={form.isValidatingId}
                      ocrProgress={form.ocrProgress}
                      validationResult={form.idValidation}
                      validationError={form.validationError}
                      onFileSelect={(file) => form.handleDocumentFileCapture('front', file)}
                      onWebcamCapture={() => form.setWebcamCapture({ isOpen: true, side: 'front' })}
                      onRotate={() => form.handleRotateImage('front')}
                      onRemove={() => form.handleRemoveImage('front')}
                      onRetry={form.handleRetryValidation}
                    />

                    {docConfig.requiresBack && (
                      <DocumentCaptureCard
                        side="back"
                        preview={form.documentCapture.backPreview}
                        documentType={form.documentType}
                        isRequired={true}
                        isValidating={form.isValidatingId}
                        ocrProgress={form.ocrProgress}
                        validationResult={form.idValidation}
                        validationError={form.validationError}
                        onFileSelect={(file) => form.handleDocumentFileCapture('back', file)}
                        onWebcamCapture={() => form.setWebcamCapture({ isOpen: true, side: 'back' })}
                        onRotate={() => form.handleRotateImage('back')}
                        onRemove={() => form.handleRemoveImage('back')}
                        onRetry={form.handleRetryValidation}
                      />
                    )}
                  </div>

                  {/* Validation Section */}
                  {form.documentCapture.front && (
                    <div className="mt-6">
                      {/* Missing info message */}
                      {!form.canValidate && !form.isValidatingId && !form.idValidation && (
                        <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                          <p className="text-gray-400 text-sm mb-3">Before validating, please provide:</p>
                          <ul className="space-y-2">
                            {!form.fullName.trim() && (
                              <li className="flex items-center gap-2 text-yellow-400 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Your full name (as it appears on the document)
                              </li>
                            )}
                            {!form.dateOfBirth && (
                              <li className="flex items-center gap-2 text-yellow-400 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Your date of birth
                              </li>
                            )}
                            {!form.countryCode && (
                              <li className="flex items-center gap-2 text-yellow-400 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Your country
                              </li>
                            )}
                            {form.documentRequiresBack && !form.documentCapture.back && (
                              <li className="flex items-center gap-2 text-yellow-400 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Back side of your document
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Ready to validate */}
                      {form.canValidate && !form.isValidatingId && !form.idValidation && (
                        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                              <h4 className="text-white font-medium flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Ready to Validate
                              </h4>
                              <p className="text-gray-400 text-sm mt-1">
                                We'll verify that "{form.fullName}" and your date of birth appear on the document.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={form.handleValidateDocument}
                              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Validate Document
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Validation in progress */}
                      {form.isValidatingId && (
                        <div className="p-4 bg-gray-900/50 border border-purple-500/30 rounded-xl">
                          <OCRProgressBar progress={form.ocrProgress} />
                        </div>
                      )}

                      {/* Validation Results - Simplified */}
                      {form.idValidation && (
                        <ValidationResultDisplay
                          result={form.idValidation}
                          documentNumber={form.documentNumber}
                          onReset={form.resetValidation}
                        />
                      )}
                    </div>
                  )}

                  <p className="text-gray-500 text-xs mt-3">
                    Accepted formats: JPG, PNG, WebP, or PDF. Maximum file size: 10MB.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Selfie Section */}
          {form.upgradeRequirements.needsSelfie && (
            <>
              {form.verifiedDocuments?.selfie ? (
                <VerifiedBadge
                  title="Selfie Already Verified"
                  description="Your selfie was verified at a previous tier."
                />
              ) : (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-green-400">🤳</span>
                    Selfie Photo *
                  </h3>

                  <DragDropZone
                    onFileDrop={(file) => form.handleSelfieUpload(file)}
                    accept="image/*"
                    disabled={!!form.selfiePreview}
                    className="mb-4"
                  >
                    {form.selfiePreview ? (
                      <div className="relative">
                        <div className={`aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border-2 ${
                          form.faceDetectionStatus === 'success' ? 'border-green-500' :
                          form.faceDetectionStatus === 'failed' ? 'border-red-500' :
                          form.faceDetectionStatus === 'detecting' ? 'border-yellow-500' :
                          'border-gray-600'
                        }`}>
                          <img src={form.selfiePreview} alt="Selfie" className="w-full h-full object-cover" />

                          {form.faceDetectionStatus === 'detecting' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="text-center">
                                <svg className="w-10 h-10 animate-spin text-yellow-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-white text-sm">Detecting face...</p>
                              </div>
                            </div>
                          )}

                          {form.faceDetectionStatus !== 'detecting' && form.faceDetectionStatus !== 'idle' && (
                            <div className={`absolute top-2 right-2 p-1.5 rounded-full ${
                              form.faceDetectionStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {form.faceDetectionStatus === 'success' ? (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>

                        {form.faceDetectionStatus === 'success' && form.faceScore > 0 && (
                          <div className="mt-3 text-center">
                            <p className="text-green-400 text-sm">Face detected with {form.faceScore}% confidence</p>
                          </div>
                        )}

                        <div className="flex justify-center mt-3">
                          <button
                            type="button"
                            onClick={() => form.handleSelfieUpload(null)}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove & Retake
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="aspect-square max-w-xs mx-auto bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
                        onClick={() => document.getElementById('selfie-input')?.click()}
                      >
                        <svg className="w-12 h-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-gray-400">Upload selfie</p>
                        <p className="text-gray-500 text-sm mt-1">or drag and drop</p>
                      </div>
                    )}
                  </DragDropZone>

                  <input
                    id="selfie-input"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => form.handleSelfieUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {!form.selfiePreview && (
                    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={() => document.getElementById('selfie-input')?.click()}
                        className="px-4 py-2.5 text-sm font-medium border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {isMobile ? 'Gallery' : 'Upload'}
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setSelfieWebcam(true)}
                        className="px-4 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Camera
                      </button>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <p className="text-gray-400 text-sm">Tips for a good selfie:</p>
                    <ul className="text-gray-500 text-xs mt-2 space-y-1">
                      <li>• Good lighting, face clearly visible</li>
                      <li>• Look directly at the camera</li>
                      <li>• No sunglasses or hats</li>
                      <li>• Plain background preferred</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Liveness Check Section */}
          {form.upgradeRequirements.needsLiveness && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-blue-400">🎥</span>
                Liveness Check *
              </h3>

              {form.livenessResult ? (
                <div className={`p-4 rounded-xl border ${
                  form.livenessResult.passed
                    ? 'bg-green-900/20 border-green-500/50'
                    : 'bg-red-900/20 border-red-500/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${form.livenessResult.passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {form.livenessResult.passed ? (
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className={`font-medium ${form.livenessResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {form.livenessResult.passed ? 'Liveness Verified' : 'Liveness Check Failed'}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        Score: {form.livenessResult.score}% • {form.livenessResult.completedChallenges}/{form.livenessResult.totalChallenges} challenges completed
                      </p>
                    </div>
                  </div>

                  {!form.livenessResult.passed && (
                    <button
                      type="button"
                      onClick={() => {
                        form.setShowLivenessModal(true);
                      }}
                      className="mt-4 w-full py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Retry Liveness Check
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-4">
                    Complete a quick liveness check to verify you're a real person. You'll need to follow some simple instructions on screen.
                  </p>
                  <button
                    type="button"
                    onClick={() => form.setShowLivenessModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Start Liveness Check
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Proof of Address Section */}
          {form.upgradeRequirements.needsAddressProof && (
            <>
              {form.verifiedDocuments?.addressProof ? (
                <VerifiedBadge
                  title="Proof of Address Already Verified"
                  description="Your address proof was verified at a previous tier."
                />
              ) : (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">🏠</span>
                    Proof of Address *
                  </h3>

                  <DragDropZone
                    onFileDrop={(file) => form.handleFileChange(form.setAddressProof, file)}
                    accept="image/*,.pdf"
                    disabled={!!form.addressProof}
                  >
                    {form.addressProof ? (
                      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium truncate max-w-[200px]">{form.addressProof.name}</p>
                            <p className="text-gray-400 text-sm">{(form.addressProof.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => form.setAddressProof(null)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500 transition-colors">
                        <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-gray-500 text-sm mt-1">PDF, JPG, PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => form.handleFileChange(form.setAddressProof, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </DragDropZone>

                  <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <p className="text-gray-400 text-sm">Accepted documents:</p>
                    <ul className="text-gray-500 text-xs mt-2 space-y-1">
                      <li>• Utility bill (electricity, water, gas) - less than 3 months old</li>
                      <li>• Bank statement - less than 3 months old</li>
                      <li>• Government-issued document with address</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Accredited Investor Section */}
          {form.upgradeRequirements.needsAccreditedProof && (
            <>
              {form.verifiedDocuments?.accreditedProof ? (
                <VerifiedBadge
                  title="Accredited Status Already Verified"
                  description="Your accredited investor status was verified at a previous tier."
                />
              ) : (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-cyan-400">💎</span>
                    Accredited Investor Documentation *
                  </h3>

                  <DragDropZone
                    onFileDrop={(file) => form.handleFileChange(form.setAccreditedProof, file)}
                    accept="image/*,.pdf"
                    disabled={!!form.accreditedProof}
                  >
                    {form.accreditedProof ? (
                      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium truncate max-w-[200px]">{form.accreditedProof.name}</p>
                            <p className="text-gray-400 text-sm">{(form.accreditedProof.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => form.setAccreditedProof(null)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500 transition-colors">
                        <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-gray-500 text-sm mt-1">PDF, JPG, PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => form.handleFileChange(form.setAccreditedProof, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </DragDropZone>

                  <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <p className="text-gray-400 text-sm">Accepted documentation:</p>
                    <ul className="text-gray-500 text-xs mt-2 space-y-1">
                      <li>• CPA letter verifying income/net worth</li>
                      <li>• Brokerage statements</li>
                      <li>• Tax returns (Schedule K-1)</li>
                      <li>• Professional certification documents</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Terms and Submit */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.termsAgreed}
                onChange={(e) => form.setTermsAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
              />
              <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                I certify that all information provided is accurate and I agree to the{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                  Privacy Policy
                </Link>
                . I understand that providing false information may result in rejection and potential legal consequences.
              </span>
            </label>

            <button
              type="button"
              onClick={form.handleSubmit}
              disabled={!form.termsAgreed || form.isWritePending || form.isTxLoading}
              className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {form.isWritePending || form.isTxLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Submit Application
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSigning = () => {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-8">
          <svg className="w-20 h-20 mx-auto text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Waiting for Signature</h2>
        <p className="text-gray-400 mb-8">
          Please confirm the transaction in your wallet to submit your KYC application.
        </p>
        <div className="flex justify-center">
          <div className="px-6 py-3 bg-gray-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-300">Awaiting confirmation...</span>
          </div>
        </div>
      </div>
    );
  };

  const renderProcessing = () => {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-8">
          <svg className="w-20 h-20 mx-auto text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Processing Application</h2>
        <p className="text-gray-400 mb-4">
          Your documents are being verified. This usually takes a few moments.
        </p>
        {form.txHash && (
          <a
            href={`${explorerUrl}/tx/${form.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            View transaction
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    );
  };

  const renderSubmitted = () => {
    const tierConfig = form.TIER_CONFIG[form.selectedTier];
    const isAutoApproved = form.submissionResult?.autoApproved;
    const verificationScore = form.submissionResult?.verificationScore ?? form.idValidation?.confidence ?? 0;

    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-8">
          {isAutoApproved ? (
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          {isAutoApproved ? 'Verification Complete!' : 'Application Submitted'}
        </h2>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${tierConfig.bgColor} ${tierConfig.borderColor} border`}>
          <span className="text-2xl">{tierConfig.icon}</span>
          <span className={`font-bold ${tierConfig.color}`}>{tierConfig.name} Tier</span>
          {isAutoApproved && (
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              ✓ Verified
            </span>
          )}
        </div>

        <p className="text-gray-400 mb-6">
          {isAutoApproved
            ? `Congratulations! Your ${tierConfig.name} verification has been approved. You can now invest up to ${tierConfig.limit}.`
            : `Your application for ${tierConfig.name} tier is being reviewed. You'll be notified once the review is complete.`
          }
        </p>

        {/* Verification Score - Always show if we have a score */}
        {verificationScore > 0 && (
          <div className="mb-6 p-4 bg-gray-800 rounded-xl">
            <p className="text-gray-400 text-sm mb-2">Verification Score</p>
            <div className="flex items-center justify-center gap-3">
              <div className="h-3 flex-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    verificationScore >= 80 ? 'bg-green-500' :
                    verificationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${verificationScore}%` }}
                />
              </div>
              <span className={`font-bold ${
                verificationScore >= 80 ? 'text-green-400' :
                verificationScore >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {verificationScore}%
              </span>
            </div>
          </div>
        )}

        {/* Validation Details Summary */}
        {form.idValidation && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl text-left">
            <p className="text-gray-400 text-sm mb-3 text-center">Verification Details</p>
            <div className="space-y-2 text-sm">
              {form.idValidation.foundText?.name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="text-green-400">✓ Verified</span>
                </div>
              )}
              {form.idValidation.foundText?.dateOfBirth && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth</span>
                  <span className="text-green-400">✓ Verified</span>
                </div>
              )}
              {form.idValidation.foundText?.country && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Country</span>
                  <span className="text-green-400">✓ Verified</span>
                </div>
              )}
              {form.idValidation.foundText?.documentNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Document Number</span>
                  <span className="text-green-400">✓ Verified</span>
                </div>
              )}
              {form.idValidation.foundText?.expiry && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiry Date</span>
                  <span className={form.idValidation.matches?.expiry?.isValid ? 'text-green-400' : 'text-red-400'}>
                    {form.idValidation.matches?.expiry?.isValid ? '✓ Valid' : '✗ Expired'}
                  </span>
                </div>
              )}
              {form.idValidation.mrzDetected && (
                <div className="flex justify-between">
                  <span className="text-gray-500">MRZ</span>
                  <span className="text-blue-400">✓ Detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {form.txHash && (
          <a
            href={`${explorerUrl}/tx/${form.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-6"
          >
            View transaction
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        <button
          onClick={() => {
            form.setUpgradeStep('select');
            form.refreshKYC();
          }}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    );
  };

  // ======================================
  // MAIN RENDER
  // ======================================

  if (!form.isConnected) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-24 pb-12 px-4">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400">
              Please connect your wallet to access KYC verification.
            </p>
          </div>
        </main>
      </>
    );
  }

  // Network not supported
  if (!isDeployed) {
    const deployedChains = getDeployedChains();
    
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-24 pb-12 px-4">
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Network Not Supported</h2>
            <p className="text-gray-400 mb-8">
              KYC verification is not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleSwitchNetwork(chain.chainId)}
                  disabled={isSwitching}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isSwitching && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {chain.name}
                  {chain.isTestnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-24 pb-12 px-4">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Wrong Network</h2>
            <p className="text-gray-400 mb-8">
              Please switch to {chainName} to continue with KYC verification.
            </p>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              {isSwitching && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Switch to {chainName}
            </button>
          </div>
        </main>
      </>
    );
  }

  if (form.kycLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-24 pb-12 px-4">
          <div className="max-w-md mx-auto text-center py-12">
            <svg className="w-12 h-12 mx-auto text-purple-400 animate-spin mb-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading KYC status from {chainName}...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              KYC Verification
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Complete identity verification to unlock higher investment limits and access premium features.
            </p>
          </div>

          {/* Network Indicator */}
          <NetworkIndicator
            chainName={chainName}
            isTestnet={isTestnet}
            nativeCurrency={nativeCurrency}
            explorerUrl={explorerUrl}
            contractAddress={kycManagerAddress}
          />

          {/* Status Banners */}
          {renderCurrentTierBanner()}
          {renderPendingBanner()}
          {renderRejectionBanner()}

          {/* Main Content */}
          {form.upgradeStep === 'select' && renderTierSelection()}
          {form.upgradeStep === 'form' && renderForm()}
          {form.upgradeStep === 'signing' && renderSigning()}
          {form.upgradeStep === 'processing' && renderProcessing()}
          {form.upgradeStep === 'submitted' && renderSubmitted()}
        </div>
      </main>

      {/* Webcam Capture Modal */}
      {form.webcamCapture?.isOpen && (
        <MobileCamera
          documentType={form.documentType}
          side={form.webcamCapture.side}
          forSelfie={false}
          onCapture={form.handleWebcamCaptureComplete}
          onClose={() => form.setWebcamCapture(null)}
        />
      )}

      {/* Selfie Webcam Modal */}
      {form.selfieWebcam && (
        <MobileCamera
          documentType={form.documentType}
          side="front"
          forSelfie={true}
          onCapture={form.handleSelfieWebcamCapture}
          onClose={() => form.setSelfieWebcam(false)}
        />
      )}

      {/* Liveness Check Modal */}
      {form.showLivenessModal && (
        <LivenessCheck
          onComplete={form.handleLivenessComplete}
          onCancel={form.handleLivenessCancel}
        />
      )}
    </>
  );
}
