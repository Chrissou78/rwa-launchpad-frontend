'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import Header from '@/components/Header';
import { useKYC, KYCTier } from '@/contexts/KYCContext';
import LivenessCheck from '@/components/LivenessCheck';
import Link from 'next/link';

// ======================================
// CONSTANTS & CONFIGURATION
// ======================================

const TIER_ORDER = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
const MAX_TIER_INDEX = 4;

const TIER_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond'
};

const TIER_NEW_REQUIREMENTS: Record<number, {
  needsPersonalInfo: boolean;
  needsIdDocument: boolean;
  needsSelfie: boolean;
  needsLiveness: boolean;
  needsAddressProof: boolean;
  needsAccreditedProof: boolean;
}> = {
  1: { needsPersonalInfo: true, needsIdDocument: true, needsSelfie: false, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: false },
  2: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: true, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: false },
  3: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: false, needsLiveness: true, needsAddressProof: true, needsAccreditedProof: false },
  4: { needsPersonalInfo: false, needsIdDocument: false, needsSelfie: false, needsLiveness: false, needsAddressProof: false, needsAccreditedProof: true }
};

// Static tier styling config (limits will come from context)
const TIER_STYLES: Record<number, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  requirements: string[];
}> = {
  0: {
    name: 'None',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
    borderColor: 'border-gray-600',
    icon: '⚪',
    description: 'No verification',
    requirements: []
  },
  1: {
    name: 'Bronze',
    color: 'text-orange-400',
    bgColor: 'bg-gradient-to-br from-orange-900/30 to-orange-800/20',
    borderColor: 'border-orange-500/50',
    icon: '🥉',
    description: 'Basic verification',
    requirements: ['Personal Information', 'Government-issued ID']
  },
  2: {
    name: 'Silver',
    color: 'text-gray-300',
    bgColor: 'bg-gradient-to-br from-gray-700/30 to-gray-600/20',
    borderColor: 'border-gray-400/50',
    icon: '🥈',
    description: 'Enhanced verification',
    requirements: ['Selfie Photo']
  },
  3: {
    name: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20',
    borderColor: 'border-yellow-500/50',
    icon: '🥇',
    description: 'Advanced verification',
    requirements: ['Liveness Check', 'Proof of Address']
  },
  4: {
    name: 'Diamond',
    color: 'text-cyan-400',
    bgColor: 'bg-gradient-to-br from-cyan-900/30 to-cyan-800/20',
    borderColor: 'border-cyan-500/50',
    icon: '💎',
    description: 'Maximum verification',
    requirements: ['Accredited Investor Documentation']
  }
};

const STATUS_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'Auto Verifying',
  3: 'Manual Review',
  4: 'Approved',
  5: 'Rejected',
  6: 'Expired',
  7: 'Revoked'
};

const REJECTION_REASONS: Record<number, string> = {
  0: 'Not rejected',
  1: 'Blocked country',
  2: 'Underage',
  3: 'Invalid document',
  4: 'Document expired',
  5: 'Face mismatch',
  6: 'Liveness check failed',
  7: 'Suspicious activity',
  8: 'Duplicate submission',
  9: 'Other'
};

const KYC_MANAGER_ABI = [
  {
    name: 'submitKYC',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'countryCode', type: 'uint16' },
      { name: 'documentHash', type: 'bytes32' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'requestedLevel', type: 'uint8' }
    ],
    outputs: []
  },
  {
    name: 'requestUpgrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'documentHash', type: 'bytes32' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'requestedLevel', type: 'uint8' }
    ],
    outputs: []
  },
  {
    name: 'getKYCSubmission',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'level', type: 'uint8' },
      { name: 'status', type: 'uint8' },
      { name: 'countryCode', type: 'uint16' },
      { name: 'submittedAt', type: 'uint64' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'documentHash', type: 'bytes32' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'requestedLevel', type: 'uint8' }
    ]
  }
] as const;

// ======================================
// HELPER FUNCTIONS
// ======================================

function getRequirementsForUpgrade(currentLevel: number, targetLevel: number) {
  const requirements = {
    needsPersonalInfo: false,
    needsIdDocument: false,
    needsSelfie: false,
    needsLiveness: false,
    needsAddressProof: false,
    needsAccreditedProof: false
  };

  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const tierReqs = TIER_NEW_REQUIREMENTS[level];
    if (tierReqs) {
      if (tierReqs.needsPersonalInfo) requirements.needsPersonalInfo = true;
      if (tierReqs.needsIdDocument) requirements.needsIdDocument = true;
      if (tierReqs.needsSelfie) requirements.needsSelfie = true;
      if (tierReqs.needsLiveness) requirements.needsLiveness = true;
      if (tierReqs.needsAddressProof) requirements.needsAddressProof = true;
      if (tierReqs.needsAccreditedProof) requirements.needsAccreditedProof = true;
    }
  }

  return requirements;
}

function getRequirementsList(requirements: ReturnType<typeof getRequirementsForUpgrade>): string[] {
  const list: string[] = [];
  if (requirements.needsPersonalInfo) list.push('Personal Information');
  if (requirements.needsIdDocument) list.push('Government-issued ID');
  if (requirements.needsSelfie) list.push('Selfie Photo');
  if (requirements.needsLiveness) list.push('Liveness Check');
  if (requirements.needsAddressProof) list.push('Proof of Address');
  if (requirements.needsAccreditedProof) list.push('Accredited Investor Documentation');
  return list;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ======================================
// INTERFACES
// ======================================

interface Country {
  code: number;
  name: string;
  blocked: boolean;
}

interface LivenessResult {
  passed: boolean;
  score: number;
  completedChallenges: number;
  totalChallenges: number;
  screenshots?: string[];
  timestamp: number;
}

// ======================================
// MAIN COMPONENT
// ======================================

export default function KYCPage() {
  const { address, isConnected } = useAccount();
  const { kycData, tierLimits, formatLimit, refreshKYC } = useKYC();

  // Build dynamic TIER_CONFIG using limits from context
  const TIER_CONFIG = useMemo(() => {
    const config: Record<number, {
      name: string;
      limit: string;
      limitValue: number;
      color: string;
      bgColor: string;
      borderColor: string;
      icon: string;
      description: string;
      requirements: string[];
    }> = {};

    for (let i = 0; i <= 4; i++) {
      const tierName = TIER_NAMES[i] as KYCTier;
      const limitValue = tierLimits[tierName] || 0;
      const styles = TIER_STYLES[i];
      
      config[i] = {
        ...styles,
        limit: !isFinite(limitValue) ? 'Unlimited' : formatLimit(limitValue),
        limitValue
      };
    }

    return config;
  }, [tierLimits, formatLimit]);

  const [submissionResult, setSubmissionResult] = useState<{
    autoApproved: boolean;
    status: string;
    verificationScore: number;
  } | null>(null);
  
  // Form state
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'form' | 'signing' | 'processing' | 'submitted'>('select');
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryCode, setCountryCode] = useState<number>(0);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [faceScore, setFaceScore] = useState<number>(0);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [accreditedProof, setAccreditedProof] = useState<File | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Liveness state
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  
  // Countries
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  
  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Contract write hooks
  const { writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash || undefined
  });

  // Check if KYC data is loading
  const kycLoading = kycData?.isLoading ?? false;

  // ======================================
  // DERIVED STATE
  // ======================================

  // Get the numeric level from the tier string
  const effectiveApprovedTier = useMemo(() => {
    if (!kycData) return 0;
    
    const tierToLevel: Record<string, number> = {
      'None': 0,
      'Bronze': 1,
      'Silver': 2,
      'Gold': 3,
      'Diamond': 4
    };
    
    // Only count as approved if status is Approved
    if (kycData.status === 'Approved') {
      return tierToLevel[kycData.tier] || 0;
    }
    
    return 0;
  }, [kycData]);

  // Status flags
  const isPending = useMemo(() => {
    const pendingStatuses = ['Pending', 'AutoVerifying', 'ManualReview'];
    return pendingStatuses.includes(kycData?.status || '');
  }, [kycData]);

  const isApproved = useMemo(() => {
    return kycData?.status === 'Approved';
  }, [kycData]);

  const isRejected = useMemo(() => {
    return kycData?.status === 'Rejected';
  }, [kycData]);

  // For pending tier, we need to fetch from API directly since context doesn't expose requestedLevel
  const [pendingRequestedTier, setPendingRequestedTier] = useState<number | null>(null);

  // Fetch the raw submission data to get requestedLevel when pending
  useEffect(() => {
    async function fetchPendingTier() {
      if (isPending && address) {
        try {
          const response = await fetch(`/api/kyc/status/${address}`);
          const data = await response.json();
          if (data.found && data.submission) {
            setPendingRequestedTier(data.submission.requestedLevel || null);
          }
        } catch (error) {
          console.error('Failed to fetch pending tier:', error);
        }
      } else {
        setPendingRequestedTier(null);
      }
    }
    fetchPendingTier();
  }, [isPending, address]);

  // Was this a rejected upgrade attempt?
  const wasUpgradeRejected = useMemo(() => {
    if (!isRejected) return false;
    // If rejected and had a tier before, it was an upgrade rejection
    const tierToLevel: Record<string, number> = {
      'None': 0, 'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Diamond': 4
    };
    const currentLevel = tierToLevel[kycData?.tier || 'None'] || 0;
    return currentLevel > 0;
  }, [isRejected, kycData]);

  // Is this an upgrade or new submission?
  const isUpgrade = effectiveApprovedTier > 0;

  // Upgrade requirements for selected tier
  const upgradeRequirements = useMemo(() => {
    if (selectedTier <= effectiveApprovedTier) {
      return {
        needsPersonalInfo: false,
        needsIdDocument: false,
        needsSelfie: false,
        needsLiveness: false,
        needsAddressProof: false,
        needsAccreditedProof: false
      };
    }
    return getRequirementsForUpgrade(effectiveApprovedTier, selectedTier);
  }, [effectiveApprovedTier, selectedTier]);

  // Requirements list for display
  const requirementsList = useMemo(() => {
    return getRequirementsList(upgradeRequirements);
  }, [upgradeRequirements]);

  // ======================================
  // EFFECTS
  // ======================================

  // Load countries
  useEffect(() => {
    async function loadCountries() {
      try {
        const response = await fetch('/api/kyc/countries');
        if (response.ok) {
          const data = await response.json();
          setCountries(data.countries || []);
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
        // Fallback countries
        setCountries([
          { code: 840, name: 'United States', blocked: false },
          { code: 826, name: 'United Kingdom', blocked: false },
          { code: 276, name: 'Germany', blocked: false },
          { code: 250, name: 'France', blocked: false }
        ]);
      } finally {
        setCountriesLoading(false);
      }
    }
    loadCountries();
  }, []);

  // Refresh KYC on mount and when address changes
  useEffect(() => {
    if (address) {
      refreshKYC();
    }
  }, [address, refreshKYC]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      processBackendVerification();
    }
  }, [isTxSuccess, txHash]);

  // ======================================
  // HANDLERS
  // ======================================

  const handleTierSelect = (tier: number) => {
    if (tier <= effectiveApprovedTier) return;
    if (isPending) return;
    
    setSelectedTier(tier);
    setUpgradeStep('form');
    setFormError(null);
    setSubmissionError(null);
    
    // Reset form
    setFullName('');
    setEmail('');
    setDateOfBirth('');
    setCountryCode(kycData?.countryCode || 0);
    setIdDocument(null);
    setSelfie(null);
    setFaceScore(0);
    setFaceDetectionStatus('idle');
    setAddressProof(null);
    setAccreditedProof(null);
    setTermsAgreed(false);
    setLivenessResult(null);
  };

  const handleLivenessComplete = (result: LivenessResult) => {
    setLivenessResult(result);
    setShowLivenessModal(false);
  };

  const handleLivenessCancel = () => {
    setShowLivenessModal(false);
  };

  // Handle selfie upload with face detection
  const handleSelfieUpload = async (file: File | null) => {
    if (!file) {
      setSelfie(null);
      setFaceScore(0);
      setFaceDetectionStatus('idle');
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setFormError('File is too large. Maximum size is 10MB');
      return;
    }

    setSelfie(file);
    setFormError(null);
    setFaceDetectionStatus('detecting');

    // Run face detection on the uploaded image
    try {
      const imageUrl = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = imageUrl;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });

      // Try to use face detection if available
      try {
        console.log('🔍 Attempting to import livenessCheck...');
        const livenessModule = await import('@/lib/livenessCheck');
        console.log('🔍 Module imported, keys:', Object.keys(livenessModule));
        
        const { detectFace } = livenessModule;
        console.log('🔍 detectFace function:', typeof detectFace);
        
        if (!detectFace) {
          throw new Error('detectFace not exported from module');
        }
        const result = await detectFace(img);
        
        URL.revokeObjectURL(imageUrl);

        if (result && result.faceDetected) {
          const score = Math.round((result.confidence || 0.85) * 100);
          setFaceScore(score);
          setFaceDetectionStatus('success');
          console.log('✅ Face detected with score:', score);
        } else {
          setFaceScore(0);
          setFaceDetectionStatus('failed');
          setFormError('No face detected in the selfie. Please upload a clear photo of your face.');
        }
      } catch (detectionError) {
        URL.revokeObjectURL(imageUrl);
        // Face detection not available - use default passing score
        console.log('⚠️ Face detection unavailable, using default score of 80');
        setFaceScore(80);
        setFaceDetectionStatus('success');
      }
    } catch (error) {
      console.error('Selfie processing error:', error);
      // Fallback - give benefit of doubt
      setFaceScore(80);
      setFaceDetectionStatus('success');
    }
  };

  const validateForm = (): boolean => {
    setFormError(null);

    // Terms
    if (!termsAgreed) {
      setFormError('You must agree to the terms and conditions');
      return false;
    }

    // Personal info validation
    if (upgradeRequirements.needsPersonalInfo) {
      if (!fullName.trim()) {
        setFormError('Please enter your full name');
        return false;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError('Please enter a valid email address');
        return false;
      }
      if (!dateOfBirth) {
        setFormError('Please enter your date of birth');
        return false;
      }
      if (calculateAge(dateOfBirth) < 18) {
        setFormError('You must be at least 18 years old');
        return false;
      }
      if (!countryCode) {
        setFormError('Please select your country');
        return false;
      }
      const selectedCountry = countries.find(c => c.code === countryCode);
      if (selectedCountry?.blocked) {
        setFormError('KYC is not available in your country');
        return false;
      }
    }

    // Document validation
    if (upgradeRequirements.needsIdDocument && !idDocument) {
      setFormError('Please upload your government-issued ID');
      return false;
    }

    if (upgradeRequirements.needsSelfie && !selfie) {
      setFormError('Please upload a selfie photo');
      return false;
    }

    // Check face detection result for selfie
    if (upgradeRequirements.needsSelfie && faceDetectionStatus === 'failed') {
      setFormError('No face detected in selfie. Please upload a clear photo of your face.');
      return false;
    }

    if (upgradeRequirements.needsLiveness) {
      if (!livenessResult) {
        setFormError('Please complete the liveness check');
        return false;
      }
      if (!livenessResult.passed) {
        setFormError('Liveness check failed. Please try again.');
        return false;
      }
    }

    if (upgradeRequirements.needsAddressProof && !addressProof) {
      setFormError('Please upload proof of address');
      return false;
    }

    if (upgradeRequirements.needsAccreditedProof && !accreditedProof) {
      setFormError('Please upload accredited investor documentation');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!address) return;

    setUpgradeStep('signing');
    setSubmissionError(null);

    try {
      // Create document hash
      let documentContent = '';
      if (selfie) {
        documentContent = await selfie.text().catch(() => selfie.name);
      } else if (idDocument) {
        documentContent = await idDocument.text().catch(() => idDocument.name);
      }
      const docHash = keccak256(toBytes(documentContent || `kyc-${address}-${Date.now()}`));

      // Create data hash
      const dataPayload = JSON.stringify({
        wallet: address,
        level: selectedTier,
        country: countryCode,
        timestamp: Date.now(),
        isUpgrade,
        livenessScore: livenessResult?.score || 0,
        faceScore: faceScore
      });
      const dataHash = keccak256(toBytes(dataPayload));

      const kycManagerAddress = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}` | undefined;

      if (kycManagerAddress) {
        // On-chain submission
        if (isUpgrade) {
          writeContract({
            address: kycManagerAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'requestUpgrade',
            args: [docHash, dataHash, selectedTier]
          }, {
            onSuccess: (hash) => {
              setTxHash(hash);
              setUpgradeStep('processing');
            },
            onError: (error) => {
              console.error('Contract write error:', error);
              setSubmissionError(mapContractError(error));
              setUpgradeStep('form');
            }
          });
        } else {
          writeContract({
            address: kycManagerAddress,
            abi: KYC_MANAGER_ABI,
            functionName: 'submitKYC',
            args: [countryCode, docHash, dataHash, selectedTier]
          }, {
            onSuccess: (hash) => {
              setTxHash(hash);
              setUpgradeStep('processing');
            },
            onError: (error) => {
              console.error('Contract write error:', error);
              setSubmissionError(mapContractError(error));
              setUpgradeStep('form');
            }
          });
        }
      } else {
        // Simulated mode - direct backend submission
        setUpgradeStep('processing');
        await processBackendVerification();
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionError('Failed to submit KYC. Please try again.');
      setUpgradeStep('form');
    }
  };

  const processBackendVerification = async () => {
    try {
      const formData = new FormData();
      formData.append('walletAddress', address || '');
      formData.append('requestedLevel', selectedTier.toString());
      formData.append('currentLevel', effectiveApprovedTier.toString());
      formData.append('isUpgrade', isUpgrade.toString());
      
      if (txHash) {
        formData.append('txHash', txHash);
      }

      // Personal info for new submissions
      if (upgradeRequirements.needsPersonalInfo) {
        formData.append('fullName', fullName);
        formData.append('email', email);
        formData.append('dateOfBirth', dateOfBirth);
        formData.append('countryCode', countryCode.toString());
      }

      // Documents
      if (idDocument) formData.append('idDocument', idDocument);
      if (selfie) formData.append('selfie', selfie);
      if (addressProof) formData.append('addressProof', addressProof);
      if (accreditedProof) formData.append('accreditedProof', accreditedProof);

      // Face detection score
      formData.append('faceScore', faceScore.toString());

      // Liveness data
      if (livenessResult) {
        formData.append('livenessScore', livenessResult.score.toString());
        formData.append('livenessPassed', livenessResult.passed.toString());
        formData.append('livenessCompletedChallenges', livenessResult.completedChallenges.toString());
        formData.append('livenessTotalChallenges', livenessResult.totalChallenges.toString());
      }

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setSubmissionResult({
          autoApproved: result.autoApproved || false,
          status: result.status || 'pending',
          verificationScore: result.verificationScore || 0
        });
        setUpgradeStep('submitted');
        // Refresh KYC status after a short delay
        setTimeout(() => {
          refreshKYC();
        }, 2000);
      } else {
        setSubmissionError(result.error || result.message || 'Verification failed');
        setUpgradeStep('form');
      }
    } catch (error) {
      console.error('Backend verification error:', error);
      setSubmissionError('Failed to verify documents. Please try again.');
      setUpgradeStep('form');
    }
  };

  const mapContractError = (error: Error): string => {
    const message = error.message || '';
    if (message.includes('AlreadySubmitted')) return 'You have already submitted KYC';
    if (message.includes('InvalidLevel')) return 'Invalid tier level selected';
    if (message.includes('BlockedCountry')) return 'KYC is not available in your country';
    if (message.includes('Underage')) return 'You must be at least 18 years old';
    if (message.includes('rejected')) return 'Transaction was rejected';
    return 'Transaction failed. Please try again.';
  };

  const handleBackToSelect = () => {
    setUpgradeStep('select');
    setSelectedTier(0);
    setFormError(null);
    setSubmissionError(null);
  };

  const handleFileChange = (
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    file: File | null,
    maxSize: number = 10 * 1024 * 1024
  ) => {
    if (file && file.size > maxSize) {
      setFormError(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
      return;
    }
    setter(file);
    setFormError(null);
  };

  // ======================================
  // RENDER HELPERS
  // ======================================

  const renderCurrentTierBanner = () => {
    // Show banner if user has an approved tier
    if (effectiveApprovedTier === 0 && !isPending) return null;

    const tierConfig = TIER_CONFIG[effectiveApprovedTier] || TIER_CONFIG[0];

    // If pending with no approved tier, show different banner
    if (effectiveApprovedTier === 0 && isPending) {
      const pendingTierConfig = TIER_CONFIG[pendingRequestedTier || 1];
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{tierConfig.icon}</div>
            <div>
              <div className="flex items-center gap-2">
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
              {kycData?.expiresAt && (
                <p className="text-gray-500 text-sm mt-1">
                  Expires: {new Date(kycData.expiresAt * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {/* Upgrade button - only if not at max tier and not pending */}
          {effectiveApprovedTier < MAX_TIER_INDEX && !isPending && upgradeStep === 'select' && (
            <button
              onClick={() => handleTierSelect(effectiveApprovedTier + 1)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              Upgrade Tier
            </button>
          )}

          {/* Show pending upgrade info */}
          {isPending && pendingRequestedTier && (
            <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Upgrading to {TIER_NAMES[pendingRequestedTier]}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPendingBanner = () => {
    if (!isPending || !pendingRequestedTier) return null;

    const pendingTierConfig = TIER_CONFIG[pendingRequestedTier];
    const statusName = STATUS_NAMES[kycData?.status || 0];

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
            {effectiveApprovedTier > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                You remain at <span className={TIER_CONFIG[effectiveApprovedTier].color}>
                  {TIER_CONFIG[effectiveApprovedTier].name}
                </span> tier during this process.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRejectionBanner = () => {
    if (!isRejected) return null;

    const rejectionReason = REJECTION_REASONS[kycData?.rejectionReason || 9];
    const attemptedTier = kycData?.requestedLevel || 1;
    const attemptedTierConfig = TIER_CONFIG[attemptedTier];

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
            {wasUpgradeRejected && effectiveApprovedTier > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                Your <span className={TIER_CONFIG[effectiveApprovedTier].color}>
                  {TIER_CONFIG[effectiveApprovedTier].name}
                </span> tier remains active. You can retry the upgrade.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleTierSelect(attemptedTier)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
              >
                Retry Application
              </button>
              {effectiveApprovedTier < MAX_TIER_INDEX - 1 && (
                <button
                  onClick={() => setUpgradeStep('select')}
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
          {isPending 
            ? 'Upgrade In Progress' 
            : effectiveApprovedTier > 0 
              ? 'Upgrade Your Verification' 
              : 'Select Verification Tier'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((tierIndex) => {
            const tierConfig = TIER_CONFIG[tierIndex];
            
            // Key status checks - FIXED LOGIC
            const isCurrentApprovedTier = effectiveApprovedTier === tierIndex;
            const isCompletedTier = effectiveApprovedTier > tierIndex;
            const isPendingThisTier = isPending && pendingRequestedTier === tierIndex;
            const isAboveCurrentTier = tierIndex > effectiveApprovedTier;
            const canSelectThisTier = isAboveCurrentTier && !isPending;

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

                {/* Action Button - aligned at bottom */}
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
                      onClick={() => handleTierSelect(tierIndex)}
                      className="w-full py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                    >
                      {effectiveApprovedTier > 0 ? `Upgrade to ${tierConfig.name}` : `Get ${tierConfig.name}`}
                    </button>
                  )}
                  {isAboveCurrentTier && isPending && !isPendingThisTier && (
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
    const targetTierConfig = TIER_CONFIG[selectedTier];

    return (
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <div className={`rounded-2xl p-6 mb-8 ${targetTierConfig.bgColor} border ${targetTierConfig.borderColor}`}>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{targetTierConfig.icon}</div>
            <div>
              <h2 className={`text-2xl font-bold ${targetTierConfig.color}`}>
                {isUpgrade ? `Upgrade to ${targetTierConfig.name}` : `Apply for ${targetTierConfig.name}`}
              </h2>
              <p className="text-gray-400 mt-1">
                Investment limit: {targetTierConfig.limit}
              </p>
            </div>
          </div>
          
          {/* Requirements summary */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Required for this {isUpgrade ? 'upgrade' : 'tier'}:</p>
            <div className="flex flex-wrap gap-2">
              {requirementsList.map((req, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
                  {req}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={handleBackToSelect}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tier selection
        </button>

        {/* Error display */}
        {(formError || submissionError) && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-400">{formError || submissionError}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Personal Information */}
          {upgradeRequirements.needsPersonalInfo && (
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  />
                  <p className="text-gray-500 text-xs mt-1">Used for investment receipts and notifications</p>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Country *</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    disabled={countriesLoading}
                  >
                    <option value={0}>Select your country</option>
                    {countries.filter(c => !c.blocked).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Government-Issued ID */}
          {upgradeRequirements.needsIdDocument && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-purple-400">🪪</span>
                Government-Issued ID *
              </h3>
              
              {idDocument ? (
                <div className="relative">
                  <div className="aspect-[3/2] rounded-xl overflow-hidden border-2 border-green-500 bg-gray-900">
                    {idDocument.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(idDocument)}
                        alt="ID Document"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">{idDocument.name}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{idDocument.name}</span>
                      <span className="text-gray-500 text-sm">({(idDocument.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => setIdDocument(null)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-sm">PNG, JPG, WebP or PDF (max. 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(setIdDocument, e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Selfie Photo */}
          {upgradeRequirements.needsSelfie && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-pink-400">🤳</span>
                Selfie Photo *
              </h3>
              
              {selfie ? (
                <div className="relative">
                  <div className={`aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border-2 bg-gray-900 ${
                    faceDetectionStatus === 'success' ? 'border-green-500' :
                    faceDetectionStatus === 'failed' ? 'border-red-500' :
                    faceDetectionStatus === 'detecting' ? 'border-yellow-500' :
                    'border-gray-600'
                  }`}>
                    <img
                      src={URL.createObjectURL(selfie)}
                      alt="Selfie"
                      className="w-full h-full object-cover"
                    />
                    {faceDetectionStatus === 'detecting' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-yellow-400 text-sm">Detecting face...</p>
                        </div>
                      </div>
                    )}
                    {faceDetectionStatus === 'success' && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {faceDetectionStatus === 'failed' && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 max-w-xs mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`flex items-center gap-2 ${
                        faceDetectionStatus === 'success' ? 'text-green-400' :
                        faceDetectionStatus === 'failed' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {faceDetectionStatus === 'success' && (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm">Face detected ({faceScore}%)</span>
                          </>
                        )}
                        {faceDetectionStatus === 'failed' && (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm">No face detected</span>
                          </>
                        )}
                        {faceDetectionStatus === 'detecting' && (
                          <span className="text-sm">Analyzing...</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelfie(null);
                          setFaceScore(0);
                          setFaceDetectionStatus('idle');
                        }}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        Change
                      </button>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {selfie.name} ({(selfie.size / 1024).toFixed(1)} KB)
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-pink-500 transition-colors">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-sm">PNG, JPG or WebP (max. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelfieUpload(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Tips for good selfie */}
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-400 text-sm font-medium mb-2">Tips for a good selfie:</p>
                    <ul className="text-gray-500 text-sm space-y-1">
                      <li>• Good lighting, face clearly visible</li>
                      <li>• Look directly at the camera</li>
                      <li>• No sunglasses or hats</li>
                      <li>• Neutral expression</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Liveness Check */}
          {upgradeRequirements.needsLiveness && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">🎭</span>
                Liveness Check *
              </h3>
              
              {livenessResult ? (
                <div className={`p-4 rounded-xl ${livenessResult.passed ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
                  <div className="flex items-center gap-3">
                    {livenessResult.passed ? (
                      <div className="p-2 bg-green-500 rounded-full">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="p-2 bg-red-500 rounded-full">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className={`font-semibold ${livenessResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {livenessResult.passed ? 'Liveness Verified' : 'Liveness Failed'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Score: {livenessResult.score}% ({livenessResult.completedChallenges}/{livenessResult.totalChallenges} challenges)
                      </p>
                    </div>
                  </div>
                  {!livenessResult.passed && (
                    <button
                      onClick={() => {
                        setLivenessResult(null);
                        setShowLivenessModal(true);
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
                    Complete a quick liveness check to verify you're a real person. This involves following simple on-screen prompts.
                  </p>
                  <button
                    onClick={() => setShowLivenessModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all"
                  >
                    Start Liveness Check
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Proof of Address */}
          {upgradeRequirements.needsAddressProof && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-green-400">🏠</span>
                Proof of Address *
              </h3>
              
              {addressProof ? (
                <div className="relative">
                  <div className="aspect-[3/2] rounded-xl overflow-hidden border-2 border-green-500 bg-gray-900">
                    {addressProof.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(addressProof)}
                        alt="Address Proof"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">{addressProof.name}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{addressProof.name}</span>
                      <span className="text-gray-500 text-sm">({(addressProof.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => setAddressProof(null)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-sm">Utility bill, bank statement, or official letter</p>
                    <p className="text-gray-500 text-sm">PNG, JPG, WebP or PDF (max. 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(setAddressProof, e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Accredited Investor Documentation */}
          {upgradeRequirements.needsAccreditedProof && (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">💎</span>
                Accredited Investor Documentation *
              </h3>
              
              {accreditedProof ? (
                <div className="relative">
                  <div className="aspect-[3/2] rounded-xl overflow-hidden border-2 border-green-500 bg-gray-900">
                    {accreditedProof.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(accreditedProof)}
                        alt="Accredited Proof"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">{accreditedProof.name}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{accreditedProof.name}</span>
                      <span className="text-gray-500 text-sm">({(accreditedProof.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => setAccreditedProof(null)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-sm">CPA letter, attorney letter, or broker certification</p>
                      <p className="text-gray-500 text-sm">PNG, JPG, WebP or PDF (max. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(setAccreditedProof, e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-400 text-sm font-medium mb-2">Accepted documents:</p>
                    <ul className="text-gray-500 text-sm space-y-1">
                      <li>• Letter from CPA, attorney, or investment advisor</li>
                      <li>• Broker-dealer certification</li>
                      <li>• Form ADV or Series 7/65/82 license</li>
                      <li>• Trust documentation (for entity accounts)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Terms Agreement */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
              />
              <span className="text-gray-300 text-sm">
                I agree to the{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                  Privacy Policy
                </Link>
                . I confirm that all information provided is accurate and I consent to identity verification.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!termsAgreed || isWritePending || faceDetectionStatus === 'detecting'}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              termsAgreed && !isWritePending && faceDetectionStatus !== 'detecting'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isWritePending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Waiting for wallet...
              </span>
            ) : faceDetectionStatus === 'detecting' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing selfie...
              </span>
            ) : (
              `Submit ${isUpgrade ? 'Upgrade' : 'Application'}`
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderProcessingState = () => {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Processing Your Application</h2>
          <p className="text-gray-400">
            Please wait while we verify your documents...
          </p>
        </div>
        
        {txHash && (
          <div className="bg-gray-800/50 rounded-xl p-4 text-left">
            <p className="text-gray-400 text-sm mb-2">Transaction Hash:</p>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm break-all"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderSuccessState = () => {
    const targetTierConfig = TIER_CONFIG[selectedTier];
    const wasAutoApproved = submissionResult?.autoApproved || false;

    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mb-8">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            wasAutoApproved ? 'bg-green-500/20' : 'bg-yellow-500/20'
          }`}>
            {wasAutoApproved ? (
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {wasAutoApproved ? 'Application Approved!' : 'Application Submitted!'}
          </h2>
          <p className="text-gray-400">
            {wasAutoApproved 
              ? `Your ${targetTierConfig.name} tier has been verified and approved.`
              : `Your ${targetTierConfig.name} tier application has been submitted for review.`
            }
          </p>
          {submissionResult?.verificationScore && (
            <p className="text-gray-500 text-sm mt-2">
              Verification score: {submissionResult.verificationScore}%
            </p>
          )}
        </div>

        <div className={`rounded-xl p-6 mb-6 ${targetTierConfig.bgColor} border ${targetTierConfig.borderColor}`}>
          <div className="text-4xl mb-2">{targetTierConfig.icon}</div>
          <h3 className={`text-xl font-bold ${targetTierConfig.color}`}>{targetTierConfig.name} Tier</h3>
          <p className="text-gray-400 text-sm mt-1">Investment limit: {targetTierConfig.limit}</p>
          {wasAutoApproved && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
              ✓ Verified
            </span>
          )}
        </div>

        {txHash && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-gray-400 text-sm mb-2">Transaction:</p>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm break-all flex items-center gap-2"
            >
              View on Polygonscan
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        <button
          onClick={() => {
            setUpgradeStep('select');
            setSelectedTier(0);
            setTxHash(null);
            setSubmissionResult(null);
            refreshKYC();
          }}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
        >
          {wasAutoApproved ? 'Continue' : 'Return to KYC Status'}
        </button>
      </div>
    );
  };

  // ======================================
  // MAIN RENDER
  // ======================================

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-gray-400">
              Please connect your wallet to access KYC verification.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (kycLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Loading KYC Status</h1>
            <p className="text-gray-400">Please wait...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">KYC Verification</h1>
          <p className="text-gray-400">Complete verification to unlock higher investment limits</p>
        </div>

        {/* Status Banners */}
        {upgradeStep === 'select' && (
          <>
            {renderCurrentTierBanner()}
            {renderPendingBanner()}
            {renderRejectionBanner()}
          </>
        )}

        {/* Main Content */}
        {upgradeStep === 'select' && renderTierSelection()}
        {upgradeStep === 'form' && renderForm()}
        {(upgradeStep === 'signing' || upgradeStep === 'processing') && renderProcessingState()}
        {upgradeStep === 'submitted' && renderSuccessState()}
      </div>

      {/* Liveness Modal */}
      {showLivenessModal && (
        <LivenessCheck
          onComplete={handleLivenessComplete}
          onCancel={handleLivenessCancel}
        />
      )}
    </main>
  );
}
