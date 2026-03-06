// src/app/admin/kyc/components/NetworkSwitcher.tsx
'use client';

import { Loader2, ArrowRightLeft } from 'lucide-react';

interface Chain {
  id: number;
  name: string;
  isTestnet: boolean;
}

interface NetworkSwitcherProps {
  currentChainId: number | undefined;
  deployedChains: Chain[];
  isSwitching: boolean;
  onSwitch: (chainId: number) => void;
}

export function NetworkSwitcher({
  currentChainId,
  deployedChains,
  isSwitching,
  onSwitch
}: NetworkSwitcherProps) {
  if (deployedChains.length <= 1) return null;

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Switch Network</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {deployedChains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => onSwitch(chain.id)}
            disabled={chain.id === currentChainId || isSwitching}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              chain.id === currentChainId
                ? 'bg-blue-600 text-white cursor-default'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSwitching && chain.id !== currentChainId && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {chain.name}
            {chain.isTestnet && (
              <span className="text-xs opacity-70">(Test)</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
