import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import halaCoinsConfig from "../config/halaCoins.json";
import deployedContractsConfig from "../config/deployedContracts.json";
import { HalaCoinsConfig, getNonStablecoins, getStablecoins, DeployedContracts } from "../config/types";

/**
 * Deploy AMM Infrastructure to Moonbase Alpha Testnet
 * 
 * This script deploys:
 * 1. SimpleFactory (creates pairs)
 * 2. SimpleRouter (routes swaps)
 * 3. MockERC20 tokens for all Initial Hala Coins
 * 4. Creates liquidity pairs
 * 5. Mints initial tokens
 * 6. Saves all addresses to config JSON files
 * 
 * Run this once (or when you need fresh AMM)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const config = halaCoinsConfig as HalaCoinsConfig;

  console.log("🏗️  Deploying AMM Infrastructure to Moonbase Alpha Testnet...\n");
  console.log("Account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DEV\n");

  const WETH_ADDRESS = ethers.getAddress("0xD909178CC99d318e4D46e7E66a972955859670E1".toLowerCase());

  // ============================================================================
  // Deploy Mock Tokens - Initial Hala Coins
  // ============================================================================
  console.log("📝 Deploying Mock Tokens (Initial Hala Coins)...");
  console.log(`📊 Total coins to deploy: ${config.coins.length}`);
  console.log();
  
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const deployedTokens: { [key: string]: string } = {};

  // Deploy all coins from config
  for (const coin of config.coins) {
    const tokenName = `Mock ${coin.name}`;
    const token = await MockERC20.deploy(tokenName, coin.symbol, coin.decimals);
    await token.waitForDeployment();
    const address = await token.getAddress();
    deployedTokens[coin.symbol] = address;
    console.log(`✅ ${coin.symbol} (${coin.name}) deployed to: ${address}`);
  }
  console.log();

  // ============================================================================
  // Deploy Factory
  // ============================================================================
  console.log("🏭 Deploying SimpleFactory...");
  const SimpleFactory = await ethers.getContractFactory("SimpleFactory");
  const factory = await SimpleFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ SimpleFactory deployed to:", factoryAddress);
  console.log();

  // ============================================================================
  // Deploy Router
  // ============================================================================
  console.log("🔀 Deploying SimpleRouter...");
  const SimpleRouter = await ethers.getContractFactory("SimpleRouter");
  const router = await SimpleRouter.deploy(factoryAddress, WETH_ADDRESS);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ SimpleRouter deployed to:", routerAddress);
  console.log();

  // ============================================================================
  // Create Pairs - All tokens against USDT and USDC
  // ============================================================================
  console.log("🔗 Creating liquidity pairs...");
  const pairs: { [key: string]: string } = {};

  // Get stablecoin addresses
  const mockUSDT = deployedTokens["USDT"];
  const mockUSDC = deployedTokens["USDC"];

  // Create pairs for each non-stablecoin with USDT and USDC
  const nonStablecoins = getNonStablecoins(config);
  
  for (const coin of nonStablecoins) {
    const tokenAddress = deployedTokens[coin.symbol];
    
    // Pair with USDT
    await factory.createPair(tokenAddress, mockUSDT);
    const pairUSDT = await factory.getPair(tokenAddress, mockUSDT);
    pairs[`${coin.symbol}_USDT`] = pairUSDT;
    console.log(`✅ ${coin.symbol}/USDT pair created at: ${pairUSDT}`);

    // Pair with USDC
    await factory.createPair(tokenAddress, mockUSDC);
    const pairUSDC = await factory.getPair(tokenAddress, mockUSDC);
    pairs[`${coin.symbol}_USDC`] = pairUSDC;
    console.log(`✅ ${coin.symbol}/USDC pair created at: ${pairUSDC}`);
  }
  console.log();

  // ============================================================================
  // Mint Initial Tokens
  // ============================================================================
  console.log("💰 Minting tokens to deployer for liquidity...");
  
  // Mint all tokens based on config
  for (const coin of config.coins) {
    const token = await ethers.getContractAt("MockERC20", deployedTokens[coin.symbol]);
    
    // Mint more for stablecoins (used in many pairs)
    const isStablecoin = config.stablecoins.includes(coin.symbol);
    const mintAmount = isStablecoin 
      ? ethers.parseUnits("10000000", coin.decimals) // 10M for stablecoins
      : ethers.parseUnits("1000000", coin.decimals);  // 1M for others
    
    await token.mint(deployer.address, mintAmount);
    const formattedAmount = isStablecoin ? "10M" : "1M";
    console.log(`✅ Minted ${formattedAmount} ${coin.symbol} to deployer`);
  }
  console.log();

  // ============================================================================
  // Update config JSON with deployed addresses
  // ============================================================================
  console.log("📝 Updating halaCoins.json with deployed addresses...");
  const configPath = path.join(__dirname, "..", "config", "halaCoins.json");
  const updatedConfig = { ...config };
  
  // Update addresses for all coins
  updatedConfig.coins = config.coins.map(coin => ({
    ...coin,
    addresses: {
      ...coin.addresses,
      moonbase: deployedTokens[coin.symbol] || null,
    },
  }));

  // Update metadata
  updatedConfig.metadata = {
    ...config.metadata,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2) + "\n");
  console.log("✅ Updated halaCoins.json with deployed addresses");
  console.log();

  // ============================================================================
  // Update deployedContracts.json with AMM addresses
  // ============================================================================
  console.log("📝 Updating deployedContracts.json with AMM addresses...");
  const contractsPath = path.join(__dirname, "..", "config", "deployedContracts.json");
  const contractsConfig = deployedContractsConfig as DeployedContracts;
  const blockNumber = await ethers.provider.getBlockNumber();

  const updatedContracts = {
    ...contractsConfig,
    network: "moonbase",
    lastDeployed: new Date().toISOString(),
    amm: {
      factory: factoryAddress,
      router: routerAddress,
      weth: WETH_ADDRESS,
    },
    metadata: {
      ...contractsConfig.metadata,
      deploymentDate: new Date().toISOString(),
      deployer: deployer.address,
      blockNumber: blockNumber,
    },
  };

  fs.writeFileSync(contractsPath, JSON.stringify(updatedContracts, null, 2) + "\n");
  console.log("✅ Updated deployedContracts.json with AMM addresses");
  console.log();

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("=".repeat(60));
  console.log("📋 AMM DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("SimpleFactory:      ", factoryAddress);
  console.log("SimpleRouter:        ", routerAddress);
  console.log("\n📦 Deployed Tokens:", Object.keys(deployedTokens).length);
  console.log("🔗 Created Pairs:   ", Object.keys(pairs).length);
  console.log("=".repeat(60));
  console.log();
  console.log("💡 Next Steps:");
  console.log("1. Add liquidity: npx hardhat run scripts/addLiquidity.ts --network moonbase");
  console.log("2. Deploy main contracts: npx hardhat run scripts/deploy-contracts.ts --network moonbase");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

