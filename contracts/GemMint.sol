// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/erc20/ERC20Upgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/erc20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/erc20/extensions/ERC20PermitUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/erc20/extensions/ERC20VotesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// -------------------------
// Custom Errors for Clarity
// -------------------------
// Using custom errors is more gas-efficient and provides clearer revert reasons than require strings.

error InitialSupplyMismatch();         // Thrown if the initial minted supply doesn't match INITIAL_SUPPLY
error TokenTransferWhilePaused();      // Thrown if a token transfer occurs while the contract is paused
error ExceedsMaxSupply();              // Thrown if minting exceeds MAX_SUPPLY
error InsufficientRewardsPoolBalance();// Thrown if the rewards pool doesn't have enough tokens for a reward transfer
error PartnerAlreadyExists();          // Thrown if trying to add a partner that already exists
error PartnerDoesNotExist();           // Thrown if trying to remove a partner that isn't one
error ERC6372InconsistentClock();      // Thrown if the snapshot clock is inconsistent

/// @title GemMint Token Contract
/// @notice GemMint is an ERC20 token with monthly rewards based on user spending at partner establishments.
/// @dev Uses ERC20Votes for off-chain data indexing with The Graph. No burning functionality is included.
contract GemMint is Initializable, ERC20Upgradeable, ERC20PausableUpgradeable, ERC20PermitUpgradeable, ERC20VotesUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // ----------------------
    // Constants
    // ----------------------
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10 ** 18;
    uint256 public constant MAX_SUPPLY = 20_000_000_000 * 10 ** 18;

    // ----------------------
    // State Variables
    // ----------------------
    address public rewardsPool;               // Address of the rewards pool holding tokens allocated for rewards
    mapping(address => bool) public partners; // Tracks which addresses are partner establishments

    // Each user's accumulated rewards balance over the month
    mapping(address => uint256) public rewardsBalance;

    // Each user's monthly spending at partner establishments (in tokens)
    mapping(address => uint256) public monthlyPartnerSpending;

    // ----------------------
    // Events
    // ----------------------
    event PartnerAdded(address indexed partner);
    event PartnerRemoved(address indexed partner);
    event SpendingRecorded(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);
    event RewardAccumulated(address indexed user, uint256 amount);
    event MonthlyDataCleared(address indexed user);
    event SnapshotCreated(uint48 id);

    // ----------------------
    // Snapshot Variables
    // ----------------------
    // _snapshotId is used as a counter-based "clock" mode for snapshots.
    uint48 private _snapshotId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    // solhint-disable-next-line func-visibility
    constructor() {
        _disableInitializers();
    }

    /// @dev Initializes the GemMint contract with initial distributions.
    /// @param initialOwner The address that will own the contract.
    /// @param rewardsPoolAddress Address of the rewards pool.
    /// @param icoPresaleAddress Address receiving ICO Presale tokens.
    /// @param liquidityPoolAddress Address receiving Liquidity Pool tokens.
    /// @param developmentAddress Address receiving Development tokens.
    /// @param teamAddress Address receiving Team tokens.
    /// @param marketingAddress Address receiving Marketing tokens.
    /// @param reservesAddress Address receiving Reserve tokens.
    function initialize(
        address initialOwner,
        address rewardsPoolAddress,
        address icoPresaleAddress,
        address liquidityPoolAddress,
        address developmentAddress,
        address teamAddress,
        address marketingAddress,
        address reservesAddress
    ) public initializer {
        // Initialize parent contracts
        __ERC20_init("GemMint", "GEMM");
        __ERC20Pausable_init();
        __ERC20Permit_init("GemMint");
        __ERC20Votes_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        // Transfer ownership to the specified initialOwner
        _transferOwnership(initialOwner);

        uint256 totalInitialMinted = 0;

        // Mint initial allocations to the respective addresses
        _mint(rewardsPoolAddress, 4_000_000_000 * 10 ** decimals()); 
        totalInitialMinted += 4_000_000_000 * 10 ** decimals();

        _mint(icoPresaleAddress, 100_000_000 * 10 ** decimals());
        totalInitialMinted += 100_000_000 * 10 ** decimals();

        _mint(liquidityPoolAddress, 2_400_000_000 * 10 ** decimals());
        totalInitialMinted += 2_400_000_000 * 10 ** decimals();

        _mint(developmentAddress, 1_000_000_000 * 10 ** decimals());
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(teamAddress, 1_000_000_000 * 10 ** decimals());
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(marketingAddress, 1_000_000_000 * 10 ** decimals());
        totalInitialMinted += 1_000_000_000 * 10 ** decimals();

        _mint(reservesAddress, 500_000_000 * 10 ** decimals());
        totalInitialMinted += 500_000_000 * 10 ** decimals();

        // Ensure that total minted matches INITIAL_SUPPLY for consistency
        if (totalInitialMinted != INITIAL_SUPPLY) {
            revert InitialSupplyMismatch();
        }

        // Set rewards pool address
        rewardsPool = rewardsPoolAddress;

        // Initialize snapshot counter
        _snapshotId = 0;
    }

    /// @dev Pauses all token transfers.
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpauses token transfers.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Hook called before any token transfer. Checks if paused.
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Amount of tokens transferred
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);

        // If the contract is paused, revert
        if (paused()) {
            revert TokenTransferWhilePaused();
        }
    }

    /// @dev Hook called after token transfers or mints/burns to update votes and track rewards.
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Amount of tokens transferred
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._afterTokenTransfer(from, to, amount);

        // Only apply logic if this is a transfer (from != address(0)) and amount > 0
        if (from != address(0) && amount > 0) {
            // Calculate 1% reward for the sender based on the transferred amount
            uint256 reward = (amount * 1) / 100; // 1%
            rewardsBalance[from] += reward;
            emit RewardAccumulated(from, reward);

            // If the recipient is a partner, record the user's spending
            if (partners[to]) {
                monthlyPartnerSpending[from] += amount;
                emit SpendingRecorded(from, amount);
            }
        }
    }

    /// @dev Internal mint function that checks not to exceed MAX_SUPPLY.
    /// @param to Recipient of the minted tokens
    /// @param amount Amount of tokens to mint
    function _mint(address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        // Check if minting would exceed MAX_SUPPLY
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply();
        }
        super._mint(to, amount);
    }

    /// @dev Returns the current nonce for owner for ERC20Permit.
    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /// @dev Returns the DOMAIN_SEPARATOR for ERC20Permit.
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR()
        external
        view
        override(ERC20PermitUpgradeable)
        returns (bytes32)
    {
        return super.DOMAIN_SEPARATOR();
    }

    /// @dev Adds a partner establishment.
    /// @param partner The address of the partner to add.
    function addPartner(address partner) external onlyOwner {
        if (partners[partner]) {
            revert PartnerAlreadyExists();
        }
        partners[partner] = true;
        emit PartnerAdded(partner);
    }

    /// @dev Removes a partner establishment.
    /// @param partner The address of the partner to remove.
    function removePartner(address partner) external onlyOwner {
        if (!partners[partner]) {
            revert PartnerDoesNotExist();
        }
        partners[partner] = false;
        emit PartnerRemoved(partner);
    }

    /// @dev Mints new tokens to a specified address, respecting MAX_SUPPLY.
    /// @param to Recipient of minted tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external onlyOwner {
        // Check if minting would exceed MAX_SUPPLY
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply();
        }
        _mint(to, amount);
    }

    /// @dev Distributes monthly bonus rewards based on spending at partners.
    /// @param users The list of users to distribute bonus rewards to.
    ///
    /// The calculation of the exact bonus and distribution may rely on off-chain calculations
    /// using The Graph. After determining the bonus amounts off-chain, you can apply them here.
    /// This contract relies on `getBonusPercentage()` to determine the bonus tier.
    function distributeMonthlyBonusRewards(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 bonusPercentage = getBonusPercentage(user);

            if (bonusPercentage > 0) {
                // Calculate bonus reward from user's current rewardsBalance
                uint256 bonusReward = (rewardsBalance[user] * bonusPercentage) / 100;
                rewardsBalance[user] += bonusReward;
                emit RewardsDistributed(user, bonusReward);
            }
        }

        // Emitting a snapshot event can help off-chain tools like The Graph know that a "month" ended.
        emit SnapshotCreated(_snapshotId);
        _snapshotId++;
    }

    /// @dev Clears monthly data for a list of users at the end of the month.
    /// @param users The users whose monthly data will be reset.
    ///
    /// After calculating and distributing monthly rewards, this function resets their spending and rewards data.
    function clearMonthlyData(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            monthlyPartnerSpending[user] = 0;
            rewardsBalance[user] = 0;
            emit MonthlyDataCleared(user);
        }
    }

    /// @dev Transfers tokens from the rewards pool to a user.
    /// @param user The user to reward.
    /// @param amount The amount of tokens to reward.
    ///
    /// This function can be used to grant immediate rewards or handle special cases.
    function rewardUser(address user, uint256 amount) external onlyOwner {
        uint256 poolBalance = balanceOf(rewardsPool);
        if (poolBalance < amount) {
            revert InsufficientRewardsPoolBalance();
        }
        _transfer(rewardsPool, user, amount);
        emit RewardsDistributed(user, amount);
    }

    /// @dev Calculates the bonus percentage based on a user's monthly spending at partners.
    ///      For simplicity, we assume $1 = 1 token.
    /// @param user The address of the user.
    /// @return The bonus percentage (0, 2, 3, or 4).
    function getBonusPercentage(address user) public view returns (uint256) {
        uint256 spending = monthlyPartnerSpending[user];

        if (spending >= 2500 * 10 ** decimals()) {
            return 4;
        } else if (spending >= 1000 * 10 ** decimals()) {
            return 3;
        } else if (spending >= 1 * 10 ** decimals()) {
            return 2;
        } else {
            return 0;
        }
    }

    /// @dev Returns the current "clock" value for snapshots.
    ///      Used by ERC20Votes to handle checkpointing.
    function clock() public view virtual override returns (uint48) {
        return _snapshotId;
    }

    /// @dev Returns the clock mode, here set as a counter-based mode.
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual override returns (string memory) {
        // Validate the consistency of the snapshot clock
        if (clock() != _snapshotId) {
            revert ERC6372InconsistentClock();
        }
        return "mode=counter";
    }

    /// @dev Makes each account delegate to itself. This simplifies queries since balances = votes.
    function delegates(address account) public pure override returns (address) {
        return account;
    }

    /// @dev Authorizes contract upgrades. Only the owner can upgrade the contract.
    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // No additional logic required here
    }
}

