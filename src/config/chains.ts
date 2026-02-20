// src/config/chains.ts

export type SupportedChainId = 
  | 43113    // Avalanche Fuji Testnet
  | 43114    // Avalanche Mainnet
  | 137      // Polygon Mainnet
  | 80002    // Polygon Amoy Testnet
  | 1        // Ethereum Mainnet
  | 11155111 // Sepolia Testnet
  | 42161    // Arbitrum One
  | 8453     // Base
  | 10       // Optimism
  | 56       // BNB Chain Mainnet
  | 97;      // BNB Chain Testnet ✅ NEW

export interface ChainInfo {
  id: SupportedChainId;
  name: string;
  testnet: boolean;
  explorerUrl: string;
  faucetUrl: string;
  nativeCurrency: string;
  rpcUrl: string;
  mainnetEquivalent?: SupportedChainId;  // For testnets: their mainnet pair
  testnetEquivalent?: SupportedChainId;  // For mainnets: their testnet pair
}

export const CHAINS: Record<SupportedChainId, ChainInfo> = {
  // ========================================
  // Avalanche
  // ========================================
  43113: {
    id: 43113,
    name: "Avalanche Fuji",
    testnet: true,
    explorerUrl: "https://testnet.snowtrace.io",
    faucetUrl: "https://faucet.avax.network/",
    nativeCurrency: "AVAX",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    mainnetEquivalent: 43114,
  },
  43114: {
    id: 43114,
    name: "Avalanche",
    testnet: false,
    explorerUrl: "https://snowtrace.io",
    faucetUrl: "",
    nativeCurrency: "AVAX",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    testnetEquivalent: 43113,
  },

  // ========================================
  // Polygon
  // ========================================
  137: {
    id: 137,
    name: "Polygon",
    testnet: false,
    explorerUrl: "https://polygonscan.com",
    faucetUrl: "",
    nativeCurrency: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    testnetEquivalent: 80002,
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    testnet: true,
    explorerUrl: "https://amoy.polygonscan.com",
    faucetUrl: "https://faucet.polygon.technology/",
    nativeCurrency: "MATIC",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    mainnetEquivalent: 137,
  },

  // ========================================
  // Ethereum
  // ========================================
  1: {
    id: 1,
    name: "Ethereum",
    testnet: false,
    explorerUrl: "https://etherscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    testnetEquivalent: 11155111,
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    testnet: true,
    explorerUrl: "https://sepolia.etherscan.io",
    faucetUrl: "https://sepoliafaucet.com/",
    nativeCurrency: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
    mainnetEquivalent: 1,
  },

  // ========================================
  // Arbitrum
  // ========================================
  42161: {
    id: 42161,
    name: "Arbitrum One",
    testnet: false,
    explorerUrl: "https://arbiscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },

  // ========================================
  // Base
  // ========================================
  8453: {
    id: 8453,
    name: "Base",
    testnet: false,
    explorerUrl: "https://basescan.org",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.base.org",
  },

  // ========================================
  // Optimism
  // ========================================
  10: {
    id: 10,
    name: "Optimism",
    testnet: false,
    explorerUrl: "https://optimistic.etherscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
  },

  // ========================================
  // BNB Chain
  // ========================================
  56: {
    id: 56,
    name: "BNB Chain",
    testnet: false,
    explorerUrl: "https://bscscan.com",
    faucetUrl: "",
    nativeCurrency: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
    testnetEquivalent: 97,
  },
  97: {  // ✅ NEW
    id: 97,
    name: "BNB Testnet",
    testnet: true,
    explorerUrl: "https://testnet.bscscan.com",
    faucetUrl: "https://testnet.bnbchain.org/faucet-smart",
    nativeCurrency: "tBNB",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    mainnetEquivalent: 56,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getChainById(chainId: number): ChainInfo | undefined {
  return CHAINS[chainId as SupportedChainId];
}

export function isValidChainId(chainId: number): chainId is SupportedChainId {
  return chainId in CHAINS;
}

export function getTestnetChains(): ChainInfo[] {
  return Object.values(CHAINS).filter(chain => chain.testnet);
}

export function getMainnetChains(): ChainInfo[] {
  return Object.values(CHAINS).filter(chain => !chain.testnet);
}

export function getChainPair(chainId: SupportedChainId): { mainnet: ChainInfo | null; testnet: ChainInfo | null } {
  const chain = CHAINS[chainId];
  if (!chain) return { mainnet: null, testnet: null };

  if (chain.testnet) {
    return {
      testnet: chain,
      mainnet: chain.mainnetEquivalent ? CHAINS[chain.mainnetEquivalent] : null,
    };
  } else {
    return {
      mainnet: chain,
      testnet: chain.testnetEquivalent ? CHAINS[chain.testnetEquivalent] : null,
    };
  }
}
