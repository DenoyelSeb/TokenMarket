// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockOracle {
    int256 private price;
    uint256 private updatedAt;

    constructor(int256 _initialPrice) {
        price = _initialPrice;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _newPrice) external {
        price = _newPrice;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt_,
            uint80 answeredInRound
        )
    {
        return (0, price, 0, updatedAt, 0);
    }
}
