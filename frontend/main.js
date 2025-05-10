let deployed, ammAbi, tokenAbi, lpAbi;
let provider, signer;
let contractRead, contractWrite, tokenA, tokenB, lpToken;
let userAddr;

async function loadConfigs() {
  try {
    deployed  = await fetch("deployed.json").then(r => r.json());
    ammAbi    = await fetch("abi/AMMWithOracle.json").then(r => r.json());
    tokenAbi  = await fetch("abi/TokenA.json").then(r => r.json());
    lpAbi     = await fetch("abi/LPToken.json").then(r => r.json());
    console.log("✅ Configs loaded", deployed);
  } catch (err) {
    console.error("❌ Error loading configs", err);
  }
}

async function connect() {
  console.log("🔌 connect() called");
  if (!window.ethereum) {
    return alert("Please install MetaMask");
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddr = accounts[0];
    console.log("✔️ Connected as", userAddr);

    // Update UI
    const btn = document.getElementById("connectWallet");
    btn.textContent = "Connected";
    btn.disabled = true;
    document.getElementById("userAddress").textContent = userAddr;

    // Ethers.js setup
    provider       = new ethers.BrowserProvider(window.ethereum);
    signer         = await provider.getSigner();
    contractRead   = new ethers.Contract(deployed.AMMWithOracle, ammAbi.abi, provider);
    contractWrite  = contractRead.connect(signer);
    tokenA         = new ethers.Contract(deployed.TokenA, tokenAbi.abi, signer);
    tokenB         = new ethers.Contract(deployed.TokenB, tokenAbi.abi, signer);
    lpToken        = new ethers.Contract(deployed.LPToken, lpAbi.abi, provider);

    await updatePrices();
    await updateLPInfo();
  } catch (err) {
    console.error("❌ Connection failed", err);
  }
}

async function updatePrices() {
  try {
    const oracle = await contractRead.getPriceFromOracle();
    const pool   = await contractRead.getPoolPrice();
    document.getElementById("oraclePrice").textContent = 
      (Number(oracle) / 1e8).toFixed(2) + " $";
    document.getElementById("poolPrice").textContent = 
      (Number(pool) / 1e18).toFixed(6);
  } catch (err) {
    console.error("Error fetching prices", err);
  }
}

async function updateLPInfo() {
  try {
    const total = await lpToken.totalSupply();
    document.getElementById("lpTotal").textContent =
      ethers.formatUnits(total, 18);

    if (userAddr) {
      const balance = await lpToken.balanceOf(userAddr);
      document.getElementById("lpBalance").textContent =
        ethers.formatUnits(balance, 18);
    }
  } catch (err) {
    console.error("Error fetching LP info", err);
  }
}

async function addLiquidity() {
  const a = document.getElementById("liquidityA").value;
  const b = document.getElementById("liquidityB").value;
  try {
    const amountA = ethers.parseUnits(a, 18);
    const amountB = ethers.parseUnits(b, 18);
    await (await tokenA.approve(deployed.AMMWithOracle, amountA)).wait();
    await (await tokenB.approve(deployed.AMMWithOracle, amountB)).wait();
    await (await contractWrite.addLiquidity(amountA, amountB)).wait();
    alert("➕ Liquidity added");
    await updatePrices();
    await updateLPInfo();
  } catch (err) {
    console.error("Error adding liquidity", err);
    alert("Failed to add liquidity");
  }
}

async function swap() {
  try {
    const amt = document.getElementById("swapAmount").value;
    const amount = ethers.parseUnits(amt, 18);
    await (await tokenA.approve(deployed.AMMWithOracle, amount)).wait();
    await (await contractWrite.swap(deployed.TokenA, amount)).wait();
    alert("🔁 Swap completed");
    await updatePrices();
    await updateLPInfo();
  } catch (err) {
    console.error("Swap failed", err);
    alert("Swap failed");
  }
}

async function removeLiquidity() {
  try {
    const pct = Number(document.getElementById("removePercent").value);
    await (await contractWrite.removeLiquidity(pct)).wait();
    alert("➖ Liquidity removed");
    await updatePrices();
    await updateLPInfo();
  } catch (err) {
    console.error("Error removing liquidity", err);
    alert("Remove liquidity failed");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadConfigs();
  document.getElementById("connectWallet").addEventListener("click", connect);
  document.getElementById("addLiquidity").addEventListener("click", addLiquidity);
  document.getElementById("swap").addEventListener("click", swap);
  document.getElementById("removeLiquidity").addEventListener("click", removeLiquidity);
});
