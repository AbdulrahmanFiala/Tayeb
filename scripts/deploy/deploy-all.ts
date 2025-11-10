import { execSync } from "child_process";
import deployedContractsConfig from "../../config/deployedContracts.json";
import { DeployedContracts } from "../../config/types";

/**
 * Full Deployment Wrapper
 * 
 * This script orchestrates the complete deployment process:
 * 1. Deploys tokens (deploy-tokens.ts)
 * 2. Deploys AMM core (Factory & Router) (deploy-amm-core.ts)
 * 3. Creates liquidity pairs (create-pairs.ts)
 * 4. Mints initial tokens (mint-tokens.ts)
 * 5. Deploys main contracts (deploy-core.ts)
 * 
 * All scripts are idempotent and safe to re-run.
 */
async function main() {
  const contractsConfig = deployedContractsConfig as DeployedContracts;

  console.log("🚀 Tayeb Full Deployment\n");
  console.log("This script will deploy the complete infrastructure:\n");
  console.log("1. Tokens");
  console.log("2. AMM Core (Factory & Router)");
  console.log("3. Liquidity Pairs");
  console.log("4. Mint Tokens");
  console.log("5. Main Contracts\n");

  const scripts = [
    { name: "Tokens", script: "deploy-tokens.ts", timeout: 60000 },
    { name: "AMM Core", script: "deploy-amm-core.ts", timeout: 60000 },
    { name: "Liquidity Pairs", script: "create-pairs.ts", timeout: 120000 },
    { name: "Mint Tokens", script: "mint-tokens.ts", timeout: 60000 },
    { name: "Main Contracts", script: "deploy-core.ts", timeout: 60000 },
  ];

  for (const { name, script, timeout } of scripts) {
    console.log(`📦 Deploying ${name}...`);
    console.log("=".repeat(60));
    try {
      execSync(`npx hardhat run scripts/deploy/${script} --network moonbase`, {
        stdio: "inherit",
        timeout,
      });
      console.log(`\n✅ ${name} deployment complete!\n`);
    } catch (error: any) {
      console.error(`\n❌ ${name} deployment failed!`);
      if (error.message?.includes("ETIMEDOUT") || error.message?.includes("ENETUNREACH")) {
        console.error("\n💡 Network connection issue detected.");
      }
      process.exit(1);
    }
  }

  console.log("=".repeat(60));
  console.log("🎉 All deployments complete!");
  console.log("=".repeat(60));
  console.log("\n📝 All addresses saved to config JSON files");
  console.log("\n💡 Next steps:");
  console.log("Add liquidity: npx hardhat run scripts/liquidity/addLiquidity.ts --network moonbase");
  console.log("Test your contracts!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
