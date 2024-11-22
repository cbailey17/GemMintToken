// contracts/GemMint.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GemMint is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10**18; // 10 billion tokens
    uint256 public constant TRANSACTION_FEE = 5; // 0.5% fee

    struct RewardInfo {
        uint256 baseReward;
        uint256 monthlyReward;
        uint256 partnerReward;
    }

    mapping(address => RewardInfo) private _rewards;
    mapping(address => bool) private _partners;

    address public rewardsPool;
    uint256 public rewardsPoolBalance;

    event RewardsDistributed(address indexed user, uint256 amount);
    event PartnerAdded(address indexed partner);
    event PartnerRemoved(address indexed partner);

    constructor(address _rewardsPool) ERC20("Gem Mint", "GEMM") {
        _mint(msg.sender, INITIAL_SUPPLY);
        rewardsPool = _rewardsPool;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * TRANSACTION_FEE) / 1000;
        uint256 netAmount = amount - fee;

        super.transfer(rewardsPool, fee); // Transaction fee to rewards pool
        super.transfer(recipient, netAmount);

        _distributeRewards(msg.sender, amount);
        _distributeRewards(recipient, amount);

        return true;
    }

    function addPartner(address partner) external onlyOwner {
        require(!_partners[partner], "Partner already exists");
        _partners[partner] = true;
        emit PartnerAdded(partner);
    }

    function removePartner(address partner) external onlyOwner {
        require(_partners[partner], "Partner does not exist");
        _partners[partner] = false;
        emit PartnerRemoved(partner);
    }

    function distributeMonthlyRewards() external onlyOwner {
        require(balanceOf(rewardsPool) >= rewardsPoolBalance, "Insufficient rewards pool balance");

        for (uint256 i = 0; i < totalSupply(); i++) {
            address account = address(i);
            uint256 rewardAmount = _rewards[account].monthlyReward;
            if (rewardAmount > 0) {
                _transfer(rewardsPool, account, rewardAmount);
                emit RewardsDistributed(account, rewardAmount);
            }
        }
    }

    function _distributeRewards(address account, uint256 transactionAmount) internal {
        uint256 baseReward = (transactionAmount * 1) / 1000; // 0.1% base reward
        uint256 partnerReward = _partners[account] ? (transactionAmount * 3) / 100 : 0; // 3% partner reward

        _rewards[account].baseReward += baseReward;
        _rewards[account].partnerReward += partnerReward;
        _rewards[account].monthlyReward += (baseReward + partnerReward);

        rewardsPoolBalance += (baseReward + partnerReward);
    }

    function claimRaffleEntry(uint256 transactionAmount) external view returns (bool) {
        return transactionAmount >= 500 ether;
    }
}
