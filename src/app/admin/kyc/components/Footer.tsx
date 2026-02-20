// src/app/admin/kyc/components/Footer.tsx
'use client';

import { ExternalLink, Shield } from 'lucide-react';
import { formatAddress } from '../utils';

interface FooterProps {
  chainName: string;
  chainId: number | undefined;
  currencySymbol: string;
  contractAddress: string | undefined;
  explorerUrl: string;
  isTestnet: boolean;
}

export function Footer({
  chainName,
  chainId,
  currencySymbol,
  contractAddress,
  explorerUrl,
  isTestnet
}: FooterProps) {
  return (
    <footer className="mt-8 pt-6 border-t border-gray-700/50">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>KYC Manager</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-500">|</span>
            <span>{chainName}</span>
            {isTestnet && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                Testnet
              </span>
            )}
          </div>
          
          {chainId && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">|</span>
              <span>Chain ID: {chainId}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-gray-500">|</span>
            <span>Currency: {currencySymbol}</span>
          </div>
        </div>

        {contractAddress && (
          <div className="flex items-center gap-2">
            <span>Contract:</span>
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {formatAddress(contractAddress)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
