// src/config/abis/index.ts
// Central ABI repository for the RWA Launchpad platform
// Last updated: 2026-02-13

// ============================================================================
// KYC MANAGER ABI
// ============================================================================
export const KYCManagerABI = [
  // State variables
  { inputs: [], name: "kycFee", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalFeesCollected", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "kycValidityPeriod", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "autoVerifyThreshold", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "identityRegistry", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "autoApprovalEnabled", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Statistics
  { inputs: [], name: "totalSubmissions", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalAutoApproved", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalManualApproved", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalRejected", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pendingManualReview", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getStatistics", outputs: [{ name: "_totalSubmissions", type: "uint256" }, { name: "_totalAutoApproved", type: "uint256" }, { name: "_totalManualApproved", type: "uint256" }, { name: "_totalRejected", type: "uint256" }, { name: "_pendingManualReview", type: "uint256" }, { name: "_totalUsers", type: "uint256" }], stateMutability: "view", type: "function" },
  // Role constants
  { inputs: [], name: "VERIFIER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "REVIEWER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Submission view functions - simple tuple
  { inputs: [{ name: "_investor", type: "address" }], name: "getSubmission", outputs: [{ type: "tuple", components: [{ name: "investor", type: "address" }, { name: "level", type: "uint8" }, { name: "status", type: "uint8" }, { name: "submittedAt", type: "uint256" }, { name: "reviewedAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "reviewer", type: "address" }, { name: "documentHash", type: "string" }, { name: "countryCode", type: "uint16" }] }], stateMutability: "view", type: "function" },
  // Status and level queries
  { inputs: [{ name: "_investor", type: "address" }], name: "getKYCStatus", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "getKYCLevel", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "isKYCValid", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "isKYCApproved", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Investment limits
  { inputs: [{ name: "_investor", type: "address" }], name: "getInvestmentLimit", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "getRemainingLimit", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "getTotalInvested", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }, { name: "_amount", type: "uint256" }], name: "canInvest", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }, { name: "_projectId", type: "uint256" }], name: "getProjectInvestment", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_level", type: "uint8" }], name: "levelInvestmentLimits", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_level", type: "uint8" }], name: "getLevelInvestmentLimit", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Pending submissions
  { inputs: [], name: "getPendingSubmissions", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPendingManualReviewList", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPendingCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Country blocking
  { inputs: [{ name: "_countryCode", type: "uint16" }], name: "blockedCountries", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Submit KYC
  { inputs: [{ name: "_level", type: "uint8" }, { name: "_documentHash", type: "string" }, { name: "_countryCode", type: "uint16" }], name: "submitKYC", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "_newLevel", type: "uint8" }, { name: "_documentHash", type: "string" }], name: "requestUpgrade", outputs: [], stateMutability: "payable", type: "function" },
  // Verification functions
  { inputs: [{ name: "_user", type: "address" }], name: "startAutoVerification", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_user", type: "address" }, { name: "_passed", type: "bool" }, { name: "_confidenceScore", type: "uint8" }, { name: "_rejectionReason", type: "uint8" }, { name: "_failureDetails", type: "string" }], name: "submitAutoVerificationResult", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Approve/Reject KYC
  { inputs: [{ name: "_investor", type: "address" }, { name: "_approvedLevel", type: "uint8" }], name: "approveKYC", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }, { name: "_reason", type: "string" }], name: "rejectKYC", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_user", type: "address" }, { name: "_reason", type: "string" }], name: "revokeKYC", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Admin functions
  { inputs: [{ name: "_newFee", type: "uint256" }], name: "setKYCFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_newRecipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_period", type: "uint256" }], name: "setKYCValidityPeriod", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_level", type: "uint8" }, { name: "_limit", type: "uint256" }], name: "setLevelLimit", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_level", type: "uint8" }, { name: "_limit", type: "uint256" }], name: "setLevelInvestmentLimit", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_enabled", type: "bool" }], name: "setAutoApprovalEnabled", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_countryCode", type: "uint16" }], name: "blockCountry", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_countryCode", type: "uint16" }], name: "unblockCountry", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "withdrawFees", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_threshold", type: "uint256" }], name: "setAutoVerifyThreshold", outputs: [], stateMutability: "nonpayable", type: "function"},
  { inputs: [{ name: "_investor", type: "address" }], name: "resetKYC", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "approveUpgrade", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }, { name: "_reason", type: "string" }], name: "rejectUpgrade", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getPendingUpgrades", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPendingUpgradeCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "getUpgradeRequest", outputs: [{ name: "", type: "tuple", components: [{ name: "requestedLevel", type: "uint8" }, { name: "documentHash", type: "string" }, { name: "submittedAt", type: "uint256" }, { name: "pending", type: "bool" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_investor", type: "address" }], name: "hasUpgradePending", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "fromLevel", type: "uint8" }, { indexed: false, name: "toLevel", type: "uint8" }, { indexed: false, name: "documentHash", type: "string" }], name: "UpgradeRequested", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "newLevel", type: "uint8" }, { indexed: true, name: "reviewer", type: "address" }], name: "UpgradeApproved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "currentLevel", type: "uint8" }, { indexed: true, name: "reviewer", type: "address" }, { indexed: false, name: "reason", type: "string" }], name: "UpgradeRejected", type: "event" },

  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "level", type: "uint8" }, { indexed: false, name: "documentHash", type: "string" }], name: "KYCSubmitted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "level", type: "uint8" }, { indexed: true, name: "reviewer", type: "address" }], name: "KYCApproved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: true, name: "reviewer", type: "address" }, { indexed: false, name: "reason", type: "string" }], name: "KYCRejected", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "FeeCollected", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "oldFee", type: "uint256" }, { indexed: false, name: "newFee", type: "uint256" }], name: "KYCFeeUpdated", type: "event" },
] as const;

// ============================================================================
// RWA LAUNCHPAD FACTORY ABI
// ============================================================================
export const RWALaunchpadFactoryABI = [
  { inputs: [], name: "projectNFT", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "creationFee", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "platformFeeBps", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "platformFeeRecipient", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "projectCounter", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "requireApproval", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "defaultPriceFeed", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "complianceImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "securityTokenImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "escrowVaultImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "dividendDistributorImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxBalanceModuleImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "lockupModuleImplementation", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "approvedDeployers", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "deploymentRecords", outputs: [{ internalType: "uint256", name: "projectId", type: "uint256" }, { internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "securityToken", type: "address" }, { internalType: "address", name: "escrowVault", type: "address" }, { internalType: "address", name: "compliance", type: "address" }, { internalType: "address", name: "dividendDistributor", type: "address" }, { internalType: "uint256", name: "deployedAt", type: "uint256" }, { internalType: "bool", name: "isActive", type: "bool" }, { internalType: "string", name: "category", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "uint256", name: "", type: "uint256" }], name: "deployerProjects", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "string", name: "_name", type: "string" }, { internalType: "string", name: "_symbol", type: "string" }, { internalType: "address", name: "", type: "address" }, { internalType: "string", name: "_category", type: "string" }, { internalType: "uint256", name: "_maxSupply", type: "uint256" }, { internalType: "uint256", name: "_fundingGoal", type: "uint256" }, { internalType: "uint256", name: "_deadlineDays", type: "uint256" }, { internalType: "string", name: "_metadataUri", type: "string" }], name: "deployProject", outputs: [{ internalType: "uint256", name: "projectId", type: "uint256" }, { internalType: "address", name: "securityToken", type: "address" }, { internalType: "address", name: "escrowVault", type: "address" }, { internalType: "address", name: "compliance", type: "address" }], stateMutability: "payable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }], name: "getDeploymentRecord", outputs: [{ components: [{ internalType: "uint256", name: "projectId", type: "uint256" }, { internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "securityToken", type: "address" }, { internalType: "address", name: "escrowVault", type: "address" }, { internalType: "address", name: "compliance", type: "address" }, { internalType: "address", name: "dividendDistributor", type: "address" }, { internalType: "uint256", name: "deployedAt", type: "uint256" }, { internalType: "bool", name: "isActive", type: "bool" }, { internalType: "string", name: "category", type: "string" }], internalType: "struct RWALaunchpadFactory.DeploymentRecord", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_deployer", type: "address" }], name: "getDeployerProjects", outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_deployer", type: "address" }], name: "getDeployerProjectCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_offset", type: "uint256" }, { internalType: "uint256", name: "_limit", type: "uint256" }], name: "getActiveProjects", outputs: [{ components: [{ internalType: "uint256", name: "projectId", type: "uint256" }, { internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "securityToken", type: "address" }, { internalType: "address", name: "escrowVault", type: "address" }, { internalType: "address", name: "compliance", type: "address" }, { internalType: "address", name: "dividendDistributor", type: "address" }, { internalType: "uint256", name: "deployedAt", type: "uint256" }, { internalType: "bool", name: "isActive", type: "bool" }, { internalType: "string", name: "category", type: "string" }], internalType: "struct RWALaunchpadFactory.DeploymentRecord[]", name: "", type: "tuple[]" }, { internalType: "uint256", name: "total", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getImplementations", outputs: [{ components: [{ internalType: "address", name: "compliance", type: "address" }, { internalType: "address", name: "securityToken", type: "address" }, { internalType: "address", name: "escrowVault", type: "address" }, { internalType: "address", name: "dividendDistributor", type: "address" }, { internalType: "address", name: "maxBalanceModule", type: "address" }, { internalType: "address", name: "lockupModule", type: "address" }], internalType: "struct RWALaunchpadFactory.ImplementationAddresses", name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_deployer", type: "address" }], name: "isApprovedDeployer", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "_compliance", type: "address" }], name: "setComplianceImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_securityToken", type: "address" }], name: "setSecurityTokenImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_escrowVault", type: "address" }], name: "setEscrowVaultImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_dividendDistributor", type: "address" }], name: "setDividendDistributorImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_maxBalanceModule", type: "address" }], name: "setMaxBalanceModuleImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_lockupModule", type: "address" }], name: "setLockupModuleImplementation", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_fee", type: "uint256" }], name: "setCreationFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_feeBps", type: "uint256" }], name: "setPlatformFeeBps", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_recipient", type: "address" }], name: "setPlatformFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_priceFeed", type: "address" }], name: "setDefaultPriceFeed", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_projectNFT", type: "address" }], name: "setProjectNFT", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bool", name: "_require", type: "bool" }], name: "setRequireApproval", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "_deployer", type: "address" }, { internalType: "bool", name: "_approved", type: "bool" }], name: "setDeployerApproval", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address[]", name: "_deployers", type: "address[]" }, { internalType: "bool", name: "_approved", type: "bool" }], name: "batchSetDeployerApproval", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }], name: "deactivateProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "projectId", type: "uint256" }, { indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: false, internalType: "address", name: "securityToken", type: "address" }, { indexed: false, internalType: "address", name: "escrowVault", type: "address" }, { indexed: false, internalType: "address", name: "compliance", type: "address" }, { indexed: false, internalType: "string", name: "category", type: "string" }], name: "ProjectDeployed", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "string", name: "implementationType", type: "string" }, { indexed: false, internalType: "address", name: "oldAddress", type: "address" }, { indexed: false, internalType: "address", name: "newAddress", type: "address" }], name: "ImplementationUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "oldFee", type: "uint256" }, { indexed: false, internalType: "uint256", name: "newFee", type: "uint256" }], name: "CreationFeeUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "oldFeeBps", type: "uint256" }, { indexed: false, internalType: "uint256", name: "newFeeBps", type: "uint256" }], name: "PlatformFeeUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "oldRecipient", type: "address" }, { indexed: false, internalType: "address", name: "newRecipient", type: "address" }], name: "FeeRecipientUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "deployer", type: "address" }, { indexed: false, internalType: "bool", name: "approved", type: "bool" }], name: "DeployerApprovalUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "projectId", type: "uint256" }], name: "ProjectDeactivated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "oldPriceFeed", type: "address" }, { indexed: false, internalType: "address", name: "newPriceFeed", type: "address" }], name: "DefaultPriceFeedUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "oldProjectNFT", type: "address" }, { indexed: false, internalType: "address", name: "newProjectNFT", type: "address" }], name: "ProjectNFTUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousOwner", type: "address" }, { indexed: true, internalType: "address", name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }], name: "Paused", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }], name: "Unpaused", type: "event" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "InvalidFee", type: "error" },
  { inputs: [], name: "InsufficientFee", type: "error" },
  { inputs: [], name: "InvalidDeadline", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
  { inputs: [], name: "DeployerNotApproved", type: "error" },
  { inputs: [], name: "ProjectNotFound", type: "error" },
  { inputs: [], name: "ArrayLengthMismatch", type: "error" },
  { stateMutability: "payable", type: "receive" }
] as const;
// ============================================================================
// RWA PROJECT NFT ABI
// ============================================================================
export const RWAProjectNFTABI = [
  // ERC721 standard
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalProjects", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getApproved", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], name: "setApprovalForAll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], name: "isApprovedForAll", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], name: "transferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], name: "safeTransferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Project data
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getProjectData", outputs: [{ type: "tuple", components: [{ name: "securityToken", type: "address" }, { name: "escrowVault", type: "address" }, { name: "compliance", type: "address" }, { name: "owner", type: "address" }, { name: "createdAt", type: "uint256" }, { name: "status", type: "uint8" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }], name: "getProject", outputs: [{ type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "owner", type: "address" }, { name: "metadataURI", type: "string" }, { name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "minInvestment", type: "uint256" }, { name: "maxInvestment", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" }, { name: "securityToken", type: "address" }, { name: "escrowVault", type: "address" }, { name: "createdAt", type: "uint256" }, { name: "completedAt", type: "uint256" }, { name: "transferable", type: "bool" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getSecurityToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getEscrowVault", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getCompliance", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "getProjectStatus", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }], name: "getProjectsByOwner", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  // Admin functions
  { inputs: [{ name: "to", type: "address" }, { name: "uri", type: "string" }, { name: "securityToken", type: "address" }, { name: "escrowVault", type: "address" }, { name: "compliance", type: "address" }], name: "mint", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }, { name: "status", type: "uint8" }], name: "setProjectStatus", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "newStatus", type: "uint8" }], name: "updateProjectStatus", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }], name: "cancelProject", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }, { name: "uri", type: "string" }], name: "setTokenURI", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "transferable", type: "bool" }], name: "setProjectTransferable", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_totalRaised", type: "uint256" }], name: "updateTotalRaised", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Role constants
  { inputs: [], name: "MINTER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MANAGER_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: true, name: "tokenId", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "approved", type: "address" }, { indexed: true, name: "tokenId", type: "uint256" }], name: "Approval", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: false, name: "metadataURI", type: "string" }], name: "ProjectCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: false, name: "oldStatus", type: "uint8" }, { indexed: false, name: "newStatus", type: "uint8" }], name: "ProjectStatusChanged", type: "event" },
] as const;

// ============================================================================
// RWA SECURITY TOKEN ABI
// ============================================================================
export const RWASecurityTokenABI = [
  // ERC20 standard
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Security token specific
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "burn", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "amount", type: "uint256" }], name: "burnFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "forcedTransfer", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_to", type: "address" }, { name: "_tokenAmount", type: "uint256" }, { name: "_paymentMethod", type: "string" }, { name: "_paymentReference", type: "string" }], name: "mintForOffChainPayment", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Freeze functionality
  { inputs: [{ name: "account", type: "address" }], name: "isFrozen", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "frozen", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "frozen", type: "bool" }], name: "setAddressFrozen", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "accounts", type: "address[]" }, { name: "frozen", type: "bool" }], name: "batchSetAddressFrozen", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "freezeAccount", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "unfreezeAccount", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Partial freeze
  { inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], name: "freezePartialTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], name: "unfreezePartialTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "getFrozenTokens", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Snapshot
  { inputs: [], name: "snapshot", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "snapshotId", type: "uint256" }], name: "balanceOfAt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "snapshotId", type: "uint256" }], name: "totalSupplyAt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Compliance & Registry
  { inputs: [], name: "identityRegistry", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "compliance", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_identityRegistry", type: "address" }], name: "setIdentityRegistry", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_compliance", type: "address" }], name: "setCompliance", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Pause
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Recovery
  { inputs: [{ name: "lostWallet", type: "address" }, { name: "newWallet", type: "address" }, { name: "investorOnchainID", type: "address" }], name: "recoveryAddress", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "spender", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Approval", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "isFrozen", type: "bool" }], name: "AddressFrozen", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensFrozen", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensUnfrozen", type: "event" },
] as const;

// ============================================================================
// RWA ESCROW VAULT ABI
// ============================================================================
export const RWAEscrowVaultABI = [
  // State variables
  { inputs: [], name: "securityToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tokenPrice", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "softCap", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "hardCap", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "minInvestment", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxInvestment", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalRaised", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "startTime", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "endTime", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "status", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Fee-related
  { inputs: [], name: "transactionFee", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "collectedTransactionFees", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  // Investment functions
  { inputs: [{ name: "paymentToken", type: "address" }, { name: "amount", type: "uint256" }], name: "invest", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "investETH", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "investor", type: "address" }, { name: "amount", type: "uint256" }], name: "recordOffChainInvestment", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimTokens", outputs: [], stateMutability: "nonpayable", type: "function" },
  // View functions
  { inputs: [{ name: "investor", type: "address" }], name: "getInvestment", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "investor", type: "address" }], name: "getTokenAllocation", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "investor", type: "address" }], name: "hasClaimedTokens", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "investor", type: "address" }], name: "hasClaimedRefund", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getInvestorCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isActive", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isSoftCapReached", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isHardCapReached", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Project funding info
  { inputs: [{ name: "projectId", type: "uint256" }], name: "getProjectFunding", outputs: [{ type: "tuple", components: [{ name: "projectId", type: "uint256" }, { name: "fundingGoal", type: "uint256" }, { name: "totalRaised", type: "uint256" }, { name: "totalReleased", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "paymentToken", type: "address" }, { name: "fundingComplete", type: "bool" }, { name: "refundsEnabled", type: "bool" }, { name: "currentMilestone", type: "uint256" }, { name: "minInvestment", type: "uint256" }, { name: "maxInvestment", type: "uint256" }, { name: "projectOwner", type: "address" }, { name: "securityToken", type: "address" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "investor", type: "address" }], name: "getInvestorBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  // Milestone functions
  { inputs: [], name: "getMilestones", outputs: [{ type: "tuple[]", components: [{ name: "description", type: "string" }, { name: "amount", type: "uint256" }, { name: "releaseTime", type: "uint256" }, { name: "released", type: "bool" }, { name: "approved", type: "bool" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }], name: "getMilestones", outputs: [{ type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "description", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "releasedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" }, { name: "proofURI", type: "string" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "milestoneId", type: "uint256" }], name: "releaseMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "milestoneId", type: "uint256" }], name: "releaseMilestoneFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "milestoneId", type: "uint256" }], name: "approveMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "milestoneId", type: "uint256" }], name: "approveMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "milestoneId", type: "uint256" }, { name: "reason", type: "string" }], name: "rejectMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "projectId", type: "uint256" }, { name: "milestoneId", type: "uint256" }, { name: "status", type: "uint8" }], name: "setMilestoneStatus", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Refunds
  { inputs: [{ name: "projectId", type: "uint256" }], name: "enableRefunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Fee management
  { inputs: [{ name: "_fee", type: "uint256" }], name: "setTransactionFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_recipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "withdrawTransactionFees", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Admin functions
  { inputs: [], name: "finalize", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "cancel", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "setAcceptedToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "paymentToken", type: "address" }], name: "Investment", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "projectId", type: "uint256" }, { indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "InvestmentReceived", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "RefundClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "TokensClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "milestoneId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }], name: "MilestoneReleased", type: "event" },
] as const;

// ============================================================================
// IDENTITY REGISTRY ABI
// ============================================================================
export const IdentityRegistryABI = [
  // View functions
  { inputs: [{ name: "account", type: "address" }], name: "isVerified", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "identity", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "investorCountry", outputs: [{ type: "uint16" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "getInvestorCountry", outputs: [{ type: "uint16" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "identityStorage", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "issuersRegistry", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "topicsRegistry", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "getIdentity", outputs: [{ type: "tuple", components: [{ name: "identityContract", type: "address" }, { name: "investorCountry", type: "uint16" }, { name: "registeredAt", type: "uint256" }] }], stateMutability: "view", type: "function" },
  // Registration functions
  { inputs: [{ name: "account", type: "address" }, { name: "_identity", type: "address" }, { name: "country", type: "uint16" }], name: "registerIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "deleteIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "_identity", type: "address" }], name: "updateIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }, { name: "country", type: "uint16" }], name: "updateCountry", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "accounts", type: "address[]" }, { name: "identities", type: "address[]" }, { name: "countries", type: "uint16[]" }], name: "batchRegisterIdentity", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Role constants
  { inputs: [], name: "REGISTRAR_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "AGENT_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "investorAddress", type: "address" }, { indexed: true, name: "identity", type: "address" }], name: "IdentityRegistered", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investorAddress", type: "address" }, { indexed: true, name: "identity", type: "address" }], name: "IdentityRemoved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investorAddress", type: "address" }, { indexed: true, name: "identity", type: "address" }], name: "IdentityUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "investorAddress", type: "address" }, { indexed: false, name: "country", type: "uint16" }], name: "CountryUpdated", type: "event" },
] as const;

// ============================================================================
// RWA SECURITY EXCHANGE ABI
// ============================================================================
export const RWASecurityExchangeABI = [
  // State variables
  { inputs: [], name: "identityRegistry", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeRecipient", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "tradingFeeBps", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "isAcceptedPaymentToken", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Order functions
  { inputs: [{ name: "securityToken", type: "address" }, { name: "amount", type: "uint256" }, { name: "pricePerToken", type: "uint256" }, { name: "paymentToken", type: "address" }], name: "createSellOrder", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "orderId", type: "uint256" }, { name: "amount", type: "uint256" }], name: "fillOrder", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "orderId", type: "uint256" }], name: "cancelOrder", outputs: [], stateMutability: "nonpayable", type: "function" },
  // View functions
  { inputs: [{ name: "orderId", type: "uint256" }], name: "getOrder", outputs: [{ type: "tuple", components: [{ name: "seller", type: "address" }, { name: "securityToken", type: "address" }, { name: "paymentToken", type: "address" }, { name: "amount", type: "uint256" }, { name: "filledAmount", type: "uint256" }, { name: "pricePerToken", type: "uint256" }, { name: "createdAt", type: "uint256" }, { name: "status", type: "uint8" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "securityToken", type: "address" }], name: "getOrdersByToken", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "seller", type: "address" }], name: "getOrdersBySeller", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getActiveOrders", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  // Admin functions
  { inputs: [{ name: "token", type: "address" }, { name: "accepted", type: "bool" }], name: "setAcceptedPaymentToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "feeBps", type: "uint256" }], name: "setTradingFee", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "setFeeRecipient", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Role constants
  { inputs: [], name: "FACTORY_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: true, name: "seller", type: "address" }, { indexed: true, name: "securityToken", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "pricePerToken", type: "uint256" }], name: "OrderCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: true, name: "buyer", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "totalPrice", type: "uint256" }], name: "OrderFilled", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "orderId", type: "uint256" }], name: "OrderCancelled", type: "event" },

  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'getTradingPair', outputs: [{ type: 'tuple', components: [{ name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'active', type: 'bool' }, { name: 'totalVolume', type: 'uint256' }, { name: 'lastPrice', type: 'uint256' }, { name: 'highPrice24h', type: 'uint256' }, { name: 'lowPrice24h', type: 'uint256' }, { name: 'orderCount', type: 'uint256' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'validPairs', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_limit', type: 'uint256' }], name: 'getOrderBook', outputs: [{ name: 'buyOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }, { name: 'sellOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }, { name: '_side', type: 'uint8' }, { name: '_price', type: 'uint256' }, { name: '_amount', type: 'uint256' }, { name: '_expiresAt', type: 'uint256' }], name: 'createOrder', outputs: [{ name: 'orderId', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
] as const;

// ============================================================================
// DIVIDEND DISTRIBUTOR ABI
// ============================================================================
export const DividendDistributorABI = [
  { inputs: [], name: "securityToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalDistributions", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "paymentToken", type: "address" }, { name: "amount", type: "uint256" }], name: "distributeDividend", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "distributionId", type: "uint256" }], name: "claimDividend", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "distributionIds", type: "uint256[]" }], name: "claimMultipleDividends", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "distributionId", type: "uint256" }], name: "getDistribution", outputs: [{ type: "tuple", components: [{ name: "paymentToken", type: "address" }, { name: "totalAmount", type: "uint256" }, { name: "snapshotId", type: "uint256" }, { name: "createdAt", type: "uint256" }, { name: "claimedAmount", type: "uint256" }] }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "distributionId", type: "uint256" }, { name: "account", type: "address" }], name: "getClaimableAmount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "distributionId", type: "uint256" }, { name: "account", type: "address" }], name: "hasClaimed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "getUnclaimedDistributions", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "distributionId", type: "uint256" }, { indexed: true, name: "paymentToken", type: "address" }, { indexed: false, name: "totalAmount", type: "uint256" }, { indexed: false, name: "snapshotId", type: "uint256" }], name: "DividendDistributed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "distributionId", type: "uint256" }, { indexed: true, name: "account", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "DividendClaimed", type: "event" },
] as const;

// ============================================================================
// MODULAR COMPLIANCE ABI
// ============================================================================
export const ModularComplianceABI = [
  { inputs: [], name: "tokenBound", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "addModule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "removeModule", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "module", type: "address" }], name: "isModuleBound", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getModules", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "canTransfer", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferred", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "created", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "amount", type: "uint256" }], name: "destroyed", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "bindToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unbindToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Events
  { anonymous: false, inputs: [{ indexed: true, name: "module", type: "address" }], name: "ModuleAdded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "module", type: "address" }], name: "ModuleRemoved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "token", type: "address" }], name: "TokenBound", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "token", type: "address" }], name: "TokenUnbound", type: "event" },
] as const;

// ============================================================================
// ERC20 ABI (for USDC, USDT, etc.)
// ============================================================================
export const ERC20ABI = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "spender", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Approval", type: "event" },
] as const;

// ============================================================================
// OPENZEPPELIN IACCESS CONTROL ABI
// ============================================================================
export const IAccessControlABI = [
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "hasRole", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }], name: "getRoleAdmin", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "role", type: "bytes32" }, { name: "callerConfirmation", type: "address" }], name: "renounceRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "previousAdminRole", type: "bytes32" }, { indexed: true, name: "newAdminRole", type: "bytes32" }], name: "RoleAdminChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "account", type: "address" }, { indexed: true, name: "sender", type: "address" }], name: "RoleGranted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "role", type: "bytes32" }, { indexed: true, name: "account", type: "address" }, { indexed: true, name: "sender", type: "address" }], name: "RoleRevoked", type: "event" },
] as const;

// ============================================================================
// OFFCHAIN INVESTMENT MANAGER ABI
// ============================================================================
export const OffChainInvestmentManagerABI = [
  { inputs: [{ name: "_projectId", type: "uint256" }, { name: "_investor", type: "address" }, { name: "_amountUSD", type: "uint256" }, { name: "_paymentMethod", type: "uint8" }, { name: "_paymentReference", type: "string" }], name: "createInvestment", outputs: [{ name: "investmentId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_investmentId", type: "uint256" }], name: "confirmAndMint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_reference", type: "string" }], name: "paymentReferenceToId", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

// ============================================================================
// COMMON ROLE CONSTANTS
// ============================================================================
export const ACCESS_CONTROL_ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  PAUSER_ROLE: '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
  BURNER_ROLE: '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
  VERIFIER_ROLE: '0x0ce23c3e399818cfee81a7ab0880f714e53d7672b08df0fa62f2a8dcaaf76c98',
  AGENT_ROLE: '0xcab5a0bfe0b79d2c4b1c2e02599fa044d115b7511f9659307cb4276950967709',
  REGISTRAR_ROLE: '0xd1f21ec03a6eb050ffd3f3d55c7c50ab84c6c62f64e998b4c9aba9a9e8875d14',
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type KYCManagerABIType = typeof KYCManagerABI;
export type RWALaunchpadFactoryABIType = typeof RWALaunchpadFactoryABI;
export type RWAProjectNFTABIType = typeof RWAProjectNFTABI;
export type RWASecurityTokenABIType = typeof RWASecurityTokenABI;
export type RWAEscrowVaultABIType = typeof RWAEscrowVaultABI;
export type IdentityRegistryABIType = typeof IdentityRegistryABI;
export type RWASecurityExchangeABIType = typeof RWASecurityExchangeABI;
export type DividendDistributorABIType = typeof DividendDistributorABI;
export type ModularComplianceABIType = typeof ModularComplianceABI;
export type ERC20ABIType = typeof ERC20ABI;
export type IAccessControlABIType = typeof IAccessControlABI;
export type OffChainInvestmentManagerABIType = typeof OffChainInvestmentManagerABI;
