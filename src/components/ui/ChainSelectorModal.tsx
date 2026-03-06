// src/components/ui/ChainSelectorModal.tsx
"use client";

import { Fragment } from "react";
import { X } from "lucide-react";
import { useChainConfig } from "@/hooks/useChainConfig";
import { SupportedChainId } from "@/config/contracts";

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ChainSelectorModal({ isOpen, onClose }: ChainSelectorModalProps) {
  const { 
    chainId, 
    chainName, 
    isTestnet, 
    deployedChains, 
    switchToChain, 
    isSwitching 
  } = useChainConfig();

  if (!isOpen) return null;

  const handleChainSelect = async (newChainId: SupportedChainId) => {
    try {
      await switchToChain(newChainId);
      onClose();
    } catch (error) {
      console.error("Chain switch failed:", error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-white">Select Network</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Currently on {chainName} {isTestnet && "(Testnet)"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Chain List */}
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {deployedChains.map((chain) => {
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
                      ? "bg-blue-900/40 border-2 border-blue-500" 
                      : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-xl`}>
                    {icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">
                      {chain.name}
                    </div>
                    <div className="text-xs text-gray-400">
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
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Info Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-xl">
              <p className="text-xs text-blue-400">
                <span className="font-medium">Note:</span> Only networks with deployed contracts are shown.
                {deployedChains.length === 1 && " More networks coming soon!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
