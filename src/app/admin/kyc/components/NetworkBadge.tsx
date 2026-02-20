// src/app/admin/kyc/components/NetworkBadge.tsx
'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface NetworkBadgeProps {
  chainName: string;
  isTestnet: boolean;
  isConnected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NetworkBadge({ 
  chainName, 
  isTestnet, 
  isConnected = true,
  size = 'md' 
}: NetworkBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} rounded-full border ${
      isConnected 
        ? isTestnet 
          ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
          : 'bg-green-500/20 border-green-500/30 text-green-400'
        : 'bg-red-500/20 border-red-500/30 text-red-400'
    }`}>
      {isConnected ? (
        <Wifi size={iconSize[size]} />
      ) : (
        <WifiOff size={iconSize[size]} />
      )}
      <span className="font-medium">{chainName}</span>
      {isTestnet && isConnected && (
        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 rounded text-yellow-300">
          Testnet
        </span>
      )}
    </div>
  );
}
