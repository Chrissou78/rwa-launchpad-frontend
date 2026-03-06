// src/components/KYCStatusBadge.tsx
"use client";

import React, { useState } from "react";
import { useKYC } from "@/hooks/useKYC";
import { WalletLinkingModal } from "./WalletLinkingModal";

const LEVEL_CONFIG = {
  0: { name: "Unverified", color: "gray", icon: "○" },
  1: { name: "Basic", color: "blue", icon: "●" },
  2: { name: "Standard", color: "green", icon: "●●" },
  3: { name: "Accredited", color: "purple", icon: "●●●" },
  4: { name: "Institutional", color: "amber", icon: "●●●●" },
};

const COLOR_CLASSES = {
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

interface KYCStatusBadgeProps {
  showLinkOption?: boolean;
  compact?: boolean;
}

export function KYCStatusBadge({ 
  showLinkOption = true, 
  compact = false 
}: KYCStatusBadgeProps) {
  const { status, kycLevel, isKYCValid, isLoading } = useKYC();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkMode, setLinkMode] = useState<"generate" | "use">("generate");

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-700 rounded-full h-8 w-24" />
    );
  }

  const config = LEVEL_CONFIG[kycLevel as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[0];
  const colorClass = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {isKYCValid ? "✓" : "○"} {config.name}
      </span>
    );
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${colorClass}`}>
        <span className="text-sm">{config.icon}</span>
        <div>
          <p className="text-sm font-medium">
            {isKYCValid ? `KYC Level ${kycLevel}` : "Not Verified"}
          </p>
          <p className="text-xs opacity-70">{config.name}</p>
        </div>
        
        {showLinkOption && (
          <div className="ml-2 pl-2 border-l border-current/20">
            {isKYCValid ? (
              <button
                onClick={() => {
                  setLinkMode("generate");
                  setShowLinkModal(true);
                }}
                className="text-xs hover:opacity-80 transition-opacity"
                title="Link another wallet"
              >
                🔗
              </button>
            ) : (
              <button
                onClick={() => {
                  setLinkMode("use");
                  setShowLinkModal(true);
                }}
                className="text-xs hover:opacity-80 transition-opacity"
                title="Link to existing KYC"
              >
                📥
              </button>
            )}
          </div>
        )}
      </div>

      <WalletLinkingModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        mode={linkMode}
      />
    </>
  );
}

export default KYCStatusBadge;
