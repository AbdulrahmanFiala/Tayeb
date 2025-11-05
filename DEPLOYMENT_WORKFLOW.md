# Deployment Workflow

> **Quick Start**: For a simple step-by-step setup guide, see [SETUP.md](./SETUP.md)

## Overview

The deployment is modular and split into focused scripts:
1. **Tokens** - Deploy MockERC20 tokens (deploy-tokens.ts)
2. **AMM Core** - Deploy Factory & Router (deploy-amm-core.ts)
3. **Pairs** - Create liquidity pairs (create-pairs.ts)
4. **Minting** - Mint initial tokens (mint-tokens.ts)
5. **Main Contracts** - Deploy ShariaCompliance, ShariaSwap, ShariaDCA (deploy-core.ts)

All scripts are idempotent and safe to re-run. All addresses are automatically saved to JSON config files (`config/deployedContracts.json` and `config/halaCoins.json`) for reuse and frontend access.

## Quick Start

### Option 1: Full Deployment (Recommended)
```bash
npm run deploy:testnet
```
This automatically runs all deployment scripts in order:
1. Deploys tokens (deploy-tokens.ts)
2. Deploys AMM core - Factory & Router (deploy-amm-core.ts)
3. Creates liquidity pairs (create-pairs.ts)
4. Mints initial tokens (mint-tokens.ts)
5. Deploys main contracts (deploy-core.ts)

All scripts are idempotent - they check for existing contracts and skip if already deployed. All addresses are automatically saved to JSON config files.

### Option 2: Manual Step-by-Step

**1. Deploy Tokens**
```bash
npm run deploy:tokens
# or
npx hardhat run scripts/deploy-tokens.ts --network moonbase
```
This deploys:
- All 16 Initial Hala Coins (MockERC20: BTC, ETH, USDT, USDC, etc.)
- **Saves token addresses to both `halaCoins.json` and `deployedContracts.json`**

**2. Deploy AMM Core**
```bash
npm run deploy:amm-core
# or
npx hardhat run scripts/deploy-amm-core.ts --network moonbase
```
This deploys:
- SimpleFactory
- SimpleRouter
- WETH (if needed)
- **Saves addresses to `deployedContracts.json`**

**3. Create Pairs**
```bash
npm run deploy:pairs
# or
npx hardhat run scripts/create-pairs.ts --network moonbase
```
This creates:
- Liquidity pairs (each coin with USDT and USDC = 28 pairs total)
- **Saves pair addresses to `deployedContracts.json`**

**4. Mint Tokens**
```bash
npm run deploy:mint
# or
npx hardhat run scripts/mint-tokens.ts --network moonbase
```
This mints initial tokens to the deployer for testing.

**5. Deploy Main Contracts (Idempotent)**
```bash
npm run deploy:core
# or
npx hardhat run scripts/deploy-core.ts --network moonbase
```
This:
- Reads AMM addresses from `deployedContracts.json`
- Reads coin config from `halaCoins.json`
- Deploys ShariaCompliance, ShariaSwap, ShariaDCA
- **Registers coins from JSON** (skips if already registered)
- Registers token addresses
- **Saves addresses to JSON configs**

**3. Add Liquidity**
```bash
npx hardhat run scripts/addLiquidity.ts --network moonbase
```
This:
- Reads addresses from JSON configs (no manual editing needed!)
- Adds liquidity to all pairs (each coin with USDT and USDC)

## Files Structure

```
scripts/
├── deploy-all.ts                  # Full deployment wrapper (orchestrates all)
├── deploy-tokens.ts               # Deploy MockERC20 tokens (idempotent)
├── deploy-amm-core.ts             # Deploy AMM infrastructure - Factory & Router (idempotent)
├── create-pairs.ts                # Create liquidity pairs (idempotent)
├── mint-tokens.ts                 # Mint initial tokens
├── deploy-core.ts                 # Deploy main contracts (idempotent)
├── verify-all.ts                  # Verify all contracts on Moonscan
├── addLiquidity.ts                # Add liquidity (reads from JSON)
├── removeLiquidity.ts             # Remove liquidity
├── sync-coins-from-contract.ts   # Manual sync: Contract → JSON
└── listen-coin-events.ts         # Auto sync: Listen to events, update JSON
└── utils/
    └── deployHelpers.ts           # Shared deployment utilities

config/
├── halaCoins.json                 # Coin metadata + addresses (auto-updated)
├── deployedContracts.json          # Contract addresses (auto-updated)
└── types.ts                       # TypeScript type definitions

.env                                # Only for PRIVATE_KEY and API keys (DO NOT COMMIT)
```

## Configuration Files

### `config/halaCoins.json`
Stores all Initial Hala Coins with:
- Symbol, name, decimals
- Compliance reason
- Description
- **Permissible flag** (maps to contract's `verified` field)
- Deployed addresses (moonbase)

### `config/deployedContracts.json`
Stores all deployed contract addresses:
- AMM: Factory, Router, WETH
- Main: ShariaCompliance, ShariaSwap, ShariaDCA
- Metadata: deployment date, deployer, block number

## Coin Management (Contract-Driven)

### Contract is Source of Truth

The ShariaCompliance contract manages coin registrations. When you add/remove coins:

**1. Owner calls contract functions:**
```solidity
// Add coin
shariaCompliance.registerShariaCoin("NEW", "New Token", "NEW", "Compliance reason");

// Remove coin
shariaCompliance.removeShariaCoin("OLD");

// Update status
shariaCompliance.updateComplianceStatus("TOKEN", false, "Reason for removal");
```

**2. Sync JSON from contract:**

**Manual Sync:**
```bash
npm run sync:coins
```
- Reads all coins from contract
- Updates JSON to match contract state
- Adds new coins, marks removed ones as `permissible: false`

**Auto Sync (Continuous):**
```bash
npm run listen:events
```
- Listens to `CoinRegistered`, `CoinRemoved`, `CoinUpdated` events
- Automatically updates JSON when events occur
- Runs continuously (Press Ctrl+C to stop)

### Idempotent Deployment

All deployment scripts are idempotent and safe to re-run:
- ✅ Checks if contracts already exist on-chain
- ✅ Skips existing contracts
- ✅ Only deploys/registers new items
- ✅ No errors on re-runs

Running `npm run deploy:testnet` multiple times is safe - it will only deploy what's missing.

### Permissible Flag

- `permissible: true` - Coin is registered and verified in contract
- `permissible: false` - Coin removed from contract (kept in JSON for history)

## Benefits

✅ **No duplicate deployments** - AMM deployed once, reused
✅ **Flexible** - Update main contracts without redeploying AMM
✅ **Frontend ready** - JSON files can be imported directly
✅ **Contract-driven** - Add/remove coins on-chain, JSON syncs automatically
✅ **Idempotent** - Safe to run deployment scripts multiple times
✅ **Version controlled** - JSON files tracked in git (addresses updated after deployment)

## Redeploying

### To Redeploy Specific Components

**Redeploy tokens only:**
```bash
# Reset token addresses in deployedContracts.json (set tokens to {}), then:
npm run deploy:tokens
```

**Redeploy AMM core only:**
```bash
# Reset AMM addresses in deployedContracts.json (set to null), then:
npm run deploy:amm-core
```

**Redeploy pairs only:**
```bash
# Reset pair addresses in deployedContracts.json (set pairs to {}), then:
npm run deploy:pairs
```

**Redeploy main contracts only:**
```bash
# Reset main contract addresses in deployedContracts.json (set to null), then:
npm run deploy:core
```

### To Redeploy Everything
```bash
# Reset addresses in JSON files, then:
npm run deploy:testnet
```

## Adding New Coins

### Method 1: On-Chain (Recommended)
1. Owner calls `registerShariaCoin()` on contract
2. Run `npm run sync:coins` (or use listener)
3. JSON automatically updated

### Method 2: Via JSON First
1. Add coin to `halaCoins.json`
2. Deploy token: `npm run deploy:tokens` (deploys new token)
3. Create pairs: `npm run deploy:pairs` (creates pairs for new token)
4. Run `npm run deploy:core` (registers new coin in ShariaCompliance)
5. Add liquidity: `npx hardhat run scripts/addLiquidity.ts --network moonbase` (if needed)

## Troubleshooting

**Error: "AMM addresses not found in deployedContracts.json"**
- Run `npm run deploy:amm-core` first

**Error: "Contract not found"**
- Check `deployedContracts.json` has valid addresses
- Redeploy if needed: `npm run deploy:core`

**Want fresh AMM?**
- Reset AMM addresses in `deployedContracts.json` to `null`
- Run `npm run deploy:amm-core` again

**Want fresh tokens?**
- Reset token addresses in `deployedContracts.json` (set tokens to {})
- Run `npm run deploy:tokens` again

**Coins not syncing?**
- Run `npm run sync:coins` manually
- Check contract address in `deployedContracts.json`

**Lost your JSON files?**
- Run `npm run deploy:testnet` - it will deploy everything fresh
- Or restore from git history

## Verification

After deployment, verify all contracts:

```bash
# Make sure ETHERSCAN_API_KEY is set in .env
npm run verify:all
```

This verifies:
- All tokens
- AMM contracts (Factory, Router)
- Main contracts (ShariaCompliance, ShariaSwap, ShariaDCA)
- All liquidity pairs

The script compiles contracts first and checks verification status, so it's safe to run multiple times.
