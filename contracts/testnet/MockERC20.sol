// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testnet
 * @dev Anyone can mint tokens for testing purposes
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /**
     * @notice Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Get token decimals
     * @return Number of decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to caller (convenience function)
     * @param amount Amount to mint
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}

