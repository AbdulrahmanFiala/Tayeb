import { execSync } from "child_process";
import deployedContractsConfig from "../config/deployedContracts.json";
import { DeployedContracts } from "../config/types";

/**
 * Smart Deployment Wrapper
 * 
 * This script:
 * 1. Checks if AMM is deployed (reads from deployedContracts.json)
 * 2. If not, deploys AMM first (deploy-amm.ts)
 * 3. Then deploys main contracts (deploy-contracts.ts)
 * 
 * This prevents duplicate AMM deployments while allowing contract updates.
 */
async function main() {
  const contractsConfig = deployedContractsConfig as DeployedContracts;

  console.log("🚀 Tayeb Smart Deployment\n");
  console.log("This script will deploy AMM (if needed) and main contracts.\n");

  const hasAMM = !!(
    contractsConfig.amm.factory &&
    contractsConfig.amm.router
  );

  if (!hasAMM) {
    console.log("📦 AMM not found in deployedContracts.json - deploying AMM infrastructure first...\n");
    console.log("=".repeat(60));
    try {
      execSync("npx hardhat run scripts/deploy-amm.ts --network moonbase", {
        stdio: "inherit",
      });
      console.log("\n✅ AMM deployment complete!\n");
    } catch (error) {
      console.error("\n❌ AMM deployment failed!");
      process.exit(1);
    }
  } else {
    console.log("✅ AMM already deployed (found in deployedContracts.json)");
    console.log("   Factory:", contractsConfig.amm.factory);
    console.log("   Router:", contractsConfig.amm.router);
    console.log("\n💡 To redeploy AMM, reset addresses in deployedContracts.json or run:");
    console.log("   npx hardhat run scripts/deploy-amm.ts --network moonbase\n");
  }

  console.log("📦 Deploying main contracts...\n");
  console.log("=".repeat(60));
  try {
    execSync("npx hardhat run scripts/deploy-contracts.ts --network moonbase", {
      stdio: "inherit",
    });
    console.log("\n✅ Main contracts deployment complete!\n");
  } catch (error) {
    console.error("\n❌ Main contracts deployment failed!");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("🎉 All deployments complete!");
  console.log("=".repeat(60));
  console.log("\n📝 All addresses saved to config JSON files");
  console.log("\n💡 Next steps:");
  console.log("1. Add liquidity: npx hardhat run scripts/addLiquidity.ts --network moonbase");
  console.log("2. Test your contracts!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
