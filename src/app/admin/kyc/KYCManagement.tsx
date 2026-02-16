// src/app/admin/kyc/KYCManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { isAddress, parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

// ============================================
// CONSTANTS
// ============================================

const TIER_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

const TIER_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-amber-600',
  2: 'bg-gray-400',
  3: 'bg-yellow-500',
  4: 'bg-purple-500',
};

const STATUS_NAMES: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Expired',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-yellow-500',
  1: 'bg-green-500',
  2: 'bg-red-500',
  3: 'bg-gray-500',
};

const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

const notifyKYCUpdate = () => {
  console.log('[KYCManagement] Dispatching kyc-limits-updated event');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kyc-limits-updated'));
  }
};

// ============================================
// TYPES
// ============================================

interface DocumentUrls {
  idDocumentFrontUrl: string | null;
  idDocumentBackUrl: string | null;
  selfieUrl: string | null;
  addressProofUrl: string | null;
  accreditedProofUrl: string | null;
}

interface DocumentInfo {
  hasIdDocument: boolean;
  hasIdDocumentBack: boolean;
  hasSelfie: boolean;
  hasAddressProof: boolean;
  hasAccreditedProof: boolean;
}

interface ValidationScores {
  faceScore?: number;
  idValidationConfidence?: number;
  idValidationPassed?: boolean;
  livenessScore?: number;
  livenessPassed?: boolean;
}

interface PersonalInfo {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  countryCode?: number;
  documentType?: string;
  documentNumber?: string;
  expiryDate?: string;
}

interface StoredSubmission {
  walletAddress: string;
  currentLevel: number;
  requestedLevel: number;
  submittedAt: number;
  status: string;
  isUpgrade: boolean;
  personalInfo?: PersonalInfo;
  documents: DocumentInfo;
  documentUrls: DocumentUrls;
  validationScores: ValidationScores;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function KYCManagement() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Search state
  const [searchAddress, setSearchAddress] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [upgradeRequest, setUpgradeRequest] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Pending submissions state
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [pendingUpgrades, setPendingUpgrades] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Stored documents state (from file system)
  const [storedSubmissions, setStoredSubmissions] = useState<Map<string, StoredSubmission>>(new Map());

  // Settings state
  const [settings, setSettings] = useState({
    kycFee: 0,
    feeRecipient: '',
    autoVerifyThreshold: 0,
    kycValidityPeriod: 0,
    paused: false,
  });
  const [levelLimits, setLevelLimits] = useState<Record<number, number | 'unlimited'>>({
    1: 0,
    2: 0,
    3: 0,
    4: 'unlimited',
  });

  // UI state
  const [activeSection, setActiveSection] = useState<'verify' | 'settings'>('verify');
  const [activeTab, setActiveTab] = useState<'submissions' | 'upgrades'>('submissions');
  const [isLoading, setIsLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showUpgradeApproveModal, setShowUpgradeApproveModal] = useState(false);
  const [showUpgradeRejectModal, setShowUpgradeRejectModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [approveLevel, setApproveLevel] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');

  // Document viewer modal
  const [documentModal, setDocumentModal] = useState<{ url: string; type: string; name: string } | null>(null);

  // Detail view state
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // Edit state
  const [editFeeRecipient, setEditFeeRecipient] = useState('');
  const [showFeeRecipientEdit, setShowFeeRecipientEdit] = useState(false);

  // Input states
  const [feeInput, setFeeInput] = useState('');
  const [thresholdInput, setThresholdInput] = useState('');
  const [limitInputs, setLimitInputs] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
  });

  // ============================================
  // HELPERS
  // ============================================

  const formatUSD = (value: number | 'unlimited'): string => {
    if (value === 'unlimited') return 'Unlimited';
    if (isNaN(value) || value === 0) return '$0';
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatPOL = (value: number): string => {
    if (isNaN(value) || value === 0) return '0 POL';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }) + ' POL';
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateMs = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fromContractUSD = (value: bigint): number | 'unlimited' => {
    if (value >= MAX_UINT256 / BigInt(2)) return 'unlimited';
    return Number(formatUnits(value, 18));
  };

  const toContractUSD = (value: number): bigint => {
    return parseUnits(value.toString(), 18);
  };

  const getStoredDataForAddress = (addr: string): StoredSubmission | undefined => {
    return storedSubmissions.get(addr.toLowerCase());
  };

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchStoredSubmissions = useCallback(async () => {
    try {
      const response = await fetch('/api/kyc/admin/pending');
      const data = await response.json();
      
      if (data.success) {
        const submissionMap = new Map<string, StoredSubmission>();
        
        data.pendingSubmissions?.forEach((sub: StoredSubmission) => {
          submissionMap.set(sub.walletAddress.toLowerCase(), sub);
        });
        
        data.pendingUpgrades?.forEach((sub: StoredSubmission) => {
          submissionMap.set(sub.walletAddress.toLowerCase(), sub);
        });
        
        setStoredSubmissions(submissionMap);
        console.log('[KYCManagement] Loaded stored submissions:', submissionMap.size);
      }
    } catch (error) {
      console.error('[KYCManagement] Failed to fetch stored submissions:', error);
    }
  }, []);

  const fetchPendingSubmissions = useCallback(async () => {
    if (!publicClient || !CONTRACTS.KYCManager) return;

    setPendingLoading(true);
    try {
      const contractAddress = CONTRACTS.KYCManager as `0x${string}`;

      await fetchStoredSubmissions();

      const pendingAddresses = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingSubmissions',
      }) as `0x${string}`[];

      const submissions = await Promise.all(
        pendingAddresses.map(async (addr) => {
          try {
            const sub = await publicClient.readContract({
              address: contractAddress,
              abi: KYCManagerABI,
              functionName: 'getSubmission',
              args: [addr],
            }) as any;

            return {
              address: addr,
              level: Number(sub.level),
              status: Number(sub.status),
              submittedAt: Number(sub.submittedAt),
              countryCode: Number(sub.countryCode),
              documentHash: sub.documentHash,
            };
          } catch {
            return null;
          }
        })
      );

      setPendingSubmissions(submissions.filter(Boolean));

      const upgradeAddresses = await publicClient.readContract({
        address: contractAddress,
        abi: KYCManagerABI,
        functionName: 'getPendingUpgrades',
      }) as `0x${string}`[];

      const upgrades = await Promise.all(
        upgradeAddresses.map(async (addr) => {
          try {
            const [sub, upgrade] = await Promise.all([
              publicClient.readContract({
                address: contractAddress,
                abi: KYCManagerABI,
                functionName: 'getSubmission',
                args: [addr],
              }),
              publicClient.readContract({
                address: contractAddress,
                abi: KYCManagerABI,
                functionName: 'getUpgradeRequest',
                args: [addr],
              }),
            ]) as [any, any];

            return {
              address: addr,
              currentLevel: Number(sub.level),
              requestedLevel: Number(upgrade.requestedLevel),
              submittedAt: Number(upgrade.submittedAt),
              documentHash: upgrade.documentHash,
            };
          } catch {
            return null;
          }
        })
      );

      setPendingUpgrades(upgrades.filter(Boolean));
    } catch (error) {
      console.error('Error fetching pending:', error);
    } finally {
      setPendingLoading(false);
    }
  }, [publicClient, fetchStoredSubmissions]);

  const fetchSettings = useCallback(async () => {
    if (!publicClient || !CONTRACTS.KYCManager) return;

    try {
      setIsLoading(true);
      const contractAddress = CONTRACTS.KYCManager as `0x${string}`;

      const [feeRaw, recipient, thresholdRaw, validityRaw, paused] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'kycFee',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'feeRecipient',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'autoVerifyThreshold',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'kycValidityPeriod',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'paused',
        }).catch(() => false),
      ]);

      const feeInPOL = Number(formatEther(feeRaw as bigint));
      const thresholdUSD = fromContractUSD(thresholdRaw as bigint);
      const validityDays = Number(validityRaw) / 86400;

      setSettings({
        kycFee: feeInPOL,
        feeRecipient: recipient as string,
        autoVerifyThreshold: thresholdUSD === 'unlimited' ? 0 : thresholdUSD,
        kycValidityPeriod: validityDays,
        paused: paused as boolean,
      });

      setFeeInput(feeInPOL.toString());
      setThresholdInput(thresholdUSD === 'unlimited' ? '0' : thresholdUSD.toString());
      setEditFeeRecipient(recipient as string);

      const limits: Record<number, number | 'unlimited'> = {};
      const limitInputsTemp: Record<number, string> = {};

      for (let level = 1; level <= 4; level++) {
        try {
          const limitRaw = await publicClient.readContract({
            address: contractAddress,
            abi: KYCManagerABI,
            functionName: 'levelInvestmentLimits',
            args: [level],
          }) as bigint;

          const limitUSD = fromContractUSD(limitRaw);
          limits[level] = limitUSD;
          limitInputsTemp[level] = limitUSD === 'unlimited' ? '' : limitUSD.toString();
        } catch (e) {
          limits[level] = 0;
          limitInputsTemp[level] = '0';
        }
      }

      setLevelLimits(limits);
      setLimitInputs(limitInputsTemp);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchSettings();
    fetchPendingSubmissions();
  }, [fetchSettings, fetchPendingSubmissions]);

  // ============================================
  // SEARCH
  // ============================================

  const handleSearch = async () => {
    if (!searchAddress || !publicClient || !CONTRACTS.KYCManager) return;

    if (!isAddress(searchAddress)) {
      setSearchError('Invalid wallet address');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSubmission(null);
    setUpgradeRequest(null);

    try {
      const contractAddress = CONTRACTS.KYCManager as `0x${string}`;

      const [sub, totalInvestedRaw, isValid, upgrade] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'getSubmission',
          args: [searchAddress as `0x${string}`],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'getTotalInvested',
          args: [searchAddress as `0x${string}`],
        }).catch(() => BigInt(0)),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'isKYCValid',
          args: [searchAddress as `0x${string}`],
        }).catch(() => false),
        publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'getUpgradeRequest',
          args: [searchAddress as `0x${string}`],
        }).catch(() => null),
      ]);

      const data = sub as any;

      if (data.investor === '0x0000000000000000000000000000000000000000') {
        setSearchError('No KYC submission found for this address');
        return;
      }

      const totalInvested = fromContractUSD(totalInvestedRaw as bigint);
      const storedData = getStoredDataForAddress(searchAddress);

      setSubmission({
        address: searchAddress,
        investor: data.investor,
        level: Number(data.level),
        status: Number(data.status),
        submittedAt: Number(data.submittedAt),
        reviewedAt: Number(data.reviewedAt),
        expiresAt: Number(data.expiresAt),
        reviewer: data.reviewer,
        documentHash: data.documentHash,
        countryCode: Number(data.countryCode),
        totalInvested: totalInvested === 'unlimited' ? 0 : totalInvested,
        isValid: isValid as boolean,
        storedData,
      });

      if (upgrade) {
        const upgradeData = upgrade as any;
        if (upgradeData.pending) {
          setUpgradeRequest({
            requestedLevel: Number(upgradeData.requestedLevel),
            documentHash: upgradeData.documentHash,
            submittedAt: Number(upgradeData.submittedAt),
          });
        }
      }
    } catch (error: any) {
      setSearchError(error.message || 'Failed to fetch submission');
    } finally {
      setIsSearching(false);
    }
  };

  // ============================================
  // KYC ACTIONS
  // ============================================

  const openApproveModal = (addr: string) => {
    setSelectedAddress(addr);
    setApproveLevel(1);
    setShowApproveModal(true);
  };

  const openRejectModal = (addr: string) => {
    setSelectedAddress(addr);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openResetModal = (addr: string) => {
    setSelectedAddress(addr);
    setShowResetModal(true);
  };

  const handleApprove = async () => {
    if (!walletClient || !selectedAddress || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'approveKYC',
        args: [selectedAddress as `0x${string}`, approveLevel],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      try {
        await fetch('/api/kyc/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: selectedAddress,
            requestedLevel: approveLevel,
            isUpgrade: false,
          }),
        });
      } catch (e) {
        console.error('Failed to update stored status:', e);
      }

      setResult({ type: 'success', message: `KYC approved at ${TIER_NAMES[approveLevel]} level` });
      setShowApproveModal(false);
      setSelectedAddress('');
      setSelectedSubmission(null);
      fetchPendingSubmissions();
      notifyKYCUpdate();

      if (submission?.address === selectedAddress) {
        handleSearch();
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to approve' });
    } finally {
      setTxPending(false);
    }
  };

  const handleReject = async () => {
    if (!walletClient || !selectedAddress || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'rejectKYC',
        args: [selectedAddress as `0x${string}`, rejectReason || 'Rejected by admin'],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      try {
        await fetch('/api/kyc/admin/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: selectedAddress,
            isUpgrade: false,
            reason: rejectReason || 'Rejected by admin',
          }),
        });
      } catch (e) {
        console.error('Failed to update stored status:', e);
      }

      setResult({ type: 'success', message: 'KYC rejected' });
      setShowRejectModal(false);
      setSelectedAddress('');
      setSelectedSubmission(null);
      fetchPendingSubmissions();
      notifyKYCUpdate();

      if (submission?.address === selectedAddress) {
        handleSearch();
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to reject' });
    } finally {
      setTxPending(false);
    }
  };

  const handleReset = async () => {
    if (!walletClient || !selectedAddress || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'resetKYC',
        args: [selectedAddress as `0x${string}`],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setResult({ type: 'success', message: 'KYC reset - user can resubmit' });
      setShowResetModal(false);
      setSelectedAddress('');
      setSubmission(null);
      setUpgradeRequest(null);
      setSearchAddress('');
      setSelectedSubmission(null);
      fetchPendingSubmissions();
      notifyKYCUpdate();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to reset KYC' });
    } finally {
      setTxPending(false);
    }
  };

  // ============================================
  // UPGRADE ACTIONS
  // ============================================

  const openUpgradeApproveModal = (addr: string) => {
    setSelectedAddress(addr);
    setShowUpgradeApproveModal(true);
  };

  const openUpgradeRejectModal = (addr: string) => {
    setSelectedAddress(addr);
    setRejectReason('');
    setShowUpgradeRejectModal(true);
  };

  const handleApproveUpgrade = async () => {
    if (!walletClient || !selectedAddress || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'approveUpgrade',
        args: [selectedAddress as `0x${string}`],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      try {
        await fetch('/api/kyc/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: selectedAddress,
            isUpgrade: true,
          }),
        });
      } catch (e) {
        console.error('Failed to update stored status:', e);
      }

      setResult({ type: 'success', message: 'Upgrade approved' });
      setShowUpgradeApproveModal(false);
      setSelectedAddress('');
      setSelectedSubmission(null);
      fetchPendingSubmissions();
      notifyKYCUpdate();

      if (submission?.address === selectedAddress) {
        handleSearch();
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to approve upgrade' });
    } finally {
      setTxPending(false);
    }
  };

  const handleRejectUpgrade = async () => {
    if (!walletClient || !selectedAddress || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    setResult(null);

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'rejectUpgrade',
        args: [selectedAddress as `0x${string}`, rejectReason || 'Upgrade rejected'],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      try {
        await fetch('/api/kyc/admin/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: selectedAddress,
            isUpgrade: true,
            reason: rejectReason || 'Upgrade rejected',
          }),
        });
      } catch (e) {
        console.error('Failed to update stored status:', e);
      }

      setResult({ type: 'success', message: 'Upgrade rejected (KYC status preserved)' });
      setShowUpgradeRejectModal(false);
      setSelectedAddress('');
      setSelectedSubmission(null);
      fetchPendingSubmissions();
      notifyKYCUpdate();

      if (submission?.address === selectedAddress) {
        handleSearch();
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to reject upgrade' });
    } finally {
      setTxPending(false);
    }
  };

  // ============================================
  // SETTINGS UPDATES
  // ============================================

  const updateKYCFee = async () => {
    if (!walletClient || !publicClient || !CONTRACTS.KYCManager) return;

    const feeValue = parseFloat(feeInput);
    if (isNaN(feeValue) || feeValue < 0) {
      setResult({ type: 'error', message: 'Invalid fee value' });
      return;
    }

    setTxPending(true);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setKYCFee',
        args: [parseEther(feeInput)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: 'success', message: `KYC fee updated to ${formatPOL(feeValue)}` });
      fetchSettings();
      notifyKYCUpdate();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to update fee' });
    } finally {
      setTxPending(false);
    }
  };

  const updateAutoVerifyThreshold = async () => {
    if (!walletClient || !publicClient || !CONTRACTS.KYCManager) return;

    const thresholdValue = parseFloat(thresholdInput);
    if (isNaN(thresholdValue) || thresholdValue < 0) {
      setResult({ type: 'error', message: 'Invalid threshold value' });
      return;
    }

    setTxPending(true);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setAutoVerifyThreshold',
        args: [toContractUSD(thresholdValue)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: 'success', message: `Auto-verify threshold updated to ${formatUSD(thresholdValue)}` });
      fetchSettings();
      notifyKYCUpdate();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to update threshold' });
    } finally {
      setTxPending(false);
    }
  };

  const updateFeeRecipient = async () => {
    if (!walletClient || !publicClient || !CONTRACTS.KYCManager || !editFeeRecipient) return;

    if (!isAddress(editFeeRecipient)) {
      setResult({ type: 'error', message: 'Invalid address' });
      return;
    }

    setTxPending(true);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setFeeRecipient',
        args: [editFeeRecipient as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: 'success', message: 'Fee recipient updated' });
      setShowFeeRecipientEdit(false);
      fetchSettings();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to update fee recipient' });
    } finally {
      setTxPending(false);
    }
  };

  const togglePause = async () => {
    if (!walletClient || !publicClient || !CONTRACTS.KYCManager) return;

    setTxPending(true);
    try {
      const functionName = settings.paused ? 'unpause' : 'pause';
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName,
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: 'success', message: `Contract ${settings.paused ? 'unpaused' : 'paused'}` });
      fetchSettings();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to toggle pause' });
    } finally {
      setTxPending(false);
    }
  };

  const updateLevelLimit = async (level: number) => {
    if (!walletClient || !publicClient || !CONTRACTS.KYCManager) return;

    const limitValue = parseFloat(limitInputs[level] || '0');
    if (isNaN(limitValue) || limitValue < 0) {
      setResult({ type: 'error', message: 'Invalid limit value' });
      return;
    }

    setTxPending(true);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.KYCManager as `0x${string}`,
        abi: KYCManagerABI,
        functionName: 'setLevelLimit',
        args: [level, toContractUSD(limitValue)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setResult({ type: 'success', message: `${TIER_NAMES[level]} limit updated to ${formatUSD(limitValue)}` });
      fetchSettings();
      notifyKYCUpdate();
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to update limit' });
    } finally {
      setTxPending(false);
    }
  };

  // ============================================
  // DOCUMENT RENDERING
  // ============================================

  const renderDocumentPreview = (url: string | null, label: string, docType: string) => {
    if (!url) return null;

    const isPDF = docType.toLowerCase().includes('proof') || docType.toLowerCase().includes('accredited');

    return (
      <div className="border border-gray-600 rounded-lg p-3 bg-gray-700/50">
        <p className="text-sm font-medium text-gray-300 mb-2">{label}</p>
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setDocumentModal({ url, type: docType, name: label })}
        >
          {isPDF ? (
            <div className="w-full h-24 bg-gray-600 rounded flex items-center justify-center">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-400">PDF</span>
              </div>
            </div>
          ) : (
            <img
              src={url}
              alt={label}
              className="w-full h-24 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
        <button
          onClick={() => window.open(url, '_blank')}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          Open in new tab
        </button>
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedSubmission) return null;

    const storedData = getStoredDataForAddress(selectedSubmission.address);
    const isUpgrade = selectedSubmission.requestedLevel !== undefined;

    return (
      <div className="bg-gray-800 rounded-xl p-6 mt-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isUpgrade ? 'Upgrade Request Details' : 'Submission Details'}
            </h3>
            <p className="font-mono text-sm text-gray-400">{selectedSubmission.address}</p>
          </div>
          <button
            onClick={() => setSelectedSubmission(null)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tier Change */}
        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">Tier Change</p>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded text-white font-medium ${TIER_COLORS[isUpgrade ? selectedSubmission.currentLevel : 0]}`}>
              {TIER_NAMES[isUpgrade ? selectedSubmission.currentLevel : 0]}
            </span>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className={`px-3 py-1.5 rounded text-white font-medium ${TIER_COLORS[isUpgrade ? selectedSubmission.requestedLevel : selectedSubmission.level]}`}>
              {TIER_NAMES[isUpgrade ? selectedSubmission.requestedLevel : selectedSubmission.level]}
            </span>
          </div>
        </div>

        {/* Personal Info from stored data */}
        {storedData?.personalInfo && (
          <div className="mb-6">
            <h4 className="font-medium text-white mb-3">Personal Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {storedData.personalInfo.fullName && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Full Name</p>
                  <p className="text-white font-medium">{storedData.personalInfo.fullName}</p>
                </div>
              )}
              {storedData.personalInfo.email && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Email</p>
                  <p className="text-white font-medium">{storedData.personalInfo.email}</p>
                </div>
              )}
              {storedData.personalInfo.dateOfBirth && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Date of Birth</p>
                  <p className="text-white font-medium">{storedData.personalInfo.dateOfBirth}</p>
                </div>
              )}
              {storedData.personalInfo.documentType && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Document Type</p>
                  <p className="text-white font-medium">{storedData.personalInfo.documentType}</p>
                </div>
              )}
              {storedData.personalInfo.documentNumber && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Document Number</p>
                  <p className="text-white font-medium">{storedData.personalInfo.documentNumber}</p>
                </div>
              )}
              {storedData.personalInfo.expiryDate && (
                <div className="bg-gray-700/50 p-3 rounded">
                  <p className="text-gray-400">Expiry Date</p>
                  <p className="text-white font-medium">{storedData.personalInfo.expiryDate}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Scores */}
        {storedData?.validationScores && (
          <div className="mb-6">
            <h4 className="font-medium text-white mb-3">Validation Results</h4>
            <div className="grid grid-cols-3 gap-4">
              {storedData.validationScores.idValidationConfidence !== undefined && (
                <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {storedData.validationScores.idValidationConfidence}%
                  </p>
                  <p className="text-xs text-gray-400">ID Confidence</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    storedData.validationScores.idValidationPassed
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {storedData.validationScores.idValidationPassed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              )}
              {storedData.validationScores.faceScore !== undefined && (
                <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {storedData.validationScores.faceScore}%
                  </p>
                  <p className="text-xs text-gray-400">Face Score</p>
                </div>
              )}
              {storedData.validationScores.livenessScore !== undefined && (
                <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {storedData.validationScores.livenessScore}%
                  </p>
                  <p className="text-xs text-gray-400">Liveness</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    storedData.validationScores.livenessPassed
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {storedData.validationScores.livenessPassed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {storedData && (
          <div className="mb-6">
            <h4 className="font-medium text-white mb-3">Submitted Documents</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {renderDocumentPreview(storedData.documentUrls?.idDocumentFrontUrl, 'ID Front', 'idDocumentFront')}
              {renderDocumentPreview(storedData.documentUrls?.idDocumentBackUrl, 'ID Back', 'idDocumentBack')}
              {renderDocumentPreview(storedData.documentUrls?.selfieUrl, 'Selfie', 'selfie')}
              {renderDocumentPreview(storedData.documentUrls?.addressProofUrl, 'Address Proof', 'addressProof')}
              {renderDocumentPreview(storedData.documentUrls?.accreditedProofUrl, 'Accredited Proof', 'accreditedProof')}
            </div>

            {!storedData.documents?.hasIdDocument &&
             !storedData.documents?.hasSelfie &&
             !storedData.documents?.hasAddressProof &&
             !storedData.documents?.hasAccreditedProof && (
              <p className="text-gray-500 text-sm mt-2">No documents found in storage</p>
            )}
          </div>
        )}

        {!storedData && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <p className="text-yellow-300 text-sm">
              No stored document data found for this submission. Documents may have been submitted before the storage system was implemented.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          {isUpgrade ? (
            <>
              <button
                onClick={() => openUpgradeApproveModal(selectedSubmission.address)}
                disabled={txPending}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Approve Upgrade
              </button>
              <button
                onClick={() => openUpgradeRejectModal(selectedSubmission.address)}
                disabled={txPending}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Reject Upgrade
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openApproveModal(selectedSubmission.address)}
                disabled={txPending}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => openRejectModal(selectedSubmission.address)}
                disabled={txPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Result Toast */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
          }`}
        >
          {result.message}
          <button onClick={() => setResult(null)} className="float-right text-lg">&times;</button>
        </div>
      )}

      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('verify')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeSection === 'verify'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Users & Verification
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeSection === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          KYC Settings
        </button>
      </div>

      {/* VERIFY SECTION */}
      {activeSection === 'verify' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Search KYC Submission</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchAddress}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchError && <p className="mt-3 text-red-400">{searchError}</p>}
          </div>

          {/* Search Result */}
          {submission && (
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white font-mono">{submission.address}</h3>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-white text-sm ${STATUS_COLORS[submission.status]}`}>
                      {STATUS_NAMES[submission.status]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-white text-sm ${TIER_COLORS[submission.level]}`}>
                      {TIER_NAMES[submission.level]}
                    </span>
                    {submission.isValid && (
                      <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm">Valid</span>
                    )}
                    {upgradeRequest && (
                      <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-sm">
                        Upgrade Pending → {TIER_NAMES[upgradeRequest.requestedLevel]}
                      </span>
                    )}
                    {submission.storedData && (
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm">
                        Documents Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {submission.status === 0 && (
                    <>
                      <button
                        onClick={() => openApproveModal(submission.address)}
                        disabled={txPending}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(submission.address)}
                        disabled={txPending}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {upgradeRequest && (
                    <>
                      <button
                        onClick={() => openUpgradeApproveModal(submission.address)}
                        disabled={txPending}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Approve Upgrade
                      </button>
                      <button
                        onClick={() => openUpgradeRejectModal(submission.address)}
                        disabled={txPending}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Reject Upgrade
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => openResetModal(submission.address)}
                    disabled={txPending}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Upgrade Request Details */}
              {upgradeRequest && (
                <div className="mb-6 p-4 bg-purple-900/30 border border-purple-600 rounded-lg">
                  <h4 className="text-purple-300 font-medium mb-2">Pending Upgrade Request</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">From</p>
                      <p className="text-white">{TIER_NAMES[submission.level]}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">To</p>
                      <p className="text-white">{TIER_NAMES[upgradeRequest.requestedLevel]}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Requested</p>
                      <p className="text-white">{formatDate(upgradeRequest.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Doc Hash</p>
                      <p className="text-white font-mono truncate">{upgradeRequest.documentHash?.slice(0, 16)}...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stored Documents Preview */}
              {submission.storedData && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">Submitted Documents</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {renderDocumentPreview(submission.storedData.documentUrls?.idDocumentFrontUrl, 'ID Front', 'idDocumentFront')}
                    {renderDocumentPreview(submission.storedData.documentUrls?.idDocumentBackUrl, 'ID Back', 'idDocumentBack')}
                    {renderDocumentPreview(submission.storedData.documentUrls?.selfieUrl, 'Selfie', 'selfie')}
                    {renderDocumentPreview(submission.storedData.documentUrls?.addressProofUrl, 'Address Proof', 'addressProof')}
                    {renderDocumentPreview(submission.storedData.documentUrls?.accreditedProofUrl, 'Accredited Proof', 'accreditedProof')}
                  </div>

                  {/* Validation Scores */}
                  {submission.storedData.validationScores && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {submission.storedData.validationScores.idValidationConfidence !== undefined && (
                        <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-blue-400">{submission.storedData.validationScores.idValidationConfidence}%</p>
                          <p className="text-xs text-gray-400">ID Score</p>
                        </div>
                      )}
                      {submission.storedData.validationScores.faceScore !== undefined && (
                        <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-green-400">{submission.storedData.validationScores.faceScore}%</p>
                          <p className="text-xs text-gray-400">Face Score</p>
                        </div>
                      )}
                      {submission.storedData.validationScores.livenessScore !== undefined && (
                        <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-purple-400">{submission.storedData.validationScores.livenessScore}%</p>
                          <p className="text-xs text-gray-400">Liveness</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Country Code</p>
                  <p className="text-white font-medium">{submission.countryCode}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Invested</p>
                  <p className="text-white font-medium">{formatUSD(submission.totalInvested)}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Submitted</p>
                  <p className="text-white font-medium">{formatDate(submission.submittedAt)}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Reviewed</p>
                  <p className="text-white font-medium">{formatDate(submission.reviewedAt)}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Expires</p>
                  <p className="text-white font-medium">{formatDate(submission.expiresAt)}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Document Hash</p>
                  <p className="text-white font-mono text-sm truncate" title={submission.documentHash}>
                    {submission.documentHash?.slice(0, 20)}...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs for Pending Submissions vs Upgrades */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('submissions')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'submissions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  New Submissions
                  {pendingSubmissions.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                      {pendingSubmissions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('upgrades')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'upgrades'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  Upgrade Requests
                  {pendingUpgrades.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-400 text-black text-xs rounded-full">
                      {pendingUpgrades.length}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={fetchPendingSubmissions}
                disabled={pendingLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {pendingLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {pendingLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-400 mt-2">Loading...</p>
              </div>
            ) : activeTab === 'submissions' ? (
              pendingSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No pending submissions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.map((sub) => {
                    const storedData = getStoredDataForAddress(sub.address);
                    return (
                      <div
                        key={sub.address}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedSubmission?.address === sub.address
                            ? 'bg-blue-900/50 border border-blue-500'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        <div className="flex-1">
                          <p className="text-white font-mono text-sm">
                            {sub.address.slice(0, 10)}...{sub.address.slice(-8)}
                          </p>
                          <div className="flex gap-2 mt-1 text-sm text-gray-400 flex-wrap">
                            <span className={`${TIER_COLORS[sub.level]} px-2 py-0.5 rounded text-white text-xs`}>
                              {TIER_NAMES[sub.level]}
                            </span>
                            <span>Country: {sub.countryCode}</span>
                            <span>•</span>
                            <span>{formatDate(sub.submittedAt)}</span>
                            {storedData && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                {storedData.documents?.hasIdDocument ? 'ID' : ''}
                                {storedData.documents?.hasSelfie ? ' Selfie' : ''}
                                {storedData.documents?.hasAddressProof ? ' Addr' : ''}
                                {storedData.documents?.hasAccreditedProof ? ' Accr' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openApproveModal(sub.address); }}
                            disabled={txPending}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openRejectModal(sub.address); }}
                            disabled={txPending}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              pendingUpgrades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No pending upgrade requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUpgrades.map((upgrade) => {
                    const storedData = getStoredDataForAddress(upgrade.address);
                    return (
                      <div
                        key={upgrade.address}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedSubmission?.address === upgrade.address
                            ? 'bg-purple-900/50 border border-purple-500'
                            : 'bg-purple-900/30 border border-purple-700 hover:bg-purple-900/50'
                        }`}
                        onClick={() => setSelectedSubmission(upgrade)}
                      >
                        <div className="flex-1">
                          <p className="text-white font-mono text-sm">
                            {upgrade.address.slice(0, 10)}...{upgrade.address.slice(-8)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                            <span className={`${TIER_COLORS[upgrade.currentLevel]} px-2 py-0.5 rounded text-white text-xs`}>
                              {TIER_NAMES[upgrade.currentLevel]}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className={`${TIER_COLORS[upgrade.requestedLevel]} px-2 py-0.5 rounded text-white text-xs`}>
                              {TIER_NAMES[upgrade.requestedLevel]}
                            </span>
                            <span className="text-gray-400 ml-2">{formatDate(upgrade.submittedAt)}</span>
                            {storedData && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                {storedData.documents?.hasAddressProof ? 'Addr' : ''}
                                {storedData.documents?.hasAccreditedProof ? ' Accr' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openUpgradeApproveModal(upgrade.address); }}
                            disabled={txPending}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openUpgradeRejectModal(upgrade.address); }}
                            disabled={txPending}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Detail Panel */}
            {renderDetailPanel()}

            <p className="mt-4 text-gray-500 text-sm">
              GDPR Compliant: We don&apos;t store user personal data. Only wallet addresses and verification status are recorded on-chain.
            </p>
          </div>
        </div>
      )}

      {/* SETTINGS SECTION */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-400 mt-2">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* General Settings */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">General Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* KYC Fee */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">KYC Submission Fee</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={feeInput}
                          onChange={(e) => setFeeInput(e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 pr-16 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">POL</span>
                      </div>
                      <button
                        onClick={updateKYCFee}
                        disabled={txPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Update
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Current: <span className="text-white">{formatPOL(settings.kycFee)}</span>
                    </p>
                  </div>

                  {/* Auto-verify Threshold */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Auto-verify Threshold</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={thresholdInput}
                          onChange={(e) => setThresholdInput(e.target.value)}
                          step="100"
                          min="0"
                          className="w-full px-4 py-2 pl-8 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={updateAutoVerifyThreshold}
                        disabled={txPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Update
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Current: <span className="text-white">{formatUSD(settings.autoVerifyThreshold)}</span> — Bronze KYC auto-approved if user invested this amount
                    </p>
                  </div>
                </div>

                {/* Fee Recipient */}
                <div className="mt-6">
                  <label className="block text-gray-400 text-sm mb-2">Fee Recipient</label>
                  {showFeeRecipientEdit ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editFeeRecipient}
                        onChange={(e) => setEditFeeRecipient(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={updateFeeRecipient}
                        disabled={txPending}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowFeeRecipientEdit(false);
                          setEditFeeRecipient(settings.feeRecipient);
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-white font-mono text-sm bg-gray-700/50 p-3 rounded-lg">
                        {settings.feeRecipient || 'Not set'}
                      </p>
                      <button
                        onClick={() => setShowFeeRecipientEdit(true)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Contract Status */}
                <div className="mt-6 flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">Contract Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${settings.paused ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                      {settings.paused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                  <button
                    onClick={togglePause}
                    disabled={txPending}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      settings.paused
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    } disabled:bg-gray-600`}
                  >
                    {txPending ? 'Processing...' : settings.paused ? 'Unpause Contract' : 'Pause Contract'}
                  </button>
                </div>
              </div>

              {/* Investment Limits */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Investment Limits by Tier</h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((level) => (
                    <div key={level} className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
                      <div className={`w-4 h-4 rounded-full ${TIER_COLORS[level]}`} />
                      <span className="text-white font-medium w-20">{TIER_NAMES[level]}</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={limitInputs[level] || ''}
                          onChange={(e) => setLimitInputs((prev) => ({ ...prev, [level]: e.target.value }))}
                          step="1000"
                          min="0"
                          className="w-full px-4 py-2 pl-8 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-32 text-right">
                        {formatUSD(levelLimits[level])}
                      </span>
                      <button
                        onClick={() => updateLevelLimit(level)}
                        disabled={txPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  ))}

                  {/* Diamond - Fixed */}
                  <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg opacity-75">
                    <div className={`w-4 h-4 rounded-full ${TIER_COLORS[4]}`} />
                    <span className="text-white font-medium w-20">{TIER_NAMES[4]}</span>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-4xl text-purple-400">∞</span>
                    </div>
                    <span className="text-purple-400 text-sm w-32 text-right">Unlimited</span>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      Fixed
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  These limits define the maximum investment amount for each KYC tier. Diamond tier is unlimited.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Approve KYC Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Approve KYC</h3>
            <p className="text-gray-400 text-sm mb-4 font-mono">{selectedAddress}</p>
            <p className="text-gray-400 mb-4">Select the tier level to approve:</p>
            <select
              value={approveLevel}
              onChange={(e) => setApproveLevel(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-6"
            >
              {[1, 2, 3].map((level) => (
                <option key={level} value={level}>
                  {TIER_NAMES[level]} — Up to {formatUSD(levelLimits[level])}
                </option>
              ))}
              <option value={4}>{TIER_NAMES[4]} — Unlimited</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={txPending}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {txPending ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject KYC Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Reject KYC</h3>
            <p className="text-gray-400 text-sm mb-4 font-mono">{selectedAddress}</p>
            <p className="text-gray-400 mb-4">Provide a reason for rejection (optional):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none h-24 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={txPending}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {txPending ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Upgrade Modal */}
      {showUpgradeApproveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Approve Upgrade</h3>
            <p className="text-gray-400 text-sm mb-4 font-mono">{selectedAddress}</p>
            <p className="text-gray-400 mb-6">
              This will upgrade the user to their requested tier level. Their existing KYC will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeApproveModal(false);
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveUpgrade}
                disabled={txPending}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {txPending ? 'Processing...' : 'Approve Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Upgrade Modal */}
      {showUpgradeRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Reject Upgrade</h3>
            <p className="text-gray-400 text-sm mb-4 font-mono">{selectedAddress}</p>
            <p className="text-green-400 text-sm mb-4">
              ✓ The user&apos;s existing KYC status will be preserved
            </p>
            <p className="text-gray-400 mb-4">Provide a reason for rejection (optional):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none h-24 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeRejectModal(false);
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectUpgrade}
                disabled={txPending}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {txPending ? 'Processing...' : 'Reject Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset KYC Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Reset KYC</h3>
            <p className="text-gray-400 text-sm mb-4 font-mono">{selectedAddress}</p>
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                ⚠️ <strong>Warning:</strong> This will completely reset the user&apos;s KYC status. They will need to resubmit their KYC application from scratch.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={txPending}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {txPending ? 'Processing...' : 'Reset KYC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {documentModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setDocumentModal(null)}
        >
          <div
            className="bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
              <h3 className="font-medium text-white">{documentModal.name}</h3>
              <div className="flex gap-2">
                <a
                  href={documentModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => setDocumentModal(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              {documentModal.type.toLowerCase().includes('proof') || documentModal.type.toLowerCase().includes('accredited') ? (
                <iframe
                  src={documentModal.url}
                  className="w-full h-[70vh] rounded"
                  title={documentModal.name}
                />
              ) : (
                <img
                  src={documentModal.url}
                  alt={documentModal.name}
                  className="max-w-full h-auto mx-auto rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
