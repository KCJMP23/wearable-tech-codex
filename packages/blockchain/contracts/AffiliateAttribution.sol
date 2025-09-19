// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title AffiliateAttribution
 * @dev Smart contract for transparent affiliate attribution and commission distribution
 * @notice This contract handles affiliate click tracking, conversion attribution, and automated commission payments
 */
contract AffiliateAttribution is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Structs
    struct Click {
        bytes32 clickId;
        address affiliate;
        string tenantId;
        string productId;
        uint256 timestamp;
        string metadata; // IPFS hash for additional data
        bool verified;
    }

    struct Conversion {
        bytes32 conversionId;
        bytes32 clickId;
        address affiliate;
        string tenantId;
        string productId;
        uint256 conversionValue;
        uint256 commissionRate; // Basis points (e.g., 500 = 5%)
        uint256 commissionAmount;
        uint256 timestamp;
        bool paid;
        string metadata;
    }

    struct Affiliate {
        address wallet;
        string email;
        uint256 totalEarned;
        uint256 totalClicks;
        uint256 totalConversions;
        bool active;
        uint256 registeredAt;
        string metadata;
    }

    struct TenantConfig {
        string tenantId;
        address payoutWallet;
        uint256 defaultCommissionRate;
        bool active;
        mapping(address => bool) authorizedTokens;
        uint256 minPayoutAmount;
    }

    // State variables
    mapping(bytes32 => Click) public clicks;
    mapping(bytes32 => Conversion) public conversions;
    mapping(address => Affiliate) public affiliates;
    mapping(string => TenantConfig) public tenantConfigs;
    mapping(address => mapping(address => uint256)) public pendingCommissions; // affiliate => token => amount
    mapping(bytes32 => bool) public processedTransactions;

    // Events
    event ClickRegistered(
        bytes32 indexed clickId,
        address indexed affiliate,
        string tenantId,
        string productId,
        uint256 timestamp
    );

    event ConversionRegistered(
        bytes32 indexed conversionId,
        bytes32 indexed clickId,
        address indexed affiliate,
        string tenantId,
        uint256 conversionValue,
        uint256 commissionAmount
    );

    event CommissionPaid(
        address indexed affiliate,
        address indexed token,
        uint256 amount,
        bytes32 indexed conversionId
    );

    event AffiliateRegistered(
        address indexed affiliate,
        string email,
        uint256 timestamp
    );

    event TenantConfigured(
        string tenantId,
        address payoutWallet,
        uint256 defaultCommissionRate
    );

    event FraudDetected(
        bytes32 indexed transactionId,
        address indexed affiliate,
        string reason
    );

    // Modifiers
    modifier onlyActiveAffiliate(address affiliate) {
        require(affiliates[affiliate].active, "Affiliate not active");
        _;
    }

    modifier onlyActiveTenant(string memory tenantId) {
        require(tenantConfigs[tenantId].active, "Tenant not active");
        _;
    }

    modifier validCommissionRate(uint256 rate) {
        require(rate <= 10000, "Commission rate cannot exceed 100%");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Register a new affiliate
     * @param affiliate Address of the affiliate wallet
     * @param email Email of the affiliate
     * @param metadata IPFS hash for additional affiliate data
     */
    function registerAffiliate(
        address affiliate,
        string memory email,
        string memory metadata
    ) external onlyRole(OPERATOR_ROLE) {
        require(affiliate != address(0), "Invalid affiliate address");
        require(!affiliates[affiliate].active, "Affiliate already registered");

        affiliates[affiliate] = Affiliate({
            wallet: affiliate,
            email: email,
            totalEarned: 0,
            totalClicks: 0,
            totalConversions: 0,
            active: true,
            registeredAt: block.timestamp,
            metadata: metadata
        });

        emit AffiliateRegistered(affiliate, email, block.timestamp);
    }

    /**
     * @dev Configure tenant settings
     * @param tenantId Unique identifier for the tenant
     * @param payoutWallet Wallet address for tenant payouts
     * @param defaultCommissionRate Default commission rate in basis points
     * @param authorizedTokens Array of authorized token addresses
     * @param minPayoutAmount Minimum payout amount
     */
    function configureTenant(
        string memory tenantId,
        address payoutWallet,
        uint256 defaultCommissionRate,
        address[] memory authorizedTokens,
        uint256 minPayoutAmount
    ) external onlyRole(ADMIN_ROLE) validCommissionRate(defaultCommissionRate) {
        require(payoutWallet != address(0), "Invalid payout wallet");
        
        TenantConfig storage config = tenantConfigs[tenantId];
        config.tenantId = tenantId;
        config.payoutWallet = payoutWallet;
        config.defaultCommissionRate = defaultCommissionRate;
        config.active = true;
        config.minPayoutAmount = minPayoutAmount;

        // Set authorized tokens
        for (uint256 i = 0; i < authorizedTokens.length; i++) {
            config.authorizedTokens[authorizedTokens[i]] = true;
        }

        emit TenantConfigured(tenantId, payoutWallet, defaultCommissionRate);
    }

    /**
     * @dev Register an affiliate click
     * @param clickId Unique identifier for the click
     * @param affiliate Address of the affiliate
     * @param tenantId Tenant identifier
     * @param productId Product identifier
     * @param metadata IPFS hash for additional click data
     */
    function registerClick(
        bytes32 clickId,
        address affiliate,
        string memory tenantId,
        string memory productId,
        string memory metadata
    ) external onlyRole(OPERATOR_ROLE) onlyActiveAffiliate(affiliate) onlyActiveTenant(tenantId) whenNotPaused {
        require(clicks[clickId].timestamp == 0, "Click already registered");

        clicks[clickId] = Click({
            clickId: clickId,
            affiliate: affiliate,
            tenantId: tenantId,
            productId: productId,
            timestamp: block.timestamp,
            metadata: metadata,
            verified: true
        });

        affiliates[affiliate].totalClicks++;

        emit ClickRegistered(clickId, affiliate, tenantId, productId, block.timestamp);
    }

    /**
     * @dev Register a conversion and calculate commission
     * @param conversionId Unique identifier for the conversion
     * @param clickId Associated click identifier
     * @param conversionValue Value of the conversion in wei
     * @param commissionRate Commission rate in basis points (overrides default if provided)
     * @param token Token address for commission payment
     * @param metadata IPFS hash for additional conversion data
     */
    function registerConversion(
        bytes32 conversionId,
        bytes32 clickId,
        uint256 conversionValue,
        uint256 commissionRate,
        address token,
        string memory metadata
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        require(conversions[conversionId].timestamp == 0, "Conversion already registered");
        require(clicks[clickId].timestamp != 0, "Invalid click ID");
        require(clicks[clickId].verified, "Click not verified");

        Click storage click = clicks[clickId];
        TenantConfig storage tenantConfig = tenantConfigs[click.tenantId];
        
        require(tenantConfig.active, "Tenant not active");
        require(tenantConfig.authorizedTokens[token], "Token not authorized");

        // Use provided commission rate or default
        uint256 finalCommissionRate = commissionRate > 0 ? commissionRate : tenantConfig.defaultCommissionRate;
        require(finalCommissionRate <= 10000, "Invalid commission rate");

        uint256 commissionAmount = (conversionValue * finalCommissionRate) / 10000;

        conversions[conversionId] = Conversion({
            conversionId: conversionId,
            clickId: clickId,
            affiliate: click.affiliate,
            tenantId: click.tenantId,
            productId: click.productId,
            conversionValue: conversionValue,
            commissionRate: finalCommissionRate,
            commissionAmount: commissionAmount,
            timestamp: block.timestamp,
            paid: false,
            metadata: metadata
        });

        // Update affiliate stats
        affiliates[click.affiliate].totalConversions++;
        pendingCommissions[click.affiliate][token] += commissionAmount;

        emit ConversionRegistered(
            conversionId,
            clickId,
            click.affiliate,
            click.tenantId,
            conversionValue,
            commissionAmount
        );
    }

    /**
     * @dev Pay commission to affiliate
     * @param conversionId Conversion identifier
     * @param token Token address for payment
     */
    function payCommission(
        bytes32 conversionId,
        address token
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Conversion storage conversion = conversions[conversionId];
        require(conversion.timestamp != 0, "Conversion not found");
        require(!conversion.paid, "Commission already paid");

        TenantConfig storage tenantConfig = tenantConfigs[conversion.tenantId];
        require(tenantConfig.authorizedTokens[token], "Token not authorized");
        require(conversion.commissionAmount >= tenantConfig.minPayoutAmount, "Amount below minimum payout");

        conversion.paid = true;
        pendingCommissions[conversion.affiliate][token] -= conversion.commissionAmount;
        affiliates[conversion.affiliate].totalEarned += conversion.commissionAmount;

        // Transfer commission
        IERC20(token).safeTransferFrom(
            tenantConfig.payoutWallet,
            conversion.affiliate,
            conversion.commissionAmount
        );

        emit CommissionPaid(conversion.affiliate, token, conversion.commissionAmount, conversionId);
    }

    /**
     * @dev Batch pay multiple commissions for gas efficiency
     * @param conversionIds Array of conversion identifiers
     * @param token Token address for payment
     */
    function batchPayCommissions(
        bytes32[] calldata conversionIds,
        address token
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(conversionIds.length > 0, "No conversions provided");
        require(conversionIds.length <= 50, "Too many conversions in batch");

        uint256 totalAmount = 0;
        address[] memory affiliates_batch = new address[](conversionIds.length);
        uint256[] memory amounts = new uint256[](conversionIds.length);

        // Validate and calculate total
        for (uint256 i = 0; i < conversionIds.length; i++) {
            Conversion storage conversion = conversions[conversionIds[i]];
            require(conversion.timestamp != 0, "Conversion not found");
            require(!conversion.paid, "Commission already paid");

            TenantConfig storage tenantConfig = tenantConfigs[conversion.tenantId];
            require(tenantConfig.authorizedTokens[token], "Token not authorized");

            totalAmount += conversion.commissionAmount;
            affiliates_batch[i] = conversion.affiliate;
            amounts[i] = conversion.commissionAmount;

            // Mark as paid
            conversion.paid = true;
            pendingCommissions[conversion.affiliate][token] -= conversion.commissionAmount;
            affiliates[conversion.affiliate].totalEarned += conversion.commissionAmount;
        }

        // Get tenant config for first conversion (assuming same tenant for batch)
        TenantConfig storage tenantConfig = tenantConfigs[conversions[conversionIds[0]].tenantId];

        // Transfer total amount to contract first
        IERC20(token).safeTransferFrom(tenantConfig.payoutWallet, address(this), totalAmount);

        // Distribute to affiliates
        for (uint256 i = 0; i < conversionIds.length; i++) {
            IERC20(token).safeTransfer(affiliates_batch[i], amounts[i]);
            emit CommissionPaid(affiliates_batch[i], token, amounts[i], conversionIds[i]);
        }
    }

    /**
     * @dev Fraud detection and prevention
     * @param transactionId Transaction to flag
     * @param affiliate Affiliate involved
     * @param reason Reason for fraud detection
     */
    function flagFraudulentTransaction(
        bytes32 transactionId,
        address affiliate,
        string memory reason
    ) external onlyRole(VERIFIER_ROLE) {
        processedTransactions[transactionId] = true;
        affiliates[affiliate].active = false;

        emit FraudDetected(transactionId, affiliate, reason);
    }

    /**
     * @dev Verify click authenticity using signature
     * @param clickId Click identifier
     * @param signature Signature from affiliate
     */
    function verifyClick(
        bytes32 clickId,
        bytes memory signature
    ) external onlyRole(VERIFIER_ROLE) {
        Click storage click = clicks[clickId];
        require(click.timestamp != 0, "Click not found");

        bytes32 messageHash = keccak256(abi.encodePacked(clickId, click.affiliate, click.timestamp));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address recoveredAddress = ethSignedMessageHash.recover(signature);
        require(recoveredAddress == click.affiliate, "Invalid signature");

        click.verified = true;
    }

    // View functions
    function getAffiliateStats(address affiliate) external view returns (
        uint256 totalEarned,
        uint256 totalClicks,
        uint256 totalConversions,
        bool active
    ) {
        Affiliate storage aff = affiliates[affiliate];
        return (aff.totalEarned, aff.totalClicks, aff.totalConversions, aff.active);
    }

    function getPendingCommissions(address affiliate, address token) external view returns (uint256) {
        return pendingCommissions[affiliate][token];
    }

    function getClickDetails(bytes32 clickId) external view returns (Click memory) {
        return clicks[clickId];
    }

    function getConversionDetails(bytes32 conversionId) external view returns (Conversion memory) {
        return conversions[conversionId];
    }

    function isTokenAuthorized(string memory tenantId, address token) external view returns (bool) {
        return tenantConfigs[tenantId].authorizedTokens[token];
    }

    // Admin functions
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function deactivateAffiliate(address affiliate) external onlyRole(ADMIN_ROLE) {
        affiliates[affiliate].active = false;
    }

    function reactivateAffiliate(address affiliate) external onlyRole(ADMIN_ROLE) {
        affiliates[affiliate].active = true;
    }

    function setTenantActive(string memory tenantId, bool active) external onlyRole(ADMIN_ROLE) {
        tenantConfigs[tenantId].active = active;
    }

    /**
     * @dev Emergency withdrawal function for contract owner
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}