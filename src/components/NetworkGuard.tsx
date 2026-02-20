// src/components/NetworkGuard.tsx
'use client';

import { useAccount } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const { 
    chainName, 
    isDeployed, 
    deployedChains,
    switchToChain,
    isSwitching
  } = useChainConfig();

  // Don't show if not connected or contracts are deployed
  if (!isConnected || isDeployed) return null;

  const suggestedChain = deployedChains[0];
  if (!suggestedChain) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-3 z-[9999] shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <span className="text-sm sm:text-base">
            <strong>{chainName}</strong> is not supported yet. 
            Switch to <strong>{suggestedChain.name}</strong> to use the platform.
          </span>
        </div>
        <button
          onClick={() => switchToChain(suggestedChain.id)}
          disabled={isSwitching}
          className="px-4 py-1.5 bg-black text-yellow-500 rounded-lg font-semibold text-sm hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {isSwitching ? 'Switching...' : `Switch Network`}
        </button>
      </div>
    </div>
  );
}
