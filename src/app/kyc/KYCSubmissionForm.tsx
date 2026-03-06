"use client";

import Link from "next/link";
import { useAccount, useChainId, useBalance, useWalletClient, useSignMessage } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseEther, formatEther } from "viem";
import { useKYC } from "@/hooks/useKYC";
import { config } from "@/config/wagmi";
import { CONTRACTS, FEES, getFees, getCurrentChainId, getNativeCurrency } from "@/config/contracts";
import {
  KYC_LEVELS,
  KYC_LEVEL_NAMES,
  KYC_INVESTMENT_LIMITS,
  formatInvestmentLimit,
} from "@/lib/constants/kyc";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { getLivenessChecker, LivenessChallenge, LivenessResult } from "@/lib/livenessCheck";
import { Upload, Check, AlertCircle, X, Camera, Clock } from 'lucide-react';
import { useRouter } from "next/navigation";
import { DocumentTypeSelector, MobileCamera } from '@/components/kyc/KYCComponents';
import { validateIdDocument, DocumentValidationResult, DocumentType } from "@/lib/documentValidation";

// ============================================================================
// CONSTANTS
// ============================================================================

const getKycFee = (): string => {
  const fees = getFees();
  return fees.KYC_FEE || fees.CREATION_FEE || "50000000000000000";
};

const getKycFeeFormatted = (): string => {
  const fees = getFees();
  return fees.KYC_FEE_FORMATTED || fees.CREATION_FEE_FORMATTED || "0.05";
};

const getNativeToken = (): string => {
  return getNativeCurrency();
};

const TIER_CONFIG: Record<
  number,
  {
    name: string;
    icon: string;
    limit: string;
    color: string;
    bgColor: string;
    borderColor: string;
    buttonColor: string;
    requirements: string[];
    processingTime: string;
  }
> = {
  0: {
    name: "Unverified",
    icon: "⚪",
    limit: "$0",
    color: "text-gray-400",
    bgColor: "bg-gray-800/50",
    borderColor: "border-gray-700",
    buttonColor: "bg-gray-600",
    requirements: [],
    processingTime: "",
  },
  1: {
    name: "Bronze",
    icon: "🥉",
    limit: formatInvestmentLimit(KYC_LEVELS.BASIC),
    color: "text-amber-400",
    bgColor: "bg-amber-900/20",
    borderColor: "border-amber-500/30",
    buttonColor: "bg-amber-600 hover:bg-amber-500",
    requirements: ["Email verification", "Basic information", "Government ID"],
    processingTime: "Instant - 24 hours",
  },
  2: {
    name: "Silver",
    icon: "🥈",
    limit: formatInvestmentLimit(KYC_LEVELS.STANDARD),
    color: "text-gray-300",
    bgColor: "bg-gray-700/30",
    borderColor: "border-gray-500/30",
    buttonColor: "bg-gray-600 hover:bg-gray-500",
    requirements: ["Bronze requirements", "Selfie verification"],
    processingTime: "1-3 business days",
  },
  3: {
    name: "Gold",
    icon: "🥇",
    limit: formatInvestmentLimit(KYC_LEVELS.ACCREDITED),
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/20",
    borderColor: "border-yellow-500/30",
    buttonColor: "bg-yellow-600 hover:bg-yellow-500",
    requirements: ["Silver requirements", "Proof of address", "Income verification"],
    processingTime: "3-5 business days",
  },
  4: {
    name: "Platinum",
    icon: "💎",
    limit: formatInvestmentLimit(KYC_LEVELS.INSTITUTIONAL),
    color: "text-cyan-400",
    bgColor: "bg-cyan-900/20",
    borderColor: "border-cyan-500/30",
    buttonColor: "bg-cyan-600 hover:bg-cyan-500",
    requirements: ["Gold requirements", "Corporate documents", "Authorized signatory"],
    processingTime: "5-10 business days",
  },
};

const documentRequiresBack = (type: DocumentType): boolean => {
  return type === 'national_id';
};

// KYCVerifier ABI
const KYC_VERIFIER_ABI = [
  {
    name: "registerWithProof",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "level", type: "uint8" },
      { name: "countryCode", type: "uint16" },
      { name: "expiry", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

type FormStep = "select" | "form" | "pending" | "payment" | "processing" | "success";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ============================================================================
// COMPONENTS
// ============================================================================

function ProgressSteps({ currentStep }: { currentStep: FormStep }) {
  const steps = [
    { key: "select", label: "Select Tier" },
    { key: "form", label: "Submit" },
    { key: "success", label: "Complete" },
  ];

  const currentIndex = steps.findIndex((s) => 
    s.key === currentStep || 
    (currentStep === "processing" && s.key === "form") ||
    (currentStep === "pending" && s.key === "form")
  );
  
  if (currentStep === "processing") return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center">
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all
                ${
                  index < currentIndex
                    ? "bg-green-500 text-white"
                    : index === currentIndex
                    ? "bg-purple-600 text-white ring-4 ring-purple-500/30"
                    : "bg-gray-700 text-gray-400"
                }
              `}
            >
              {index < currentIndex ? "✓" : index + 1}
            </div>
            <span
              className={`text-xs mt-2 ${
                index === currentIndex ? "text-purple-400" : "text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-6 ${
                index < currentIndex ? "bg-green-500" : "bg-gray-700"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function TierCard({
  tier,
  config,
  isSelected,
  isCurrent,
  isCompleted,
  canSelect,
  onSelect,
}: {
  tier: number;
  config: (typeof TIER_CONFIG)[number];
  isSelected: boolean;
  isCurrent: boolean;
  isCompleted: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={() => canSelect && onSelect()}
      className={`
        relative rounded-2xl p-6 border-2 transition-all flex flex-col
        ${
          isCurrent
            ? `${config.bgColor} ${config.borderColor} ring-2 ring-green-500/50`
            : isCompleted
            ? "bg-gray-800/50 border-gray-600"
            : canSelect
            ? `${config.bgColor} ${config.borderColor} hover:ring-2 hover:ring-purple-500/50 cursor-pointer`
            : "bg-gray-800/30 border-gray-700 opacity-50"
        }
      `}
    >
      {isCurrent && (
        <span className="absolute -top-3 -right-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
          ✓ CURRENT
        </span>
      )}

      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{config.icon}</div>
        <h3 className={`text-xl font-bold ${config.color}`}>{config.name}</h3>
        <p className="text-2xl font-bold text-white mt-2">{config.limit}</p>
        <p className="text-gray-400 text-sm">investment limit</p>
      </div>

      <div className="flex-1">
        <ul className="space-y-2">
          {config.requirements.map((req, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
              <span className={isCompleted || isCurrent ? "text-green-400" : config.color}>
                {isCompleted || isCurrent ? "✓" : "•"}
              </span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        {isCurrent && (
          <div className="text-center text-green-400 font-medium py-2">✓ Your Current Tier</div>
        )}
        {isCompleted && (
          <div className="text-center text-gray-500 font-medium py-2">✓ Completed</div>
        )}
        {canSelect && (
          <div
            className={`w-full py-2 rounded-xl font-semibold text-center text-white ${config.buttonColor}`}
          >
            Select
          </div>
        )}
        {!isCurrent && !isCompleted && !canSelect && (
          <div className="text-center text-gray-600 font-medium py-2">Locked</div>
        )}
      </div>

      {config.processingTime && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Processing: {config.processingTime}
        </p>
      )}
    </div>
  );
}

// OCR Progress Component
function OcrProgressBar({ stage, percent }: { stage: string; percent: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span className="text-sm text-gray-400">{stage || 'Processing...'}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{percent}%</span>
    </div>
  );
}

// ============================================================================
// LIVENESS CAPTURE COMPONENT
// ============================================================================

function LivenessCapture({ 
  onComplete, 
  isRunning, 
  setIsRunning 
}: { 
  onComplete: (result: LivenessResult) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(5);
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const checkerRef = useRef<ReturnType<typeof getLivenessChecker> | null>(null);

  useEffect(() => {
    return () => {
      checkerRef.current?.cleanup();
    };
  }, []);

  const handleStart = async () => {
    setError(null);
    setIsLoading(true);
    
    if (!videoRef.current || !canvasRef.current) {
      setError('Video elements not ready');
      setIsLoading(false);
      return;
    }

    const checker = getLivenessChecker();
    checkerRef.current = checker;

    const initialized = await checker.initialize(
      videoRef.current,
      canvasRef.current,
      {
        onChallengeUpdate: (challenge, index, total) => {
          setCurrentChallenge(challenge);
          setChallengeIndex(index);
          setTotalChallenges(total);
        },
        onProgress: (p) => setProgress(p),
        onFaceDetected: (detected) => setFaceDetected(detected),
      }
    );

    setIsLoading(false);

    if (!initialized) {
      setError('Failed to initialize camera. Please allow camera access and ensure no other app is using it.');
      return;
    }

    setIsReady(true);
    await checker.startPreview();
  };

  const handleBeginChallenge = async () => {
    if (!checkerRef.current) return;
    
    setIsRunning(true);
    checkerRef.current.stopPreview();
    
    const result = await checkerRef.current.start();
    
    setIsRunning(false);
    onComplete(result);
    checkerRef.current.cleanup();
    setIsReady(false);
  };

  const handleCancel = () => {
    checkerRef.current?.cleanup();
    setIsReady(false);
    setIsRunning(false);
    setCurrentChallenge(null);
    setProgress(0);
    setChallengeIndex(0);
  };

  const FaceGuideOverlay = () => (
    <div className="absolute inset-0 pointer-events-none">
      <svg 
        className="w-full h-full" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <mask id="faceMask">
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <ellipse cx="50" cy="42" rx="20" ry="28" fill="black" />
          </mask>
        </defs>
        
        <rect 
          x="0" y="0" width="100" height="100" 
          fill="rgba(0,0,0,0.6)" 
          mask="url(#faceMask)" 
        />
        
        <ellipse 
          cx="50" cy="42" rx="20" ry="28" 
          fill="none" 
          stroke={faceDetected ? "#22c55e" : "#ffffff"} 
          strokeWidth="0.5"
          strokeDasharray={faceDetected ? "none" : "2,1"}
          className="transition-all duration-300"
        />
        
        {!isRunning && (
          <>
            <path d="M30 18 L30 14 L34 14" fill="none" stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="0.4" />
            <path d="M70 18 L70 14 L66 14" fill="none" stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="0.4" />
            <path d="M30 66 L30 70 L34 70" fill="none" stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="0.4" />
            <path d="M70 66 L70 70 L66 70" fill="none" stroke={faceDetected ? "#22c55e" : "#ffffff"} strokeWidth="0.4" />
          </>
        )}
      </svg>
      
      {isReady && !isRunning && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className={`text-sm font-medium ${faceDetected ? 'text-green-400' : 'text-white'}`}>
            {faceDetected ? '✓ Face positioned correctly' : 'Position your face in the oval'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {(isReady || isRunning) && <FaceGuideOverlay />}
        
        {isReady && (
          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
            faceDetected ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}>
            <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
            {faceDetected ? 'Face detected' : 'No face'}
          </div>
        )}
        
        {isRunning && currentChallenge && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-12">
            <div className="text-center">
              <div className="text-5xl mb-3 animate-bounce">{currentChallenge.icon}</div>
              <p className="text-white text-xl font-semibold mb-1">{currentChallenge.instruction}</p>
              <p className="text-gray-400 text-sm">Step {challengeIndex + 1} of {totalChallenges}</p>
            </div>
          </div>
        )}
        
        {isRunning && (
          <div className="absolute top-4 left-4 right-20">
            <div className="h-2 bg-gray-700/80 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/80 text-xs mt-1 text-center">{Math.round(progress)}% complete</p>
          </div>
        )}
        
        {!isReady && !isRunning && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center p-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-600/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Liveness Verification</h3>
              <p className="text-gray-400 text-sm mb-1">We'll ask you to perform simple actions</p>
              <p className="text-gray-500 text-xs">Look at camera • Turn head • Blink • Smile</p>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white">Initializing camera...</p>
              <p className="text-gray-400 text-sm mt-1">Loading face detection models</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <p className="text-red-400 font-medium">Camera Error</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex gap-3">
        {!isReady && !isRunning && (
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Camera
              </>
            )}
          </button>
        )}
        
        {isReady && !isRunning && (
          <>
            <button
              type="button"
              onClick={handleBeginChallenge}
              disabled={!faceDetected}
              className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {faceDetected ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Begin Verification
                </>
              ) : (
                'Position your face first'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </>
        )}
        
        {isRunning && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Stop Verification
          </button>
        )}
      </div>
      
      {isReady && !isRunning && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips for best results
          </h4>
          <ul className="text-blue-300/80 text-sm space-y-1">
            <li>• Ensure good lighting on your face</li>
            <li>• Remove glasses if possible</li>
            <li>• Keep your face centered in the oval</li>
            <li>• Follow instructions slowly and clearly</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KYCSubmissionForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [isLivenessRunning, setIsLivenessRunning] = useState(false);
  const router = useRouter();

  const {
    status,
    kycLevel,
    isLoading: kycLoading,
    refreshStatus,
    getProof,
    submitKYC,
    generateLinkCode,
    useLinkCode,
  } = useKYC();

  // ============================================================================
  // STATE
  // ============================================================================

  const [step, setStep] = useState<FormStep>("select");
  const [selectedTier, setSelectedTier] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [countryCode, setCountryCode] = useState(0);
  const [documentType, setDocumentType] = useState<DocumentType>("passport");
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentFrontPreview, setDocumentFrontPreview] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentExpiry, setDocumentExpiry] = useState('');
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [documentBackPreview, setDocumentBackPreview] = useState<string | null>(null);

  // OCR Validation state
  const [idValidation, setIdValidation] = useState<DocumentValidationResult | null>(null);
  const [isValidatingId, setIsValidatingId] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ stage: string; percent: number }>({ stage: '', percent: 0 });

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Wallet linking
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkCodeInput, setLinkCodeInput] = useState("");

  // Countries
  const [countries, setCountries] = useState<{ code: number; name: string; blocked: boolean }[]>([]);

  // Additional document states for upgrades
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [addressProofPreview, setAddressProofPreview] = useState<string | null>(null);
  const [accreditedProof, setAccreditedProof] = useState<File | null>(null);
  const [accreditedProofPreview, setAccreditedProofPreview] = useState<string | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    async function loadCountries() {
      try {
        const response = await fetch("/api/kyc/countries");
        if (response.ok) {
          const data = await response.json();
          setCountries(data.countries || []);
        }
      } catch (err) {
        console.error("Failed to load countries:", err);
      }
    }
    loadCountries();
  }, []);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const effectiveTier = kycLevel;
  const isPending = status?.applicationStatus === 'pending';
  const isApproved = status?.applicationStatus === 'approved' && !status?.isExpired;
  const hasEnoughBalance = balance ? BigInt(balance.value) >= BigInt(getKycFee()) : false;

  const canSubmitForm = useMemo(() => {
    const currentLevel = effectiveTier;
    
    if (currentLevel === 0 && selectedTier >= 1) {
      if (!fullName.trim() || !email.trim() || !dateOfBirth || !countryCode) return false;
      if (!documentFront || !documentNumber.trim() || !documentExpiry) return false;
      if (documentRequiresBack(documentType) && !documentBack) return false;
    }
    
    if (currentLevel === 1 && selectedTier >= 2) {
      if (!selfie) return false;
    }

    if (currentLevel === 2 && selectedTier >= 3) {
      if (!livenessResult?.passed) return false;
    }
    
    if (currentLevel === 3 && selectedTier >= 4) {
      if (!accreditedProof) return false;
    }
    
    if (!termsAgreed) return false;
    return true;
  }, [effectiveTier, selectedTier, fullName, email, dateOfBirth, countryCode, documentFront, documentBack, documentNumber, documentExpiry, documentType, selfie, livenessResult, accreditedProof, termsAgreed]);
  
  const tierConfig = TIER_CONFIG[selectedTier];

  // ============================================================================
  // OCR VALIDATION
  // ============================================================================

  const handleValidateDocument = async () => {
    if (!documentFrontPreview) {
      setError('Please upload ID document front first');
      return false;
    }

    if (!fullName.trim() || !dateOfBirth) {
      setError('Please fill in your name and date of birth first');
      return false;
    }

    setIsValidatingId(true);
    setError(null);
    setIdValidation(null);
    setOcrProgress({ stage: 'Initializing...', percent: 0 });

    try {
      const countryObj = countries.find(c => c.code === countryCode);
      const countryName = countryObj?.name || '';

      const expectedData = {
        fullName,
        dateOfBirth,
        country: countryName,
        documentNumber: documentNumber || undefined,
      };

      const docType = documentType;

      const result = await validateIdDocument(
        documentFrontPreview,
        documentBackPreview || null,
        expectedData,
        docType,
        (stage, percent) => {
          setOcrProgress({ stage, percent });
        }
      );

      setIdValidation(result);

      if (!result.isValid && result.errors.length > 0) {
        setError(`Document validation: ${result.errors.join(', ')}`);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('OCR validation error:', err);
      setError(err.message || 'Document validation failed');
      return false;
    } finally {
      setIsValidatingId(false);
    }
  };

  const resetValidation = () => {
    setIdValidation(null);
    setOcrProgress({ stage: '', percent: 0 });
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTierSelect = (tier: number) => {
    if (tier <= effectiveTier || isPending) return;
    setSelectedTier(tier);
    setStep("form");
    setError(null);
  };

  const handleFileUpload = (type: "document" | "document_back" | "selfie" | "address_proof" | "accredited_proof", file: File | null) => {
    if (type === "document" || type === "document_back") {
      resetValidation();
    }

    if (type === "document") {
      setDocumentFront(file);
      setDocumentFrontPreview(file ? URL.createObjectURL(file) : null);
    } else if (type === "document_back") {
      setDocumentBack(file);
      setDocumentBackPreview(file ? URL.createObjectURL(file) : null);
    } else if (type === "selfie") {
      setSelfie(file);
      setSelfiePreview(file ? URL.createObjectURL(file) : null);
    } else if (type === "address_proof") {
      setAddressProof(file);
      setAddressProofPreview(file ? URL.createObjectURL(file) : null);
    } else if (type === "accredited_proof") {
      setAccreditedProof(file);
      setAccreditedProofPreview(file ? URL.createObjectURL(file) : null);
    }
  };

  const [proofData, setProofData] = useState<{
    level: number;
    countryCode: number;
    expiry: number;
    signature: string;
  } | null>(null);

  const handleSubmitForm = async () => {
    if (!address) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // For new users, validate document first
      if (effectiveTier === 0 && !idValidation?.isValid) {
        const isValid = await handleValidateDocument();
        if (!isValid) {
          setIsSubmitting(false);
          return;
        }
      }

      // Check balance
      if (!hasEnoughBalance) {
        setError(`Insufficient balance. You need ${getKycFeeFormatted()} ${getNativeToken()}`);
        setIsSubmitting(false);
        return;
      }

      // 1. SINGLE SIGNATURE for everything
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const message = `KYC Application\nWallet: ${address}\nLevel: ${selectedTier}\nTimestamp: ${timestamp}`;
      
      console.log('Step 1: Requesting signature...');
      const signature = await signMessageAsync({ message });
      console.log('Signature obtained');

      // 2. Upload all documents
      const uploadedDocs: Record<string, string> = {};
      
      const uploadDoc = async (file: File, docType: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', docType);
        formData.append('walletAddress', address);
        formData.append('signature', signature);
        formData.append('timestamp', timestamp);
        
        const response = await fetch('/api/kyc/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Failed to upload ${docType}`);
        }
        return data.documentId;
      };

      if (documentFront) {
        console.log('Step 2: Uploading documents...');
        uploadedDocs.idFront = await uploadDoc(documentFront, 'idFront');
      }
      if (documentBack) {
        uploadedDocs.idBack = await uploadDoc(documentBack, 'idBack');
      }
      if (selfie) {
        uploadedDocs.selfie = await uploadDoc(selfie, 'selfie');
      }
      if (livenessResult?.passed && livenessResult.screenshots?.length > 0) {
        for (let i = 0; i < Math.min(livenessResult.screenshots.length, 3); i++) {
          const res = await fetch(livenessResult.screenshots[i]);
          const blob = await res.blob();
          const file = new File([blob], `liveness_${i + 1}.jpg`, { type: 'image/jpeg' });
          uploadedDocs[`liveness_${i + 1}`] = await uploadDoc(file, 'livenessScreenshot');
        }
      }
      if (accreditedProof) {
        uploadedDocs.accreditedProof = await uploadDoc(accreditedProof, 'accreditedProof');
      }

      console.log('Documents uploaded:', Object.keys(uploadedDocs));

      // 3. PAY FIRST - before submit
      console.log('Step 3: Processing payment...');
      setStep('processing');
      
      // Generate proof for payment
      const proofResponse = await fetch('/api/kyc/generate-proof', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId?.toString() || '80002',
        },
        body: JSON.stringify({
          walletAddress: address,
          level: selectedTier,
          countryCode: effectiveTier === 0 ? countryCode : undefined,
          signature,
          timestamp,
        }),
      });
      
      const proofDataResponse = await proofResponse.json();
      if (!proofResponse.ok || !proofDataResponse.success) {
        throw new Error(proofDataResponse.error || 'Failed to generate proof');
      }

      const hash = await writeContract(config, {
        address: CONTRACTS.KYCVerifier as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: 'registerWithProof',
        args: [
          proofDataResponse.proof.level,
          proofDataResponse.proof.countryCode,
          BigInt(proofDataResponse.proof.expiry),
          proofDataResponse.proof.signature as `0x${string}`,
        ],
        value: BigInt(getKycFee()),
      });

      console.log('TX Hash:', hash);
      setTxHash(hash);

      const receipt = await waitForTransactionReceipt(config, { hash });
      console.log('TX confirmed:', receipt.status);

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // 4. SUBMIT after payment confirmed
      console.log('Step 4: Submitting KYC application...');
      
      const nameParts = fullName.trim().split(' ');
      const firstNamePart = nameParts[0] || '';
      const lastNamePart = nameParts.slice(1).join(' ') || '';

      const submissionData: any = {
        walletAddress: address,
        signature,
        timestamp: parseInt(timestamp),
        requestedLevel: selectedTier,
        documents: uploadedDocs,
        verificationScore: idValidation?.confidence,
        txHash: hash,
      };

      if (effectiveTier === 0) {
        submissionData.firstName = firstNamePart;
        submissionData.lastName = lastNamePart;
        submissionData.email = email;
        submissionData.dateOfBirth = dateOfBirth;
        submissionData.countryCode = countryCode;
        submissionData.documentType = documentType;
        submissionData.documentNumber = documentNumber;
        submissionData.documentExpiry = documentExpiry;
      }

      if (selectedTier >= 3 && livenessResult) {
        submissionData.livenessVerification = {
          passed: livenessResult.passed,
          score: livenessResult.score,
          completedChallenges: livenessResult.completedChallenges,
          totalChallenges: livenessResult.totalChallenges,
        };
      }

      const submitResponse = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId?.toString() || '80002',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await submitResponse.json();
      console.log('Submit result:', result);

      if (!submitResponse.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit KYC');
      }

      await refreshStatus();
      setStep('success');

    } catch (err: any) {
      console.error('KYC error:', err);
      if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled');
      } else {
        setError(err.message || 'Failed to complete KYC');
      }
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayAndVerify = async () => {
    if (!address || !proofData) return;
    setIsPaying(true);
    setError(null);

    try {
      console.log('Sending payment transaction...');
      const hash = await writeContract(config, {
        address: CONTRACTS.KYCVerifier as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: 'registerWithProof',
        args: [
          proofData.level,
          proofData.countryCode,
          BigInt(proofData.expiry),
          proofData.signature as `0x${string}`,
        ],
        value: BigInt(getKycFee()),
      });

      console.log('TX Hash:', hash);
      setTxHash(hash);
      setStep('processing');

      const receipt = await waitForTransactionReceipt(config, { hash });
      console.log('TX confirmed:', receipt.status);

      if (receipt.status === 'success') {
        await fetch('/api/kyc/confirm-payment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-chain-id': chainId?.toString() || '80002',
          },
          body: JSON.stringify({
            walletAddress: address,
            txHash: hash,
          }),
        });

        await refreshStatus();
        setStep('success');
      } else {
        throw new Error('Transaction failed');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled');
      } else {
        setError(err.shortMessage || err.message || 'Payment failed');
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleGenerateLinkCode = async () => {
    const result = await generateLinkCode();
    if (result) {
      setLinkCode(result.code);
    }
  };

  const handleUseLinkCode = async () => {
    if (!linkCodeInput.trim()) return;

    const success = await useLinkCode(linkCodeInput.trim());
    if (success) {
      setShowLinkModal(false);
      await refreshStatus();
    } else {
      setError("Failed to link wallet");
    }
  };

  // ============================================================================
  // RENDER: NOT CONNECTED
  // ============================================================================

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400">Please connect your wallet to access KYC verification.</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (kycLoading) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <svg className="w-12 h-12 mx-auto text-purple-400 animate-spin mb-6" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p className="text-gray-400">Loading KYC status...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STATUS BANNER
  // ============================================================================

  const renderStatusBanner = () => {
    if (effectiveTier === 0 && !isPending) return null;

    const config = TIER_CONFIG[effectiveTier];

    if (isPending) {
      return (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <svg className="w-8 h-8 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <div>
              <h2 className="text-xl font-semibold text-yellow-400">Application Under Review</h2>
              <p className="text-gray-400 mt-1">Your application is being processed. This usually takes a few minutes.</p>
            </div>
          </div>
        </div>
      );
    }

    if (isApproved) {
      return (
        <div className={`rounded-2xl p-6 mb-8 ${config.bgColor} border ${config.borderColor}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{config.icon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-2xl font-bold ${config.color}`}>{config.name} Tier</h2>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    ✓ Verified
                  </span>
                </div>
                <p className="text-gray-400 mt-1">Investment limit: {config.limit}</p>
              </div>
            </div>

            {effectiveTier < 4 && (
              <button
                onClick={() => handleTierSelect(effectiveTier + 1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
              >
                Upgrade Tier
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================================================
  // RENDER: TIER SELECTION
  // ============================================================================

  const renderTierSelection = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {effectiveTier > 0 ? "Upgrade Your Verification" : "Select Verification Tier"}
        </h2>
        <p className="text-gray-400">
          One-time registration fee: <span className="text-white font-medium">{getKycFeeFormatted()} {getNativeToken()}</span>
        </p>
      </div>

      {effectiveTier === 0 && !isPending && (
        <div className="mb-8 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-white font-medium">Already verified with another wallet?</h3>
              <p className="text-gray-400 text-sm mt-1">Link this wallet to skip re-verification.</p>
            </div>
            <button
              onClick={() => setShowLinkModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
            >
              Link Wallet
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((tier) => {
          const config = TIER_CONFIG[tier];
          const isCurrent = effectiveTier === tier;
          const isCompleted = effectiveTier > tier;
          const canSelect = tier > effectiveTier && !isPending;

          return (
            <TierCard
              key={tier}
              tier={tier}
              config={config}
              isSelected={selectedTier === tier}
              isCurrent={isCurrent}
              isCompleted={isCompleted}
              canSelect={canSelect}
              onSelect={() => handleTierSelect(tier)}
            />
          );
        })}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: FORM
  // ============================================================================

  const renderForm = () => {
    const currentLevel = effectiveTier;
    const needsPersonalInfo = currentLevel === 0;
    const needsIdDocument = currentLevel === 0;
    const needsSelfie = currentLevel < 2 && selectedTier >= 2;
    const needsAddressProof = currentLevel < 3 && selectedTier >= 3;
    const needsAccreditedProof = currentLevel < 4 && selectedTier >= 4;

    return (
      <div className="max-w-xl mx-auto">
        <div className={`rounded-2xl p-6 mb-6 ${tierConfig.bgColor} border ${tierConfig.borderColor}`}>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{tierConfig.icon}</div>
            <div>
              <h2 className={`text-2xl font-bold ${tierConfig.color}`}>{tierConfig.name} Tier</h2>
              <p className="text-gray-400">Investment limit: {tierConfig.limit}</p>
            </div>
          </div>
        </div>

        <button onClick={() => setStep("select")} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {currentLevel > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
            <p className="text-blue-400 text-sm">
              <span className="font-medium">Upgrading from {TIER_CONFIG[currentLevel].name}:</span> Only new requirements are shown below.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {needsPersonalInfo && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Country *</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={0}>Select your country</option>
                    {countries
                      .filter((c) => !c.blocked)
                      .map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {needsIdDocument && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Government ID *</h3>

              <DocumentTypeSelector 
                selectedType={documentType} 
                onSelect={(type) => {
                  setDocumentType(type);
                  resetValidation();
                  if (type === 'passport') {
                    setDocumentBack(null);
                    setDocumentBackPreview(null);
                  }
                }} 
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Document Number *</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="e.g. AB1234567"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Expiry Date *</label>
                  <input
                    type="date"
                    value={documentExpiry}
                    onChange={(e) => setDocumentExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  {documentType === 'passport' ? 'Passport Photo Page *' : 'Front of Document *'}
                </label>
                {documentFrontPreview ? (
                  <div className="relative">
                    <img src={documentFrontPreview} alt="ID Front" className="w-full max-w-sm mx-auto rounded-xl border border-gray-600" />
                    <button onClick={() => handleFileUpload("document", null)} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500">
                    <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-gray-400 text-sm">Upload front</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload("document", e.target.files?.[0] || null)} className="hidden" />
                  </label>
                )}
              </div>

              {documentRequiresBack(documentType) && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Back of Document *</label>
                  {documentBackPreview ? (
                    <div className="relative">
                      <img src={documentBackPreview} alt="ID Back" className="w-full max-w-sm mx-auto rounded-xl border border-gray-600" />
                      <button onClick={() => handleFileUpload("document_back", null)} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500">
                      <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-gray-400 text-sm">Upload back</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload("document_back", e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {documentFrontPreview && (
                <div className="mt-4 p-4 border border-gray-600 rounded-xl bg-gray-900/50">
                  {isValidatingId ? (
                    <OcrProgressBar stage={ocrProgress.stage} percent={ocrProgress.percent} />
                  ) : idValidation ? (
                    <div className={`p-3 rounded-lg ${idValidation.isValid ? 'bg-green-900/30 border border-green-500/50' : 'bg-yellow-900/30 border border-yellow-500/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={idValidation.isValid ? 'text-green-400 font-medium' : 'text-yellow-400 font-medium'}>
                          {idValidation.isValid ? '✓ Document verified' : '⚠ Review needed'}
                        </span>
                        <span className="text-sm text-gray-400">
                          Confidence: {idValidation.confidence}%
                        </span>
                      </div>
                      
                      {idValidation.foundText && (
                        <div className="text-sm text-gray-400 space-y-1 mb-2">
                          {idValidation.foundText.name && (
                            <p>Name: <span className="text-white">{idValidation.foundText.name}</span></p>
                          )}
                          {idValidation.foundText.dateOfBirth && (
                            <p>DOB: <span className="text-white">{idValidation.foundText.dateOfBirth}</span></p>
                          )}
                          {idValidation.foundText.documentNumber && (
                            <p>Doc #: <span className="text-white">{idValidation.foundText.documentNumber}</span></p>
                          )}
                          {idValidation.foundText.expiry && (
                            <p>Expiry: <span className={idValidation.matches.expiry.isValid ? 'text-green-400' : 'text-red-400'}>
                              {idValidation.foundText.expiry}
                            </span></p>
                          )}
                        </div>
                      )}

                      {idValidation.mrzDetected && (
                        <p className="text-xs text-blue-400 mb-2">✓ MRZ code detected</p>
                      )}

                      {idValidation.warnings && idValidation.warnings.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-400">
                          {idValidation.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                        </div>
                      )}

                      {idValidation.errors && idValidation.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-400">
                          {idValidation.errors.map((e, i) => <p key={i}>✗ {e}</p>)}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={resetValidation}
                        className="mt-3 text-sm text-gray-400 hover:text-white"
                      >
                        Re-validate
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleValidateDocument}
                      disabled={!fullName || !dateOfBirth || !documentNumber}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      Verify Document
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {needsSelfie && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Selfie Verification *</h3>
              <p className="text-gray-400 text-sm mb-4">Take a clear photo of yourself. This will be manually reviewed.</p>

              {selfiePreview ? (
                <div className="relative max-w-xs mx-auto">
                  <img src={selfiePreview} alt="Selfie" className="w-full aspect-square object-cover rounded-xl border border-gray-600" />
                  <button onClick={() => handleFileUpload("selfie", null)} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500 max-w-xs mx-auto">
                  <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-400">Upload selfie</span>
                  <input type="file" accept="image/*" capture="user" onChange={(e) => handleFileUpload("selfie", e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">⏱ Manual review required (1-3 business days)</p>
              </div>
            </div>
          )}

          {currentLevel < 3 && selectedTier >= 3 && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Liveness Verification *</h3>
              <p className="text-gray-400 text-sm mb-4">
                Complete a short video verification to prove you're a real person. You'll be asked to perform simple actions like looking at the camera, turning your head, and blinking.
              </p>
              
              {!livenessResult ? (
                <LivenessCapture 
                  onComplete={(result) => setLivenessResult(result)}
                  isRunning={isLivenessRunning}
                  setIsRunning={setIsLivenessRunning}
                />
              ) : (
                <div className={`p-4 rounded-lg ${
                  livenessResult.passed 
                    ? 'bg-green-900/30 border border-green-500/50' 
                    : 'bg-red-900/30 border border-red-500/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {livenessResult.passed ? (
                        <span className="text-green-400 font-medium">✓ Liveness verified</span>
                      ) : (
                        <span className="text-red-400 font-medium">✗ Verification failed</span>
                      )}
                      <span className="text-sm text-gray-400">
                        ({livenessResult.completedChallenges}/{livenessResult.totalChallenges} challenges)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLivenessResult(null)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Retry
                    </button>
                  </div>
                  {!livenessResult.passed && (
                    <p className="text-sm text-gray-400 mt-2">
                      Please try again in better lighting conditions.
                    </p>
                  )}
                </div>
              )}
              
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">⏱ Manual review required (3-5 business days)</p>
              </div>
            </div>
          )}

          {needsAccreditedProof && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Accredited Investor Documentation *</h3>
              <p className="text-gray-400 text-sm mb-4">Upload proof of accredited investor status (CPA letter, tax returns, or certification)</p>

              {accreditedProofPreview ? (
                <div className="relative">
                  <img src={accreditedProofPreview} alt="Accredited Proof" className="w-full max-w-sm mx-auto rounded-xl border border-gray-600" />
                  <button onClick={() => handleFileUpload("accredited_proof", null)} className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 cursor-pointer hover:border-gray-500">
                  <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-gray-400 text-sm">Upload accredited investor proof</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload("accredited_proof", e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">⏱ Manual review required (5-10 business days)</p>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-900 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-400 text-sm">
                I agree to the{" "}
                <Link href="/legal/terms" className="text-purple-400 hover:text-purple-300 underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link>.
                I confirm the information provided is accurate.
              </span>
            </label>

            <button
              onClick={handleSubmitForm}
              disabled={!canSubmitForm || isSubmitting || isValidatingId}
              className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Submit & Pay ${getKycFeeFormatted()} ${getNativeToken()}`
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPending = () => (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-yellow-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Application Submitted</h3>
      <p className="text-gray-400 mb-4">
        Your upgrade to {TIER_CONFIG[selectedTier].name} requires manual review.
      </p>
      <p className="text-gray-500 text-sm">
        You'll be notified once your application is approved.
      </p>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Complete Registration</h3>

        <p className="text-gray-400 text-center mb-6">
          Pay the one-time registration fee to activate your KYC verification on-chain.
        </p>

        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Registration Fee</span>
            <span className="text-white font-bold text-xl">{getKycFeeFormatted()} {getNativeToken()}</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm">
            <span className="text-gray-500">Your Balance</span>
            <span className={hasEnoughBalance ? "text-green-400" : "text-red-400"}>
              {balance ? formatEther(balance.value).slice(0, 8) : "0"} {getNativeToken()}
            </span>
          </div>
        </div>

        {!hasEnoughBalance && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm text-center">
              Insufficient balance. Please add {getNativeToken()} to continue.
            </p>
          </div>
        )}

        <button
          onClick={handlePayAndVerify}
          disabled={!hasEnoughBalance || isPaying}
          className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isPaying ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              Pay {getKycFeeFormatted()} {getNativeToken()} & Verify
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>

      <button onClick={() => setStep("form")} className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors">
        ← Back to form
      </button>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-md mx-auto text-center py-12">
      <svg className="w-20 h-20 mx-auto text-purple-400 animate-spin mb-8" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <h2 className="text-2xl font-bold text-white mb-4">Confirming Transaction</h2>
      <p className="text-gray-400 mb-6">Please wait while your transaction is being confirmed...</p>
      {txHash && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 text-sm"
        >
          View on Explorer →
        </a>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">Verification Complete!</h2>

      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${tierConfig.bgColor} ${tierConfig.borderColor} border`}
      >
        <span className="text-2xl">{tierConfig.icon}</span>
        <span className={`font-bold ${tierConfig.color}`}>{tierConfig.name} Tier</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">✓ Active</span>
      </div>

      <p className="text-gray-400 mb-8">Your KYC verification is now active. You can invest up to {tierConfig.limit}.</p>

      {txHash && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          View Transaction
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}

      <div className="flex gap-4 justify-center">
        <Link
          href="/invest"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
        >
          Start Investing
        </Link>
        <button
          onClick={() => {
            setStep("select");
            refreshStatus();
          }}
          className="px-6 py-3 border border-gray-600 hover:border-gray-500 text-white font-semibold rounded-xl transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderLinkModal = () => {
    if (!showLinkModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Link Wallet</h3>
            <button onClick={() => setShowLinkModal(false)} className="p-2 text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {effectiveTier > 0 ? (
            <div>
              <p className="text-gray-400 text-sm mb-4">Generate a code to link another wallet:</p>
              {linkCode ? (
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-mono font-bold text-purple-400 tracking-wider">{linkCode}</p>
                  <p className="text-gray-500 text-sm mt-2">Expires in 15 minutes</p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateLinkCode}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
                >
                  Generate Code
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm mb-4">Enter the code from your verified wallet:</p>
              <input
                type="text"
                value={linkCodeInput}
                onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                placeholder="RWA-XXXXXX"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-xl font-mono tracking-wider uppercase mb-4"
                maxLength={12}
              />
              <button
                onClick={handleUseLinkCode}
                disabled={!linkCodeInput.trim()}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-semibold rounded-xl"
              >
                Link Wallet
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">KYC Verification</h1>
        <p className="text-gray-400">Complete verification to unlock investment access</p>
      </div>

      <ProgressSteps currentStep={step} />

      {renderStatusBanner()}

      {step === "select" && renderTierSelection()}
      {step === "form" && renderForm()}
      {step === 'pending' && renderPending()}
      {step === "payment" && renderPayment()}
      {step === "processing" && renderProcessing()}
      {step === "success" && renderSuccess()}

      {renderLinkModal()}
    </div>
  );
}

export default KYCSubmissionForm;
