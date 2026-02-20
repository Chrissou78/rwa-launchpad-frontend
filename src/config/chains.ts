export type SupportedChainId = 43113 | 43114 | 137 | 80002 | 1 | 11155111 | 42161 | 8453 | 10 | 56;

export interface ChainInfo {
  id: SupportedChainId;
  name: string;
  testnet: boolean;
  explorerUrl: string;
  faucetUrl: string;
  nativeCurrency: string;
  rpcUrl: string;
}

export const CHAINS: Record<SupportedChainId, ChainInfo> = {
  43113: {
    id: 43113,
    name: "Avalanche Fuji",
    testnet: true,
    explorerUrl: "https://testnet.snowtrace.io",
    faucetUrl: "https://faucet.avax.network/",
    nativeCurrency: "AVAX",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  },
  43114: {
    id: 43114,
    name: "Avalanche",
    testnet: false,
    explorerUrl: "https://snowtrace.io",
    faucetUrl: "",
    nativeCurrency: "AVAX",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
  },
  137: {
    id: 137,
    name: "Polygon",
    testnet: false,
    explorerUrl: "https://polygonscan.com",
    faucetUrl: "",
    nativeCurrency: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    testnet: true,
    explorerUrl: "https://amoy.polygonscan.com",
    faucetUrl: "https://faucet.polygon.technology/",
    nativeCurrency: "MATIC",
    rpcUrl: "https://rpc-amoy.polygon.technology",
  },
  1: {
    id: 1,
    name: "Ethereum",
    testnet: false,
    explorerUrl: "https://etherscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    testnet: true,
    explorerUrl: "https://sepolia.etherscan.io",
    faucetUrl: "https://sepoliafaucet.com/",
    nativeCurrency: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    testnet: false,
    explorerUrl: "https://arbiscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  8453: {
    id: 8453,
    name: "Base",
    testnet: false,
    explorerUrl: "https://basescan.org",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.base.org",
  },
  10: {
    id: 10,
    name: "Optimism",
    testnet: false,
    explorerUrl: "https://optimistic.etherscan.io",
    faucetUrl: "",
    nativeCurrency: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
  },
  56: {
    id: 56,
    name: "BNB Chain",
    testnet: false,
    explorerUrl: "https://bscscan.com",
    faucetUrl: "",
    nativeCurrency: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
  },
};
