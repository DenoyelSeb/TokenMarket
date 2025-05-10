const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with ${deployer.address}`);

  const initialSupply = ethers.parseUnits("10000", 18);

  // Deploy TokenA
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy(initialSupply);
  await tokenA.waitForDeployment();
  console.log(`TokenA deployed at: ${tokenA.target}`);

  // Deploy TokenB
  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy(initialSupply);
  await tokenB.waitForDeployment();
  console.log(`TokenB deployed at: ${tokenB.target}`);

  // Deploy MockOracle
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const mockOracle = await MockOracle.deploy(BigInt(3000e8)); // $3000, 8 decimals
  await mockOracle.waitForDeployment();
  console.log(`MockOracle deployed at: ${mockOracle.target}`);

  // Use Chainlink real oracle (ETH/USD Sepolia)
  const realOracle = ethers.getAddress("0x694AA1769357215DE4FAC081bf1f309aDC325306");

  // Deploy LPToken (provisoirement owned par le déployeur)
  const LPToken = await ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy(deployer.address);
  await lpToken.waitForDeployment();
  console.log(`LPToken deployed at: ${lpToken.target}`);

  // Deploy AMMWithOracle
  const AMM = await ethers.getContractFactory("AMMWithOracle");
  const amm = await AMM.deploy(tokenA.target, tokenB.target, realOracle, lpToken.target);
  await amm.waitForDeployment();
  console.log(`AMMWithOracle deployed at: ${amm.target}`);

  // Transfert ownership du LPToken au AMM
  const tx = await lpToken.transferOwnership(amm.target);
  await tx.wait();
  console.log("Ownership of LPToken transferred to AMM");

  // Save to deployed.json
  const deployment = {
    TokenA: tokenA.target,
    TokenB: tokenB.target,
    MockOracle: mockOracle.target,
    AMMWithOracle: amm.target,
    LPToken: lpToken.target
  };

  fs.writeFileSync("deployed.json", JSON.stringify(deployment, null, 2));
  console.log("✅ Addresses saved to deployed.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
