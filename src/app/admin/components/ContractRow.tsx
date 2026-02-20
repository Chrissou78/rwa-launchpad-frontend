// src/app/admin/components/ContractRow.tsx
'use client';

import { useState } from 'react';
import { ZERO_ADDRESS } from '@/config/contracts';

interface ContractRowProps {
  label: string;
  address?: string;
  type: 'core' | 'registry' | 'implementation' | 'module' | 'token';
  explorerUrl: string;
}

export default function ContractRow({ label, address, type, explorerUrl }: ContractRowProps) {
  const [copied, setCopied] = useState(false);

  const isValid = address && address !== ZERO_ADDRESS;

  const typeColors = {
    core: 'bg-blue-500/20 text-blue-400',
    registry: 'bg-green-500/20 text-green-400',
    implementation: 'bg-purple-500/20 text-purple-400',
    module: 'bg-orange-500/20 text-orange-400',
    token: 'bg-cyan-500/20 text-cyan-400',
  };

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[type]}`}>
          {type.toUpperCase()}
        </span>
        <span className="text-gray-300">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isValid ? (
          <>
            <a
              href={`${explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-mono text-sm hover:underline"
            >
              {truncateAddress(address)}
            </a>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title={copied ? 'Copied!' : 'Copy address'}
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </>
        ) : (
          <span className="text-gray-500 text-sm italic">Not deployed</span>
        )}
      </div>
    </div>
  );
}
