// src/components/ui/ChainSelector.tsx
"use client";

import { useState } from "react";
import { useChainConfig } from "@/hooks/useChainConfig";
import { SupportedChainId } from "@/config/contracts";

interface ChainSelectorProps {
  showOnlyDeployed?: boolean;
  showStatus?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dropdown" | "list" | "grid";
  onChainSelect?: (chainId: SupportedChainId) => void;
}

const chainIcons: Record<number, { icon: string; color: string }> = {
  43113: { icon: "🔺", color: "bg-red-500" },
  43114: { icon: "🔺", color: "bg-red-500" },
  137: { icon: "🟣", color: "bg-purple-500" },
  80002: { icon: "🟣", color: "bg-purple-500" },
  1: { icon: "💎", color: "bg-blue-500" },
  11155111: { icon: "💎", color: "bg-blue-500" },
  42161: { icon: "🔵", color: "bg-blue-600" },
  421614: { icon: "🔵", color: "bg-blue-600" },
  8453: { icon: "🔷", color: "bg-blue-400" },
  84532: { icon: "🔷", color: "bg-blue-400" },
  10: { icon: "🔴", color: "bg-red-600" },
  56: { icon: "🟡", color: "bg-yellow-500" },
  31337: { icon: "🔧", color: "bg-gray-500" },
};

export function ChainSelector({ 
  showOnlyDeployed = true, 
  showStatus = true,
  className = "",
  size = "md",
  variant = "dropdown",
  onChainSelect,
}: ChainSelectorProps) {
  const {
    chainId,
    chainName,
    isSupported,
    isDeployed,
    supportedChains,
    deployedChains,
    switchToChain,
    isSwitching,
  } = useChainConfig();

  const chains = showOnlyDeployed ? deployedChains : supportedChains;
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  const handleChainSelect = async (newChainId: SupportedChainId) => {
    try {
      await switchToChain(newChainId);
      onChainSelect?.(newChainId);
    } catch (error) {
      console.error("Chain switch failed:", error);
    }
  };

  if (variant === "dropdown") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <select
          value={chainId}
          onChange={(e) => handleChainSelect(parseInt(e.target.value) as SupportedChainId)}
          disabled={isSwitching}
          className={`
            ${sizeClasses[size]}
            rounded-lg border border-gray-300 dark:border-gray-600 
            bg-white dark:bg-gray-800 
            font-medium 
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
        >
          {chains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chainIcons[chain.id]?.icon || "⛓️"} {chain.name}
              {chain.testnet ? " (Testnet)" : ""}
            </option>
          ))}
        </select>

        {showStatus && (
          <ChainStatusBadge 
            isSupported={isSupported}
            isDeployed={isDeployed}
            isSwitching={isSwitching}
            chainName={chainName}
          />
        )}
      </div>
    );
  }

  // List variant for modals
  if (variant === "list") {
    return (
      <div className={`space-y-2 ${className}`}>
        {chains.map((chain) => {
          const isSelected = chain.id === chainId;
          const { icon, color } = chainIcons[chain.id] || { icon: "⛓️", color: "bg-gray-500" };
          
          return (
            <button
              key={chain.id}
              onClick={() => handleChainSelect(chain.id)}
              disabled={isSwitching}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl
                transition-all duration-200
                ${isSelected 
                  ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500" 
                  : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-xl`}>
                {icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {chain.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {chain.testnet ? "Testnet" : "Mainnet"} • {chain.nativeCurrency}
                </div>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {isSwitching && chain.id !== chainId && (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Grid variant
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {chains.map((chain) => {
        const isSelected = chain.id === chainId;
        const { icon, color } = chainIcons[chain.id] || { icon: "⛓️", color: "bg-gray-500" };
        
        return (
          <button
            key={chain.id}
            onClick={() => handleChainSelect(chain.id)}
            disabled={isSwitching}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl
              transition-all duration-200
              ${isSelected 
                ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500" 
                : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-2xl`}>
              {icon}
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {chain.name}
              </div>
              {chain.testnet && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Testnet
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Status badge component
function ChainStatusBadge({ 
  isSupported, 
  isDeployed, 
  isSwitching, 
  chainName 
}: { 
  isSupported: boolean; 
  isDeployed: boolean; 
  isSwitching: boolean;
  chainName: string;
}) {
  if (isSwitching) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 border border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
          Switching...
        </span>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-red-500 font-medium">Unsupported</span>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
          Not Deployed
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        {chainName}
      </span>
    </div>
  );
}

// Compact badge for navbar
export function ChainBadge({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  const { chainId, chainName, isDeployed, isTestnet } = useChainConfig();
  const { icon } = chainIcons[chainId] || { icon: "⛓️" };
  
  return (
    <button 
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200
        ${isTestnet 
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50" 
          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
        }
        ${!isDeployed ? "opacity-50" : ""}
        ${className}
      `}
    >
      <span>{icon}</span>
      <span>{chainName}</span>
      {isTestnet && <span className="opacity-60">(Test)</span>}
      <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
