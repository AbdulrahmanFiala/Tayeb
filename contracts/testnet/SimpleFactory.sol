// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimplePair.sol";

/**
 * @title SimpleFactory
 * @notice Factory contract for creating and tracking pairs
 * @dev Minimal Uniswap V2-style factory for testnet
 */
contract SimpleFactory {
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairCount
    );

    // ============================================================================
    // ERRORS
    // ============================================================================

    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();

    // ============================================================================
    // PUBLIC FUNCTIONS
    // ============================================================================

    /**
     * @notice Create a new token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of created pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();

        // Deploy new pair
        bytes memory bytecode = type(SimplePair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // Initialize pair
        SimplePair(pair).initialize(token0, token1);

        // Store pair
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get total number of pairs
     * @return Total pair count
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}

