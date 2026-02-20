// src/app/admin/kyc/KYCManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Address } from 'viem';
import Header from '@/components/Header';
import { useChainConfig } from '@/hooks/useChainConfig';

// Types
import { 
  StoredSubmission, 
  SearchResult, 
  UpgradeRequest,
  ModalState 
} from './types';

// Hooks
import { useKYCData } from './hooks/useKYCData';
import { useKYCActions } from './hooks/useKYCActions';

// Components
import {
  NetworkBadge,
  NetworkSwitcher,
  ResultMessage,
  StatsCards,
  SearchSection,
  PendingSubmissionsList,
  PendingUpgradesList,
  SettingsSection,
  ApproveModal,
  RejectModal,
  ResetModal,
  ApproveUpgradeModal,
  RejectUpgradeModal,
  Footer,
  NotDeployed
} from './components';

import { Shield, RefreshCw, Loader2, Settings, Users } from 'lucide-react';

export default function KYCManagement() {
  // Wallet connection
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Chain config
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  const kycManagerAddress = contracts?.KYCManager as Address | undefined;
  const currencySymbol = nativeCurrency?.symbol || 'ETH';
  const deployedChains = getDeployedChains();

  // Active tab
  const [activeTab, setActiveTab] = useState<'verify' | 'settings'>('verify');

  // Modal states
  const [modals, setModals] = useState<ModalState>({
    approve: false,
    reject: false,
    reset: false,
    approveUpgrade: false,
    rejectUpgrade: false,
    documentViewer: false,
    updateFee: false,
    updateThreshold: false,
    updateRecipient: false,
    updateTierLimit: false,
    confirmPause: false
  });

  // Selected address for modals
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<StoredSubmission | null>(null);
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeRequest | null>(null);

  // Data hook
  const {
    storedSubmissions,
    pendingSubmissions,
    pendingUpgrades,
    settings,
    isLoadingSubmissions,
    isLoadingSettings,
    isLoadingSearch,
    searchAddress,
    refreshAll
  } = useKYCData({
    publicClient,
    kycManagerAddress,
    chainId,
    isConnected
  });

  // Actions hook
  const {
    isProcessing,
    processingAction,
    result,
    clearResult,
    approveKYC,
    rejectKYC,
    resetKYC,
    approveUpgrade,
    rejectUpgrade,
    updateKYCFee,
    updateAutoVerifyThreshold,
    updateFeeRecipient,
    updateTierInvestmentLimit,
    pauseContract,
    unpauseContract
  } = useKYCActions({
    walletClient,
    publicClient,
    kycManagerAddress,
    chainId,
    chainName,
    explorerUrl,
    onSuccess: refreshAll
  });

  // Modal handlers
  const openApproveModal = (address: string, submission?: StoredSubmission) => {
    setSelectedAddress(address);
    setSelectedSubmission(submission || null);
    setModals(prev => ({ ...prev, approve: true }));
  };

  const openRejectModal = (address: string) => {
    setSelectedAddress(address);
    setModals(prev => ({ ...prev, reject: true }));
  };

  const openResetModal = (address: string) => {
    setSelectedAddress(address);
    setModals(prev => ({ ...prev, reset: true }));
  };

  const openApproveUpgradeModal = (address: string, upgrade?: UpgradeRequest) => {
    setSelectedAddress(address);
    setSelectedUpgrade(upgrade || null);
    setModals(prev => ({ ...prev, approveUpgrade: true }));
  };

  const openRejectUpgradeModal = (address: string, upgrade?: UpgradeRequest) => {
    setSelectedAddress(address);
    setSelectedUpgrade(upgrade || null);
    setModals(prev => ({ ...prev, rejectUpgrade: true }));
  };

  const closeAllModals = () => {
    setModals({
      approve: false,
      reject: false,
      reset: false,
      approveUpgrade: false,
      rejectUpgrade: false,
      documentViewer: false,
      updateFee: false,
      updateThreshold: false,
      updateRecipient: false,
      updateTierLimit: false,
      confirmPause: false
    });
    setSelectedAddress('');
    setSelectedSubmission(null);
    setSelectedUpgrade(null);
  };

  // Action handlers
  const handleApprove = async (tier: number) => {
    const success = await approveKYC(selectedAddress as Address, tier);
    if (success) closeAllModals();
  };

  const handleReject = async (reason: string) => {
    const success = await rejectKYC(selectedAddress as Address, reason);
    if (success) closeAllModals();
  };

  const handleReset = async (reason: string) => {
    const success = await resetKYC(selectedAddress as Address, reason);
    if (success) closeAllModals();
  };

  const handleApproveUpgrade = async () => {
    const success = await approveUpgrade(selectedAddress as Address);
    if (success) closeAllModals();
  };

  const handleRejectUpgrade = async (reason: string) => {
    const success = await rejectUpgrade(selectedAddress as Address, reason);
    if (success) closeAllModals();
  };

  // Search handler
  const handleSearch = async (address: string): Promise<SearchResult | null> => {
    return searchAddress(address);
  };

  // Select from pending list
  const handleSelectPending = (address: string) => {
    // This will trigger a search for the selected address
    handleSearch(address);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to access KYC management.</p>
          </div>
        </main>
      </div>
    );
  }

  // Contract not deployed
  if (!kycManagerAddress) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <NotDeployed
            chainName={chainName}
            deployedChains={deployedChains}
            onSwitch={switchToChain}
            isSwitching={isSwitching}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              KYC Management
            </h1>
            <p className="text-gray-400">Review and manage KYC submissions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <NetworkBadge 
              chainName={chainName} 
              isTestnet={isTestnet} 
            />
            <button
              onClick={refreshAll}
              disabled={isLoadingSubmissions || isLoadingSettings}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoadingSubmissions ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Network Switcher */}
        <div className="mb-6">
          <NetworkSwitcher
            currentChainId={chainId}
            deployedChains={deployedChains}
            isSwitching={isSwitching}
            onSwitch={switchToChain}
          />
        </div>

        {/* Result Message */}
        {result && (
          <ResultMessage
            result={result}
            explorerUrl={explorerUrl}
            onClose={clearResult}
          />
        )}

        {/* Stats Cards */}
        <StatsCards
          pendingSubmissions={pendingSubmissions}
          pendingUpgrades={pendingUpgrades}
          settings={settings}
          currencySymbol={currencySymbol}
        />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'verify'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Verify
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            {/* Search Section */}
            <SearchSection
              onSearch={handleSearch}
              isLoading={isLoadingSearch}
              explorerUrl={explorerUrl}
              currencySymbol={currencySymbol}
              onApprove={openApproveModal}
              onReject={openRejectModal}
              onReset={openResetModal}
              onApproveUpgrade={openApproveUpgradeModal}
              onRejectUpgrade={openRejectUpgradeModal}
            />

            {/* Pending Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendingSubmissionsList
                submissions={pendingSubmissions}
                explorerUrl={explorerUrl}
                onSelect={handleSelectPending}
                isLoading={isLoadingSubmissions}
              />
              <PendingUpgradesList
                upgrades={pendingUpgrades}
                explorerUrl={explorerUrl}
                onSelect={handleSelectPending}
                isLoading={isLoadingSubmissions}
              />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsSection
            settings={settings}
            isLoading={isLoadingSettings}
            currencySymbol={currencySymbol}
            explorerUrl={explorerUrl}
            isProcessing={isProcessing}
            onUpdateFee={updateKYCFee}
            onUpdateThreshold={updateAutoVerifyThreshold}
            onUpdateRecipient={updateFeeRecipient}
            onUpdateTierLimit={updateTierInvestmentLimit}
            onPause={pauseContract}
            onUnpause={unpauseContract}
          />
        )}

        {/* Footer */}
        <Footer
          chainName={chainName}
          chainId={chainId}
          currencySymbol={currencySymbol}
          contractAddress={kycManagerAddress}
          explorerUrl={explorerUrl}
          isTestnet={isTestnet}
        />
      </main>

      {/* Modals */}
      <ApproveModal
        isOpen={modals.approve}
        onClose={closeAllModals}
        address={selectedAddress}
        currentTier={selectedSubmission?.tier || 1}
        onApprove={handleApprove}
        isProcessing={isProcessing}
      />

      <RejectModal
        isOpen={modals.reject}
        onClose={closeAllModals}
        address={selectedAddress}
        onReject={handleReject}
        isProcessing={isProcessing}
      />

      <ResetModal
        isOpen={modals.reset}
        onClose={closeAllModals}
        address={selectedAddress}
        onReset={handleReset}
        isProcessing={isProcessing}
      />

      <ApproveUpgradeModal
        isOpen={modals.approveUpgrade}
        onClose={closeAllModals}
        address={selectedAddress}
        currentTier={selectedUpgrade?.currentTier || 1}
        requestedTier={selectedUpgrade?.requestedTier || 2}
        onApprove={handleApproveUpgrade}
        isProcessing={isProcessing}
      />

      <RejectUpgradeModal
        isOpen={modals.rejectUpgrade}
        onClose={closeAllModals}
        address={selectedAddress}
        currentTier={selectedUpgrade?.currentTier || 1}
        requestedTier={selectedUpgrade?.requestedTier || 2}
        onReject={handleRejectUpgrade}
        isProcessing={isProcessing}
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <div>
              <p className="text-white font-medium">{processingAction || 'Processing...'}</p>
              <p className="text-sm text-gray-400">Please confirm in your wallet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
