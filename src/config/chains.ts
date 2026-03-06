import { 
  polygon, 
  polygonAmoy, 
  mainnet, 
  sepolia, 
  avalanche, 
  avalancheFuji, 
  arbitrum, 
  base, 
  optimism, 
  bsc, 
  bscTestnet,
  cronos,
  type Chain 
} from "viem/chains";
import { DEPLOYMENTS } from "./deployments";

// Define Cronos Testnet manually (not in viem/chains)
const cronosTestnet: Chain = {
  id: 338,
  name: 'Cronos Testnet',
  nativeCurrency: { name: 'Test Cronos', symbol: 'tCRO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-t3.cronos.org'] },
  },
  blockExplorers: {
    default: { name: 'Cronos Testnet Explorer', url: 'https://testnet.cronoscan.com' },
  },
  testnet: true,
};

// Helper to get KYCVerifier address from deployments
function getKYCVerifier(chainId: number): string | undefined {
  const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];
  return deployment?.contracts?.KYCVerifier;
}

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
  | 97       // BNB Chain Testnet
  | 25       // Cronos Mainnet
  | 338;     // Cronos Testnet

export interface ChainContracts {
  KYCVerifier?: string;
  Token?: string;
  Presale?: string;
  Launchpad?: string;
}

export interface ChainInfo {
  id: SupportedChainId;
  name: string;
  testnet: boolean;
  explorerUrl: string;
  faucetUrl: string;
  nativeCurrency: string;
  rpcUrl: string;
  mainnetEquivalent?: SupportedChainId;
  testnetEquivalent?: SupportedChainId;
  chain: Chain;
  contracts?: ChainContracts;
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
    chain: avalancheFuji,
    contracts: {
      KYCVerifier: getKYCVerifier(43113),
    },
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
    chain: avalanche,
    contracts: {
      KYCVerifier: getKYCVerifier(43114),
    },
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
    nativeCurrency: "POL",
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC || "https://polygon-rpc.com",
    testnetEquivalent: 80002,
    chain: polygon,
    contracts: {
      KYCVerifier: getKYCVerifier(137),
    },
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    testnet: true,
    explorerUrl: "https://amoy.polygonscan.com",
    faucetUrl: "https://faucet.polygon.technology/",
    nativeCurrency: "POL",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    mainnetEquivalent: 137,
    chain: polygonAmoy,
    contracts: {
      KYCVerifier: getKYCVerifier(80002),
    },
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
    rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC || "https://eth.llamarpc.com",
    testnetEquivalent: 11155111,
    chain: mainnet,
    contracts: {
      KYCVerifier: getKYCVerifier(1),
    },
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
    chain: sepolia,
    contracts: {
      KYCVerifier: getKYCVerifier(11155111),
    },
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
    chain: arbitrum,
    contracts: {
      KYCVerifier: getKYCVerifier(42161),
    },
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
    chain: base,
    contracts: {
      KYCVerifier: getKYCVerifier(8453),
    },
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
    chain: optimism,
    contracts: {
      KYCVerifier: getKYCVerifier(10),
    },
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
    chain: bsc,
    contracts: {
      KYCVerifier: getKYCVerifier(56),
    },
  },
  97: {
    id: 97,
    name: "BNB Testnet",
    testnet: true,
    explorerUrl: "https://testnet.bscscan.com",
    faucetUrl: "https://testnet.bnbchain.org/faucet-smart",
    nativeCurrency: "tBNB",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    mainnetEquivalent: 56,
    chain: bscTestnet,
    contracts: {
      KYCVerifier: getKYCVerifier(97),
    },
  },

  // ========================================
  // Cronos
  // ========================================
  25: {
    id: 25,
    name: "Cronos",
    testnet: false,
    explorerUrl: "https://cronoscan.com",
    faucetUrl: "",
    nativeCurrency: "CRO",
    rpcUrl: "https://evm.cronos.org",
    testnetEquivalent: 338,
    chain: cronos,
    contracts: {
      KYCVerifier: getKYCVerifier(25),
    },
  },
  338: {
    id: 338,
    name: "Cronos Testnet",
    testnet: true,
    explorerUrl: "https://testnet.cronoscan.com",
    faucetUrl: "https://cronos.org/faucet",
    nativeCurrency: "tCRO",
    rpcUrl: "https://evm-t3.cronos.org",
    mainnetEquivalent: 25,
    chain: cronosTestnet,
    contracts: {
      KYCVerifier: getKYCVerifier(338),
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getChainById(chainId: number): ChainInfo | undefined {
  return CHAINS[chainId as SupportedChainId];
}

export function getChainConfig(chainId: number): ChainInfo {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
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

export function getSupportedChainIds(): SupportedChainId[] {
  return Object.keys(CHAINS).map(Number) as SupportedChainId[];
}

export function getDefaultChain(): ChainInfo {
  const defaultChainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 137) as SupportedChainId;
  return CHAINS[defaultChainId] || CHAINS[137];
}
