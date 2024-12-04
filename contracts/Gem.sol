// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract GemMint is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    // Roles
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // State Variables
    address public rewardsPool;
    mapping(address => bool) public partners;

    // Events
    event PartnerAdded(address indexed partner);
    event PartnerRemoved(address indexed partner);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract, replacing constructor.
     * @param admin Address of the admin with DEFAULT_ADMIN_ROLE.
     * @param upgrader Address with UPGRADER_ROLE for managing upgrades.
     * @param rewardsPool_ Address of the rewards pool.
     */
    function initialize(address admin, address upgrader, address rewardsPool_) public initializer {
        __ERC20_init("GemMint", "GEMM");
        __AccessControl_init();
        __UUPSUpgradeable_init();

        rewardsPool = rewardsPool_;

        // Set roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(PARTNER_MANAGER_ROLE, admin);

        // Mint initial supply to admin
        _mint(admin, 10_000_000 * 10 ** decimals());
    }

    /**
     * @dev Add a partner to the partner program.
     * @param partner Address to be added as a partner.
     */
    function addPartner(address partner) external onlyRole(PARTNER_MANAGER_ROLE) {
        require(!partners[partner], "Partner already exists");
        partners[partner] = true;
        emit PartnerAdded(partner);
    }

    /**
     * @dev Remove a partner from the partner program.
     * @param partner Address to be removed as a partner.
     */
    function removePartner(address partner) external onlyRole(PARTNER_MANAGER_ROLE) {
        require(partners[partner], "Partner does not exist");
        partners[partner] = false;
        emit PartnerRemoved(partner);
    }

    /**
     * @dev Authorize contract upgrades. Restricted to UPGRADER_ROLE.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
