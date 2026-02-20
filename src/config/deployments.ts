import { SupportedChainId } from "./chains";

export interface DeploymentData {
  contracts: {
    RWAProjectNFT: string;
    RWALaunchpadFactory: string;
    KYCManager: string;
    RWATokenizationFactory: string;
    IdentityRegistry: string;
    IdentityRegistryStorage: string;
    ClaimTopicsRegistry: string;
    TrustedIssuersRegistry: string;
    RWASecurityExchange: string;
    OffChainInvestmentManager: string;
    CountryRestrictModule: string;
    AccreditedInvestorModule: string;
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
    };
  };
  tokens: {
    USDC: string;
    USDT: string;
  };
  fees: {
    CREATION_FEE: string;
    CREATION_FEE_FORMATTED: string;
    KYC_FEE: string;
    KYC_FEE_FORMATTED: string;
  };
  deployedAt?: string;
  version: string;
}

const ZERO = "0x0000000000000000000000000000000000000000";

const EMPTY_DEPLOYMENT: DeploymentData = {
  contracts: {
    RWAProjectNFT: ZERO,
    RWALaunchpadFactory: ZERO,
    KYCManager: ZERO,
    RWATokenizationFactory: ZERO,
    IdentityRegistry: ZERO,
    IdentityRegistryStorage: ZERO,
    ClaimTopicsRegistry: ZERO,
    TrustedIssuersRegistry: ZERO,
    RWASecurityExchange: ZERO,
    OffChainInvestmentManager: ZERO,
    CountryRestrictModule: ZERO,
    AccreditedInvestorModule: ZERO,
    Implementations: {
      SecurityToken: ZERO,
      EscrowVault: ZERO,
      Compliance: ZERO,
      ProjectNFT: ZERO,
      KYCManager: ZERO,
      OffChainManager: ZERO,
      Exchange: ZERO,
      DividendDistributor: ZERO,
      MaxBalanceModule: ZERO,
      LockupModule: ZERO,
    },
  },
  tokens: {
    USDC: ZERO,
    USDT: ZERO,
  },
  fees: {
    CREATION_FEE: "10000000000000000",
    CREATION_FEE_FORMATTED: "0.01",
    KYC_FEE: "50000000000000000",
    KYC_FEE_FORMATTED: "0.05",
  },
  version: "0.0.0",
};

export const DEPLOYMENTS: Record<SupportedChainId, DeploymentData> = {
  // ========================================
  // Avalanche Fuji Testnet
  // ========================================
  43113: {
    contracts: {
      RWAProjectNFT: "0x887E74dDf58FF6a0F6DE51e0fe310e5943E13247",
      RWALaunchpadFactory: "0xd24e102B207f55a7B13F2d269de5ebC2B526A2dF",
      KYCManager: "0x3D58fFF590d1E925fd0f510e96C20bc12691840F",
      RWATokenizationFactory: "0xa02567564095960412BD32cC47C07a91f85BA213",
      IdentityRegistry: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D",
      IdentityRegistryStorage: "0x22005206f3FeC3A12Eb507591De8f201e0807b5d",
      ClaimTopicsRegistry: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
      TrustedIssuersRegistry: "0xE9DA0F79BC40e1c111de49498b3Fb17dCE59b7f2",
      RWASecurityExchange: "0x9ce72c0932441482A492Fa4a5b2F4Dea5E87F722",
      OffChainInvestmentManager: "0x70624D6f3f4FF5ff684Bfe87E862ccEB21a604B2",
      CountryRestrictModule: "0x941Bf67C211983639b8c3C5374212a25216B25a8",
      AccreditedInvestorModule: "0x8a2Da8bF967B24A466458c4751453200B968dF06",
      Implementations: {
        SecurityToken: "0x90Ae280C9b591F136883A243661ce63df517108a",
        EscrowVault: "0x847082755E336b629eD5B7d300a032587eD96058",
        Compliance: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
        ProjectNFT: "0x0F6a4f7486ad12e03C89800F251e7f046fD2Ec4e",
        KYCManager: "0x0D128B3480bb7566dc3c6846cEA5E1A25512c903",
        OffChainManager: "0xC8e4E9B4e2814c7E5295DE8809E7Dc321539fe9e",
        Exchange: "0xEcD5F2772fF19089f46f1542A07736dfeD9D17e7",
        DividendDistributor: "0x02D074440967709a56E91cDACfdB37f8Ca2843D9",
        MaxBalanceModule: "0x44EBD95d5C6Ea4eB24DEa99231A0e87F0ED025DE",
        LockupModule: "0xAc005d3978F6288755d532A1Aca59fe46D719146",
      },
    },
    tokens: {
      USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
      USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
    },
    fees: {
      CREATION_FEE: "10000000000000000",
      CREATION_FEE_FORMATTED: "0.01",
      KYC_FEE: "50000000000000000",
      KYC_FEE_FORMATTED: "0.05",
    },
    deployedAt: "2026-02-19",
    version: "1.0.0",
  },

  // ========================================
  // Avalanche Mainnet (placeholder)
  // ========================================
  43114: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
    fees: {
      CREATION_FEE: "100000000000000000", // 0.1 AVAX for mainnet
      CREATION_FEE_FORMATTED: "0.1",
      KYC_FEE: "100000000000000000",
      KYC_FEE_FORMATTED: "0.1",
    },
  },

  // ========================================
  // Polygon Amoy Testnet (placeholder)
  // ========================================
  80002: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
      USDT: ZERO,
    },
  },

  // ========================================
  // Polygon Mainnet (placeholder)
  // ========================================
  137: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    fees: {
      CREATION_FEE: "5000000000000000000", // 5 MATIC
      CREATION_FEE_FORMATTED: "5",
      KYC_FEE: "10000000000000000000", // 10 MATIC
      KYC_FEE_FORMATTED: "10",
    },
  },

  // ========================================
  // Ethereum Mainnet (placeholder)
  // ========================================
  1: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    fees: {
      CREATION_FEE: "5000000000000000", // 0.005 ETH
      CREATION_FEE_FORMATTED: "0.005",
      KYC_FEE: "10000000000000000", // 0.01 ETH
      KYC_FEE_FORMATTED: "0.01",
    },
  },

  // ========================================
  // Sepolia Testnet (placeholder)
  // ========================================
  11155111: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      USDT: ZERO,
    },
  },

  // ========================================
  // Arbitrum One (placeholder)
  // ========================================
  42161: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    fees: {
      CREATION_FEE: "5000000000000000", // 0.005 ETH
      CREATION_FEE_FORMATTED: "0.005",
      KYC_FEE: "10000000000000000",
      KYC_FEE_FORMATTED: "0.01",
    },
  },

  // ========================================
  // Base (placeholder)
  // ========================================
  8453: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: ZERO,
    },
    fees: {
      CREATION_FEE: "5000000000000000",
      CREATION_FEE_FORMATTED: "0.005",
      KYC_FEE: "10000000000000000",
      KYC_FEE_FORMATTED: "0.01",
    },
  },

  // ========================================
  // Optimism (placeholder)
  // ========================================
  10: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    },
    fees: {
      CREATION_FEE: "5000000000000000",
      CREATION_FEE_FORMATTED: "0.005",
      KYC_FEE: "10000000000000000",
      KYC_FEE_FORMATTED: "0.01",
    },
  },

  // ========================================
  // BNB Chain (placeholder)
  // ========================================
  56: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
    },
    fees: {
      CREATION_FEE: "10000000000000000", // 0.01 BNB
      CREATION_FEE_FORMATTED: "0.01",
      KYC_FEE: "50000000000000000",
      KYC_FEE_FORMATTED: "0.05",
    },
  },
};

export function isChainDeployed(chainId: SupportedChainId): boolean {
  return DEPLOYMENTS[chainId]?.version !== "0.0.0";
}

export function getDeployedChainIds(): SupportedChainId[] {
  return (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[])
    .filter(id => isChainDeployed(Number(id) as SupportedChainId));
}
