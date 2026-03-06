// src/hooks/useKYCForm.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { useKYC, KYCTier } from '@/contexts/KYCContext';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';
import {
  validateIdDocument,
  DocumentValidationResult,
  ExpectedPersonalData,
  DOCUMENT_TYPES,
  DocumentType,
  fileToDataUrl,
  dataUrlToFile,
  rotateImage,
} from '@/lib/documentValidation';
import {
  Country,
  LivenessResult,
  DocumentCapture,
  OCRProgress,
  ValidationError,
  SubmissionResult,
  TIER_NAMES,
  TIER_STYLES,
  MAX_RETRIES,
  getRequirementsForUpgrade,
  getRequirementsList,
  calculateAge,
  mapContractError,
  getVerifiedDocumentsForTier,
  getRequirementsWithStatus,
  VerifiedDocuments,
} from '@/types/kyc';

export type UpgradeStep = 'select' | 'form' | 'signing' | 'processing' | 'submitted';

export function useKYCForm() {
  const { address, isConnected } = useAccount();
  const { kycData, tierLimits, formatLimit, refreshKYC } = useKYC();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // Multichain config
  const {
    chainId: currentChainId,
    chainName,
    contracts,
    fees,
    isDeployed,
    nativeCurrency,
    switchToChain,
    isSwitching: isChainSwitching,
  } = useChainConfig();

  // Contract write hooks
  const { writeContract, isPending: isWritePending, error: writeError } = useWriteContract();

  // ======================================
  // CONTRACT ADDRESS
  // ======================================
  
  const kycManagerAddress = useMemo(() => {
    if (!contracts?.KYCManager || contracts.KYCManager === ZERO_ADDRESS) {
      return undefined;
    }
    return contracts.KYCManager as `0x${string}`;
  }, [contracts]);

  // ======================================
  // CONTRACT READS - Pending Upgrade Check
  // ======================================

  // Check if user has a pending upgrade request
  const { 
    data: hasUpgradePendingData, 
    refetch: refetchHasUpgradePending 
  } = useReadContract({
    address: kycManagerAddress,
    abi: KYCManagerABI,
    functionName: 'hasUpgradePending',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!kycManagerAddress && isDeployed,
    }
  });

  // Get upgrade request details
  const { 
    data: upgradeRequestData, 
    refetch: refetchUpgradeRequest 
  } = useReadContract({
    address: kycManagerAddress,
    abi: KYCManagerABI,
    functionName: 'getUpgradeRequest',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!kycManagerAddress && isDeployed,
    }
  });

  // ======================================
  // STATE
  // ======================================

  // Submission result
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Form state
  const [upgradeStep, setUpgradeStep] = useState<UpgradeStep>('select');
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryCode, setCountryCode] = useState<number>(0);
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Document type and capture state
  const [documentType, setDocumentType] = useState<DocumentType>('national_id');
  const [documentCapture, setDocumentCapture] = useState<DocumentCapture>({
    front: null,
    back: null,
    frontPreview: null,
    backPreview: null,
  });
  const [webcamCapture, setWebcamCapture] = useState<{ isOpen: boolean; side: 'front' | 'back' } | null>(null);
  const [selfieWebcam, setSelfieWebcam] = useState(false);

  // Legacy single file state (for backward compatibility)
  const [idDocument, setIdDocument] = useState<File | null>(null);

  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [faceScore, setFaceScore] = useState<number>(0);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [accreditedProof, setAccreditedProof] = useState<File | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ID Validation state
  const [idValidation, setIdValidation] = useState<DocumentValidationResult | null>(null);
  const [isValidatingId, setIsValidatingId] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress>({ status: 'idle', progress: 0, message: '' });
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canValidate, setCanValidate] = useState(false);

  // Liveness state
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);

  // Countries
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash || undefined
  });

  // Check if KYC data is loading
  const kycLoading = kycData?.isLoading ?? false;

  // ======================================
  // DERIVED STATE
  // ======================================

  // Get KYC fee from chain config
  const kycFee = useMemo(() => {
    if (!fees?.KYC_FEE) return BigInt(0);
    return BigInt(fees.KYC_FEE);
  }, [fees]);

  // Pending upgrade from contract
  const hasPendingUpgrade = useMemo(() => {
    return hasUpgradePendingData === true;
  }, [hasUpgradePendingData]);

  const pendingUpgradeTier = useMemo(() => {
    if (!upgradeRequestData) return null;
    const request = upgradeRequestData as { requestedLevel: number; pending: boolean };
    if (request.pending) {
      return Number(request.requestedLevel);
    }
    return null;
  }, [upgradeRequestData]);

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

  const effectiveApprovedTier = useMemo(() => {
    if (!kycData) return 0;

    const tierToLevel: Record<string, number> = {
      'None': 0,
      'Bronze': 1,
      'Silver': 2,
      'Gold': 3,
      'Diamond': 4
    };

    if (kycData.status === 'Approved') {
      return tierToLevel[kycData.tier] || 0;
    }

    return 0;
  }, [kycData]);

  // Verified documents based on current approved tier
  const verifiedDocuments = useMemo<VerifiedDocuments>(() => {
    return getVerifiedDocumentsForTier(effectiveApprovedTier);
  }, [effectiveApprovedTier]);

  // Requirements with verification status for selected tier
  const requirementsWithStatus = useMemo(() => {
    if (!selectedTier) return [];
    return getRequirementsWithStatus(selectedTier, effectiveApprovedTier);
  }, [selectedTier, effectiveApprovedTier]);

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

  const [pendingRequestedTier, setPendingRequestedTier] = useState<number | null>(null);

  const wasUpgradeRejected = useMemo(() => {
    if (!isRejected) return false;
    const tierToLevel: Record<string, number> = {
      'None': 0, 'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Diamond': 4
    };
    const currentLevel = tierToLevel[kycData?.tier || 'None'] || 0;
    return currentLevel > 0;
  }, [isRejected, kycData]);

  const isUpgrade = effectiveApprovedTier > 0;

  // Combined check for any pending request (initial or upgrade)
  const hasAnyPendingRequest = useMemo(() => {
    return isPending || hasPendingUpgrade;
  }, [isPending, hasPendingUpgrade]);

  // Get the tier that's currently pending (either initial or upgrade)
  const currentPendingTier = useMemo(() => {
    if (hasPendingUpgrade && pendingUpgradeTier) {
      return pendingUpgradeTier;
    }
    if (isPending && pendingRequestedTier) {
      return pendingRequestedTier;
    }
    return null;
  }, [hasPendingUpgrade, pendingUpgradeTier, isPending, pendingRequestedTier]);

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

  const requirementsList = useMemo(() => {
    return getRequirementsList(upgradeRequirements);
  }, [upgradeRequirements]);

  const documentRequiresBack = useMemo(() => {
    return DOCUMENT_TYPES[documentType].requiresBack;
  }, [documentType]);

  // Check if wallet is on the correct chain
  const isWrongChain = useMemo(() => {
    return walletChainId !== currentChainId;
  }, [walletChainId, currentChainId]);

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
        setCountries([
          { code: 840, name: 'United States', blocked: false },
          { code: 826, name: 'United Kingdom', blocked: false },
          { code: 276, name: 'Germany', blocked: false },
          { code: 250, name: 'France', blocked: false },
          { code: 208, name: 'Denmark', blocked: false }
        ]);
      } finally {
        setCountriesLoading(false);
      }
    }
    loadCountries();
  }, []);

  // Refresh KYC on address or chain change
  useEffect(() => {
    if (address) {
      refreshKYC();
    }
  }, [address, currentChainId, refreshKYC]);

  // Process backend verification on tx success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      processBackendVerification();
      // Refetch pending upgrade status after successful transaction
      refetchHasUpgradePending();
      refetchUpgradeRequest();
    }
  }, [isTxSuccess, txHash]);

  // Sync document capture front to idDocument for backward compatibility
  useEffect(() => {
    setIdDocument(documentCapture.front);
  }, [documentCapture.front]);

  // Check if can validate
  useEffect(() => {
    const hasRequiredInfo =
      fullName.trim().length >= 2 &&
      dateOfBirth !== '' &&
      countryCode > 0;

    const hasRequiredImages =
      documentCapture.front !== null &&
      (!documentRequiresBack || documentCapture.back !== null);

    setCanValidate(hasRequiredInfo && hasRequiredImages);
  }, [fullName, dateOfBirth, countryCode, documentCapture, documentRequiresBack]);

  // Fetch pending tier for initial submissions
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

  // ======================================
  // HANDLERS
  // ======================================

  const handleTierSelect = useCallback((tier: number) => {
    if (tier <= effectiveApprovedTier) return;
    if (hasAnyPendingRequest) return;

    // Check if contracts are deployed
    if (!isDeployed) {
      setFormError(`KYC is not available on ${chainName || 'this network'}. Please switch to a supported network.`);
      return;
    }

    setSelectedTier(tier);
    setUpgradeStep('form');
    setFormError(null);
    setSubmissionError(null);

    // Reset form
    setFullName('');
    setEmail('');
    setDateOfBirth('');
    setCountryCode(kycData?.countryCode || 0);
    setDocumentNumber('');
    setExpiryDate('');
    setDocumentType('national_id');
    setDocumentCapture({ front: null, back: null, frontPreview: null, backPreview: null });
    setIdDocument(null);
    setIdValidation(null);
    setIsValidatingId(false);
    setOcrProgress({ status: 'idle', progress: 0, message: '' });
    setValidationError(null);
    setRetryCount(0);
    setSelfie(null);
    setSelfiePreview(null);
    setFaceScore(0);
    setFaceDetectionStatus('idle');
    setAddressProof(null);
    setAccreditedProof(null);
    setTermsAgreed(false);
    setLivenessResult(null);
  }, [effectiveApprovedTier, hasAnyPendingRequest, kycData?.countryCode, isDeployed, chainName]);

  const handleLivenessComplete = useCallback((result: LivenessResult) => {
    setLivenessResult(result);
    setShowLivenessModal(false);
  }, []);

  const handleLivenessCancel = useCallback(() => {
    setShowLivenessModal(false);
  }, []);

  const handleDocumentTypeChange = useCallback((type: DocumentType) => {
    setDocumentType(type);
    setDocumentCapture({ front: null, back: null, frontPreview: null, backPreview: null });
    setIdValidation(null);
    setIsValidatingId(false);
    setOcrProgress({ status: 'idle', progress: 0, message: '' });
    setValidationError(null);
    setRetryCount(0);
    setFormError(null);
  }, []);

  // Handle document capture from file
  const handleDocumentFileCapture = useCallback(async (side: 'front' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setValidationError({
        code: 'FILE_TOO_LARGE',
        message: 'File is too large',
        recoverable: true,
        suggestion: 'Please upload a file smaller than 10MB'
      });
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setValidationError({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file type',
        recoverable: true,
        suggestion: 'Please upload an image (PNG, JPG, WebP) or PDF file'
      });
      return;
    }

    setValidationError(null);

    try {
      const preview = await fileToDataUrl(file);

      setDocumentCapture(prev => ({
        ...prev,
        [side]: file,
        [`${side}Preview`]: preview,
      }));

      setIdValidation(null);
      setOcrProgress({ status: 'idle', progress: 0, message: '' });
      setFormError(null);

    } catch (error) {
      console.error('File capture error:', error);
      setValidationError({
        code: 'FILE_LOAD_ERROR',
        message: 'Failed to load the image',
        recoverable: true,
        suggestion: 'Please try uploading the file again'
      });
    }
  }, []);

  // Handle webcam capture completion
  const handleWebcamCaptureComplete = useCallback(async (dataUrl: string) => {
    if (!webcamCapture) return;

    const file = await dataUrlToFile(dataUrl, `document_${webcamCapture.side}_${Date.now()}.jpg`);
    await handleDocumentFileCapture(webcamCapture.side, file);
    setWebcamCapture(null);
  }, [webcamCapture, handleDocumentFileCapture]);

  // Handle selfie webcam capture
  const handleSelfieWebcamCapture = useCallback(async (dataUrl: string) => {
    const file = await dataUrlToFile(dataUrl, `selfie_${Date.now()}.jpg`);
    setSelfie(file);
    setSelfiePreview(dataUrl);
    setSelfieWebcam(false);

    await handleSelfieValidation(file, dataUrl);
  }, []);

  // Validate selfie with face detection
  const handleSelfieValidation = useCallback(async (file: File, previewUrl?: string) => {
    setFaceDetectionStatus('detecting');
    setFormError(null);

    try {
      const imageUrl = previewUrl || URL.createObjectURL(file);
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load image')); };
      });

      let result: { faceDetected: boolean; confidence: number } | null = null;

      try {
        const { detectFace } = await import('@/lib/livenessCheck');
        result = await detectFace(img);
      } catch (detectionError) {
        console.error('Face detection module error:', detectionError);
      }

      if (!previewUrl) URL.revokeObjectURL(imageUrl);

      if (result && result.faceDetected) {
        const score = Math.round((result.confidence || 0.85) * 100);
        setFaceScore(score);
        setFaceDetectionStatus('success');
      } else if (result && !result.faceDetected) {
        setFaceScore(0);
        setFaceDetectionStatus('failed');
        setFormError('No face detected. Please upload a clear photo of your face looking at the camera.');
      } else {
        setFaceScore(75);
        setFaceDetectionStatus('success');
      }
    } catch (error) {
      console.error('Selfie validation error:', error);
      setFaceScore(70);
      setFaceDetectionStatus('success');
    }
  }, []);

  // Handle image rotation
  const handleRotateImage = useCallback(async (side: 'front' | 'back') => {
    const preview = side === 'front' ? documentCapture.frontPreview : documentCapture.backPreview;
    if (!preview) return;

    try {
      const rotated = await rotateImage(preview, 90);
      const file = await dataUrlToFile(rotated, `document_${side}_${Date.now()}.jpg`);

      setDocumentCapture(prev => ({
        ...prev,
        [side]: file,
        [`${side}Preview`]: rotated,
      }));

      setIdValidation(null);
      setValidationError(null);
    } catch (error) {
      console.error('Rotate error:', error);
      setFormError('Failed to rotate image');
    }
  }, [documentCapture.frontPreview, documentCapture.backPreview]);

  // Handle image removal
  const handleRemoveImage = useCallback((side: 'front' | 'back') => {
    setDocumentCapture(prev => ({
      ...prev,
      [side]: null,
      [`${side}Preview`]: null,
    }));
    setIdValidation(null);
    setValidationError(null);
    setOcrProgress({ status: 'idle', progress: 0, message: '' });
  }, []);

  // Validate document with OCR
  const handleValidateDocument = useCallback(async () => {
    if (!canValidate) return;

    setIsValidatingId(true);
    setValidationError(null);
    setOcrProgress({ status: 'loading', progress: 5, message: 'Starting validation...' });

    try {
      const countryName = countries.find(c => c.code === countryCode)?.name || '';

      const expectedData: ExpectedPersonalData = {
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth,
        country: countryName,
        documentNumber: documentNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
      };

      const result = await validateIdDocument(
        documentCapture.frontPreview!,
        documentCapture.backPreview,
        expectedData,
        documentType,
        (stage, percent) => {
          setOcrProgress({ status: 'recognizing', progress: percent, message: stage });
        }
      );

      setIdValidation(result);
      setOcrProgress({ status: 'complete', progress: 100, message: 'Validation complete' });
    } catch (error) {
      console.error('Validation error:', error);
      setOcrProgress({ status: 'error', progress: 0, message: 'Validation failed' });
      setValidationError({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Validation failed',
        recoverable: true,
        suggestion: 'Please try again or use a clearer image'
      });
    } finally {
      setIsValidatingId(false);
    }
  }, [canValidate, countries, countryCode, fullName, dateOfBirth, documentNumber, expiryDate, documentCapture, documentType]);

  // Retry validation
  const handleRetryValidation = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;

    setRetryCount(prev => prev + 1);
    setValidationError(null);
    handleValidateDocument();
  }, [retryCount, handleValidateDocument]);

  // Handle selfie upload
  const handleSelfieUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setSelfie(null);
      setSelfiePreview(null);
      setFaceScore(0);
      setFaceDetectionStatus('idle');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('File is too large. Maximum size is 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Please upload an image file');
      return;
    }

    const preview = await fileToDataUrl(file);
    setSelfie(file);
    setSelfiePreview(preview);
    setFormError(null);

    await handleSelfieValidation(file, preview);
  }, [handleSelfieValidation]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    setFormError(null);

    // Check if deployed
    if (!isDeployed) {
      setFormError(`KYC is not available on ${chainName || 'this network'}. Please switch to a supported network.`);
      return false;
    }

    if (!termsAgreed) {
      setFormError('You must agree to the terms and conditions');
      return false;
    }

    // Only validate fields that are needed AND not already verified
    if (upgradeRequirements.needsPersonalInfo && !verifiedDocuments.idDocument) {
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

    if (upgradeRequirements.needsIdDocument && !verifiedDocuments.idDocument) {
      if (!documentCapture.front) {
        setFormError('Please upload the front of your government-issued ID');
        return false;
      }

      if (documentRequiresBack && !documentCapture.back) {
        setFormError(`Please upload the back of your ${DOCUMENT_TYPES[documentType].label}`);
        return false;
      }

      if (idValidation && !idValidation.isValid) {
        setFormError(idValidation.errors[0] || 'ID document validation failed. Please upload a valid document.');
        return false;
      }
    }

    if (upgradeRequirements.needsSelfie && !verifiedDocuments.selfie) {
      if (!selfie) {
        setFormError('Please upload a selfie photo');
        return false;
      }
      if (faceDetectionStatus === 'failed') {
        setFormError('No face detected in selfie. Please upload a clear photo of your face.');
        return false;
      }
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

    if (upgradeRequirements.needsAddressProof && !verifiedDocuments.addressProof) {
      if (!addressProof) {
        setFormError('Please upload proof of address');
        return false;
      }
    }

    if (upgradeRequirements.needsAccreditedProof && !verifiedDocuments.accreditedProof) {
      if (!accreditedProof) {
        setFormError('Please upload accredited investor documentation');
        return false;
      }
    }

    return true;
  }, [
    isDeployed, chainName, termsAgreed, upgradeRequirements, verifiedDocuments, 
    fullName, email, dateOfBirth, countryCode, countries, documentCapture, 
    documentRequiresBack, documentType, idValidation, selfie, faceDetectionStatus, 
    livenessResult, addressProof, accreditedProof
  ]);

  // Process backend verification
  const processBackendVerification = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append('walletAddress', address || '');
      formData.append('requestedLevel', selectedTier.toString());
      formData.append('currentLevel', effectiveApprovedTier.toString());
      formData.append('isUpgrade', isUpgrade.toString());
      formData.append('chainId', currentChainId.toString());

      if (txHash) {
        formData.append('txHash', txHash);
      }

      // ALWAYS send personal info if we have it (for admin reference)
      if (fullName) formData.append('fullName', fullName);
      if (email) formData.append('email', email);
      if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
      if (countryCode) formData.append('countryCode', countryCode.toString());
      if (documentNumber) formData.append('documentNumber', documentNumber);
      if (expiryDate) formData.append('expiryDate', expiryDate);

      // ALWAYS send document type
      formData.append('documentType', documentType);

      // ALWAYS send documents if we have them (regardless of tier requirements)
      if (documentCapture.front) {
        formData.append('idDocumentFront', documentCapture.front);
        formData.append('idDocument', documentCapture.front);
      }
      if (documentCapture.back) {
        formData.append('idDocumentBack', documentCapture.back);
      }
      if (selfie) {
        formData.append('selfie', selfie);
      }
      if (addressProof) {
        formData.append('addressProof', addressProof);
      }
      if (accreditedProof) {
        formData.append('accreditedProof', accreditedProof);
      }

      // Send face score if we have it
      if (faceScore > 0) {
        formData.append('faceScore', faceScore.toString());
      }

      // Pass ID validation data if we have it
      if (idValidation) {
        formData.append('idValidationScore', idValidation.confidence.toString());
        formData.append('idValidationPassed', idValidation.isValid.toString());
        formData.append('idRequiresManualReview', (idValidation.requiresManualReview || false).toString());
        if (idValidation.extractedData) {
          formData.append('idExtractedData', JSON.stringify(idValidation.extractedData));
        }
        if (idValidation.foundText) {
          formData.append('idFoundText', JSON.stringify(idValidation.foundText));
        }
        if (idValidation.matches) {
          formData.append('idMatches', JSON.stringify(idValidation.matches));
        }
        if (idValidation.errors && idValidation.errors.length > 0) {
          formData.append('idValidationErrors', JSON.stringify(idValidation.errors));
        }
        if (idValidation.warnings && idValidation.warnings.length > 0) {
          formData.append('idValidationWarnings', JSON.stringify(idValidation.warnings));
        }
        if (idValidation.mrzDetected !== undefined) {
          formData.append('mrzDetected', idValidation.mrzDetected.toString());
        }
        if (idValidation.mrzData) {
          formData.append('mrzData', JSON.stringify(idValidation.mrzData));
        }
      }

      // Send liveness data if we have it
      if (livenessResult) {
        formData.append('livenessScore', livenessResult.score.toString());
        formData.append('livenessPassed', livenessResult.passed.toString());
        formData.append('livenessCompletedChallenges', livenessResult.completedChallenges.toString());
        formData.append('livenessTotalChallenges', livenessResult.totalChallenges.toString());
      }

      const submitResponse = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: formData
      });

      const result = await submitResponse.json();

      if (submitResponse.ok) {
        const backendScore = result.verificationScore;
        const localScore = idValidation?.confidence || 0;
        const finalScore = backendScore > 0 ? backendScore : localScore;

        const isAutoApproved = result.autoApproved ||
          (idValidation?.isValid && finalScore >= 70 && !idValidation?.requiresManualReview);

        setSubmissionResult({
          autoApproved: isAutoApproved,
          status: result.status || (isAutoApproved ? 'approved' : 'pending'),
          verificationScore: finalScore
        });
        setUpgradeStep('submitted');
        setTimeout(() => {
          refreshKYC();
          refetchHasUpgradePending();
          refetchUpgradeRequest();
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
  }, [
    address, selectedTier, effectiveApprovedTier, isUpgrade, currentChainId, txHash,
    fullName, email, dateOfBirth, countryCode, documentNumber, expiryDate,
    documentType, documentCapture, selfie, addressProof, accreditedProof,
    faceScore, idValidation, livenessResult,
    refreshKYC, refetchHasUpgradePending, refetchUpgradeRequest
  ]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    if (!address) return;

    // Check if deployed
    if (!isDeployed || !kycManagerAddress) {
      setSubmissionError(`KYC contracts are not deployed on ${chainName || 'this network'}.`);
      return;
    }

    setUpgradeStep('signing');
    setSubmissionError(null);

    try {
      // Switch chain if needed
      if (isWrongChain) {
        await switchChainAsync({ chainId: currentChainId });
      }

      // Generate document hash string
      let documentContent = '';
      if (selfie) {
        documentContent = await selfie.text().catch(() => selfie.name);
      } else if (documentCapture.front) {
        documentContent = await documentCapture.front.text().catch(() => documentCapture.front!.name);
      }

      // Create a unique hash string for the document
      const docHash = keccak256(toBytes(documentContent || `kyc-${address}-${Date.now()}`));

      if (isUpgrade) {
        // requestUpgrade(uint8 _newLevel, string _documentHash) payable
        writeContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'requestUpgrade',
          args: [Number(selectedTier), docHash],
          value: kycFee,
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
        // submitKYC(uint8 _level, string _documentHash, uint16 _countryCode) payable
        writeContract({
          address: kycManagerAddress,
          abi: KYCManagerABI,
          functionName: 'submitKYC',
          args: [Number(selectedTier), docHash, Number(countryCode)],
          value: kycFee,
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
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionError('Failed to submit KYC. Please try again.');
      setUpgradeStep('form');
    }
  }, [
    validateForm, address, isDeployed, kycManagerAddress, chainName, isWrongChain,
    switchChainAsync, currentChainId, selfie, documentCapture, writeContract,
    selectedTier, kycFee, countryCode, isUpgrade
  ]);

  const handleBackToSelect = useCallback(() => {
    setUpgradeStep('select');
    setSelectedTier(0);
    setFormError(null);
    setSubmissionError(null);
  }, []);

  const handleFileChange = useCallback((
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
  }, []);

  const resetValidation = useCallback(() => {
    setIdValidation(null);
    setValidationError(null);
    setOcrProgress({ status: 'idle', progress: 0, message: '' });
  }, []);

  // ======================================
  // RETURN
  // ======================================

  return {
    // Connection
    isConnected,
    address,

    // Chain info
    currentChainId,
    chainName,
    nativeCurrency,
    isDeployed,
    isWrongChain,
    isChainSwitching,
    kycFee,

    // Loading
    kycLoading,
    countriesLoading,

    // KYC Data
    kycData,
    TIER_CONFIG,
    effectiveApprovedTier,
    isPending,
    isApproved,
    isRejected,
    pendingRequestedTier,
    wasUpgradeRejected,
    isUpgrade,
    upgradeRequirements,
    requirementsList,
    verifiedDocuments,
    requirementsWithStatus,

    // Pending upgrade state
    hasPendingUpgrade,
    pendingUpgradeTier,
    hasAnyPendingRequest,
    currentPendingTier,

    // Form state
    upgradeStep,
    setUpgradeStep,
    selectedTier,
    fullName,
    setFullName,
    email,
    setEmail,
    dateOfBirth,
    setDateOfBirth,
    countryCode,
    setCountryCode,
    documentNumber,
    setDocumentNumber,
    expiryDate,
    setExpiryDate,
    countries,

    // Document
    documentType,
    documentCapture,
    documentRequiresBack,
    webcamCapture,
    setWebcamCapture,

    // Validation
    idValidation,
    isValidatingId,
    ocrProgress,
    validationError,
    canValidate,
    retryCount,

    // Selfie
    selfie,
    selfiePreview,
    selfieWebcam,
    setSelfieWebcam,
    faceScore,
    faceDetectionStatus,

    // Other uploads
    addressProof,
    setAddressProof,
    accreditedProof,
    setAccreditedProof,

    // Liveness
    showLivenessModal,
    setShowLivenessModal,
    livenessResult,

    // Terms & submission
    termsAgreed,
    setTermsAgreed,
    formError,
    submissionError,
    submissionResult,
    txHash,
    isWritePending,
    isTxLoading,

    // Handlers
    handleTierSelect,
    handleBackToSelect,
    handleDocumentTypeChange,
    handleDocumentFileCapture,
    handleWebcamCaptureComplete,
    handleSelfieWebcamCapture,
    handleSelfieUpload,
    handleRotateImage,
    handleRemoveImage,
    handleValidateDocument,
    handleRetryValidation,
    handleLivenessComplete,
    handleLivenessCancel,
    handleSubmit,
    handleFileChange,
    resetValidation,
    refreshKYC,
    switchToChain,
  };
}
