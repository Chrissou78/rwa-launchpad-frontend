// src/app/admin/kyc/KYCManagement.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from "wagmi";
import { formatEther, parseEther, isAddress, getAddress } from "viem";
import Header from "@/components/Header";
import { useChainConfig } from "@/hooks/useChainConfig";
import { getNativeCurrency } from "@/config/contracts";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface KYCApplication {
  id: string;
  walletHash: string;
  walletPreview: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  countryCode: number;
  countryName: string;
  requestedLevel: number;
  currentLevel: number;
  status: "pending" | "approved" | "rejected" | "expired";
  submittedAt: string;
  documents: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
    accreditedProof?: string;
  };
  verificationScore?: number;
  rejectionReason?: string;
  notes?: string;
  linkedWallets?: string[];
}

interface KYCStats {
  totalApplications: number;
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  totalFeesCollected: string;
  averageProcessingTime: string;
}

interface KYCSettings {
  registrationFee: string;
  feeRecipient: string;
  trustedSigner: string;
  isPaused: boolean;
  defaultRestrictedCountries: number[];
  autoApprovalEnabled: boolean;
  autoApprovalMaxLevel: number;
}

interface SignedProof {
  level: number;
  countryCode: number;
  expiry: number;
  signature: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_NAMES: Record<number, string> = {
  0: "Unverified",
  1: "Basic",
  2: "Standard",
  3: "Accredited",
  4: "Institutional",
};

const LEVEL_COLORS: Record<number, string> = {
  0: "bg-gray-500",
  1: "bg-blue-500",
  2: "bg-green-500",
  3: "bg-purple-500",
  4: "bg-amber-500",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  expired: "bg-gray-500",
};

const REJECTION_REASONS = [
  { id: "invalid_document", label: "Invalid or unreadable document" },
  { id: "expired_document", label: "Expired identity document" },
  { id: "mismatch", label: "Information mismatch" },
  { id: "selfie_mismatch", label: "Selfie does not match ID photo" },
  { id: "restricted_country", label: "Restricted jurisdiction" },
  { id: "suspicious_activity", label: "Suspicious activity detected" },
  { id: "incomplete", label: "Incomplete documentation" },
  { id: "other", label: "Other (specify in notes)" },
];

const COUNTRY_NAMES: Record<number, string> = {
  840: "United States",
  826: "United Kingdom",
  276: "Germany",
  250: "France",
  392: "Japan",
  156: "China",
  408: "North Korea",
  364: "Iran",
  760: "Syria",
  192: "Cuba",
  // Add more as needed
};

const DEFAULT_RESTRICTED_COUNTRIES = [408, 364, 760, 192]; // NK, Iran, Syria, Cuba

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchKYCApplications(
  status?: string,
  search?: string,
  walletAddress?: string,
  chainId?: number
): Promise<KYCApplication[]> {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  if (search) params.append("search", search);

  const response = await fetch(`/api/admin/kyc/applications?${params}`, {
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": walletAddress || "",
      "x-chain-id": chainId?.toString() || "",
    },
  });

  if (!response.ok) throw new Error("Failed to fetch applications");
  const data = await response.json();
  return data.applications;
}

async function fetchKYCStats(
  walletAddress?: string,
  chainId?: number
): Promise<KYCStats> {
  const response = await fetch("/api/admin/kyc/stats", {
    headers: {
      "x-wallet-address": walletAddress || "",
      "x-chain-id": chainId?.toString() || "",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

async function approveKYCApplication(
  applicationId: string,
  adminAddress: string,
  signature: string,
  notes?: string,
  chainId?: number
): Promise<SignedProof> {
  const response = await fetch(`/api/admin/kyc/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": adminAddress,
      "x-chain-id": chainId?.toString() || "",
    },
    body: JSON.stringify({
      applicationId,
      adminAddress,
      signature,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve application");
  }
  return response.json();
}

async function rejectKYCApplication(
  applicationId: string,
  adminAddress: string,
  signature: string,
  reason: string,
  notes?: string,
  chainId?: number
): Promise<void> {
  const response = await fetch(`/api/admin/kyc/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": adminAddress,
      "x-chain-id": chainId?.toString() || "",
    },
    body: JSON.stringify({
      applicationId,
      adminAddress,
      signature,
      reason,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reject application");
  }
}

async function fetchKYCSettings(
  verifierAddress: string,
  publicClient: any,
  walletAddress?: string,
  chainId?: number
): Promise<KYCSettings> {
  const [
    registrationFee,
    feeRecipient,
    trustedSigner,
    isPaused,
  ] = await Promise.all([
    publicClient.readContract({
      address: verifierAddress,
      abi: KYC_VERIFIER_ABI,
      functionName: "registrationFee",
    }),
    publicClient.readContract({
      address: verifierAddress,
      abi: KYC_VERIFIER_ABI,
      functionName: "feeRecipient",
    }),
    publicClient.readContract({
      address: verifierAddress,
      abi: KYC_VERIFIER_ABI,
      functionName: "trustedSigner",
    }),
    publicClient.readContract({
      address: verifierAddress,
      abi: KYC_VERIFIER_ABI,
      functionName: "paused",
    }),
  ]);

  // Fetch auto-approval settings from API
  const settingsResponse = await fetch("/api/admin/kyc/settings", {
    headers: {
      "x-wallet-address": walletAddress || "",
      "x-chain-id": chainId?.toString() || "",
    },
  });
  const apiSettings = settingsResponse.ok ? await settingsResponse.json() : {};

  return {
    registrationFee: formatEther(registrationFee as bigint),
    feeRecipient: feeRecipient as string,
    trustedSigner: trustedSigner as string,
    isPaused: isPaused as boolean,
    defaultRestrictedCountries: apiSettings.restrictedCountries || DEFAULT_RESTRICTED_COUNTRIES,
    autoApprovalEnabled: apiSettings.autoApprovalEnabled || false,
    autoApprovalMaxLevel: apiSettings.autoApprovalMaxLevel || 1,
  };
}


// ============================================================================
// CONTRACT ABI (Partial)
// ============================================================================

const KYC_VERIFIER_ABI = [
  {
    name: "registrationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "feeRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "trustedSigner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "totalFeesCollected",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "setRegistrationFee",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_fee", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setFeeRecipient",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_recipient", type: "address" }],
    outputs: [],
  },
  {
    name: "setTrustedSigner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_signer", type: "address" }],
    outputs: [],
  },
  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-50">{subtitle}</p>}
        </div>
        <div className="text-3xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  onApprove,
  onReject,
  onViewDetails,
}: {
  application: KYCApplication;
  onApprove: () => void;
  onReject: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">
            {application.firstName} {application.lastName}
          </h3>
          <p className="text-sm text-gray-400">{application.email}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {application.walletPreview}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
              STATUS_COLORS[application.status]
            }`}
          >
            {application.status.toUpperCase()}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
              LEVEL_COLORS[application.requestedLevel]
            }`}
          >
            {LEVEL_NAMES[application.requestedLevel]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-500">Country:</span>
          <span className="text-white ml-2">
            {COUNTRY_NAMES[application.countryCode] || `Code: ${application.countryCode}`}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Submitted:</span>
          <span className="text-white ml-2">
            {new Date(application.submittedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {application.verificationScore !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Verification Score</span>
            <span className="text-white">{application.verificationScore}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                application.verificationScore >= 80
                  ? "bg-green-500"
                  : application.verificationScore >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${application.verificationScore}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          View Details
        </button>
        {application.status === "pending" && (
          <>
            <button
              onClick={onApprove}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApproveModal({
  application,
  onConfirm,
  onClose,
  isProcessing,
}: {
  application: KYCApplication;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">Approve KYC Application</h2>
        
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <p className="text-white font-medium">
            {application.firstName} {application.lastName}
          </p>
          <p className="text-gray-400 text-sm">{application.email}</p>
          <p className="text-gray-500 text-xs font-mono mt-1">
            {application.walletPreview}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-gray-400 text-sm">Level:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                LEVEL_COLORS[application.requestedLevel]
              }`}
            >
              {LEVEL_NAMES[application.requestedLevel]}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Add any notes about this approval..."
          />
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Approving will generate a signed KYC proof that the user can use to register 
          on-chain. The user will pay a 0.05 native token fee during registration.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⟳</span>
                Signing...
              </>
            ) : (
              "Sign & Approve"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  application,
  onConfirm,
  onClose,
  isProcessing,
}: {
  application: KYCApplication;
  onConfirm: (reason: string, notes: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">Reject KYC Application</h2>
        
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <p className="text-white font-medium">
            {application.firstName} {application.lastName}
          </p>
          <p className="text-gray-400 text-sm">{application.email}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Rejection Reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
          >
            <option value="">Select a reason...</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            rows={3}
            placeholder="Provide details for the rejection..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason, notes)}
            disabled={isProcessing || !reason}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⟳</span>
                Processing...
              </>
            ) : (
              "Reject Application"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  application,
  onClose,
}: {
  application: KYCApplication;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    async function fetchDocumentUrls() {
      if (!application.documents || !address) {
        setLoadingDocs(false);
        return;
      }

      const urls: Record<string, string> = {};
      
      for (const [docType, docId] of Object.entries(application.documents)) {
        if (docId) {
          try {
            const response = await fetch(`/api/admin/kyc/document/${docId}`, {
              headers: {
                'x-wallet-address': address,
              },
            });
            if (response.ok) {
              const data = await response.json();
              urls[docType] = data.url;
            }
          } catch (err) {
            console.error(`Failed to fetch ${docType} document:`, err);
          }
        }
      }
      
      setDocumentUrls(urls);
      setLoadingDocs(false);
    }

    fetchDocumentUrls();
  }, [application.documents, address]);

  const renderDocument = (docType: string, label: string, emoji: string) => {
    const docId = application.documents?.[docType as keyof typeof application.documents];
    if (!docId) return null;

    const url = documentUrls[docType];

    return (
      <div className="text-center">
        <div className="bg-gray-600 rounded-lg aspect-video flex items-center justify-center mb-1 overflow-hidden">
          {loadingDocs ? (
            <span className="animate-spin text-2xl">⟳</span>
          ) : url ? (
            <img 
              src={url} 
              alt={label}
              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(url, '_blank')}
            />
          ) : (
            <span className="text-4xl">{emoji}</span>
          )}
        </div>
        <p className="text-xs text-gray-400">{label}</p>
        {url && (
          <button
            onClick={() => window.open(url, '_blank')}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            View Full Size
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Application Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Personal Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm text-gray-400 mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs">Full Name</p>
              <p className="text-white">{application.firstName} {application.lastName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Email</p>
              <p className="text-white">{application.email}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Date of Birth</p>
              <p className="text-white">{application.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Country</p>
              <p className="text-white">{COUNTRY_NAMES[application.countryCode] || `Code: ${application.countryCode}`}</p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm text-gray-400 mb-3">Verification Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[application.status]}`}>
                {application.status.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Requested Level</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${LEVEL_COLORS[application.requestedLevel]}`}>
                {LEVEL_NAMES[application.requestedLevel]}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Current Level</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${LEVEL_COLORS[application.currentLevel]}`}>
                {LEVEL_NAMES[application.currentLevel]}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Submitted</p>
              <p className="text-white">{new Date(application.submittedAt).toLocaleString()}</p>
            </div>
          </div>
          {application.verificationScore !== undefined && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Verification Score</span>
                <span className="text-white">{application.verificationScore}%</span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    application.verificationScore >= 80
                      ? "bg-green-500"
                      : application.verificationScore >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${application.verificationScore}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Wallet Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm text-gray-400 mb-3">Wallet Information</h3>
          <p className="text-gray-500 text-xs">Wallet Hash</p>
          <p className="text-white font-mono text-sm break-all">{application.walletHash}</p>
          {application.linkedWallets && application.linkedWallets.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-500 text-xs">Linked Wallets</p>
              {application.linkedWallets.map((wallet, i) => (
                <p key={i} className="text-white font-mono text-sm">{wallet}</p>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        {application.documents && Object.keys(application.documents).length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-gray-400 mb-3">Documents</h3>
            <div className="grid grid-cols-3 gap-3">
              {renderDocument('idFront', 'ID Front', '🪪')}
              {renderDocument('idBack', 'ID Back', '🪪')}
              {renderDocument('selfie', 'Selfie', '🤳')}
              {renderDocument('addressProof', 'Address Proof', '📄')}
              {renderDocument('accreditedProof', 'Accredited Proof', '📋')}
            </div>
          </div>
        )}

        {/* Rejection Info */}
        {application.status === 'rejected' && application.rejectionReason && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-red-400 mb-2">Rejection Reason</h3>
            <p className="text-white">{application.rejectionReason}</p>
          </div>
        )}

        {/* Notes */}
        {application.notes && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-gray-400 mb-2">Admin Notes</h3>
            <p className="text-white">{application.notes}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onUpdateFee,
  onUpdateRecipient,
  onTogglePause,
  onUpdateAutoApproval,
  onUpdateRestrictedCountries,
  isProcessing,
}: {
  settings: KYCSettings;
  onUpdateFee: (fee: string) => void;
  onUpdateRecipient: (address: string) => void;
  onTogglePause: () => void;
  onUpdateAutoApproval: (enabled: boolean, maxLevel: number) => void;
  onUpdateRestrictedCountries: (countries: number[]) => void;
  isProcessing: boolean;
}) {
  const [newFee, setNewFee] = useState(settings.registrationFee);
  const [newRecipient, setNewRecipient] = useState(settings.feeRecipient);
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(
    settings.autoApprovalEnabled
  );
  const [autoApprovalMaxLevel, setAutoApprovalMaxLevel] = useState(
    settings.autoApprovalMaxLevel
  );
  const [restrictedCountries, setRestrictedCountries] = useState<number[]>(
    settings.defaultRestrictedCountries
  );
  const [newCountryCode, setNewCountryCode] = useState("");

  const handleAddCountry = () => {
    const code = parseInt(newCountryCode);
    if (!isNaN(code) && !restrictedCountries.includes(code)) {
      const updated = [...restrictedCountries, code];
      setRestrictedCountries(updated);
      onUpdateRestrictedCountries(updated);
      setNewCountryCode("");
    }
  };

  const handleRemoveCountry = (code: number) => {
    const updated = restrictedCountries.filter((c) => c !== code);
    setRestrictedCountries(updated);
    onUpdateRestrictedCountries(updated);
  };

  return (
    <div className="space-y-6">
      {/* Contract Settings */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Contract Settings
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Registration Fee (Native Token)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="0.05"
              />
              <button
                onClick={() => onUpdateFee(newFee)}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Fee Recipient
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                placeholder="0x..."
              />
              <button
                onClick={() => onUpdateRecipient(newRecipient)}
                disabled={isProcessing || !isAddress(newRecipient)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div>
            <p className="text-white font-medium">Contract Status</p>
            <p className="text-sm text-gray-400">
              {settings.isPaused
                ? "Contract is paused - registrations disabled"
                : "Contract is active - accepting registrations"}
            </p>
          </div>
          <button
            onClick={onTogglePause}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              settings.isPaused
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-red-600 hover:bg-red-500 text-white"
            }`}
          >
            {settings.isPaused ? "Unpause" : "Pause"}
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            Trusted Signer:{" "}
            <span className="font-mono text-white">{settings.trustedSigner}</span>
          </p>
        </div>
      </div>

      {/* Auto-Approval Settings */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Auto-Approval Settings
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-medium">Enable Auto-Approval</p>
            <p className="text-sm text-gray-400">
              Automatically approve applications up to a certain level
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprovalEnabled}
              onChange={(e) => {
                setAutoApprovalEnabled(e.target.checked);
                onUpdateAutoApproval(e.target.checked, autoApprovalMaxLevel);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {autoApprovalEnabled && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Maximum Auto-Approval Level
            </label>
            <select
              value={autoApprovalMaxLevel}
              onChange={(e) => {
                const level = parseInt(e.target.value);
                setAutoApprovalMaxLevel(level);
                onUpdateAutoApproval(autoApprovalEnabled, level);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="1">Level 1 - Basic (auto-approve basic only)</option>
              <option value="2">Level 2 - Standard (auto-approve up to standard)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Levels 3 (Accredited) and 4 (Institutional) always require manual review
            </p>
          </div>
        )}
      </div>

      {/* Restricted Countries */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Restricted Countries
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Users from these countries will be blocked from KYC approval
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {restrictedCountries.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/30 border border-red-500/30 text-red-400 rounded-full text-sm"
            >
              {COUNTRY_NAMES[code] || `Code: ${code}`}
              <button
                onClick={() => handleRemoveCountry(code)}
                className="hover:text-red-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCountryCode}
            onChange={(e) => setNewCountryCode(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="Enter ISO 3166-1 numeric country code"
          />
          <button
            onClick={handleAddCountry}
            disabled={!newCountryCode}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Add Restriction
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KYCManagement() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { chainId, chainName, contracts, explorerUrl, isTestnet, isDeployed } = useChainConfig();

  // State
  const [activeTab, setActiveTab] = useState<"applications" | "settings">(
    "applications"
  );
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [applications, setApplications] = useState<KYCApplication[]>([]);
  const [stats, setStats] = useState<KYCStats | null>(null);
  const [settings, setSettings] = useState<KYCSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedApplication, setSelectedApplication] =
    useState<KYCApplication | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const verifierAddress = contracts?.KYCVerifier ?? '';
  const isAdmin =
    address?.toLowerCase() ===
    process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

  // Load data
  const loadData = useCallback(async () => {
    if (!isConnected || !verifierAddress || !publicClient || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const [applicationsData, statsData, settingsData] = await Promise.all([
        fetchKYCApplications(statusFilter, searchQuery, address, chainId),
        fetchKYCStats(address, chainId),
        fetchKYCSettings(verifierAddress, publicClient, address, chainId),
      ]);

      setApplications(applicationsData);
      setStats(statsData);
      setSettings(settingsData);
    } catch (err) {
      console.error("Failed to load KYC data:", err);
      setError("Failed to load KYC data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnected,
    address,
    verifierAddress,
    publicClient,
    chainId,
    statusFilter,
    searchQuery,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sign admin action message
  const signAdminAction = async (action: string, applicationId: string) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");

    const message = `KYC Admin Action\n\nAction: ${action}\nApplication: ${applicationId}\nTimestamp: ${Date.now()}\nAdmin: ${address}`;

    return walletClient.signMessage({
      account: address,
      message,
    });
  };

  // Handle approve
  const handleApprove = async (notes: string) => {
    if (!selectedApplication || !address) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/kyc/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          "x-chain-id": chainId?.toString() || "",
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve application");
      }

      const result = await response.json();
      console.log("KYC Proof generated:", result.proof);
      
      setShowApproveModal(false);
      setSelectedApplication(null);
      await loadData();
    } catch (err) {
      console.error("Failed to approve:", err);
      setError(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async (reason: string, notes: string) => {
    if (!selectedApplication || !address) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/kyc/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          "x-chain-id": chainId?.toString() || "",
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          reason,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject application");
      }

      // Optimistically update UI - remove from list or change status
      setApplications(prev => 
        prev.map(app => 
          app.id === selectedApplication.id 
            ? { ...app, status: 'rejected' as const }
            : app
        )
      );

      setShowRejectModal(false);
      setSelectedApplication(null);
      
      // Refresh in background to ensure sync
      loadData();
      
    } catch (err) {
      console.error("Failed to reject:", err);
      setError(err instanceof Error ? err.message : "Failed to reject application");
      // Refresh to restore correct state on error
      await loadData();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle settings updates
  const handleUpdateFee = async (fee: string) => {
    if (!walletClient || !address || !verifierAddress) return;

    setIsProcessing(true);
    try {
      const hash = await walletClient.writeContract({
        address: verifierAddress as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: "setRegistrationFee",
        args: [parseEther(fee)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await loadData();
    } catch (err) {
      console.error("Failed to update fee:", err);
      setError("Failed to update registration fee");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRecipient = async (recipient: string) => {
    if (!walletClient || !address || !verifierAddress) return;

    setIsProcessing(true);
    try {
      const hash = await walletClient.writeContract({
        address: verifierAddress as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: "setFeeRecipient",
        args: [getAddress(recipient)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await loadData();
    } catch (err) {
      console.error("Failed to update recipient:", err);
      setError("Failed to update fee recipient");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePause = async () => {
    if (!walletClient || !address || !verifierAddress || !settings) return;

    setIsProcessing(true);
    try {
      const hash = await walletClient.writeContract({
        address: verifierAddress as `0x${string}`,
        abi: KYC_VERIFIER_ABI,
        functionName: settings.isPaused ? "unpause" : "pause",
        args: [],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle pause:", err);
      setError("Failed to toggle contract pause state");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAutoApproval = async (enabled: boolean, maxLevel: number) => {
    try {
      await fetch("/api/admin/kyc/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
          "x-chain-id": chainId?.toString() || "",
        },
        body: JSON.stringify({
          autoApprovalEnabled: enabled,
          autoApprovalMaxLevel: maxLevel,
        }),
      });
    } catch (err) {
      console.error("Failed to update auto-approval:", err);
    }
  };

  const handleUpdateRestrictedCountries = async (countries: number[]) => {
    try {
      await fetch("/api/admin/kyc/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
          "x-chain-id": chainId?.toString() || "",
        },
        body: JSON.stringify({
          restrictedCountries: countries,
        }),
      });
    } catch (err) {
      console.error("Failed to update restricted countries:", err);
    }
  };

  // Render states
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h1>
          <p className="text-gray-400">
            Please connect your admin wallet to access the KYC management dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">
            This wallet does not have admin permissions.
          </p>
          <p className="text-gray-500 text-sm mt-2 font-mono">
            Connected: {address}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">KYC Management</h1>
            <p className="text-gray-400">
              Manage KYC applications and verification settings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              {chainName || `Chain ${chainId}`}
            </span>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Applications"
              value={stats.totalApplications}
              icon="📋"
              color="blue"
            />
            <StatCard
              title="Pending Review"
              value={stats.pendingCount}
              icon="⏳"
              color="yellow"
            />
            <StatCard
              title="Approved Today"
              value={stats.approvedToday}
              icon="✅"
              color="green"
            />
            <StatCard
              title="Fees Collected"
              value={`${stats.totalFeesCollected} ${getNativeCurrency()}`}
              subtitle={stats.averageProcessingTime}
              icon="💰"
              color="purple"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "applications"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "settings"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Settings
          </button>
        </div>

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or wallet..."
                className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Applications Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⟳</div>
                <p className="text-gray-400">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-xl">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-400">No applications found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onApprove={() => {
                      setSelectedApplication(app);
                      setShowApproveModal(true);
                    }}
                    onReject={() => {
                      setSelectedApplication(app);
                      setShowRejectModal(true);
                    }}
                    onViewDetails={() => {
                      setSelectedApplication(app);
                      setShowDetailsModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && settings && (
          <SettingsPanel
            settings={settings}
            onUpdateFee={handleUpdateFee}
            onUpdateRecipient={handleUpdateRecipient}
            onTogglePause={handleTogglePause}
            onUpdateAutoApproval={handleUpdateAutoApproval}
            onUpdateRestrictedCountries={handleUpdateRestrictedCountries}
            isProcessing={isProcessing}
          />
        )}
      </main>

      {/* Modals */}
      {showApproveModal && selectedApplication && (
        <ApproveModal
          application={selectedApplication}
          onConfirm={handleApprove}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedApplication(null);
          }}
          isProcessing={isProcessing}
        />
      )}

      {showRejectModal && selectedApplication && (
        <RejectModal
          application={selectedApplication}
          onConfirm={handleReject}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedApplication(null);
          }}
          isProcessing={isProcessing}
        />
      )}

      {showDetailsModal && selectedApplication && (
        <DetailsModal
          application={selectedApplication}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedApplication(null);
          }}
        />
      )}
    </div>
  );
}

export default KYCManagement;
