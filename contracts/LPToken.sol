// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LPToken - ERC20 représentant les parts du pool AMM
/// @notice Mintable et burnable uniquement par le contrat AMM (owner)
contract LPToken is ERC20, Ownable {
    constructor(address _owner) ERC20("Neo LP Token", "NLP") Ownable(_owner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
