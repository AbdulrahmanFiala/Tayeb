// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IDEXRouter.sol";
import "./SimplePair.sol";
import "./SimpleFactory.sol";

/**
 * @title SimpleRouter
 * @notice Router for SimplePair AMM (Uniswap V2-style)
 * @dev Implements IDEXRouter interface for compatibility
 */
contract SimpleRouter is IDEXRouter, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    address public immutable factory;
    address public immutable WETH;

    // ============================================================================
    // ERRORS
    // ============================================================================

    error InsufficientAmount();
    error InsufficientLiquidity();
    error InvalidPath();
    error ExcessiveInputAmount();
    error Expired();

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(address _factory, address _weth) {
        factory = _factory;
        WETH = _weth;
    }

    // ============================================================================
    // LIQUIDITY FUNCTIONS
    // ============================================================================

    /**
     * @notice Add liquidity to a pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountADesired Desired amount of tokenA
     * @param amountBDesired Desired amount of tokenB
     * @param amountAMin Minimum amount of tokenA
     * @param amountBMin Minimum amount of tokenB
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = _pairFor(tokenA, tokenB);
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = SimplePair(pair).mint(to);
    }

    /**
     * @notice Remove liquidity from a pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive
     * @param amountBMin Minimum amount of tokenB to receive
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pair = _pairFor(tokenA, tokenB);
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = SimplePair(pair).burn(to);
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        if (amountA < amountAMin) revert InsufficientAmount();
        if (amountB < amountBMin) revert InsufficientAmount();
    }

    // ============================================================================
    // SWAP FUNCTIONS
    // ============================================================================

    /**
     * @notice Swap exact tokens for tokens
     * @param amountIn Exact input amount
     * @param amountOutMin Minimum output amount
     * @param path Array of token addresses
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amounts Array of amounts for each swap
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientAmount();
        IERC20(path[0]).safeTransferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    /**
     * @notice Swap tokens for exact tokens
     * @param amountOut Exact output amount
     * @param amountInMax Maximum input amount
     * @param path Array of token addresses
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amounts Array of amounts for each swap
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();
        IERC20(path[0]).safeTransferFrom(msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get output amounts for a given input
     * @param amountIn Input amount
     * @param path Array of token addresses
     * @return amounts Array of output amounts
     */
    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        override
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = _getReserves(path[i], path[i + 1]);
            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @notice Get input amounts for a given output
     * @param amountOut Output amount
     * @param path Array of token addresses
     * @return amounts Array of input amounts
     */
    function getAmountsIn(uint256 amountOut, address[] memory path)
        public
        view
        override
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = _getReserves(path[i - 1], path[i]);
            amounts[i - 1] = _getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================

    /**
     * @notice Calculate optimal amounts for adding liquidity
     */
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        (uint256 reserveA, uint256 reserveB) = _getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientAmount();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                if (amountAOptimal < amountAMin) revert InsufficientAmount();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /**
     * @notice Execute swap through pairs
     */
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            SimplePair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    /**
     * @notice Get pair address for two tokens
     */
    function _pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        pair = SimpleFactory(factory).getPair(token0, token1);
        if (pair == address(0)) revert InvalidPath();
    }

    /**
     * @notice Get reserves for a token pair
     */
    function _getReserves(address tokenA, address tokenB) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = _sortTokens(tokenA, tokenB);
        address pair = SimpleFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) return (0, 0);
        (uint256 reserve0, uint256 reserve1,) = SimplePair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @notice Sort two token addresses
     */
    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    /**
     * @notice Quote amount B for amount A
     */
    function _quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        if (amountA == 0) revert InsufficientAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();
        amountB = (amountA * reserveB) / reserveA;
    }

    /**
     * @notice Calculate output amount (with 0.3% fee)
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Calculate input amount (with 0.3% fee)
     */
    function _getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountIn)
    {
        if (amountOut == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}

