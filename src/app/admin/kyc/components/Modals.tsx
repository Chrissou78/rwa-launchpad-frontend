// src/app/admin/kyc/components/Modals.tsx
'use client';

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { TIER_NAMES } from '../types';
import { formatAddress } from '../utils';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, title, icon, iconBg, children }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// APPROVE MODAL
// ============================================================================

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  onApprove: (tier: number) => void;
  isProcessing: boolean;
}

export function ApproveModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  onApprove, 
  isProcessing 
}: ApproveModalProps) {
  const [selectedTier, setSelectedTier] = useState(currentTier || 1);

  const handleApprove = () => {
    onApprove(selectedTier);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve KYC"
      icon={<CheckCircle className="w-5 h-5 text-green-400" />}
      iconBg="bg-green-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Select Tier to Approve</label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedTier === tier
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <div className="font-medium">Tier {tier}</div>
                <div className="text-xs opacity-70">{TIER_NAMES[tier]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">
            This will approve the KYC submission and grant {TIER_NAMES[selectedTier]} access level.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// REJECT MODAL
// ============================================================================

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}

export function RejectModal({ 
  isOpen, 
  onClose, 
  address, 
  onReject, 
  isProcessing 
}: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason);
  };

  const quickReasons = [
    'Invalid or unreadable documents',
    'Document expired',
    'Information mismatch',
    'Suspected fraud',
    'Incomplete submission',
    'Failed identity verification'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject KYC"
      icon={<XCircle className="w-5 h-5 text-red-400" />}
      iconBg="bg-red-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejection..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded text-gray-300 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">
              This will reject the KYC submission. The user will need to resubmit their documents.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// RESET MODAL
// ============================================================================

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onReset: (reason: string) => void;
  isProcessing: boolean;
}

export function ResetModal({ 
  isOpen, 
  onClose, 
  address, 
  onReset, 
  isProcessing 
}: ResetModalProps) {
  const [reason, setReason] = useState('');

  const handleReset = () => {
    if (!reason.trim()) return;
    onReset(reason);
  };

  const quickReasons = [
    'User requested reset',
    'Documents need re-verification',
    'Information update required',
    'Tier upgrade requirement',
    'Expiration reset',
    'Administrative correction'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset KYC Status"
      icon={<RotateCcw className="w-5 h-5 text-yellow-400" />}
      iconBg="bg-yellow-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Reset Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for reset..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded text-gray-300 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              This will reset the KYC status to pending. The submission will need to be reviewed again.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Reset
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// APPROVE UPGRADE MODAL
// ============================================================================

interface ApproveUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  requestedTier: number;
  onApprove: () => void;
  isProcessing: boolean;
}

export function ApproveUpgradeModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  requestedTier,
  onApprove, 
  isProcessing 
}: ApproveUpgradeModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Tier Upgrade"
      icon={<CheckCircle className="w-5 h-5 text-purple-400" />}
      iconBg="bg-purple-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-3">Upgrade Details</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="px-3 py-2 bg-gray-700 rounded-lg mb-1">
                <span className="text-lg font-bold text-white">Tier {currentTier}</span>
              </div>
              <span className="text-xs text-gray-400">{TIER_NAMES[currentTier]}</span>
            </div>
            <div className="text-2xl text-gray-500">→</div>
            <div className="text-center">
              <div className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg mb-1">
                <span className="text-lg font-bold text-purple-400">Tier {requestedTier}</span>
              </div>
              <span className="text-xs text-purple-400">{TIER_NAMES[requestedTier]}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-400">
            This will upgrade the user to {TIER_NAMES[requestedTier]} tier with higher investment limits.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve Upgrade
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// REJECT UPGRADE MODAL
// ============================================================================

interface RejectUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentTier: number;
  requestedTier: number;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}

export function RejectUpgradeModal({ 
  isOpen, 
  onClose, 
  address, 
  currentTier,
  requestedTier,
  onReject, 
  isProcessing 
}: RejectUpgradeModalProps) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (!reason.trim()) return;
    onReject(reason);
  };

  const quickReasons = [
    'Insufficient documentation',
    'Investment history not met',
    'Additional verification required',
    'Does not meet tier requirements',
    'Suspicious activity detected',
    'Incomplete upgrade request'
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Tier Upgrade"
      icon={<XCircle className="w-5 h-5 text-red-400" />}
      iconBg="bg-red-500/20"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-3">Requested Upgrade</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="px-3 py-2 bg-gray-700 rounded-lg mb-1">
                <span className="text-lg font-bold text-white">Tier {currentTier}</span>
              </div>
              <span className="text-xs text-gray-400">{TIER_NAMES[currentTier]}</span>
            </div>
            <div className="text-2xl text-gray-500">→</div>
            <div className="text-center">
              <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg mb-1">
                <span className="text-lg font-bold text-red-400 line-through">Tier {requestedTier}</span>
              </div>
              <span className="text-xs text-red-400">{TIER_NAMES[requestedTier]}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejecting the upgrade..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Quick Reasons</p>
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                onClick={() => setReason(qr)}
                className="px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded text-gray-300 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">
              The user will remain at {TIER_NAMES[currentTier]} tier and will be notified of the rejection.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject Upgrade
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// ============================================================================
// CONFIRM ACTION MODAL
// ============================================================================

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: 'red' | 'green' | 'yellow' | 'blue';
  onConfirm: () => void;
  isProcessing: boolean;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  confirmColor = 'blue',
  onConfirm,
  isProcessing
}: ConfirmActionModalProps) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700'
  };

  const iconColors = {
    red: 'text-red-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400'
  };

  const bgColors = {
    red: 'bg-red-500/20',
    green: 'bg-green-500/20',
    yellow: 'bg-yellow-500/20',
    blue: 'bg-blue-500/20'
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className={`w-5 h-5 ${iconColors[confirmColor]}`} />}
      iconBg={bgColors[confirmColor]}
    >
      <div className="space-y-4">
        <p className="text-gray-300">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 px-4 py-3 ${colorClasses[confirmColor]} disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
