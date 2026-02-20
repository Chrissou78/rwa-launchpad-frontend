// src/app/admin/kyc/components/NotDeployed.tsx
'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Chain {
  id: number;
  name: string;
  isTestnet: boolean;
}

interface NotDeployedProps {
  chainName: string;
  deployedChains: Chain[];
  onSwitch: (chainId: number) => void;
  isSwitching: boolean;
}

export function NotDeployed({
  chainName,
  deployedChains,
  onSwitch,
  isSwitching
}: NotDeployedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">
          KYC Manager Not Deployed
        </h2>
        
        <p className="text-gray-400 mb-6">
          The KYC Manager contract is not deployed on <span className="text-white font-medium">{chainName}</span>.
          Please switch to a supported network.
        </p>

        {deployedChains.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Available Networks:</p>
            <div className="flex flex-col gap-2">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => onSwitch(chain.id)}
                  disabled={isSwitching}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>{chain.name}</span>
                  {chain.isTestnet && (
                    <span className="text-xs opacity-70">(Testnet)</span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
