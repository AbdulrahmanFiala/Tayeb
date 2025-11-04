import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import halaCoinsConfig from "../config/halaCoins.json";
import deployedContractsConfig from "../config/deployedContracts.json";
import { HalaCoinsConfig, getNonStablecoins, getCoinBySymbol, DeployedContracts } from "../config/types";

/**
 * Add liquidity to AMM pairs for all Initial Hala Coins
 * Usage: npx hardhat run scripts/addLiquidity.ts --network moonbase
 * 
 * Reads addresses from config JSON files
 * Adds liquidity to all token/USDT and token/USDC pairs
 */
async function main() {
  dotenv.config();
  const config = halaCoinsConfig as HalaCoinsConfig;
  const contractsConfig = deployedContractsConfig as DeployedContracts;

  const [deployer] = await ethers.getSigners();
  
  console.log("💧 Adding Liquidity to All AMM Pairs\n");
  console.log("Account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DEV\n");

  // ============================================================================
  // Read addresses from JSON configs
  // ============================================================================
  
  const ROUTER_ADDRESS = contractsConfig.amm.router;
  const USDT_COIN = config.coins.find(c => c.symbol === "USDT");
  const USDC_COIN = config.coins.find(c => c.symbol === "USDC");
  const USDT_ADDRESS = USDT_COIN?.addresses.moonbase;
  const USDC_ADDRESS = USDC_COIN?.addresses.moonbase;

  if (!ROUTER_ADDRESS || !USDT_ADDRESS || !USDC_ADDRESS) {
    console.error("❌ Error: AMM addresses not found in config files!");
    console.log("\n📝 Please run deploy-amm.ts first:");
    console.log("   npx hardhat run scripts/deploy-amm.ts --network moonbase\n");
    process.exit(1);
  }

  // Get non-stablecoin Hala Coins from config
  const nonStablecoins = getNonStablecoins(config);
  
  console.log("📖 Reading addresses from config files...");
  console.log(`📊 Total pairs to add liquidity: ${nonStablecoins.length * 2}`);
  console.log("   Router:", ROUTER_ADDRESS);
  console.log("   USDT:", USDT_ADDRESS);
  console.log("   USDC:", USDC_ADDRESS);
  console.log();

  // ============================================================================
  // LIQUIDITY AMOUNTS
  // ============================================================================
  
  // Stablecoin amounts (6 decimals)
  const stablecoinAmount = ethers.parseUnits("1000", 6); // 1000 USDT/USDC per pair
  
  // Token amounts (varies by decimals - from config)
  const tokenAmounts: { [key: string]: bigint } = {};
  for (const coin of nonStablecoins) {
    tokenAmounts[coin.symbol] = ethers.parseUnits("1000", coin.decimals); // 1000 tokens per pair
  }

  const deadline = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes

  // ============================================================================
  // GET CONTRACT INSTANCES
  // ============================================================================
  
  const router = await ethers.getContractAt("SimpleRouter", ROUTER_ADDRESS);
  const usdt = await ethers.getContractAt("MockERC20", USDT_ADDRESS);
  const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);

  console.log("✅ Connected to contracts");
  console.log();

  // ============================================================================
  // APPROVE TOKENS
  // ============================================================================
  
  console.log("✅ Approving tokens...");
  
  // Calculate total amounts needed
  const totalPairs = halaCoins.length * 2; // Each coin has 2 pairs (USDT and USDC)
  const totalUSDTNeeded = stablecoinAmount * BigInt(totalPairs);
  const totalUSDCNeeded = stablecoinAmount * BigInt(totalPairs);
  
  await usdt.approve(ROUTER_ADDRESS, totalUSDTNeeded);
  console.log(`✅ Approved ${ethers.formatUnits(totalUSDTNeeded, 6)} USDT`);
  
  await usdc.approve(ROUTER_ADDRESS, totalUSDCNeeded);
  console.log(`✅ Approved ${ethers.formatUnits(totalUSDCNeeded, 6)} USDC`);

  // Approve each Hala Coin
  const tokenApprovals: { [key: string]: bigint } = {};
  for (const coin of nonStablecoins) {
    const tokenAddress = coin.addresses.moonbase;
    if (!tokenAddress) {
      console.warn(`⚠️  Warning: ${coin.symbol} address not found in config, skipping...`);
      continue;
    }
    
    const token = await ethers.getContractAt("MockERC20", tokenAddress);
    const amountNeeded = tokenAmounts[coin.symbol] * BigInt(2); // For both USDT and USDC pairs
    tokenApprovals[coin.symbol] = amountNeeded;
    await token.approve(ROUTER_ADDRESS, amountNeeded);
    console.log(`✅ Approved ${coin.symbol}`);
  }
  console.log();

  // ============================================================================
  // ADD LIQUIDITY TO ALL PAIRS
  // ============================================================================
  
  console.log("💧 Adding liquidity to all pairs...");
  console.log("=".repeat(60));
  
  let successCount = 0;
  let failCount = 0;

  for (const coin of nonStablecoins) {
    const tokenAddress = coin.addresses.moonbase;
    if (!tokenAddress) {
      console.warn(`⚠️  Skipping ${coin.symbol} - address not found in config`);
      failCount++;
      continue;
    }

    const tokenAmount = tokenAmounts[coin.symbol];
    const token = await ethers.getContractAt("MockERC20", tokenAddress);

    // Add liquidity to USDT pair
    try {
      console.log(`\n💧 Adding liquidity to ${coin.symbol}/USDT pair...`);
      const tx1 = await router.addLiquidity(
        tokenAddress,
        USDT_ADDRESS,
        tokenAmount,
        stablecoinAmount,
        0, // Accept any amount (for initial liquidity)
        0,
        deployer.address,
        deadline
      );
      await tx1.wait();
      console.log(`✅ Added ${coin.symbol}/USDT liquidity`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to add ${coin.symbol}/USDT liquidity:`, error.message);
      failCount++;
    }

    // Add liquidity to USDC pair
    try {
      console.log(`💧 Adding liquidity to ${coin.symbol}/USDC pair...`);
      const tx2 = await router.addLiquidity(
        tokenAddress,
        USDC_ADDRESS,
        tokenAmount,
        stablecoinAmount,
        0,
        0,
        deployer.address,
        deadline
      );
      await tx2.wait();
      console.log(`✅ Added ${coin.symbol}/USDC liquidity`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to add ${coin.symbol}/USDC liquidity:`, error.message);
      failCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("🎉 LIQUIDITY ADDITION COMPLETE!");
  console.log("=".repeat(60));
  console.log(`✅ Successfully added: ${successCount} pairs`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} pairs`);
  }
  console.log();
  console.log("💡 All Initial Hala Coins now have liquidity pools with USDT and USDC");
  console.log("💡 You can now test swaps through the ShariaSwap contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
