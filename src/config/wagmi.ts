// src/config/wagmi.ts
// Multichain wagmi configuration

import { http, createConfig, type Config } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import type { Chain, Transport } from 'viem';
import { CHAINS, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS, getDeployedChainIds } from '@/config/deployments';

// =============================================================================
// CHAIN DEFINITIONS
// =============================================================================

// Build viem Chain objects from our chain config
function buildChain(chainId: SupportedChainId): Chain {
  const chainInfo = CHAINS[chainId];
  if (!chainInfo) {
    throw new Error(`Chain ${chainId} not found in CHAINS config`);
  }

  return {
    id: chainId,
    name: chainInfo.name,
    nativeCurrency: {
      name: chainInfo.nativeCurrency,
      symbol: chainInfo.nativeCurrency,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [chainInfo.rpcUrl] },
    },
    blockExplorers: chainInfo.explorerUrl
      ? {
          default: {
            name: getExplorerName(chainId),
            url: chainInfo.explorerUrl,
          },
        }
      : undefined,
    testnet: chainInfo.testnet,
  };
}

function getExplorerName(chainId: SupportedChainId): string {
  const explorerNames: Partial<Record<SupportedChainId, string>> = {
    43113: 'SnowTrace',
    43114: 'SnowTrace',
    137: 'PolygonScan',
    80002: 'PolygonScan',
    1: 'Etherscan',
    11155111: 'Etherscan',
    42161: 'Arbiscan',
    8453: 'BaseScan',
    10: 'Optimism Explorer',
    56: 'BscScan',
  };
  return explorerNames[chainId] || 'Explorer';
}

// =============================================================================
// DEFINE ALL SUPPORTED CHAINS
// =============================================================================

// Testnets
export const avalancheFuji = buildChain(43113);
export const polygonAmoy = buildChain(80002);
export const sepolia = buildChain(11155111);

// Mainnets
export const avalanche = buildChain(43114);
export const polygon = buildChain(137);
export const ethereum = buildChain(1);
export const arbitrum = buildChain(42161);
export const base = buildChain(8453);
export const optimism = buildChain(10);
export const bnbChain = buildChain(56);

// Local
export const hardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
};

// All chains mapped by ID
export const ALL_CHAINS: Record<SupportedChainId, Chain> = {
  43113: avalancheFuji,
  43114: avalanche,
  137: polygon,
  80002: polygonAmoy,
  1: ethereum,
  11155111: sepolia,
  42161: arbitrum,
  8453: base,
  10: optimism,
  56: bnbChain,
  31337: hardhat,
};

// =============================================================================
// DETERMINE ACTIVE CHAINS
// =============================================================================

// Get chains that have deployments
const deployedChainIds = getDeployedChainIds();

// Build array of deployed chains for wagmi config
const deployedChains: [Chain, ...Chain[]] = deployedChainIds.length > 0
  ? (deployedChainIds.map(id => ALL_CHAINS[id]).filter(Boolean) as [Chain, ...Chain[]])
  : [avalancheFuji]; // Fallback to Fuji if nothing deployed

// Option: Include all chains (deployed + not deployed) for flexibility
const allSupportedChains: [Chain, ...Chain[]] = [
  avalancheFuji,
  avalanche,
  polygon,
  polygonAmoy,
  ethereum,
  sepolia,
  arbitrum,
  base,
  optimism,
  bnbChain,
  ...(process.env.NODE_ENV === 'development' ? [hardhat] : []),
] as [Chain, ...Chain[]];

// Choose which chains to use in wagmi config
// Set to true to only show deployed chains, false to show all
const ONLY_DEPLOYED_CHAINS = false;
const activeChains = ONLY_DEPLOYED_CHAINS ? deployedChains : allSupportedChains;

// =============================================================================
// BUILD TRANSPORTS
// =============================================================================

function buildTransports(): Record<number, Transport> {
  const transports: Record<number, Transport> = {};

  for (const chainId of Object.keys(CHAINS).map(Number) as SupportedChainId[]) {
    const chainInfo = CHAINS[chainId];
    if (chainInfo) {
      transports[chainId] = http(chainInfo.rpcUrl);
    }
  }

  // Add hardhat for development
  if (process.env.NODE_ENV === 'development') {
    transports[31337] = http('http://127.0.0.1:8545');
  }

  return transports;
}

// =============================================================================
// WALLET CONNECTORS
// =============================================================================

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const appMetadata = {
  name: 'RWA Launchpad',
  description: 'Real World Asset Investment Platform',
  url: typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://rwa-launchpad.vercel.app',
  icons: [
    typeof window !== 'undefined'
      ? `${window.location.origin}/icon.png`
      : 'https://rwa-launchpad.vercel.app/icon.png'
  ],
};

const connectors = [
  // MetaMask
  injected({
    target: 'metaMask',
  }),
  
  // Coinbase Wallet
  coinbaseWallet({
    appName: appMetadata.name,
    appLogoUrl: appMetadata.icons[0],
  }),
  
  // Phantom
  injected({
    target: 'phantom',
  }),
  
  // WalletConnect (if project ID is set)
  ...(projectId
    ? [
        walletConnect({
          projectId,
          metadata: appMetadata,
          showQrModal: true,
        }),
      ]
    : []),
  
  // Generic injected (fallback for other browser wallets)
  injected(),
];

// =============================================================================
// WAGMI CONFIG
// =============================================================================

export const config: Config = createConfig({
  chains: activeChains,
  connectors,
  transports: buildTransports(),
  ssr: true,
  // Automatically reconnect on page load
  syncConnectedChain: true,
});

// =============================================================================
// HELPER EXPORTS
// =============================================================================

/**
 * Get chain object by ID
 */
export function getChain(chainId: number): Chain | undefined {
  return ALL_CHAINS[chainId as SupportedChainId];
}

/**
 * Check if a chain is supported in wagmi config
 */
export function isChainSupported(chainId: number): boolean {
  return activeChains.some(chain => chain.id === chainId);
}

/**
 * Get all chains in the wagmi config
 */
export function getConfiguredChains(): Chain[] {
  return [...activeChains];
}

/**
 * Get the default chain (first in the list)
 */
export function getDefaultChain(): Chain {
  return activeChains[0];
}

/**
 * Get chains grouped by network type
 */
export function getChainsByType(): { mainnets: Chain[]; testnets: Chain[] } {
  return {
    mainnets: activeChains.filter(chain => !chain.testnet),
    testnets: activeChains.filter(chain => chain.testnet),
  };
}

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

export { 
  getCurrentChainId, 
  setCurrentChain,
  subscribeToChainChanges,
} from '@/config/contracts';

export type { SupportedChainId } from '@/config/chains';
