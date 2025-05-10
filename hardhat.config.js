require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); 

module.exports = {
  solidity: "0.8.28", 
  networks: {
    sepolia: {
      url: process.env.MY_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`] 
    }
  }
};
