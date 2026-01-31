'use client';

import { useState } from 'react';
import Header  from '@/components/Header';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { IdentityRegistryABI } from '@/config/abis';

export default function IdentityPage() {
  const { isConnected, address } = useAccount();
  const [checkAddress, setCheckAddress] = useState('');

  const { data: isVerified } = useReadContract({
    address: CONTRACTS.identityRegistry as `0x${string}`,
    abi: IdentityRegistryABI,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
  });

  const { data: investorCountry } = useReadContract({
    address: CONTRACTS.identityRegistry as `0x${string}`,
    abi: IdentityRegistryABI,
    functionName: 'investorCountry',
    args: address ? [address] : undefined,
  });

  const { data: identity } = useReadContract({
    address: CONTRACTS.identityRegistry as `0x${string}`,
    abi: IdentityRegistryABI,
    functionName: 'identity',
    args: address ? [address] : undefined,
  });

  const { data: checkedVerification } = useReadContract({
    address: CONTRACTS.identityRegistry as `0x${string}`,
    abi: IdentityRegistryABI,
    functionName: 'isVerified',
    args: checkAddress ? [checkAddress as `0x${string}`] : undefined,
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Identity Registry</h1>

        {!isConnected ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-lg">
              Connect your wallet to view identity information
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Your Identity Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Your Identity Status
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Wallet Address</span>
                  <span className="text-white font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Verification Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isVerified
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Country Code</span>
                  <span className="text-white">
                    {investorCountry ? getCountryName(Number(investorCountry)) : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400">Identity Contract</span>
                  <span className="text-white font-mono">
                    {identity && identity !== '0x0000000000000000000000000000000000000000'
                      ? `${identity.slice(0, 6)}...${identity.slice(-4)}`
                      : 'Not Registered'}
                  </span>
                </div>
              </div>

              {!isVerified && (
                <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    You are not verified yet. Contact the platform administrator to 
                    complete KYC verification and register your identity.
                  </p>
                </div>
              )}
            </div>

            {/* Check Other Address */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Check Address Verification
              </h2>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={checkAddress}
                  onChange={(e) => setCheckAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {checkAddress && checkAddress.startsWith('0x') && checkAddress.length === 42 && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Verification Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        checkedVerification
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {checkedVerification ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Registry Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Registry Information
              </h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Identity Registry:</span>
                  <a
                    href={`https://amoy.polygonscan.com/address/${CONTRACTS.identityRegistry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 font-mono"
                  >
                    {CONTRACTS.identityRegistry.slice(0, 6)}...{CONTRACTS.identityRegistry.slice(-4)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Claim Topics Registry:</span>
                  <a
                    href={`https://amoy.polygonscan.com/address/${CONTRACTS.claimTopicsRegistry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 font-mono"
                  >
                    {CONTRACTS.claimTopicsRegistry.slice(0, 6)}...{CONTRACTS.claimTopicsRegistry.slice(-4)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trusted Issuers Registry:</span>
                  <a
                    href={`https://amoy.polygonscan.com/address/${CONTRACTS.trustedIssuersRegistry}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 font-mono"
                  >
                    {CONTRACTS.trustedIssuersRegistry.slice(0, 6)}...{CONTRACTS.trustedIssuersRegistry.slice(-4)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getCountryName(code: number): string {
  const countries: Record<number, string> = {
    840: 'United States',
    826: 'United Kingdom',
    276: 'Germany',
    250: 'France',
    392: 'Japan',
    156: 'China',
    356: 'India',
    76: 'Brazil',
    124: 'Canada',
    36: 'Australia',
  };
  return countries[code] || `Code: ${code}`;
}
