// src/config/contracts.ts
"use client";

import { CHAINS, SupportedChainId, ChainInfo } from "./chains";
import { 
  DEPLOYMENTS, 
  DeploymentData, 
  isChainDeployed, 
  getDeployedChainIds 
} from "./deployments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ContractsConfig {
  // Core contracts
  RWAProjectNFT: string;
  RWALaunchpadFactory: string;
  KYCManager: string;
  RWATokenizationFactory: string;
  RWATradeEscrow: string;  // ✅ NEW
  
  // Identity contracts
  IdentityRegistry: string;
  IdentityRegistryStorage: string;
  ClaimTopicsRegistry: string;
  TrustedIssuersRegistry: string;
  
  // Other contracts
  RWASecurityExchange: string;
  OffChainInvestmentManager: string;
  CountryRestrictModule: string;
  AccreditedInvestorModule: string;
  
  // Implementation contracts
  Implementations: {
    SecurityToken: string;
    EscrowVault: string;
    Compliance: string;
    ProjectNFT: string;
    KYCManager: string;
    OffChainManager: string;
    Exchange: string;
    DividendDistributor: string;
    MaxBalanceModule: string;
    LockupModule: string;
    RWATradeEscrow: string;      // ✅ NEW
    TokenizationFactory: string;  // ✅ NEW
  };
}

export interface TokensConfig {
  USDC: string;
  USDT: string;
}

export interface FeesConfig {
  CREATION_FEE: string;
  CREATION_FEE_FORMATTED: string;
  KYC_FEE: string;
  KYC_FEE_FORMATTED: string;
}

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

export const getContracts = (): ContractsConfig => getCurrentDeployment().contracts as ContractsConfig;
export const getTokens = (): TokensConfig => getCurrentDeployment().tokens;
export const getFees = (): FeesConfig => getCurrentDeployment().fees;

// ============================================================================
// INDIVIDUAL CONTRACT GETTERS (for convenience)
// ============================================================================

export const getRWAProjectNFT = (): string => getContracts().RWAProjectNFT;
export const getRWALaunchpadFactory = (): string => getContracts().RWALaunchpadFactory;
export const getKYCManager = (): string => getContracts().KYCManager;
export const getRWATokenizationFactory = (): string => getContracts().RWATokenizationFactory;
export const getRWATradeEscrow = (): string => getContracts().RWATradeEscrow;  // ✅ NEW
export const getRWASecurityExchange = (): string => getContracts().RWASecurityExchange;
export const getOffChainInvestmentManager = (): string => getContracts().OffChainInvestmentManager;
export const getIdentityRegistry = (): string => getContracts().IdentityRegistry;
export const getIdentityRegistryStorage = (): string => getContracts().IdentityRegistryStorage;
export const getClaimTopicsRegistry = (): string => getContracts().ClaimTopicsRegistry;
export const getTrustedIssuersRegistry = (): string => getContracts().TrustedIssuersRegistry;
export const getCountryRestrictModule = (): string => getContracts().CountryRestrictModule;
export const getAccreditedInvestorModule = (): string => getContracts().AccreditedInvestorModule;

// Implementation getters
export const getSecurityTokenImpl = (): string => getContracts().Implementations.SecurityToken;
export const getEscrowVaultImpl = (): string => getContracts().Implementations.EscrowVault;
export const getComplianceImpl = (): string => getContracts().Implementations.Compliance;
export const getProjectNFTImpl = (): string => getContracts().Implementations.ProjectNFT;
export const getKYCManagerImpl = (): string => getContracts().Implementations.KYCManager;
export const getOffChainManagerImpl = (): string => getContracts().Implementations.OffChainManager;
export const getExchangeImpl = (): string => getContracts().Implementations.Exchange;
export const getDividendDistributorImpl = (): string => getContracts().Implementations.DividendDistributor;
export const getMaxBalanceModuleImpl = (): string => getContracts().Implementations.MaxBalanceModule;
export const getLockupModuleImpl = (): string => getContracts().Implementations.LockupModule;
export const getRWATradeEscrowImpl = (): string => getContracts().Implementations.RWATradeEscrow;  // ✅ NEW
export const getTokenizationFactoryImpl = (): string => getContracts().Implementations.TokenizationFactory;  // ✅ NEW

// Token getters
export const getUSDC = (): string => getTokens().USDC;
export const getUSDT = (): string => getTokens().USDT;

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
export type { DeploymentData } from "./deployments";
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
  return (DEPLOYMENTS[chainId]?.contracts || DEPLOYMENTS[43113].contracts) as ContractsConfig;
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
  console.log(`║ TradeEscrow:     ${deployment.contracts.RWATradeEscrow}`);  // ✅ NEW
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ TOKENS");
  console.log(`║ USDC:            ${deployment.tokens.USDC}`);
  console.log(`║ USDT:            ${deployment.tokens.USDT}`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
}
