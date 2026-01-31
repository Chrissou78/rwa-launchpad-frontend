// Export all ABIs
// These should be copied from your compiled artifacts in rwa-launchpad-evm/artifacts

export const RWALaunchpadFactoryABI = [
  {
    "inputs": [],
    "name": "getProjectCount",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "projectId", "type": "uint256" }],
    "name": "getProject",
    "outputs": [
      { "name": "securityToken", "type": "address" },
      { "name": "escrowVault", "type": "address" },
      { "name": "compliance", "type": "address" },
      { "name": "owner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "symbol", "type": "string" },
      { "name": "maxSupply", "type": "uint256" },
      { "name": "tokenPrice", "type": "uint256" },
      { "name": "minInvestment", "type": "uint256" },
      { "name": "maxInvestment", "type": "uint256" },
      { "name": "lockupPeriod", "type": "uint256" },
      { "name": "metadataURI", "type": "string" }
    ],
    "name": "createProject",
    "outputs": [{ "name": "projectId", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creationFee",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFee",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "projectId", "type": "uint256" },
      { "indexed": true, "name": "owner", "type": "address" },
      { "indexed": false, "name": "securityToken", "type": "address" },
      { "indexed": false, "name": "escrowVault", "type": "address" }
    ],
    "name": "ProjectCreated",
    "type": "event"
  }
] as const;

export const RWASecurityTokenABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "from", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "isFrozen",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" },
      { "name": "frozen", "type": "bool" }
    ],
    "name": "setAddressFrozen",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "snapshot",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "identityRegistry",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "compliance",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const RWAEscrowVaultABI = [
  {
    "inputs": [{ "name": "paymentToken", "type": "address" }],
    "name": "invest",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "investor", "type": "address" }],
    "name": "getInvestment",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalRaised",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "softCap",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "hardCap",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minInvestment",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxInvestment",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMilestones",
    "outputs": [
      {
        "components": [
          { "name": "description", "type": "string" },
          { "name": "amount", "type": "uint256" },
          { "name": "releaseTime", "type": "uint256" },
          { "name": "released", "type": "bool" }
        ],
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const IdentityRegistryABI = [
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "isVerified",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" },
      { "name": "identity", "type": "address" },
      { "name": "country", "type": "uint16" }
    ],
    "name": "registerIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "deleteIdentity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "identity",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "investorCountry",
    "outputs": [{ "type": "uint16" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const RWAProjectNFTABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "ownerOf",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "tokenURI",
    "outputs": [{ "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "getSecurityToken",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "getEscrowVault",
    "outputs": [{ "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "isProjectCompleted",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
