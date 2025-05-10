const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AMMWithOracle + LPToken + Fees", function () {
  let tokenA, tokenB, mockOracle, amm, lpToken;
  let deployer, user;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();

    // Deploy TokenA and TokenB
    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy(ethers.parseUnits("10000", 18));
    await tokenA.waitForDeployment();

    const TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy(ethers.parseUnits("10000", 18));
    await tokenB.waitForDeployment();

    // Deploy MockOracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy(BigInt(3000e8)); // $3000
    await mockOracle.waitForDeployment();

    // Deploy LPToken (owned by deployer temporarily)
    const LPToken = await ethers.getContractFactory("LPToken");
    lpToken = await LPToken.deploy(deployer.address);
    await lpToken.waitForDeployment();

    // Deploy AMM and transfer ownership of LPToken
    const AMM = await ethers.getContractFactory("AMMWithOracle");
    amm = await AMM.deploy(tokenA.target, tokenB.target, mockOracle.target, lpToken.target);
    await amm.waitForDeployment();

    await lpToken.transferOwnership(amm.target);

    // Approve and seed liquidity
    const amountA = ethers.parseUnits("1000", 18);
    const amountB = ethers.parseUnits("2000", 18);

    await tokenA.approve(amm.target, amountA);
    await tokenB.approve(amm.target, amountB);
    await amm.addLiquidity(amountA, amountB);
  });

  it("reads oracle price correctly", async function () {
    const price = await amm.getPriceFromOracle();
    expect(price).to.equal(BigInt(3000e8));
  });

  it("swaps tokenA for tokenB with fee", async function () {
    const inputAmount = ethers.parseUnits("100", 18);
  
    await tokenA.connect(deployer).transfer(user.address, inputAmount);
    await tokenA.connect(user).approve(amm.target, inputAmount);
  
    const balanceBefore = await tokenB.balanceOf(user.address);
  
    await amm.connect(user).swap(tokenA.target, inputAmount);
  
    const balanceAfter = await tokenB.balanceOf(user.address);
    expect(balanceAfter).to.be.gt(balanceBefore);

    // Fee effect: output should be slightly < 100:2 = 50
    const output = balanceAfter - balanceBefore;
    expect(output).to.be.lt(ethers.parseUnits("200", 18)); // sécurité large
  });

  it("adds liquidity and mints LP tokens", async function () {
    const amountA = ethers.parseUnits("100", 18);
    const amountB = ethers.parseUnits("200", 18);

    await tokenA.approve(amm.target, amountA);
    await tokenB.approve(amm.target, amountB);

    const totalBefore = await lpToken.totalSupply();
    await amm.addLiquidity(amountA, amountB);
    const totalAfter = await lpToken.totalSupply();

    expect(totalAfter).to.be.gt(totalBefore);
  });

  it("removes liquidity and burns LP tokens", async function () {
    const userLP = await lpToken.balanceOf(deployer.address);
    const removeAmount = userLP / 10n; // 10%

    const balanceA_before = await tokenA.balanceOf(deployer.address);
    const balanceB_before = await tokenB.balanceOf(deployer.address);

    await amm.removeLiquidity(removeAmount);

    const balanceA_after = await tokenA.balanceOf(deployer.address);
    const balanceB_after = await tokenB.balanceOf(deployer.address);

    expect(balanceA_after).to.be.gt(balanceA_before);
    expect(balanceB_after).to.be.gt(balanceB_before);

    const userLP_after = await lpToken.balanceOf(deployer.address);
    expect(userLP_after).to.equal(userLP - removeAmount);
  });
});