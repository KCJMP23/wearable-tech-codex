// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AffiliateRewardsToken
 * @dev ERC20 token for affiliate platform rewards and loyalty programs
 * @notice This token is used for affiliate rewards, user loyalty points, and platform incentives
 */
contract AffiliateRewardsToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Token configuration
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens

    // Vesting and lockup
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool revocable;
        bool revoked;
    }

    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => uint256) public lockedBalances;

    // Reward distribution
    struct RewardTier {
        uint256 minStake;
        uint256 multiplier; // Basis points (e.g., 1500 = 15%)
        bool active;
    }

    RewardTier[] public rewardTiers;
    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public lastRewardClaim;

    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime);
    event TokensUnlocked(address indexed user, uint256 amount);
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 startTime);
    event VestingScheduleRevoked(address indexed beneficiary);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardTierAdded(uint256 minStake, uint256 multiplier);

    constructor() ERC20("Affiliate Rewards Token", "ART") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        // Mint initial supply to deployer
        _mint(msg.sender, INITIAL_SUPPLY);

        // Initialize default reward tiers
        _initializeRewardTiers();
    }

    /**
     * @dev Initialize default reward tiers for staking
     */
    function _initializeRewardTiers() internal {
        rewardTiers.push(RewardTier({
            minStake: 1000 * 10**18,     // 1,000 ART
            multiplier: 1000,            // 10%
            active: true
        }));

        rewardTiers.push(RewardTier({
            minStake: 10000 * 10**18,    // 10,000 ART
            multiplier: 1250,            // 12.5%
            active: true
        }));

        rewardTiers.push(RewardTier({
            minStake: 50000 * 10**18,    // 50,000 ART
            multiplier: 1500,            // 15%
            active: true
        }));

        rewardTiers.push(RewardTier({
            minStake: 100000 * 10**18,   // 100,000 ART
            multiplier: 2000,            // 20%
            active: true
        }));
    }

    /**
     * @dev Mint tokens for affiliate rewards or platform incentives
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting
     */
    function mint(
        address to,
        uint256 amount,
        string memory reason
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");

        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     * @param reason Reason for batch minting
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string memory reason
    ) external onlyRole(MINTER_ROLE) {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= 100, "Too many recipients");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Would exceed max supply");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i], reason);
        }
    }

    /**
     * @dev Burn tokens from a specific address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnFrom(
        address from,
        uint256 amount,
        string memory reason
    ) public onlyRole(BURNER_ROLE) {
        require(from != address(0), "Cannot burn from zero address");
        require(balanceOf(from) >= amount, "Insufficient balance");

        _burn(from, amount);
        emit TokensBurned(from, amount, reason);
    }

    /**
     * @dev Create a vesting schedule for tokens
     * @param beneficiary Address of the beneficiary
     * @param totalAmount Total amount of tokens to vest
     * @param startTime Start time of vesting
     * @param cliffDuration Duration of cliff period
     * @param vestingDuration Total vesting duration
     * @param revocable Whether the vesting is revocable
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) external onlyRole(ADMIN_ROLE) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be greater than 0");
        require(vestingDuration > 0, "Vesting duration must be greater than 0");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting schedule already exists");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable,
            revoked: false
        });

        // Transfer tokens to contract for vesting
        _transfer(msg.sender, address(this), totalAmount);

        emit VestingScheduleCreated(beneficiary, totalAmount, startTime);
    }

    /**
     * @dev Release vested tokens to beneficiary
     * @param beneficiary Address of the beneficiary
     */
    function releaseVestedTokens(address beneficiary) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting schedule revoked");

        uint256 vestedAmount = _calculateVestedAmount(beneficiary);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;

        require(releasableAmount > 0, "No tokens to release");

        schedule.releasedAmount += releasableAmount;
        _transfer(address(this), beneficiary, releasableAmount);
    }

    /**
     * @dev Calculate vested amount for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Amount of tokens vested
     */
    function _calculateVestedAmount(address beneficiary) internal view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }

        return (schedule.totalAmount * (block.timestamp - schedule.startTime)) / schedule.vestingDuration;
    }

    /**
     * @dev Stake tokens for rewards
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _transfer(msg.sender, address(this), amount);
        stakedBalances[msg.sender] += amount;
        
        if (lastRewardClaim[msg.sender] == 0) {
            lastRewardClaim[msg.sender] = block.timestamp;
        }

        emit TokensStaked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalances[msg.sender] >= amount, "Insufficient staked balance");

        // Claim pending rewards first
        _claimRewards(msg.sender);

        stakedBalances[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount);
    }

    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to claim rewards
     * @param user Address of the user
     */
    function _claimRewards(address user) internal {
        uint256 stakedAmount = stakedBalances[user];
        if (stakedAmount == 0) return;

        uint256 timeSinceLastClaim = block.timestamp - lastRewardClaim[user];
        if (timeSinceLastClaim == 0) return;

        uint256 multiplier = _getRewardMultiplier(stakedAmount);
        uint256 rewardAmount = (stakedAmount * multiplier * timeSinceLastClaim) / (365 days * 10000);

        if (rewardAmount > 0) {
            lastRewardClaim[user] = block.timestamp;
            _mint(user, rewardAmount);
            emit RewardsClaimed(user, rewardAmount);
        }
    }

    /**
     * @dev Get reward multiplier for staked amount
     * @param stakedAmount Amount of tokens staked
     * @return Multiplier in basis points
     */
    function _getRewardMultiplier(uint256 stakedAmount) internal view returns (uint256) {
        uint256 multiplier = 0;
        
        for (uint256 i = rewardTiers.length; i > 0; i--) {
            RewardTier storage tier = rewardTiers[i - 1];
            if (tier.active && stakedAmount >= tier.minStake) {
                multiplier = tier.multiplier;
                break;
            }
        }
        
        return multiplier;
    }

    /**
     * @dev Add a new reward tier
     * @param minStake Minimum stake required for tier
     * @param multiplier Reward multiplier in basis points
     */
    function addRewardTier(uint256 minStake, uint256 multiplier) external onlyRole(ADMIN_ROLE) {
        require(multiplier <= 5000, "Multiplier too high"); // Max 50%
        
        rewardTiers.push(RewardTier({
            minStake: minStake,
            multiplier: multiplier,
            active: true
        }));

        emit RewardTierAdded(minStake, multiplier);
    }

    /**
     * @dev Update reward tier status
     * @param tierIndex Index of the tier to update
     * @param active Whether the tier should be active
     */
    function updateRewardTier(uint256 tierIndex, bool active) external onlyRole(ADMIN_ROLE) {
        require(tierIndex < rewardTiers.length, "Invalid tier index");
        rewardTiers[tierIndex].active = active;
    }

    // View functions
    function getVestingSchedule(address beneficiary) external view returns (VestingSchedule memory) {
        return vestingSchedules[beneficiary];
    }

    function getVestedAmount(address beneficiary) external view returns (uint256) {
        return _calculateVestedAmount(beneficiary);
    }

    function getReleasableAmount(address beneficiary) external view returns (uint256) {
        uint256 vestedAmount = _calculateVestedAmount(beneficiary);
        return vestedAmount - vestingSchedules[beneficiary].releasedAmount;
    }

    function getPendingRewards(address user) external view returns (uint256) {
        uint256 stakedAmount = stakedBalances[user];
        if (stakedAmount == 0) return 0;

        uint256 timeSinceLastClaim = block.timestamp - lastRewardClaim[user];
        if (timeSinceLastClaim == 0) return 0;

        uint256 multiplier = _getRewardMultiplier(stakedAmount);
        return (stakedAmount * multiplier * timeSinceLastClaim) / (365 days * 10000);
    }

    function getRewardTiersCount() external view returns (uint256) {
        return rewardTiers.length;
    }

    function getUserRewardTier(address user) external view returns (uint256, uint256) {
        uint256 stakedAmount = stakedBalances[user];
        uint256 multiplier = _getRewardMultiplier(stakedAmount);
        
        for (uint256 i = 0; i < rewardTiers.length; i++) {
            if (rewardTiers[i].active && stakedAmount >= rewardTiers[i].minStake && rewardTiers[i].multiplier == multiplier) {
                return (i, multiplier);
            }
        }
        
        return (type(uint256).max, multiplier);
    }

    // Admin functions
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function revokeVestingSchedule(address beneficiary) external onlyRole(ADMIN_ROLE) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(schedule.revocable, "Vesting schedule not revocable");
        require(!schedule.revoked, "Already revoked");

        schedule.revoked = true;
        
        uint256 vestedAmount = _calculateVestedAmount(beneficiary);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;
        uint256 returnAmount = schedule.totalAmount - vestedAmount;

        if (releasableAmount > 0) {
            _transfer(address(this), beneficiary, releasableAmount);
        }

        if (returnAmount > 0) {
            _transfer(address(this), msg.sender, returnAmount);
        }

        emit VestingScheduleRevoked(beneficiary);
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}