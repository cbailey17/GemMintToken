// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20CappedUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20SnapshotUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract GemMint is Initializable, ERC20Upgradeable, ERC20SnapshotUpgradeable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    // ?? What happens when reward pool runs out of tokens 
    
    // Roles
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PARTNER_MANAGER_ROLE = keccak256("PARTNER_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Constants
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10 ** 18;
    uint256 public constant MAX_SUPPLY = 20_000_000_000 * 10 ** 18;

    // State Variables
    address public rewardsPool;
    mapping(address => bool) public partners;
    mapping(address => uint256) public userSpending;

    uint256 public totalReflectionFees;
    uint256 public reflectionFee = 10; // 0.1% (using basis points, i.e., 10 / 10000)

    // Events
    event PartnerAdded(address indexed partner);
    event PartnerRemoved(address indexed partner);
    event SpendingRecorded(address indexed user, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract.
     */
    function initialize(
        address[] memory admins,
        address upgrader,
        address rewardsPoolAddress,
        address icoPresaleAddress,
        address liquidityPoolAddress,
        address developmentAddress,
        address teamAddress,
        address marketingAddress,
        address reservesAddress
    ) public initializer {
        __ERC20_init("GemMint", "GEMM");
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ERC20Snapshot_init();

        // Set roles
        for (uint256 i = 0; i < admins.length; i++) {
            _grantRole(DEFAULT_ADMIN_ROLE, admins[i]);
            _grantRole(MINTER_ROLE, admins[i]);
            _grantRole(PARTNER_MANAGER_ROLE, admins[i]);
        }
        _grantRole(UPGRADER_ROLE, upgrader);

        // Mint allocations
        uint256 totalInitialMinted = 0;

        _mint(rewardsPoolAddress, 4_000_000_000 * 10 ** decimals()); // Rewards Pool
        totalInitialMinted += 4_000_000_000 * 10 ** decimals();

        _mint(icoPresaleAddress, 100_000_000 * 10 ** decimals());     // ICO Presale Pool
        totalInitialMinted += 100_000_000 * 10 ** decimals();

        _mint(liquidityPoolAddress, 2_400_000_000 * 10 ** decimals()); // Liquidity Pool
        totalInitialMinted += 2_400_000_000 * 10 ** decimals();

        _mint(developmentAddress, 1_000_000_000 * 10 ** decimals());   // Development and Partnerships
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(teamAddress, 1_000_000_000 * 10 ** decimals());          // Team and Advisors
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(marketingAddress, 1_000_000_000 * 10 ** decimals());     // Marketing and Community Growth
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(reservesAddress, 500_000_000 * 10 ** decimals());        // Reserves
        totalInitialMinted += 500_000_000 * 10 ** decimals();

        require(totalInitialMinted == INITIAL_SUPPLY, "Initial supply mismatch");

        // Set rewards pool
        rewardsPool = rewardsPoolAddress;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override whenNotPaused {
        // Calculate the reflection reward as 0.1% of the sender's balance
        uint256 senderBalance = balanceOf(sender);
        uint256 rewardAmount = senderBalance * reflectionFee / 10000; // 0.1% of sender's balance

        // Ensure the rewards pool has enough tokens
        require(balanceOf(rewardsPool) >= rewardAmount, "Rewards pool insufficient");

        // Transfer the reward from the rewards pool to the sender
        if (rewardAmount > 0) {
            super._transfer(rewardsPool, sender, rewardAmount);
        }

        // Proceed with the original transfer
        super._transfer(sender, recipient, amount);
    }

    function _transfer_recipient(address sender, address recipient, uint256 amount) internal override whenNotPaused {
        // Proceed with the original transfer
        super._transfer(sender, recipient, amount);

        // Calculate the reflection reward as 0.1% of the recipient's new balance
        uint256 recipientBalance = balanceOf(recipient);
        uint256 rewardAmount = recipientBalance * reflectionFee / 10000; // 0.1% of recipient's balance

        // Ensure the rewards pool has enough tokens
        require(balanceOf(rewardsPool) >= rewardAmount, "Rewards pool insufficient");

        // Transfer the reward from the rewards pool to the recipient
        if (rewardAmount > 0) {
            super._transfer(rewardsPool, recipient, rewardAmount);
        }
    }



      // Add pause and unpause functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Override ERC20 functions to include whenNotPaused modifier
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Adds a new admin. Can only be called by an existing admin.
     */
    function addAdmin(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        grantRole(DEFAULT_ADMIN_ROLE, account);
        grantRole(MINTER_ROLE, account);
        grantRole(PARTNER_MANAGER_ROLE, account);
    }

    /**
     * @dev Removes an admin. Can only be called by an existing admin.
     */
    function removeAdmin(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        revokeRole(MINTER_ROLE, account);
        revokeRole(PARTNER_MANAGER_ROLE, account);
        revokeRole(DEFAULT_ADMIN_ROLE, account);
    }

    /**
     * @dev Records user spending from partners.
     */
    function recordSpending(address user, uint256 amount) external {
        require(partners[msg.sender], "Caller is not a partner");
        userSpending[user] += amount;
        emit SpendingRecorded(user, amount);
    }

    /**
     * @dev Adds a partner.
     */
    function addPartner(address partner) external onlyRole(PARTNER_MANAGER_ROLE) {
        require(!partners[partner], "Partner already exists");
        partners[partner] = true;
        emit PartnerAdded(partner);
    }

    /**
     * @dev Removes a partner.
     */
    function removePartner(address partner) external onlyRole(PARTNER_MANAGER_ROLE) {
        require(partners[partner], "Partner does not exist");
        partners[partner] = false;
        emit PartnerRemoved(partner);
    }

    /**
     * @dev Mints new tokens, up to MAX_SUPPLY.
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @dev Authorizes contract upgrades.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Creates a snapshot of balances.
     */
    function snapshot() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _snapshot();
    }

    // Additional functions for distributing monthly rewards based on snapshots and user spending

    // Mapping from snapshot IDs to total supply at that snapshot
    mapping(uint256 => uint256) private _snapshotTotalSupply;

    // Mapping from user address to last snapshot ID when they received rewards
    mapping(address => uint256) private _lastRewardSnapshot;

    /**
     * @dev Distributes monthly rewards based on holdings.
     */
    function distributeMonthlyRewards() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 currentSnapshotId = _snapshot();

        // Record the total supply at the snapshot
        _snapshotTotalSupply[currentSnapshotId] = totalSupply();

        // Logic to calculate and distribute rewards based on holdings
        // This would likely require off-chain processing to loop through all holders efficiently

        // For example, you could emit an event here and process rewards off-chain
    }

    // Function to calculate and distribute spending-based rewards
    function distributeSpendingRewards() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Logic to calculate and distribute rewards based on user spending
        // Similar to holdings-based rewards, this may require off-chain processing
    }

    // Note: Due to gas limitations, it's impractical to loop over all token holders on-chain
    // Off-chain scripts or services (like The Graph) are typically used to process and distribute rewards
}


