// contracts/tokenize/RWATokenizationFactory.sol
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRWAProjectNFT {
    function createProject(
        address owner,
        string calldata name,
        string calldata category,
        uint256 fundingGoal,
        string calldata metadataUri
    ) external returns (uint256);
    
    function linkSecurityToken(uint256 projectId, address token) external;
    function linkEscrowVault(uint256 projectId, address vault) external;
}

interface IRWASecurityToken {
    function mint(address to, uint256 amount) external;
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    function MINTER_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
}

interface IModularCompliance {
    function bindToken(address _token) external;
}

/**
 * @title RWATokenizationFactory
 * @notice Factory for direct RWA tokenization using existing project infrastructure
 * @dev Uses RWAProjectNFT + RWASecurityToken, optional escrow and dividends
 */
contract RWATokenizationFactory is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Implementations {
        address securityToken;
        address compliance;
        address escrowVault;
        address dividendDistributor;
    }

    struct TokenizationRecord {
        uint256 projectId;
        address owner;
        address securityToken;
        address escrowVault;
        address dividendDistributor;
        address compliance;
        uint256 tokenSupply;
        uint256 createdAt;
        bool hasEscrow;
        bool hasDividends;
    }

    // ============ State Variables ============

    Implementations public implementations;
    IRWAProjectNFT public projectNFT;
    address public identityRegistry;
    address public platformFeeRecipient;
    
    // Fees (6 decimals for USDC)
    uint256 public baseFee;             // $750
    uint256 public escrowFee;           // $250
    uint256 public dividendFee;         // $200
    
    address public stablecoin;
    uint256 public tokenizationCounter;
    
    mapping(uint256 => TokenizationRecord) public tokenizations;
    mapping(uint256 => uint256) public projectToTokenization;
    mapping(address => uint256[]) public ownerTokenizations;
    mapping(address => bool) public approvedDeployers;
    
    bool public requireApproval;

    // ============ Events ============

    event AssetTokenized(
        uint256 indexed tokenizationId,
        uint256 indexed projectId,
        address indexed owner,
        address securityToken,
        uint256 tokenSupply
    );
    
    event EscrowAdded(uint256 indexed tokenizationId, address escrowVault);
    event DividendsAdded(uint256 indexed tokenizationId, address dividendDistributor);
    event DeployerApprovalUpdated(address indexed deployer, bool approved);
    event FeeUpdated(string feeType, uint256 oldFee, uint256 newFee);

    // ============ Errors ============

    error InvalidAddress();
    error InvalidAmount();
    error InsufficientFee();
    error NotApproved();
    error NotOwner();
    error AlreadyHasModule();
    error TokenizationNotFound();
    error ImplementationNotSet();
    error TransferFailed();

    // ============ Modifiers ============

    modifier onlyApprovedDeployer() {
        if (requireApproval && !approvedDeployers[msg.sender] && msg.sender != owner()) {
            revert NotApproved();
        }
        _;
    }

    modifier onlyTokenizationOwner(uint256 _tokenizationId) {
        if (tokenizations[_tokenizationId].owner != msg.sender) {
            revert NotOwner();
        }
        _;
    }

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _projectNFT,
        address _securityTokenImpl,
        address _complianceImpl,
        address _identityRegistry,
        address _feeRecipient,
        address _stablecoin
    ) external initializer {
        if (_admin == address(0) || _projectNFT == address(0) || 
            _securityTokenImpl == address(0) || _complianceImpl == address(0) ||
            _identityRegistry == address(0) || _feeRecipient == address(0)) {
            revert InvalidAddress();
        }

        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _transferOwnership(_admin);

        projectNFT = IRWAProjectNFT(_projectNFT);
        identityRegistry = _identityRegistry;
        platformFeeRecipient = _feeRecipient;
        stablecoin = _stablecoin;

        implementations = Implementations({
            securityToken: _securityTokenImpl,
            compliance: _complianceImpl,
            escrowVault: address(0),
            dividendDistributor: address(0)
        });

        // Fees (6 decimals for USDC)
        baseFee = 750 * 1e6;      // $750
        escrowFee = 250 * 1e6;    // $250
        dividendFee = 200 * 1e6;  // $200

        requireApproval = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Main Tokenization Function ============

    /**
     * @notice Tokenize a real-world asset
     * @param _name Asset name
     * @param _symbol Token symbol
     * @param _category Asset category (real_estate, art, equipment, etc.)
     * @param _tokenSupply Total token supply (minted to caller)
     * @param _metadataURI IPFS metadata URI
     * @param _withEscrow Include trade escrow ($250 extra)
     * @param _withDividends Include dividend distributor ($200 extra)
     * @return tokenizationId Internal tracking ID
     * @return projectId RWAProjectNFT token ID
     * @return securityToken Deployed ERC3643 token address
     */
    function tokenizeAsset(
        string calldata _name,
        string calldata _symbol,
        string calldata _category,
        uint256 _tokenSupply,
        string calldata _metadataURI,
        bool _withEscrow,
        bool _withDividends
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 tokenizationId,
        uint256 projectId,
        address securityToken
    ) {
        if (_tokenSupply == 0) revert InvalidAmount();
        if (bytes(_name).length == 0 || bytes(_symbol).length == 0) revert InvalidAmount();

        // Calculate and collect fee
        uint256 totalFee = _calculateFee(_withEscrow, _withDividends);
        _collectFee(totalFee);

        tokenizationId = tokenizationCounter++;

        // 1. Create Project NFT (fundingGoal=0 for direct tokenization)
        projectId = projectNFT.createProject(
            msg.sender,
            _name,
            _category,
            0,  // No funding goal - direct tokenization
            _metadataURI
        );

        // 2. Deploy Compliance
        address compliance = address(new ERC1967Proxy(
            implementations.compliance,
            abi.encodeWithSignature("initialize(address)", address(this))
        ));

        // 3. Deploy Security Token (ERC3643)
        securityToken = address(new ERC1967Proxy(
            implementations.securityToken,
            abi.encodeWithSignature(
                "initialize(string,string,address,address,address,uint256)",
                _name,
                _symbol,
                address(this),      // Initial admin
                compliance,
                identityRegistry,   // Shared KYC
                _tokenSupply
            )
        ));

        // 4. Bind token to compliance
        IModularCompliance(compliance).bindToken(securityToken);

        // 5. Link token to project NFT
        projectNFT.linkSecurityToken(projectId, securityToken);

        // 6. Mint all tokens to owner (100% ownership)
        IRWASecurityToken(securityToken).mint(msg.sender, _tokenSupply);

        // 7. Transfer token admin to owner
        _transferTokenOwnership(securityToken, msg.sender);

        // 8. Optional: Deploy Escrow Vault
        address escrowVault = address(0);
        if (_withEscrow) {
            escrowVault = _deployEscrow(projectId);
            projectNFT.linkEscrowVault(projectId, escrowVault);
        }

        // 9. Optional: Deploy Dividend Distributor
        address dividendDistributor = address(0);
        if (_withDividends) {
            dividendDistributor = _deployDividends(securityToken);
        }

        // Record tokenization
        tokenizations[tokenizationId] = TokenizationRecord({
            projectId: projectId,
            owner: msg.sender,
            securityToken: securityToken,
            escrowVault: escrowVault,
            dividendDistributor: dividendDistributor,
            compliance: compliance,
            tokenSupply: _tokenSupply,
            createdAt: block.timestamp,
            hasEscrow: _withEscrow,
            hasDividends: _withDividends
        });

        projectToTokenization[projectId] = tokenizationId;
        ownerTokenizations[msg.sender].push(tokenizationId);

        emit AssetTokenized(tokenizationId, projectId, msg.sender, securityToken, _tokenSupply);
        
        if (_withEscrow) emit EscrowAdded(tokenizationId, escrowVault);
        if (_withDividends) emit DividendsAdded(tokenizationId, dividendDistributor);
    }

    // ============ Add Modules Later ============

    /**
     * @notice Add escrow to existing tokenization
     * @param _tokenizationId Tokenization ID
     */
    function addEscrow(uint256 _tokenizationId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyTokenizationOwner(_tokenizationId)
        returns (address escrowVault) 
    {
        TokenizationRecord storage record = tokenizations[_tokenizationId];
        
        if (record.owner == address(0)) revert TokenizationNotFound();
        if (record.hasEscrow) revert AlreadyHasModule();
        if (implementations.escrowVault == address(0)) revert ImplementationNotSet();

        _collectFee(escrowFee);

        escrowVault = _deployEscrow(record.projectId);
        projectNFT.linkEscrowVault(record.projectId, escrowVault);
        
        record.escrowVault = escrowVault;
        record.hasEscrow = true;

        emit EscrowAdded(_tokenizationId, escrowVault);
    }

    /**
     * @notice Add dividend distributor to existing tokenization
     * @param _tokenizationId Tokenization ID
     */
    function addDividends(uint256 _tokenizationId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyTokenizationOwner(_tokenizationId)
        returns (address dividendDistributor) 
    {
        TokenizationRecord storage record = tokenizations[_tokenizationId];
        
        if (record.owner == address(0)) revert TokenizationNotFound();
        if (record.hasDividends) revert AlreadyHasModule();
        if (implementations.dividendDistributor == address(0)) revert ImplementationNotSet();

        _collectFee(dividendFee);

        dividendDistributor = _deployDividends(record.securityToken);
        
        record.dividendDistributor = dividendDistributor;
        record.hasDividends = true;

        emit DividendsAdded(_tokenizationId, dividendDistributor);
    }

    // ============ Internal Helpers ============

    function _deployEscrow(uint256 _projectId) internal returns (address) {
        return address(new ERC1967Proxy(
            implementations.escrowVault,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                address(this),
                platformFeeRecipient,
                address(projectNFT)
            )
        ));
    }

    function _deployDividends(address _securityToken) internal returns (address) {
        return address(new ERC1967Proxy(
            implementations.dividendDistributor,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                _securityToken,
                msg.sender,
                platformFeeRecipient
            )
        ));
    }

    function _transferTokenOwnership(address _token, address _newOwner) internal {
        IRWASecurityToken token = IRWASecurityToken(_token);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), _newOwner);
        token.grantRole(token.MINTER_ROLE(), _newOwner);
        token.renounceRole(token.MINTER_ROLE(), address(this));
        token.renounceRole(token.DEFAULT_ADMIN_ROLE(), address(this));
    }

    function _calculateFee(bool _withEscrow, bool _withDividends) internal view returns (uint256) {
        uint256 total = baseFee;
        if (_withEscrow) total += escrowFee;
        if (_withDividends) total += dividendFee;
        return total;
    }

    function _collectFee(uint256 _amount) internal {
        if (_amount == 0) return;
        
        if (stablecoin != address(0)) {
            IERC20(stablecoin).safeTransferFrom(msg.sender, platformFeeRecipient, _amount);
        } else {
            if (msg.value < _amount) revert InsufficientFee();
            (bool sent, ) = platformFeeRecipient.call{value: msg.value}("");
            if (!sent) revert TransferFailed();
        }
    }

    // ============ Admin Functions ============

    function setSecurityTokenImpl(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        implementations.securityToken = _impl;
    }

    function setComplianceImpl(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        implementations.compliance = _impl;
    }

    function setEscrowVaultImpl(address _impl) external onlyOwner {
        implementations.escrowVault = _impl;
    }

    function setDividendDistributorImpl(address _impl) external onlyOwner {
        implementations.dividendDistributor = _impl;
    }

    function setProjectNFT(address _projectNFT) external onlyOwner {
        if (_projectNFT == address(0)) revert InvalidAddress();
        projectNFT = IRWAProjectNFT(_projectNFT);
    }

    function setIdentityRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert InvalidAddress();
        identityRegistry = _registry;
    }

    function setStablecoin(address _stablecoin) external onlyOwner {
        stablecoin = _stablecoin;
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        platformFeeRecipient = _recipient;
    }

    function setBaseFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = baseFee;
        baseFee = _fee;
        emit FeeUpdated("baseFee", oldFee, _fee);
    }

    function setEscrowFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = escrowFee;
        escrowFee = _fee;
        emit FeeUpdated("escrowFee", oldFee, _fee);
    }

    function setDividendFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = dividendFee;
        dividendFee = _fee;
        emit FeeUpdated("dividendFee", oldFee, _fee);
    }

    function setDeployerApproval(address _deployer, bool _approved) external onlyOwner {
        if (_deployer == address(0)) revert InvalidAddress();
        approvedDeployers[_deployer] = _approved;
        emit DeployerApprovalUpdated(_deployer, _approved);
    }

    function batchSetDeployerApproval(address[] calldata _deployers, bool _approved) external onlyOwner {
        for (uint256 i = 0; i < _deployers.length; i++) {
            if (_deployers[i] != address(0)) {
                approvedDeployers[_deployers[i]] = _approved;
                emit DeployerApprovalUpdated(_deployers[i], _approved);
            }
        }
    }

    function setRequireApproval(bool _require) external onlyOwner {
        requireApproval = _require;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ View Functions ============

    function getTokenization(uint256 _id) external view returns (TokenizationRecord memory) {
        return tokenizations[_id];
    }

    function getTokenizationByProject(uint256 _projectId) external view returns (TokenizationRecord memory) {
        uint256 tokenizationId = projectToTokenization[_projectId];
        return tokenizations[tokenizationId];
    }

    function getOwnerTokenizations(address _owner) external view returns (uint256[] memory) {
        return ownerTokenizations[_owner];
    }

    function getOwnerTokenizationCount(address _owner) external view returns (uint256) {
        return ownerTokenizations[_owner].length;
    }

    function calculateFee(bool _withEscrow, bool _withDividends) external view returns (uint256) {
        return _calculateFee(_withEscrow, _withDividends);
    }

    function getFees() external view returns (
        uint256 _baseFee,
        uint256 _escrowFee,
        uint256 _dividendFee
    ) {
        return (baseFee, escrowFee, dividendFee);
    }

    function getImplementations() external view returns (Implementations memory) {
        return implementations;
    }

    function isDeployerApproved(address _deployer) external view returns (bool) {
        if (!requireApproval) return true;
        return approvedDeployers[_deployer] || _deployer == owner();
    }

    // ============ Receive ============

    receive() external payable {}
}