const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [user] = await ethers.getSigners();

  const deployment = JSON.parse(fs.readFileSync("deployed.json"));

  const tokenA  = await ethers.getContractAt("TokenA", deployment.TokenA);
  const tokenB  = await ethers.getContractAt("TokenB", deployment.TokenB);
  const amm     = await ethers.getContractAt("AMMWithOracle", deployment.AMMWithOracle);
  const lpToken = await ethers.getContractAt("LPToken", deployment.LPToken);

  const amountA = ethers.parseUnits("1000", 18);
  const amountB = ethers.parseUnits("2000", 18);

  // Approve transfers
  await (await tokenA.approve(amm.target, amountA)).wait();
  await (await tokenB.approve(amm.target, amountB)).wait();

  // Add liquidity
  await (await amm.addLiquidity(amountA, amountB)).wait();

  const balanceLP = await lpToken.balanceOf(user.address);
  console.log(`Seeded AMM with liquidity. LP tokens minted: ${ethers.formatUnits(balanceLP, 18)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});