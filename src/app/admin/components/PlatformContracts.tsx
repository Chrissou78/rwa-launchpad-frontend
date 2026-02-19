// src/app/admin/components/PlatformContracts.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { CHAIN_ID, EXPLORER_URL, CONTRACTS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { publicClient } from '../client';
import { ZERO_ADDRESS } from '../constants';
import { getExplorerUrl, truncateAddress } from '../helpers';
import ContractRow from './ContractRow';

export default function PlatformContracts() {
  const [implementations, setImplementations] = useState<any>(null);
  const [factoryConfig, setFactoryConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const [impls, projectNFT, identityRegistry, feeRecipient, platformFee, creationFee] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'implementations',
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'projectNFT',
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'identityRegistry',
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'platformFeeRecipient',
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
            abi: RWALaunchpadFactoryABI,
            functionName: 'platformFeeBps',
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
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
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Platform Contracts</h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading contracts...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Platform Contracts</h2>

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
          <ContractRow label="RWA Launchpad Factory" address={CONTRACTS.RWALaunchpadFactory} type="core" />
          <ContractRow label="RWA Project NFT" address={factoryConfig?.projectNFT || CONTRACTS.RWAProjectNFT} type="core" />
          <ContractRow label="KYC Manager" address={CONTRACTS.KYCManager} type="core" />
          <ContractRow label="Off-Chain Investment Manager" address={CONTRACTS.OffChainInvestmentManager} type="core" />
          <ContractRow label="RWA Security Exchange" address={CONTRACTS.RWASecurityExchange} type="core" />
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
          <ContractRow label="Identity Registry" address={factoryConfig?.identityRegistry || CONTRACTS.IdentityRegistry} type="registry" />
          <ContractRow label="Identity Registry Storage" address={CONTRACTS.IdentityRegistryStorage} type="registry" />
          <ContractRow label="Claim Topics Registry" address={CONTRACTS.ClaimTopicsRegistry} type="registry" />
          <ContractRow label="Trusted Issuers Registry" address={CONTRACTS.TrustedIssuersRegistry} type="registry" />
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
          <ContractRow label="Security Token Implementation" address={implementations?.securityToken || CONTRACTS.Implementations?.SecurityToken} type="implementation" />
          <ContractRow label="Escrow Vault Implementation" address={implementations?.escrowVault || CONTRACTS.Implementations?.EscrowVault} type="implementation" />
          <ContractRow label="Modular Compliance Implementation" address={implementations?.compliance || CONTRACTS.Implementations?.Compliance} type="implementation" />
          <ContractRow label="Dividend Distributor Implementation" address={implementations?.dividendDistributor} type="implementation" />
          <ContractRow label="Max Balance Module Implementation" address={implementations?.maxBalanceModule} type="implementation" />
          <ContractRow label="Lockup Module Implementation" address={implementations?.lockupModule} type="implementation" />
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
          <ContractRow label="Country Restrict Module" address={CONTRACTS.Modules?.CountryRestrict} type="module" />
          <ContractRow label="Accredited Investor Module" address={CONTRACTS.Modules?.AccreditedInvestor} type="module" />
          <ContractRow label="Max Balance Module (Global)" address={CONTRACTS.Modules?.MaxBalance} type="module" />
          <ContractRow label="Lockup Module (Global)" address={CONTRACTS.Modules?.Lockup} type="module" />
        </div>
      </div>

      {/* Payment Tokens */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-cyan-500/10 to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Payment Tokens</h3>
              <p className="text-gray-400 text-sm">Accepted payment tokens (testnet)</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ContractRow label="USDC" address={CONTRACTS.USDC} type="token" />
          <ContractRow label="USDT" address={CONTRACTS.USDT} type="token" />
        </div>
      </div>

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
              <p className="text-white text-xl font-semibold">{factoryConfig.creationFee ?? 'N/A'} POL</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Fee Recipient</p>
              {factoryConfig.feeRecipient && factoryConfig.feeRecipient !== ZERO_ADDRESS ? (
                <a href={getExplorerUrl(factoryConfig.feeRecipient)} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm font-mono hover:underline">
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
            <p className="text-white font-medium">
              {CHAIN_ID === 43113 ? 'Avalanche Fuji Testnet' : CHAIN_ID === 43114 ? 'Avalanche C-Chain Mainnet' : `Chain ${CHAIN_ID}`}
            </p>
            <p className="text-gray-400 text-xs mt-1">Chain ID: {CHAIN_ID}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Block Explorer</p>
            <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {EXPLORER_URL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
