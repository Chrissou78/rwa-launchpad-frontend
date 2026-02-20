// src/app/admin/components/PlatformContracts.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { createPublicClient, http } from 'viem';
import ContractRow from './ContractRow';

export default function PlatformContracts() {
  const { 
    chainId, 
    chainName, 
    contracts, 
    tokens,
    fees,
    explorerUrl, 
    isDeployed,
    nativeCurrency 
  } = useChainConfig();
  
  const [implementations, setImplementations] = useState<any>(null);
  const [factoryConfig, setFactoryConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Refetch when chain changes
  useEffect(() => {
    if (!contracts || !isDeployed) {
      setLoading(false);
      return;
    }

    const fetchContracts = async () => {
      setLoading(true);
      
      try {
        // Create a client for the current chain
        const client = createPublicClient({
          transport: http(),
        });

        const [impls, projectNFT, identityRegistry, feeRecipient, platformFee, creationFee] = await Promise.all([
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'implementations',
          }).catch(() => null),
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'projectNFT',
          }).catch(() => null),
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'identityRegistry',
          }).catch(() => null),
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'platformFeeRecipient',
          }).catch(() => null),
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'platformFeeBps',
          }).catch(() => null),
          client.readContract({
            address: contracts.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'creationFee',
          }).catch(() => null),
        ]);

        setImplementations(impls);
        setFactoryConfig({
          projectNFT,
          identityRegistry,
          feeRecipient,
          platformFee: platformFee ? Number(platformFee) / 100 : null,
          creationFee: creationFee ? formatEther(creationFee as bigint) : null,
        });
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [chainId, contracts, isDeployed]); // Re-fetch when chain changes

  // Not deployed state
  if (!isDeployed || !contracts) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Contracts</h2>
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-400">Not Deployed</h3>
              <p className="text-gray-400">
                Platform contracts are not deployed on {chainName} (Chain ID: {chainId}).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Contracts</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading contracts for {chainName}...</span>
          </div>
        </div>
      </div>
    );
  }

  const truncateAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getExplorerAddressUrl = (address: string) => {
    return `${explorerUrl}/address/${address}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Platform Contracts</h2>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-300">{chainName}</span>
        </div>
      </div>

      {/* Core Contracts */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">🏛️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Core Contracts</h3>
              <p className="text-gray-400 text-sm">Main platform infrastructure</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ContractRow label="RWA Launchpad Factory" address={contracts.RWALaunchpadFactory} type="core" explorerUrl={explorerUrl} />
          <ContractRow label="RWA Project NFT" address={factoryConfig?.projectNFT || contracts.RWAProjectNFT} type="core" explorerUrl={explorerUrl} />
          <ContractRow label="KYC Manager" address={contracts.KYCManager} type="core" explorerUrl={explorerUrl} />
          <ContractRow label="RWA Tokenization Factory" address={contracts.RWATokenizationFactory} type="core" explorerUrl={explorerUrl} />
          <ContractRow label="Off-Chain Investment Manager" address={contracts.OffChainInvestmentManager} type="core" explorerUrl={explorerUrl} />
          <ContractRow label="RWA Security Exchange" address={contracts.RWASecurityExchange} type="core" explorerUrl={explorerUrl} />
        </div>
      </div>

      {/* Registry Contracts */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Registry Contracts</h3>
              <p className="text-gray-400 text-sm">Identity and compliance registries</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ContractRow label="Identity Registry" address={factoryConfig?.identityRegistry || contracts.IdentityRegistry} type="registry" explorerUrl={explorerUrl} />
          <ContractRow label="Identity Registry Storage" address={contracts.IdentityRegistryStorage} type="registry" explorerUrl={explorerUrl} />
          <ContractRow label="Claim Topics Registry" address={contracts.ClaimTopicsRegistry} type="registry" explorerUrl={explorerUrl} />
          <ContractRow label="Trusted Issuers Registry" address={contracts.TrustedIssuersRegistry} type="registry" explorerUrl={explorerUrl} />
        </div>
      </div>

      {/* Implementation Contracts */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-xl">🔧</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Implementation Contracts</h3>
              <p className="text-gray-400 text-sm">Template contracts for project deployments</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ContractRow label="Security Token Implementation" address={implementations?.securityToken || contracts.Implementations?.SecurityToken} type="implementation" explorerUrl={explorerUrl} />
          <ContractRow label="Escrow Vault Implementation" address={implementations?.escrowVault || contracts.Implementations?.EscrowVault} type="implementation" explorerUrl={explorerUrl} />
          <ContractRow label="Modular Compliance Implementation" address={implementations?.compliance || contracts.Implementations?.Compliance} type="implementation" explorerUrl={explorerUrl} />
          <ContractRow label="Dividend Distributor Implementation" address={implementations?.dividendDistributor || contracts.Implementations?.DividendDistributor} type="implementation" explorerUrl={explorerUrl} />
          <ContractRow label="Max Balance Module Implementation" address={implementations?.maxBalanceModule || contracts.Implementations?.MaxBalanceModule} type="implementation" explorerUrl={explorerUrl} />
          <ContractRow label="Lockup Module Implementation" address={implementations?.lockupModule || contracts.Implementations?.LockupModule} type="implementation" explorerUrl={explorerUrl} />
        </div>
      </div>

      {/* Compliance Modules */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Shared Compliance Modules</h3>
              <p className="text-gray-400 text-sm">Global compliance modules (identity-based)</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ContractRow label="Country Restrict Module" address={contracts.CountryRestrictModule} type="module" explorerUrl={explorerUrl} />
          <ContractRow label="Accredited Investor Module" address={contracts.AccreditedInvestorModule} type="module" explorerUrl={explorerUrl} />
        </div>
      </div>

      {/* Payment Tokens */}
      {tokens && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-cyan-500/10 to-teal-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Payment Tokens</h3>
                <p className="text-gray-400 text-sm">Accepted payment tokens on {chainName}</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <ContractRow label="USDC" address={tokens.USDC} type="token" explorerUrl={explorerUrl} />
            <ContractRow label="USDT" address={tokens.USDT} type="token" explorerUrl={explorerUrl} />
          </div>
        </div>
      )}

      {/* Factory Configuration */}
      {factoryConfig && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Factory Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Platform Fee</p>
              <p className="text-white text-xl font-semibold">{factoryConfig.platformFee ?? 'N/A'}%</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Creation Fee</p>
              <p className="text-white text-xl font-semibold">
                {factoryConfig.creationFee ?? 'N/A'} {nativeCurrency}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Fee Recipient</p>
              {factoryConfig.feeRecipient && factoryConfig.feeRecipient !== ZERO_ADDRESS ? (
                <a 
                  href={getExplorerAddressUrl(factoryConfig.feeRecipient)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-400 text-sm font-mono hover:underline"
                >
                  {truncateAddress(factoryConfig.feeRecipient)}
                </a>
              ) : (
                <p className="text-yellow-400 text-sm">Not set</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Network Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Network</p>
            <p className="text-white font-medium">{chainName}</p>
            <p className="text-gray-400 text-xs mt-1">Chain ID: {chainId}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Block Explorer</p>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline break-all"
            >
              {explorerUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
