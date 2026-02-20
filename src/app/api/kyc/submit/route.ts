// src/app/api/kyc/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { saveKYCDocuments, KYCDocuments } from '@/lib/kycStorage';
import { KYCManagerABI } from '@/config/abis';

// ============================================================================
// MULTICHAIN CONFIGURATION
// ============================================================================

interface ChainConfig {
  chain: Chain;
  name: string;
  rpcUrl: string;
  contracts: {
    KYCManager?: string;
  };
  isTestnet: boolean;
  nativeCurrency: string;
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Avalanche Fuji Testnet
  43113: {
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_FUJI_KYC_MANAGER || process.env.NEXT_PUBLIC_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'AVAX',
  },
  // Polygon Amoy Testnet
  80002: {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      KYCManager: process.env.POLYGON_AMOY_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'POL',
  },
  // Sepolia Testnet
  11155111: {
    chain: sepolia,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      KYCManager: process.env.SEPOLIA_KYC_MANAGER,
    },
    isTestnet: true,
    nativeCurrency: 'ETH',
  },
  // Avalanche Mainnet
  43114: {
    chain: avalanche,
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      KYCManager: process.env.AVALANCHE_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'AVAX',
  },
  // Polygon Mainnet
  137: {
    chain: polygon,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      KYCManager: process.env.POLYGON_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'POL',
  },
  // Ethereum Mainnet
  1: {
    chain: mainnet,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      KYCManager: process.env.ETHEREUM_KYC_MANAGER,
    },
    isTestnet: false,
    nativeCurrency: 'ETH',
  },
};

// Default chain ID
const DEFAULT_CHAIN_ID = 43113;

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;

// Scoring thresholds
const AUTO_APPROVAL_THRESHOLD = 80;
const MANUAL_REVIEW_THRESHOLD = 50;
const FACE_DETECTION_THRESHOLD = 50;
const LIVENESS_SCORE_THRESHOLD = 70;

// Blocked countries (ISO 3166-1 numeric codes)
const BLOCKED_COUNTRIES = [408, 364, 760, 729, 192];

// Tier names for logging
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];

// Rejection reason codes
enum RejectionReason {
  None = 0,
  BlockedCountry = 1,
  Underage = 2,
  DocumentExpired = 3,
  DocumentUnreadable = 4,
  FaceMismatch = 5,
  LivenessCheckFailed = 6,
  SanctionsList = 7,
  DuplicateIdentity = 8,
  SuspiciousActivity = 9,
  Other = 10,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

function createChainPublicClient(chainConfig: ChainConfig) {
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

function createChainWalletClient(chainConfig: ChainConfig, privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

// ============================================================================
// TIER REQUIREMENTS LOGIC
// ============================================================================

interface TierRequirements {
  needsPersonalInfo?: boolean;
  needsIdDocument?: boolean;
  needsSelfie?: boolean;
  needsLiveness?: boolean;
  needsAddressProof?: boolean;
  needsAccreditedProof?: boolean;
}

const TIER_NEW_REQUIREMENTS: Record<number, TierRequirements> = {
  1: { needsPersonalInfo: true, needsIdDocument: true },
  2: { needsSelfie: true },
  3: { needsLiveness: true, needsAddressProof: true },
  4: { needsAccreditedProof: true },
};

function getUpgradeRequirements(currentLevel: number, requestedLevel: number): TierRequirements {
  const requirements: TierRequirements = {
    needsPersonalInfo: false,
    needsIdDocument: false,
    needsSelfie: false,
    needsLiveness: false,
    needsAddressProof: false,
    needsAccreditedProof: false,
  };

  if (requestedLevel <= currentLevel) return requirements;

  for (let level = currentLevel + 1; level <= requestedLevel; level++) {
    const tierReqs = TIER_NEW_REQUIREMENTS[level];
    if (!tierReqs) continue;

    if (tierReqs.needsPersonalInfo) requirements.needsPersonalInfo = true;
    if (tierReqs.needsIdDocument) requirements.needsIdDocument = true;
    if (tierReqs.needsSelfie) requirements.needsSelfie = true;
    if (tierReqs.needsLiveness) requirements.needsLiveness = true;
    if (tierReqs.needsAddressProof) requirements.needsAddressProof = true;
    if (tierReqs.needsAccreditedProof) requirements.needsAccreditedProof = true;
  }

  return requirements;
}

// ============================================================================
// VERIFICATION HELPERS
// ============================================================================

interface VerificationDecision {
  verificationScore: number;
  canAutoApprove: boolean;
  rejectionReason: RejectionReason;
  rejectionDetails: string;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function evaluateNewSubmission(params: {
  requestedLevel: number;
  fullName: string | null;
  dateOfBirth: string | null;
  countryCode: number;
  hasId: boolean;
  hasSelfie: boolean;
  faceScore: number;
  faceSimilarity: number;
  livenessScore: number;
  livenessPassed: boolean;
  hasAccreditedProof: boolean;
}): VerificationDecision {
  const {
    requestedLevel, fullName, dateOfBirth, countryCode, hasId, hasSelfie,
    faceScore, livenessScore, livenessPassed, hasAccreditedProof,
  } = params;

  const requirements = getUpgradeRequirements(0, requestedLevel);

  console.log('New submission evaluation:', {
    requestedLevel, requirements,
    provided: { fullName: !!fullName, dateOfBirth: !!dateOfBirth, countryCode, hasId, hasSelfie, faceScore, livenessScore, livenessPassed, hasAccreditedProof }
  });

  if (BLOCKED_COUNTRIES.includes(countryCode)) {
    return { verificationScore: 0, canAutoApprove: false, rejectionReason: RejectionReason.BlockedCountry, rejectionDetails: 'Country not supported for KYC verification' };
  }

  if (dateOfBirth) {
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      return { verificationScore: 0, canAutoApprove: false, rejectionReason: RejectionReason.Underage, rejectionDetails: 'Must be at least 18 years old' };
    }
  }

  if (requirements.needsPersonalInfo && (!fullName || !dateOfBirth || countryCode === 0)) {
    return { verificationScore: 30, canAutoApprove: false, rejectionReason: RejectionReason.Other, rejectionDetails: 'Personal information required' };
  }

  if (requirements.needsIdDocument && !hasId) {
    return { verificationScore: 35, canAutoApprove: false, rejectionReason: RejectionReason.DocumentUnreadable, rejectionDetails: 'Government-issued ID document required' };
  }

  if (requirements.needsSelfie) {
    if (!hasSelfie) {
      return { verificationScore: 45, canAutoApprove: false, rejectionReason: RejectionReason.DocumentUnreadable, rejectionDetails: 'Selfie photo required' };
    }
    if (faceScore < FACE_DETECTION_THRESHOLD) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.FaceMismatch, rejectionDetails: `Face detection score too low (${faceScore}%, need ${FACE_DETECTION_THRESHOLD}%)` };
    }
  }

  if (requirements.needsLiveness) {
    if (!livenessPassed) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.LivenessCheckFailed, rejectionDetails: 'Liveness verification required' };
    }
    if (livenessScore < LIVENESS_SCORE_THRESHOLD) {
      return { verificationScore: 55, canAutoApprove: false, rejectionReason: RejectionReason.LivenessCheckFailed, rejectionDetails: `Liveness score too low (${livenessScore}%, need ${LIVENESS_SCORE_THRESHOLD}%)` };
    }
  }

  if (requirements.needsAccreditedProof) {
    if (!hasAccreditedProof) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.Other, rejectionDetails: 'Accredited investor documentation required for Diamond tier' };
    }
    return { verificationScore: 75, canAutoApprove: false, rejectionReason: RejectionReason.None, rejectionDetails: 'Diamond tier requires manual review' };
  }

  let score = 85;
  if (requestedLevel >= 3 && livenessPassed) score = 95;

  return { verificationScore: score, canAutoApprove: true, rejectionReason: RejectionReason.None, rejectionDetails: '' };
}

function evaluateUpgrade(params: {
  currentLevel: number;
  requestedLevel: number;
  hasSelfie: boolean;
  faceScore: number;
  faceSimilarity: number;
  livenessScore: number;
  livenessPassed: boolean;
  hasAccreditedProof: boolean;
}): VerificationDecision {
  const { currentLevel, requestedLevel, hasSelfie, faceScore, livenessScore, livenessPassed, hasAccreditedProof } = params;

  if (requestedLevel <= currentLevel) {
    return { verificationScore: 0, canAutoApprove: false, rejectionReason: RejectionReason.Other, rejectionDetails: 'Cannot upgrade to same or lower tier' };
  }

  const requirements = getUpgradeRequirements(currentLevel, requestedLevel);

  console.log('Upgrade evaluation:', {
    from: `${TIER_NAMES[currentLevel]} (${currentLevel})`,
    to: `${TIER_NAMES[requestedLevel]} (${requestedLevel})`,
    requirements,
    provided: { hasSelfie, faceScore, livenessScore, livenessPassed, hasAccreditedProof }
  });

  if (requirements.needsSelfie) {
    if (!hasSelfie) {
      return { verificationScore: 45, canAutoApprove: false, rejectionReason: RejectionReason.DocumentUnreadable, rejectionDetails: 'Selfie photo required for this upgrade' };
    }
    if (faceScore < FACE_DETECTION_THRESHOLD) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.FaceMismatch, rejectionDetails: `Face detection score too low (${faceScore}%, need ${FACE_DETECTION_THRESHOLD}%)` };
    }
  }

  if (requirements.needsLiveness) {
    if (!livenessPassed) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.LivenessCheckFailed, rejectionDetails: 'Liveness verification required for this upgrade' };
    }
    if (livenessScore < LIVENESS_SCORE_THRESHOLD) {
      return { verificationScore: 55, canAutoApprove: false, rejectionReason: RejectionReason.LivenessCheckFailed, rejectionDetails: `Liveness score too low (${livenessScore}%, need ${LIVENESS_SCORE_THRESHOLD}%)` };
    }
  }

  if (requirements.needsAccreditedProof) {
    if (!hasAccreditedProof) {
      return { verificationScore: 50, canAutoApprove: false, rejectionReason: RejectionReason.Other, rejectionDetails: 'Accredited investor documentation required for Diamond upgrade' };
    }
    return { verificationScore: 75, canAutoApprove: false, rejectionReason: RejectionReason.None, rejectionDetails: 'Diamond tier requires manual review' };
  }

  let score = 85;
  if (requirements.needsLiveness && livenessPassed && livenessScore >= LIVENESS_SCORE_THRESHOLD) {
    score = 95;
  } else if (requirements.needsSelfie && hasSelfie && faceScore >= FACE_DETECTION_THRESHOLD) {
    score = 85;
  }

  console.log(`✅ Upgrade requirements met! Score: ${score}`);
  return { verificationScore: score, canAutoApprove: true, rejectionReason: RejectionReason.None, rejectionDetails: '' };
}

async function fileToBase64(file: File | null): Promise<{ name: string; type: string; data: string } | undefined> {
  if (!file) return undefined;
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { name: file.name, type: file.type, data: base64 };
}

function getStatusName(status: number): string {
  const statusNames = ['Pending', 'Approved', 'Rejected', 'Expired'];
  return statusNames[status] || 'Unknown';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();

    // Get chain ID from form data or header
    const chainIdParam = formData.get('chainId') as string || request.headers.get('x-chain-id');
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : DEFAULT_CHAIN_ID;

    // Validate chain
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      return NextResponse.json({
        success: false,
        message: `Unsupported chain ID: ${chainId}`,
        supportedChains: Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
          chainId: parseInt(id, 10),
          name: config.name,
        })),
      }, { status: 400 });
    }

    // DEBUG: Log all form data keys and values
    console.log('\n========================================');
    console.log(`📥 FORM DATA RECEIVED - ${chainConfig.name} (${chainId})`);
    console.log('========================================');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: FILE - ${value.name} (${value.size} bytes, ${value.type})`);
      } else {
        const strValue = String(value);
        console.log(`  ${key}: ${strValue.length > 100 ? strValue.substring(0, 100) + '...' : strValue}`);
      }
    }
    console.log('========================================\n');

    // Extract all form fields
    const walletAddress = formData.get('walletAddress') as string;
    const requestedLevel = parseInt(formData.get('requestedLevel') as string) || 1;
    const currentLevel = parseInt(formData.get('currentLevel') as string) || 0;
    const isUpgradeFlag = formData.get('isUpgrade') as string;
    const txHash = formData.get('txHash') as string;

    // Personal info
    const fullName = formData.get('fullName') as string | null;
    const dateOfBirth = formData.get('dateOfBirth') as string | null;
    const countryCode = parseInt(formData.get('countryCode') as string) || 0;

    // Documents
    const idDocument = formData.get('idDocument') as File | null;
    const selfie = formData.get('selfie') as File | null;
    const addressProof = formData.get('addressProof') as File | null;
    const accreditedProof = formData.get('accreditedProof') as File | null;

    // Face verification scores
    const faceScore = parseInt(formData.get('faceScore') as string) || 0;
    const faceSimilarity = parseInt(formData.get('faceSimilarity') as string) || 0;

    // Liveness verification
    const livenessScore = parseInt(formData.get('livenessScore') as string) || 0;
    const livenessPassed = formData.get('livenessPassed') === 'true';

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ success: false, message: 'Invalid wallet address' }, { status: 400 });
    }

    const isUpgrade = isUpgradeFlag === 'true' || currentLevel > 0;
    const requirements = getUpgradeRequirements(isUpgrade ? currentLevel : 0, requestedLevel);

    // Log incoming request
    console.log('\n========================================');
    console.log(`KYC SUBMISSION RECEIVED - ${chainConfig.name}`);
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Chain:', chainConfig.name, `(${chainId})`);
    console.log('Wallet:', walletAddress);
    console.log('TX Hash:', txHash || 'N/A');
    console.log('Current Level:', currentLevel, `(${TIER_NAMES[currentLevel]})`);
    console.log('Requested Level:', requestedLevel, `(${TIER_NAMES[requestedLevel]})`);
    console.log('Is Upgrade:', isUpgrade);
    console.log('Documents:', {
      idDocument: idDocument ? `${idDocument.name} (${idDocument.size} bytes)` : 'No',
      selfie: selfie ? `${selfie.name} (${selfie.size} bytes)` : 'No',
      addressProof: addressProof ? 'Yes' : 'No',
      accreditedProof: accreditedProof ? 'Yes' : 'No',
    });
    console.log('Scores:', { faceScore, faceSimilarity, livenessScore, livenessPassed });
    console.log('========================================\n');

    // ==========================================
    // SAVE DOCUMENTS FOR ADMIN REVIEW
    // ==========================================
    try {
      // Get additional form fields
      const idDocumentFront = formData.get('idDocumentFront') as File | null;
      const idDocumentBack = formData.get('idDocumentBack') as File | null;
      const documentType = formData.get('documentType') as string | null;
      const documentNumber = formData.get('documentNumber') as string | null;
      const expiryDateField = formData.get('expiryDate') as string | null;
      
      // Get validation data
      const idValidationScore = parseFloat(formData.get('idValidationScore') as string) || undefined;
      const idValidationPassed = formData.get('idValidationPassed') === 'true';
      const idRequiresManualReview = formData.get('idRequiresManualReview') === 'true';
      const mrzDetected = formData.get('mrzDetected') === 'true';
      
      let idFoundText, idMatches, mrzData;
      try { idFoundText = JSON.parse(formData.get('idFoundText') as string || 'null'); } catch {}
      try { idMatches = JSON.parse(formData.get('idMatches') as string || 'null'); } catch {}
      try { mrzData = JSON.parse(formData.get('mrzData') as string || 'null'); } catch {}
      
      const kycDocs: KYCDocuments = {
        walletAddress,
        submittedAt: Date.now(),
        requestedLevel,
        currentLevel,
        isUpgrade,
        txHash: txHash || undefined,
        status: 'Pending',
        chainId, // Include chain ID in stored documents
        chainName: chainConfig.name,
        email: formData.get('email') as string || undefined,
        documentType: documentType || undefined,
        documentNumber: documentNumber || undefined,
        expiryDate: expiryDateField || undefined,
        // Documents
        idDocument: await fileToBase64(idDocument),
        idDocumentFront: await fileToBase64(idDocumentFront),
        idDocumentBack: await fileToBase64(idDocumentBack),
        selfie: await fileToBase64(selfie),
        addressProof: await fileToBase64(addressProof),
        accreditedProof: await fileToBase64(accreditedProof),
        // Personal info
        personalInfo: requirements.needsPersonalInfo ? {
          fullName: fullName || '',
          dateOfBirth: dateOfBirth || '',
          countryCode
        } : undefined,
        // Validation results
        idValidationScore,
        idValidationPassed,
        idRequiresManualReview,
        mrzDetected,
        idFoundText,
        idMatches,
        mrzData,
        // Scores
        faceScore,
        livenessScore,
        livenessPassed,
      };
      
      console.log('\n========================================');
      console.log(`💾 SAVING KYC DOCUMENTS - ${chainConfig.name}`);
      console.log('========================================');
      console.log('Wallet:', walletAddress);
      console.log('Chain:', chainConfig.name, `(${chainId})`);
      console.log('idDocument:', kycDocs.idDocument ? `${kycDocs.idDocument.name} (${kycDocs.idDocument.data?.length || 0} base64 chars)` : 'NONE');
      console.log('idDocumentFront:', kycDocs.idDocumentFront ? `${kycDocs.idDocumentFront.name} (${kycDocs.idDocumentFront.data?.length || 0} base64 chars)` : 'NONE');
      console.log('idDocumentBack:', kycDocs.idDocumentBack ? `${kycDocs.idDocumentBack.name} (${kycDocs.idDocumentBack.data?.length || 0} base64 chars)` : 'NONE');
      console.log('selfie:', kycDocs.selfie ? `${kycDocs.selfie.name} (${kycDocs.selfie.data?.length || 0} base64 chars)` : 'NONE');
      console.log('addressProof:', kycDocs.addressProof ? `${kycDocs.addressProof.name} (${kycDocs.addressProof.data?.length || 0} base64 chars)` : 'NONE');
      console.log('accreditedProof:', kycDocs.accreditedProof ? `${kycDocs.accreditedProof.name} (${kycDocs.accreditedProof.data?.length || 0} base64 chars)` : 'NONE');
      console.log('========================================\n');

      await saveKYCDocuments(kycDocs);
      console.log(`📁 [${chainConfig.name}] Documents saved for admin review`);
    } catch (storageErr) {
      console.error(`⚠️ [${chainConfig.name}] Failed to save documents (continuing):`, storageErr);
    }

    // Calculate verification decision
    let decision: VerificationDecision;

    if (isUpgrade) {
      decision = evaluateUpgrade({
        currentLevel, requestedLevel, hasSelfie: !!selfie, faceScore, faceSimilarity, livenessScore, livenessPassed, hasAccreditedProof: !!accreditedProof,
      });
    } else {
      decision = evaluateNewSubmission({
        requestedLevel, fullName, dateOfBirth, countryCode, hasId: !!idDocument, hasSelfie: !!selfie, faceScore, faceSimilarity, livenessScore, livenessPassed, hasAccreditedProof: !!accreditedProof,
      });
    }

    const { verificationScore, canAutoApprove, rejectionReason, rejectionDetails } = decision;

    console.log('========================================');
    console.log(`VERIFICATION DECISION - ${chainConfig.name}`);
    console.log('Score:', verificationScore, '| Auto-Approve:', canAutoApprove);
    console.log('Rejection:', rejectionReason, `(${RejectionReason[rejectionReason]})`);
    console.log('Details:', rejectionDetails || 'N/A');
    console.log('========================================\n');

    // Check for blockchain configuration
    const KYC_MANAGER_ADDRESS = chainConfig.contracts.KYCManager as `0x${string}` | undefined;

    // If no blockchain config, return simulated response
    if (!VERIFIER_PRIVATE_KEY || !KYC_MANAGER_ADDRESS) {
      console.log(`⚠️ [${chainConfig.name}] No blockchain configuration - returning simulated response`);
      const status = canAutoApprove ? 'auto_approved' : verificationScore >= MANUAL_REVIEW_THRESHOLD ? 'manual_review' : 'rejected';
      return NextResponse.json({
        success: canAutoApprove || verificationScore >= MANUAL_REVIEW_THRESHOLD,
        message: canAutoApprove 
          ? `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'KYC'} would be auto-approved on ${chainConfig.name}` 
          : verificationScore >= MANUAL_REVIEW_THRESHOLD 
            ? `Would be sent to manual review on ${chainConfig.name}` 
            : rejectionDetails,
        autoApproved: canAutoApprove, 
        verificationScore, 
        status, 
        isUpgrade, 
        simulatedResponse: true,
        chainId,
        chainName: chainConfig.name,
      });
    }

    // Blockchain interaction
    try {
      const publicClient = createChainPublicClient(chainConfig);
      const walletClient = createChainWalletClient(chainConfig, VERIFIER_PRIVATE_KEY as `0x${string}`);

      // Read current on-chain status
      const submission = (await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS, 
        abi: KYCManagerABI, 
        functionName: 'getSubmission', 
        args: [walletAddress as `0x${string}`],
      })) as { investor: string; status: number; level: number; submittedAt: bigint; expiresAt: bigint };

      const onChainStatus = Number(submission.status);
      const onChainLevel = Number(submission.level);

      console.log(`[${chainConfig.name}] ON-CHAIN STATUS:`, onChainStatus, getStatusName(onChainStatus), '| Level:', onChainLevel);

      const processingTime = Date.now() - startTime;

      // Status 0 = Pending
      if (onChainStatus === 0) {
        // BASIC level (Bronze) - contract auto-verifies internally during submitKYC
        if (requestedLevel === 1) {
          console.log(`✅ [${chainConfig.name}] BASIC tier - checking if auto-approved by contract...`);
          
          // Wait for the transaction to be fully processed and re-check status
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const updatedSubmission = (await publicClient.readContract({
            address: KYC_MANAGER_ADDRESS,
            abi: KYCManagerABI,
            functionName: 'getSubmission',
            args: [walletAddress as `0x${string}`],
          })) as { investor: string; status: number; level: number };
          
          const updatedStatus = Number(updatedSubmission.status);
          const updatedLevel = Number(updatedSubmission.level);
          
          console.log(`[${chainConfig.name}] Updated status after wait:`, updatedStatus, getStatusName(updatedStatus), '| Level:', updatedLevel);
          
          if (updatedStatus === 1) {
            // Auto-approved by contract!
            return NextResponse.json({
              success: true,
              message: `${TIER_NAMES[requestedLevel]} KYC auto-approved on ${chainConfig.name}! ✅`,
              autoApproved: true,
              verificationScore: 100,
              status: 'auto_approved',
              isUpgrade,
              processingTime: Date.now() - startTime,
              chainId,
              chainName: chainConfig.name,
            });
          }
          
          // Still pending - return pending status (shouldn't normally happen for BASIC)
          return NextResponse.json({
            success: true,
            message: `${TIER_NAMES[requestedLevel]} KYC submitted for review on ${chainConfig.name}.`,
            autoApproved: false,
            verificationScore,
            status: 'pending',
            isUpgrade,
            processingTime: Date.now() - startTime,
            chainId,
            chainName: chainConfig.name,
          });
        }

        // Higher tiers need manual approval from admin
        if (canAutoApprove && verificationScore >= AUTO_APPROVAL_THRESHOLD) {
          // Auto-approve via backend (call approveKYC)
          console.log(`📤 [${chainConfig.name}] Auto-approving via backend...`);
          try {
            const approveTx = await walletClient.writeContract({
              address: KYC_MANAGER_ADDRESS,
              abi: KYCManagerABI,
              functionName: 'approveKYC',
              args: [walletAddress as `0x${string}`, requestedLevel],
            });
            console.log(`[${chainConfig.name}] Approve TX:`, approveTx);
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            console.log(`✅ [${chainConfig.name}] KYC auto-approved by backend`);

            return NextResponse.json({
              success: true,
              message: `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'KYC'} auto-approved on ${chainConfig.name}! ✅`,
              autoApproved: true,
              verificationScore,
              status: 'auto_approved',
              isUpgrade,
              txHash: approveTx,
              processingTime: Date.now() - startTime,
              chainId,
              chainName: chainConfig.name,
            });
          } catch (approveError) {
            console.error(`[${chainConfig.name}] Auto-approve failed:`, approveError);
            // Fall through to manual review
          }
        }

        // Needs manual review
        return NextResponse.json({
          success: true,
          message: `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'application'} submitted for review on ${chainConfig.name}`,
          autoApproved: false,
          verificationScore,
          status: 'pending',
          isUpgrade,
          processingTime: Date.now() - startTime,
          chainId,
          chainName: chainConfig.name,
        });
      }

      // Status 1 = Approved
      if (onChainStatus === 1) {
        // Already approved - check if this is an upgrade request
        if (isUpgrade && requestedLevel > onChainLevel) {
          // Handle upgrade request
          console.log(`📤 [${chainConfig.name}] Processing upgrade request...`);
          
          if (canAutoApprove && verificationScore >= AUTO_APPROVAL_THRESHOLD) {
            // Auto-approve upgrade
            try {
              const upgradeTx = await walletClient.writeContract({
                address: KYC_MANAGER_ADDRESS,
                abi: KYCManagerABI,
                functionName: 'approveUpgrade',
                args: [walletAddress as `0x${string}`],
              });
              await publicClient.waitForTransactionReceipt({ hash: upgradeTx });
              console.log(`✅ [${chainConfig.name}] Upgrade auto-approved`);

              return NextResponse.json({
                success: true,
                message: `Upgraded to ${TIER_NAMES[requestedLevel]} on ${chainConfig.name}! ✅`,
                autoApproved: true,
                verificationScore,
                status: 'auto_approved',
                isUpgrade: true,
                txHash: upgradeTx,
                processingTime: Date.now() - startTime,
                chainId,
                chainName: chainConfig.name,
              });
            } catch (upgradeError) {
              console.error(`[${chainConfig.name}] Upgrade approval failed:`, upgradeError);
            }
          }

          // Upgrade pending manual review
          return NextResponse.json({
            success: true,
            message: `Upgrade to ${TIER_NAMES[requestedLevel]} submitted for review on ${chainConfig.name}`,
            autoApproved: false,
            verificationScore,
            status: 'pending',
            isUpgrade: true,
            currentLevel: onChainLevel,
            processingTime: Date.now() - startTime,
            chainId,
            chainName: chainConfig.name,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Already approved at ${TIER_NAMES[onChainLevel]} tier on ${chainConfig.name}`,
          status: 'approved',
          currentLevel: onChainLevel,
          onChainStatus,
          chainId,
          chainName: chainConfig.name,
        });
      }

      // Status 2 = Rejected
      if (onChainStatus === 2) {
        return NextResponse.json({
          success: false,
          message: `Previous application was rejected on ${chainConfig.name}. Please submit a new KYC request.`,
          status: 'rejected',
          onChainStatus,
          chainId,
          chainName: chainConfig.name,
        });
      }

      // Status 3 = Expired
      if (onChainStatus === 3) {
        return NextResponse.json({
          success: false,
          message: `KYC has expired on ${chainConfig.name}. Please submit a new application.`,
          status: 'expired',
          onChainStatus,
          chainId,
          chainName: chainConfig.name,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Current status on ${chainConfig.name}: ${getStatusName(onChainStatus)}`,
        status: getStatusName(onChainStatus).toLowerCase(),
        onChainStatus,
        verificationScore,
        chainId,
        chainName: chainConfig.name,
      });

    } catch (blockchainError: unknown) {
      const error = blockchainError as Error;
      console.error(`❌ [${chainConfig.name}] Blockchain error:`, error);
      
      let errorMessage = error.message || 'Blockchain transaction failed';
      if (errorMessage.includes('NotAuthorized')) errorMessage = `Backend verifier not authorized on ${chainConfig.name}.`;
      else if (errorMessage.includes('InvalidStatus') || errorMessage.includes('NotPending')) errorMessage = `KYC is not in a valid state for this action on ${chainConfig.name}.`;
      else if (errorMessage.includes('insufficient funds')) errorMessage = `Backend verifier has insufficient ${chainConfig.nativeCurrency} for gas on ${chainConfig.name}.`;
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        verificationScore,
        isUpgrade,
        chainId,
        chainName: chainConfig.name,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }, { status: 500 });
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Request processing error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error' }, { status: 500 });
  }
}
