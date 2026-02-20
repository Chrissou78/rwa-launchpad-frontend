// src/config/contracts.ts
"use client";

import { CHAINS, SupportedChainId, ChainInfo } from "./chains";
import { 
  DEPLOYMENTS, 
  DeploymentData, 
  ContractsConfig, 
  TokensConfig, 
  FeesConfig,
  isChainDeployed, 
  getDeployedChainIds 
} from "./deployments";

// ============================================================================
// CHAIN STATE MANAGEMENT
// ============================================================================

const DEFAULT_CHAIN_ID = (parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "43113")) as SupportedChainId;

let _currentChainId: SupportedChainId = DEFAULT_CHAIN_ID;
const _chainChangeListeners: Set<(chainId: SupportedChainId) => void> = new Set();

// ============================================================================
// INTERNAL GETTERS (always return current chain data)
// ============================================================================

function getCurrentDeployment(): DeploymentData {
  return DEPLOYMENTS[_currentChainId] || DEPLOYMENTS[43113];
}

function getCurrentChain(): ChainInfo {
  return CHAINS[_currentChainId] || CHAINS[43113];
}

// ============================================================================
// CHAIN MANAGEMENT API
// ============================================================================

export function setCurrentChain(chainId: SupportedChainId): void {
  if (!CHAINS[chainId]) {
    console.warn(`[Contracts] Unsupported chain ID: ${chainId}, using default: ${DEFAULT_CHAIN_ID}`);
    chainId = DEFAULT_CHAIN_ID;
  }
  
  const previousChainId = _currentChainId;
  _currentChainId = chainId;
  
  console.log(`[Contracts] Chain changed: ${previousChainId} → ${chainId}`);
  
  // Notify all listeners
  if (previousChainId !== chainId) {
    _chainChangeListeners.forEach(listener => {
      try {
        listener(chainId);
      } catch (e) {
        console.error("[Contracts] Chain change listener error:", e);
      }
    });
  }
}

export function getCurrentChainId(): SupportedChainId {
  return _currentChainId;
}

export function subscribeToChainChanges(listener: (chainId: SupportedChainId) => void): () => void {
  _chainChangeListeners.add(listener);
  return () => _chainChangeListeners.delete(listener);
}

export function isCurrentChainDeployed(): boolean {
  return isChainDeployed(_currentChainId);
}

export function getSupportedChains(): ChainInfo[] {
  return Object.values(CHAINS);
}

export function getDeployedChains(): ChainInfo[] {
  return getDeployedChainIds().map(id => CHAINS[id]).filter(Boolean);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ============================================================================
// DYNAMIC GETTERS - Always return current chain values
// ============================================================================

export const getChainId = (): SupportedChainId => _currentChainId;

export const getChainIdTestnet = (): SupportedChainId => {
  const chain = getCurrentChain();
  return chain.testnet ? _currentChainId : (chain.testnetEquivalent || 43113);
};

export const getChainIdMainnet = (): SupportedChainId => {
  const chain = getCurrentChain();
  return chain.testnet ? (chain.mainnetEquivalent || 43114) : _currentChainId;
};

export const getExplorerUrl = (): string => getCurrentChain().explorerUrl;
export const getFaucetUrl = (): string => getCurrentChain().faucetUrl;
export const getNativeCurrency = (): string => getCurrentChain().nativeCurrency;
export const getRpcUrl = (): string => getCurrentChain().rpcUrl;
export const getIsTestnet = (): boolean => getCurrentChain().testnet;

export const getContracts = (): ContractsConfig => getCurrentDeployment().contracts;
export const getTokens = (): TokensConfig => getCurrentDeployment().tokens;
export const getFees = (): FeesConfig => getCurrentDeployment().fees;

// ============================================================================
// PROXY-BASED EXPORTS (for backward compatibility)
// ============================================================================

const createDynamicProxy = <T extends object>(getter: () => T): T => {
  return new Proxy({} as T, {
    get(_, prop) {
      const current = getter();
      return current[prop as keyof T];
    },
    ownKeys() {
      return Reflect.ownKeys(getter());
    },
    getOwnPropertyDescriptor(_, prop) {
      const current = getter();
      const value = current[prop as keyof T];
      if (value !== undefined) {
        return { enumerable: true, configurable: true, value };
      }
      return undefined;
    },
    has(_, prop) {
      return prop in getter();
    },
  });
};

// These proxies always return the current chain's data
export const CONTRACTS = createDynamicProxy(getContracts);
export const TOKENS = createDynamicProxy(getTokens);
export const FEES = createDynamicProxy(getFees);

// Static exports for backward compatibility (snapshot of default chain)
const _initialChain = getCurrentChain();
export const CHAIN_ID = DEFAULT_CHAIN_ID;
export const CHAIN_ID_TESTNET = 43113 as SupportedChainId;
export const CHAIN_ID_MAINNET = 43114 as SupportedChainId;
export const EXPLORER_URL = _initialChain.explorerUrl;
export const FAUCET_URL = _initialChain.faucetUrl;
export const NATIVE_CURRENCY = _initialChain.nativeCurrency;
export const RPC_URL = _initialChain.rpcUrl;
export const IS_TESTNET = _initialChain.testnet;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { SupportedChainId, ChainInfo } from "./chains";
export type { ContractsConfig, TokensConfig, FeesConfig, DeploymentData } from "./deployments";
export type ContractAddresses = ContractsConfig;
export type TokenAddresses = TokensConfig;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getExplorerTxUrl(hash: string): string {
  return `${getCurrentChain().explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${getCurrentChain().explorerUrl}/address/${address}`;
}

export function getExplorerTokenUrl(address: string): string {
  return `${getCurrentChain().explorerUrl}/token/${address}`;
}

export function getContractsForChain(chainId: SupportedChainId): ContractsConfig {
  return DEPLOYMENTS[chainId]?.contracts || DEPLOYMENTS[43113].contracts;
}

export function getTokensForChain(chainId: SupportedChainId): TokensConfig {
  return DEPLOYMENTS[chainId]?.tokens || DEPLOYMENTS[43113].tokens;
}

export function getFeesForChain(chainId: SupportedChainId): FeesConfig {
  return DEPLOYMENTS[chainId]?.fees || DEPLOYMENTS[43113].fees;
}

export function getChainInfo(chainId: SupportedChainId): ChainInfo | null {
  return CHAINS[chainId] || null;
}

// ============================================================================
// DEBUG
// ============================================================================

export function debugCurrentConfig(): void {
  const chain = getCurrentChain();
  const deployment = getCurrentDeployment();
  
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           RWA LAUNCHPAD - CURRENT CONFIGURATION              ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║ Chain ID:        ${_currentChainId}`);
  console.log(`║ Chain Name:      ${chain.name}`);
  console.log(`║ Is Testnet:      ${chain.testnet ? "Yes" : "No"}`);
  console.log(`║ Is Deployed:     ${isChainDeployed(_currentChainId) ? "Yes" : "No"}`);
  console.log(`║ Version:         ${deployment.version}`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ KEY CONTRACTS");
  console.log(`║ Factory:         ${deployment.contracts.RWALaunchpadFactory}`);
  console.log(`║ KYCManager:      ${deployment.contracts.KYCManager}`);
  console.log(`║ TokenizationFac: ${deployment.contracts.RWATokenizationFactory}`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ TOKENS");
  console.log(`║ USDC:            ${deployment.tokens.USDC}`);
  console.log(`║ USDT:            ${deployment.tokens.USDT}`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
}
