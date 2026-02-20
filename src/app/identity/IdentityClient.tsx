// src/app/identity/IdentityClient.tsx
'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import { IdentityRegistryABI } from '@/config/abis';
import { Address } from 'viem';

// Country code mapping
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
    756: 'Switzerland',
    702: 'Singapore',
    784: 'United Arab Emirates',
    528: 'Netherlands',
    380: 'Italy',
    724: 'Spain',
    410: 'South Korea',
    484: 'Mexico',
    643: 'Russia',
    710: 'South Africa',
  };
  return countries[code] || `Code: ${code}`;
}

export default function IdentityClient() {
  const { isConnected, address } = useAccount();
  const walletChainId = useChainId();
  const [checkAddress, setCheckAddress] = useState('');

  // Chain config for multichain support
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  // Get contract addresses from chain config
  const identityRegistryAddress = contracts?.IdentityRegistry as Address | undefined;
  const claimTopicsRegistryAddress = contracts?.ClaimTopicsRegistry as Address | undefined;
  const trustedIssuersRegistryAddress = contracts?.TrustedIssuersRegistry as Address | undefined;

  // Check if identity registry is available
  const hasIdentityRegistry = identityRegistryAddress && identityRegistryAddress !== ZERO_ADDRESS;

  // Read contract data for connected user
  const { data: isVerified, isLoading: isVerifiedLoading } = useReadContract({
    address: identityRegistryAddress,
    abi: IdentityRegistryABI,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!identityRegistryAddress && isDeployed
    }
  });

  const { data: investorCountry, isLoading: countryLoading } = useReadContract({
    address: identityRegistryAddress,
    abi: IdentityRegistryABI,
    functionName: 'investorCountry',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!identityRegistryAddress && isDeployed
    }
  });

  const { data: identity, isLoading: identityLoading } = useReadContract({
    address: identityRegistryAddress,
    abi: IdentityRegistryABI,
    functionName: 'identity',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!identityRegistryAddress && isDeployed
    }
  });

  // Check verification for other addresses
  const isValidCheckAddress = checkAddress && checkAddress.startsWith('0x') && checkAddress.length === 42;
  
  const { data: checkedVerification, isLoading: checkLoading } = useReadContract({
    address: identityRegistryAddress,
    abi: IdentityRegistryABI,
    functionName: 'isVerified',
    args: isValidCheckAddress ? [checkAddress as Address] : undefined,
    query: {
      enabled: isValidCheckAddress && !!identityRegistryAddress && isDeployed
    }
  });

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // Truncate address helper
  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Loading state
  const isLoading = isVerifiedLoading || countryLoading || identityLoading;

  // Not connected view
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Identity Registry</h1>
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">
              Connect your wallet to view identity information
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Network not supported view
  if (!isDeployed) {
    const deployedChains = getDeployedChains();
    
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Identity Registry</h1>
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              Identity Registry is not available on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleSwitchNetwork(chain.chainId)}
                  disabled={isSwitching}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isSwitching && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {chain.name}
                  {chain.isTestnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Wrong chain warning view
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Identity Registry</h1>
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Wrong Network</h2>
            <p className="text-gray-400 mb-6">
              Please switch to {chainName} to view identity information.
            </p>
            <button
              onClick={() => handleSwitchNetwork(chainId)}
              disabled={isSwitching}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              {isSwitching && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Switch to {chainName}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Identity Registry</h1>

        {/* Network Banner */}
        <div className={`rounded-lg p-4 mb-6 border ${
          isTestnet 
            ? 'bg-yellow-500/10 border-yellow-500/30' 
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
              <span className={`font-medium ${isTestnet ? 'text-yellow-400' : 'text-green-400'}`}>
                {chainName}
              </span>
              {isTestnet && (
                <span className="text-xs text-yellow-400/70">(Testnet)</span>
              )}
            </div>
            {hasIdentityRegistry && (
              <a
                href={`${explorerUrl}/address/${identityRegistryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View Registry Contract
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Your Identity Status */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Your Identity Status
            </h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-gray-400">Loading identity data...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Wallet Address</span>
                  <a
                    href={`${explorerUrl}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    {truncateAddress(address || '')}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Network</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isTestnet 
                      ? 'bg-yellow-900/50 text-yellow-300' 
                      : 'bg-green-900/50 text-green-300'
                  }`}>
                    {chainName}
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
                  {identity && identity !== ZERO_ADDRESS ? (
                    <a
                      href={`${explorerUrl}/address/${identity}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                    >
                      {truncateAddress(identity)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-gray-500">Not Registered</span>
                  )}
                </div>
              </div>
            )}

            {!isLoading && !isVerified && (
              <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  You are not verified yet on {chainName}. Complete KYC verification to register your identity.
                </p>
                <a
                  href="/kyc"
                  className="inline-block mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Start KYC Verification →
                </a>
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

            {isValidCheckAddress && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                {checkLoading ? (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-400">Checking...</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Verification Status on {chainName}:</span>
                    </div>
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
                )}
              </div>
            )}
          </div>

          {/* Registry Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Registry Information on {chainName}
            </h2>
            
            <div className="space-y-3 text-sm">
              {hasIdentityRegistry && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Identity Registry:</span>
                  <a
                    href={`${explorerUrl}/address/${identityRegistryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    {truncateAddress(identityRegistryAddress!)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {claimTopicsRegistryAddress && claimTopicsRegistryAddress !== ZERO_ADDRESS && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Claim Topics Registry:</span>
                  <a
                    href={`${explorerUrl}/address/${claimTopicsRegistryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    {truncateAddress(claimTopicsRegistryAddress)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {trustedIssuersRegistryAddress && trustedIssuersRegistryAddress !== ZERO_ADDRESS && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Trusted Issuers Registry:</span>
                  <a
                    href={`${explorerUrl}/address/${trustedIssuersRegistryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    {truncateAddress(trustedIssuersRegistryAddress)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {!hasIdentityRegistry && !claimTopicsRegistryAddress && !trustedIssuersRegistryAddress && (
                <div className="text-center py-4 text-gray-400">
                  No registry contracts found on {chainName}
                </div>
              )}
            </div>

            {/* Native Currency Info */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Native Currency:</span>
                <span className="text-white font-medium">{nativeCurrency}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
