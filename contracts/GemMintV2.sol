// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./GemMint.sol" as GemMintBase;

contract GemMintV2 is GemMintBase {
    // Simple change: add a version function to confirm upgrade success
    function version() external pure returns (string memory) {
        return "V2";
    }
}
