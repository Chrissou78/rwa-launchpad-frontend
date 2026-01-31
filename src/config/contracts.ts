export const CHAIN_ID = 80002;
export const EXPLORER_URL = 'https://amoy.polygonscan.com';

export const CONTRACTS = {
  // Core contracts
  RWAProjectNFT: '0x4497e4EA43C1A1Cd2B719fF0E4cea376364c1315',
  RWALaunchpadFactory: '0x07bf2B1e5900B967175C5927bfA01E30Eb06ab87',
  DividendDistributor: '0x1cAaBF55391F9d2D541C47C3534Ba89d747e6C60',
  
  // Identity & Compliance
  IdentityRegistry: '0xb9C738ed28AcBDA3f1eF7b7933dD5C57f80896e0',
  IdentityRegistryStorage: '0x74c1fAB88afE0C15e5F17B8a8bC7251308e20Dc0',
  ModularCompliance: '0xEa738f23eDebB9DbEa567EA75e64cB92d91f07BA',
  ClaimTopicsRegistry: '0x3D3F72FAc44120C3991eF0bcc8Ae55a3A9f40186',
  TrustedIssuersRegistry: '0x93283fF20131213707c3eD29cB991a77aE3Ffd79',
  EscrowVault: '0x7f65Fc9eC415C155ec1EcF83E77d6c052029A51a',
  
  // Implementation contracts (for reference)
  Implementations: {
    SecurityToken: '0xF399A233884ADF36de64cBb01ff28c907670Ba71',
    EscrowVault: '0x592E76b6883049D81f0118493AcDa9d8ce8C4c24',
    Compliance: '0x175b5Fa6eb9b0331a2dd45820020D05617BA0AE3',
  },
  
  // Compliance modules
  Modules: {
    CountryRestrict: '0x7246D4d135A211b760a2E6ae4Dd76cd9452656ae',
    MaxBalance: '0x11Dbd81b00384e493E6dbd12Af4E5b2eeC1F56DB',
    Lockup: '0x159B4377823C77d9C0092d3BAABd3f3dee0B5b10',
    AccreditedInvestor: '0x775c17387074018603141b2D82F7D764c867B306',
  },
  
  // Tokens (testnet)
  USDC: '0xEd589B57e559874A5202a0FB82406c46A2116675',
  USDT: '0xfa86C7c30840694293a5c997f399d00A4eD3cDD8',
};
