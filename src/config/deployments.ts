// src/config/deployments.ts
import { SupportedChainId } from "./chains";

export interface DeploymentData {
  contracts: {
    // Core contracts
    RWAProjectNFT: string;
    RWALaunchpadFactory: string;
    KYCManager: string;
    RWATokenizationFactory: string;
    RWATradeEscrow: string;
    
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
      RWATradeEscrow: string;
      TokenizationFactory: string;
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
    ESCROW_TRANSACTION_FEE_BPS?: number;      // Optional for backward compat
    ESCROW_TRANSACTION_FEE_PERCENT?: string;  // Optional for backward compat
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
    RWATradeEscrow: ZERO,
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
      RWATradeEscrow: ZERO,
      TokenizationFactory: ZERO,
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
      RWAProjectNFT: "0x0F0b2B1763C49758423f952dEf41d638C8dE7bDF",
      RWALaunchpadFactory: "0xAa3aCCf3C777fCa942e698BA3Abff27d4e43eaB2",
      KYCManager: "0x8370A7c242fd30911a6E6B52335FC4AdF7753c6F",
      RWATokenizationFactory: "0x2dd0b32EeF71d963f84da652c15742A416393fe8",
      RWATradeEscrow: "0xe7F8a504C53E3B5e4E954a442D3f2627dD19b8c4",
      IdentityRegistry: "0x10C0C865594Af3E642D44d925AD621e0563431c5",
      IdentityRegistryStorage: "0x135d953926A39CB868e524a4D6cFE026b751fA71",
      ClaimTopicsRegistry: "0xf30A735389F69Bf46e00731D164300E16129CDb2",
      TrustedIssuersRegistry: "0xd2ae7843435e809b6f4b638bEB5495F768841D45",
      RWASecurityExchange: "0x2Eb97264737edFA3FE998960967BBA4b4D36BB3E",
      OffChainInvestmentManager: "0xe233382adAb62B569D2b392FdeE5000457135D9c",
      CountryRestrictModule: "0xf4f252ef2383CaCb54Fc75A48b7FD2D5dc66E577",
      AccreditedInvestorModule: "0x79FB567C8Dc0A35F6622Ed070060FB6fc7a9cB5A",
      Implementations: {
        SecurityToken: "0x198E1fa20f0538A587C3D3C50Cd0CF7CC67A9052",
        EscrowVault: "0x8A962582446686b62D1F9d86dfe6D8c107f11357",
        Compliance: "0x73B699A1e7AF652027194d35A7DB3eD0AD6DF399",
        ProjectNFT: "0xc1E2682b9bDBB6341e346Bc4Dff9ccBB8fE0Bb09",
        KYCManager: "0x2b5C3b768D44457330646B205B6fC35666Da5d34",
        OffChainManager: "0x30B0C77426dd7c3BCBC845099BEE931aE00904a6",
        Exchange: "0x99E6deBB20E6807904F8827D3b20aAe90353C9bC",
        DividendDistributor: "0xf49f7F8af071c50fE732b2488d569737628dE75E",
        MaxBalanceModule: "0x01B4286FdcBf99dFA42a06f90FB1058A397F7c2c",
        LockupModule: "0x540Cf149653495998a9e9474244c3612FB5f7e8a",
        RWATradeEscrow: "0xe7F8a504C53E3B5e4E954a442D3f2627dD19b8c4",
        TokenizationFactory: "0x1EA30C3E4E4e47627013B3dcaBA81ABaD84b3768",
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
      ESCROW_TRANSACTION_FEE_BPS: 100,
      ESCROW_TRANSACTION_FEE_PERCENT: "1",
    },
    deployedAt: "2026-02-20",
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
      CREATION_FEE: "100000000000000000",
      CREATION_FEE_FORMATTED: "0.1",
      KYC_FEE: "100000000000000000",
      KYC_FEE_FORMATTED: "0.1",
      ESCROW_TRANSACTION_FEE_BPS: 100,
      ESCROW_TRANSACTION_FEE_PERCENT: "1",
    },
  },

  // ========================================
  // Polygon Amoy Testnet - DEPLOYED
  // ========================================
  80002: {
    contracts: {
      RWAProjectNFT: "0xc0a4048dC08a4264f23e6421fE7C39f85893c177",
      RWALaunchpadFactory: "0x3526eA23462EEF440830883755FE4c7C2E950D4D",
      KYCManager: "0x0f717E38086dE75e91a06A94651C5F9f65Ea46DA",
      RWATokenizationFactory: "0x3CFf301e5cBfBD6E477D324C219CEE122af611A4",
      RWATradeEscrow: "0xD0F152D827B9Ff649F2b51C2Ce0057B080980691",  // ✅ ADDED
      IdentityRegistry: "0x9f41B622620194Efe33F3E6ea98491b596A3fbfc",
      IdentityRegistryStorage: "0x7E8F717E4797DB78216c94865EF632C838Bb8210",
      ClaimTopicsRegistry: "0x91B0842f54e5b665ac0A522028fa689A35297F7f",
      TrustedIssuersRegistry: "0x5072Bf6B3175085BFd0E369e88904388e9cD2053",
      RWASecurityExchange: "0x9aF6753638516dB3e96A1A2d7841931Bc1Af7730",
      OffChainInvestmentManager: "0x5148e1C544a230C5930B41b822C1a20479Bfd1eF",
      CountryRestrictModule: "0xB4e54DF18640a5A3e9215e41F804a057D57ef13B",
      AccreditedInvestorModule: "0x994Ec9edE136a1553B0043Bb918E9663c473bb6e",
      Implementations: {
        SecurityToken: "0x8E3cb291808cd11De2784ad755583c81271d7CB6",
        EscrowVault: "0xDaB11CBCE78B74855bfFe1Ecde32B9E398735E21",
        Compliance: "0xE96EC2CBF6286ecDd4b62652249b4671d759bB6f",
        ProjectNFT: "0x1cBb32106cba839F3B832d0f7E97eBFA478b6C9f",
        KYCManager: "0xd2A1A01A7c09248F799aD3a13b22768aE6a57154",
        OffChainManager: "0xFdfCF4bedd5b2b2F1551Bc5504a52CDb7ECc5827",
        Exchange: "0x663b7b7E2033B379aE36120e9511eFBF9A8280e0",
        DividendDistributor: "0x14B1f263A533b5973A1bC3Bb3DfEB1EcDBf83FDe",
        MaxBalanceModule: "0x1017BAE2fa985cfa9C507C433D9eF9F1b7c1a623",
        LockupModule: "0xE88C3bc8EBa58cbB53F02a546A6d960b266cA9AB",
        RWATradeEscrow: "0xD0F152D827B9Ff649F2b51C2Ce0057B080980691",
        TokenizationFactory: "0x0194e637d64F2367fb229f3168DaB3E8817911CE",
      },
    },
    tokens: {
      USDC: "0xEd589B57e559874A5202a0FB82406c46A2116675",
      USDT: "0xfa86C7c30840694293a5c997f399d00A4eD3cDD8",
    },
    fees: {
      CREATION_FEE: "10000000000000000",
      CREATION_FEE_FORMATTED: "0.01",
      KYC_FEE: "50000000000000000",
      KYC_FEE_FORMATTED: "0.05",
      ESCROW_TRANSACTION_FEE_BPS: 100,
      ESCROW_TRANSACTION_FEE_PERCENT: "1",
    },
    deployedAt: "2026-02-21",
    version: "1.0.0",
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
      CREATION_FEE: "5000000000000000000",
      CREATION_FEE_FORMATTED: "5",
      KYC_FEE: "10000000000000000000",
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
      CREATION_FEE: "5000000000000000",
      CREATION_FEE_FORMATTED: "0.005",
      KYC_FEE: "10000000000000000",
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
      CREATION_FEE: "5000000000000000",
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
  // BNB Chain Mainnet (placeholder)
  // ========================================
  56: {
    ...EMPTY_DEPLOYMENT,
    tokens: {
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
    },
    fees: {
      CREATION_FEE: "10000000000000000",
      CREATION_FEE_FORMATTED: "0.01",
      KYC_FEE: "50000000000000000",
      KYC_FEE_FORMATTED: "0.05",
    },
  },

  // ========================================
  // BNB Chain Testnet (placeholder)
  // ========================================
  97: {
    contracts: {
      RWAProjectNFT: "0x609915eCcf8C784f021ef49F4568d51132185D77",
      RWALaunchpadFactory: "0x3D58fFF590d1E925fd0f510e96C20bc12691840F",
      KYCManager: "0x983BeE34CA5747B2Ea9014D60882e48da9b94a24",
      RWATokenizationFactory: "0x27a3199C114621C384ddC50C755bdbFa79809075",
      RWATradeEscrow: "0xCE42B1F13e1B5311Ad6c2Cf75D5351385e91f914",
      IdentityRegistry: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
      IdentityRegistryStorage: "0x90Ae280C9b591F136883A243661ce63df517108a",
      ClaimTopicsRegistry: "0x22005206f3FeC3A12Eb507591De8f201e0807b5d",
      TrustedIssuersRegistry: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D",
      RWASecurityExchange: "0xf34eE271324B3EE33a9d8A3dE3FFa5be5981E22c",
      OffChainInvestmentManager: "0xbC7c83af353c286dC8Aa31A3254b4D058134F481",
      CountryRestrictModule: "0x9b869Dbb6a9c071f7993fC5609F13792FCF1647D",
      AccreditedInvestorModule: "0x9c4Bd10F3e7D13Beca138dFE0866430c231006DD",
      Implementations: {
        SecurityToken: "0xC8e4E9B4e2814c7E5295DE8809E7Dc321539fe9e",
        EscrowVault: "0xEcD5F2772fF19089f46f1542A07736dfeD9D17e7",
        Compliance: "0x02D074440967709a56E91cDACfdB37f8Ca2843D9",
        ProjectNFT: "0x44EBD95d5C6Ea4eB24DEa99231A0e87F0ED025DE",
        KYCManager: "0xd24e102B207f55a7B13F2d269de5ebC2B526A2dF",
        OffChainManager: "0xAc005d3978F6288755d532A1Aca59fe46D719146",
        Exchange: "0x0D128B3480bb7566dc3c6846cEA5E1A25512c903",
        DividendDistributor: "0x240221a1B94cc0bC81539b7Aa2A91932Cd06Bc12",
        MaxBalanceModule: "0x887E74dDf58FF6a0F6DE51e0fe310e5943E13247",
        LockupModule: "0x6FB518295aDe55D7c04b576A1385942638829701",
        RWATradeEscrow: "0xCE42B1F13e1B5311Ad6c2Cf75D5351385e91f914",
        TokenizationFactory: "0x80De45b0c75b0d4281dD6871d14cDe38785B2Cd1",
      },
    },
    tokens: {
      USDC: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
      USDT: "0xe57d2BA10a92eb04eD1B56Cb2dE9D67799782835",
    },
    fees: {
      CREATION_FEE: "10000000000000000",
      CREATION_FEE_FORMATTED: "0.01",
      KYC_FEE: "50000000000000000",
      KYC_FEE_FORMATTED: "0.05",
    },
    deployedAt: "2026-02-21",
    version: "1.0.0",
  },
};

export function isChainDeployed(chainId: SupportedChainId): boolean {
  return DEPLOYMENTS[chainId]?.version !== "0.0.0";
}

export function getDeployedChainIds(): SupportedChainId[] {
  return (Object.keys(DEPLOYMENTS) as unknown as SupportedChainId[])
    .filter(id => isChainDeployed(Number(id) as SupportedChainId));
}