// src/components/ui/ChainBadge.tsx
"use client";

import { useChainConfig } from "@/hooks/useChainConfig";

const chainIcons: Record<number, string> = {
  43113: "🔺", 43114: "🔺",
  137: "🟣", 80002: "🟣",
  1: "💎", 11155111: "💎",
  42161: "🔵", 421614: "🔵",
  8453: "🔷", 84532: "🔷",
  10: "🔴",
  56: "🟡",
  31337: "🔧",
};

interface ChainBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function ChainBadge({ onClick, className = "" }: ChainBadgeProps) {
  const { chainId, chainName, isDeployed, isTestnet, isSwitching } = useChainConfig();
  const icon = chainIcons[chainId] || "⛓️";

  return (
    <button
      onClick={onClick}
      disabled={isSwitching}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all
        ${isTestnet
          ? "bg-yellow-900/30 border-yellow-600 text-yellow-400 hover:bg-yellow-900/50"
          : "bg-green-900/30 border-green-600 text-green-400 hover:bg-green-900/50"
        }
        ${!isDeployed ? "opacity-50" : ""}
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isSwitching ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-sm">{icon}</span>
      )}
      <span className="text-sm font-medium hidden sm:inline">
        {isSwitching ? "Switching..." : chainName}
      </span>
      <span className="text-sm font-medium sm:hidden">
        {isSwitching ? "..." : icon}
      </span>
      {!isSwitching && (
        <svg 
          className="w-3 h-3 opacity-60" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}
