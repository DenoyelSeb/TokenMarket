// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

// Interface Chainlink
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract AMMWithOracle is ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;
    LPToken public lpToken;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public constant FEE_PERCENT = 3; // 0.3%

    AggregatorV3Interface public priceOracle;

    event LiquidityAdded(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted);
    event LiquidityRemoved(address indexed user, uint256 amountA, uint256 amountB, uint256 lpBurned);
    event Swapped(address indexed user, address inputToken, uint256 inputAmount, uint256 outputAmount);

    constructor(address _tokenA, address _tokenB, address _oracle, address _lpToken) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        priceOracle = AggregatorV3Interface(_oracle);
        lpToken = LPToken(_lpToken);
    }

    function getPriceFromOracle() public view returns (int256) {
        (, int256 price,,,) = priceOracle.latestRoundData();
        return price;
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external nonReentrant {
        require(amountA > 0 && amountB > 0, "Invalid amounts");

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        uint256 lpToMint;

        if (reserveA == 0 && reserveB == 0) {
            // Initial liquidity: sqrt(amountA * amountB)
            lpToMint = sqrt(amountA * amountB);
        } else {
            // Mint proportionnal to added liquidity
            uint256 lpTotal = lpToken.totalSupply();
            uint256 lpA = (amountA * lpTotal) / reserveA;
            uint256 lpB = (amountB * lpTotal) / reserveB;
            lpToMint = lpA < lpB ? lpA : lpB;
        }

        require(lpToMint > 0, "Zero LP minted");
        lpToken.mint(msg.sender, lpToMint);

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, lpToMint);
    }

    function removeLiquidity(uint256 lpAmount) external nonReentrant {
        require(lpAmount > 0, "Invalid LP amount");

        uint256 lpTotal = lpToken.totalSupply();
        require(lpAmount <= lpTotal, "Exceeds total LP");

        uint256 amountA = (reserveA * lpAmount) / lpTotal;
        uint256 amountB = (reserveB * lpAmount) / lpTotal;

        require(amountA > 0 && amountB > 0, "Insufficient output");

        reserveA -= amountA;
        reserveB -= amountB;

        lpToken.burn(msg.sender, lpAmount);
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
    }

    function swap(address inputToken, uint256 inputAmount) external nonReentrant returns (uint256 outputAmount) {
        require(inputAmount > 0, "Zero input");
        require(inputToken == address(tokenA) || inputToken == address(tokenB), "Invalid token");

        bool isAtoB = inputToken == address(tokenA);
        (IERC20 fromToken, IERC20 toToken, uint256 reserveIn, uint256 reserveOut) = isAtoB
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);

        fromToken.transferFrom(msg.sender, address(this), inputAmount);

        uint256 amountInWithFee = inputAmount * (1000 - FEE_PERCENT);
        outputAmount = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
        require(outputAmount > 0, "Insufficient output");

        toToken.transfer(msg.sender, outputAmount);

        if (isAtoB) {
            reserveA += inputAmount;
            reserveB -= outputAmount;
        } else {
            reserveB += inputAmount;
            reserveA -= outputAmount;
        }

        emit Swapped(msg.sender, inputToken, inputAmount, outputAmount);
    }

    function getPoolPrice() external view returns (uint256) {
        if (reserveA == 0 || reserveB == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}