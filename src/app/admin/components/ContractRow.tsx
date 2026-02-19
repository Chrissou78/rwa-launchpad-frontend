// src/app/admin/components/ContractRow.tsx
'use client';

import { useState } from 'react';
import { ZERO_ADDRESS } from '@/config/contracts';
import { getExplorerUrl, truncateAddress } from '../helpers';

interface ContractRowProps {
  label: string;
  address: string | undefined;
  type: 'core' | 'registry' | 'implementation' | 'module' | 'token';
}

const typeColors: Record<string, string> = {
  core: 'bg-blue-500/30 text-blue-300',
  registry: 'bg-green-500/30 text-green-300',
  implementation: 'bg-purple-500/30 text-purple-300',
  module: 'bg-orange-500/30 text-orange-300',
  token: 'bg-cyan-500/30 text-cyan-300',
};

export default function ContractRow({ label, address, type }: ContractRowProps) {
  const [copied, setCopied] = useState(false);
  const isValid = address && address !== ZERO_ADDRESS;

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition group">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[type]}`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
        <span className="text-gray-300 font-medium">{label}</span>
      </div>

      {isValid ? (
        <div className="flex items-center gap-2">
          <a
            href={getExplorerUrl(address!)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm font-mono transition"
          >
            {truncateAddress(address!)}
          </a>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition"
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
          <a
            href={getExplorerUrl(address!)}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition"
            title="View on explorer"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      ) : (
        <span className="text-gray-500 text-sm italic">Not deployed</span>
      )}
    </div>
  );
}
