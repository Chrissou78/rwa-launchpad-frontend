import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { saveKYCDocuments } from '@/lib/kycStorage';

// ============================================================================
// CONFIGURATION
// ============================================================================

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;

// Scoring thresholds
const AUTO_APPROVAL_THRESHOLD = 80;
const MANUAL_REVIEW_THRESHOLD = 50;
const FACE_DETECTION_THRESHOLD = 50;
const FACE_MATCH_THRESHOLD = 70;
const LIVENESS_SCORE_THRESHOLD = 70;

// Blocked countries (ISO 3166-1 numeric codes)
const BLOCKED_COUNTRIES = [408, 364, 760, 729, 192];

// Tier names for logging
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];

// Contract ABI
const KYC_MANAGER_ABI = parseAbi([
  'function getKYCSubmission(address _user) view returns ((address user, uint8 status, uint8 level, uint8 requestedLevel, uint16 countryCode, bytes32 documentHash, bytes32 dataHash, uint256 submittedAt, uint256 verifiedAt, uint256 expiresAt, address verifiedBy, bool autoVerified, uint8 rejectionReason, string rejectionDetails, uint8 verificationScore, uint256 totalInvested))',
  'function startAutoVerification(address _user)',
  'function submitAutoVerificationResult(address _user, bool _passed, uint8 _confidenceScore, uint8 _rejectionReason, string _failureDetails)',
]);

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
// HELPER FUNCTIONS
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

// Helper to convert File to base64
async function fileToBase64(file: File | null): Promise<{ name: string; type: string; data: string } | undefined> {
  if (!file) return undefined;
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { name: file.name, type: file.type, data: base64 };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();

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
    console.log('KYC SUBMISSION RECEIVED');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
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
      const kycDocs = {
        walletAddress,
        submittedAt: Date.now(),
        email: formData.get('email') as string || undefined,
        idDocument: await fileToBase64(idDocument),
        selfie: await fileToBase64(selfie),
        addressProof: await fileToBase64(addressProof),
        accreditedProof: await fileToBase64(accreditedProof),
        personalInfo: requirements.needsPersonalInfo ? {
          fullName: fullName || '',
          dateOfBirth: dateOfBirth || '',
          countryCode
        } : undefined
      };
      await saveKYCDocuments(kycDocs);
      console.log('📁 Documents saved for admin review');
    } catch (storageErr) {
      console.error('⚠️ Failed to save documents (continuing):', storageErr);
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
    console.log('VERIFICATION DECISION');
    console.log('Score:', verificationScore, '| Auto-Approve:', canAutoApprove);
    console.log('Rejection:', rejectionReason, `(${RejectionReason[rejectionReason]})`);
    console.log('Details:', rejectionDetails || 'N/A');
    console.log('========================================\n');

    // If no blockchain config, return simulated response
    if (!VERIFIER_PRIVATE_KEY || !KYC_MANAGER_ADDRESS) {
      console.log('⚠️ No blockchain configuration - returning simulated response');
      const status = canAutoApprove ? 'auto_approved' : verificationScore >= MANUAL_REVIEW_THRESHOLD ? 'manual_review' : 'rejected';
      return NextResponse.json({
        success: canAutoApprove || verificationScore >= MANUAL_REVIEW_THRESHOLD,
        message: canAutoApprove ? `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'KYC'} would be auto-approved` : verificationScore >= MANUAL_REVIEW_THRESHOLD ? 'Would be sent to manual review' : rejectionDetails,
        autoApproved: canAutoApprove, verificationScore, status, isUpgrade, simulatedResponse: true,
      });
    }

    // Blockchain submission
    try {
      const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
      const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY as `0x${string}`);
      const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) });

      const submission = (await publicClient.readContract({
        address: KYC_MANAGER_ADDRESS, abi: KYC_MANAGER_ABI, functionName: 'getKYCSubmission', args: [walletAddress as `0x${string}`],
      })) as { user: string; status: number; level: number; requestedLevel: number; countryCode: number; verificationScore: number };

      const onChainStatus = Number(submission.status);
      const onChainLevel = Number(submission.level);

      console.log('ON-CHAIN STATUS:', onChainStatus, getStatusName(onChainStatus), '| Level:', onChainLevel);

      if (onChainStatus === 1) {
        console.log('📤 Starting auto-verification on-chain...');
        const tx1 = await walletClient.writeContract({
          address: KYC_MANAGER_ADDRESS, abi: KYC_MANAGER_ABI, functionName: 'startAutoVerification', args: [walletAddress as `0x${string}`],
        });
        console.log('TX1:', tx1);
        await publicClient.waitForTransactionReceipt({ hash: tx1 });
        console.log('✅ Auto-verification started');

        console.log('📤 Submitting verification result...');
        const tx2 = await walletClient.writeContract({
          address: KYC_MANAGER_ADDRESS, abi: KYC_MANAGER_ABI, functionName: 'submitAutoVerificationResult',
          args: [walletAddress as `0x${string}`, canAutoApprove, verificationScore, rejectionReason, rejectionDetails],
        });
        console.log('TX2:', tx2);
        await publicClient.waitForTransactionReceipt({ hash: tx2 });
        console.log('✅ Verification result submitted');

        const processingTime = Date.now() - startTime;

        if (canAutoApprove) {
          return NextResponse.json({ success: true, message: `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'KYC'} auto-approved! ✅`, autoApproved: true, verificationScore, status: 'auto_approved', isUpgrade, txHash: tx2, processingTime });
        } else if (verificationScore >= MANUAL_REVIEW_THRESHOLD) {
          return NextResponse.json({ success: true, message: `${TIER_NAMES[requestedLevel]} ${isUpgrade ? 'upgrade' : 'application'} sent to manual review`, autoApproved: false, verificationScore, status: 'manual_review', isUpgrade, txHash: tx2, processingTime });
        } else {
          return NextResponse.json({ success: false, message: rejectionDetails || 'Verification rejected', autoApproved: false, verificationScore, status: 'rejected', rejectionReason: RejectionReason[rejectionReason], isUpgrade, txHash: tx2, processingTime });
        }
      }

      if (onChainStatus === 2) return NextResponse.json({ success: true, message: 'Verification already in progress', status: 'auto_verifying', onChainStatus });
      if (onChainStatus === 3) return NextResponse.json({ success: true, message: 'Application is pending manual review', status: 'manual_review', onChainStatus });
      if (onChainStatus === 4) return NextResponse.json({ success: true, message: `Already approved at ${TIER_NAMES[onChainLevel]} tier`, status: 'approved', currentLevel: onChainLevel, onChainStatus });
      if (onChainStatus === 5) return NextResponse.json({ success: false, message: 'Previous application was rejected. Please submit a new KYC request.', status: 'rejected', onChainStatus });

      return NextResponse.json({ success: true, message: `Current status: ${getStatusName(onChainStatus)}`, status: getStatusName(onChainStatus).toLowerCase(), onChainStatus, verificationScore });
    } catch (blockchainError: unknown) {
      const error = blockchainError as Error;
      console.error('❌ Blockchain error:', error);
      let errorMessage = error.message || 'Blockchain transaction failed';
      if (errorMessage.includes('NotAuthorized')) errorMessage = 'Backend verifier not authorized.';
      else if (errorMessage.includes('InvalidStatus')) errorMessage = 'KYC is not in a valid state for verification.';
      else if (errorMessage.includes('insufficient funds')) errorMessage = 'Backend verifier has insufficient gas.';
      return NextResponse.json({ success: false, message: errorMessage, verificationScore, isUpgrade, error: process.env.NODE_ENV === 'development' ? error.message : undefined }, { status: 500 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Request processing error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error' }, { status: 500 });
  }
}

function getStatusName(status: number): string {
  const statusNames = ['None', 'Pending', 'AutoVerifying', 'ManualReview', 'Approved', 'Rejected', 'Expired', 'Revoked'];
  return statusNames[status] || 'Unknown';
}