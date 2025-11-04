# Deployment Workflow

## Overview

The deployment is split into two parts:
1. **AMM Infrastructure** (deployed once) - Factory, Router, Mock Tokens, Pairs
2. **Main Contracts** (can be redeployed) - ShariaCompliance, ShariaSwap, ShariaDCA

All addresses are automatically saved to `.env` file for reuse.

## Quick Start

### Option 1: Smart Deployment (Recommended)
```bash
npm run deploy:testnet
```
This automatically:
- Checks if AMM exists in `.env`
- Deploys AMM if needed
- Deploys main contracts
- Saves all addresses to `.env`

### Option 2: Manual Step-by-Step

**1. Deploy AMM (once)**
```bash
npm run deploy:amm
# or
npx hardhat run scripts/deploy-amm.ts --network moonbase
```
This deploys:
- SimpleFactory
- SimpleRouter
- MockUSDT, MockUSDC, MockDAI
- Creates pairs
- Mints initial tokens
- **Saves addresses to .env**

**2. Deploy Main Contracts**
```bash
npm run deploy:contracts
# or
npx hardhat run scripts/deploy-contracts.ts --network moonbase
```
This:
- Reads AMM addresses from `.env`
- Deploys ShariaCompliance, ShariaSwap, ShariaDCA
- Registers tokens
- **Saves addresses to .env**

**3. Add Liquidity**
```bash
npx hardhat run scripts/addLiquidity.ts --network moonbase
```
This:
- Reads addresses from `.env` (no manual editing needed!)
- Adds liquidity to all pairs

## Files Structure

```
scripts/
├── deploy.ts              # Smart wrapper (checks .env, runs appropriate scripts)
├── deploy-amm.ts          # Deploy AMM infrastructure (run once)
├── deploy-contracts.ts    # Deploy main contracts (can run multiple times)
├── addLiquidity.ts        # Add liquidity (reads from .env)
└── removeLiquidity.ts     # Remove liquidity

.env                       # Auto-populated with addresses (DO NOT COMMIT)
```

## Environment Variables

The following variables are automatically saved to `.env`:

### AMM Infrastructure
- `FACTORY_ADDRESS`
- `ROUTER_ADDRESS`
- `MOCK_USDT_ADDRESS`
- `MOCK_USDC_ADDRESS`
- `MOCK_DAI_ADDRESS`
- `WETH_ADDRESS`
- `WETH_PAIR_USDT_ADDRESS`
- `WETH_PAIR_USDC_ADDRESS`
- `WETH_PAIR_DAI_ADDRESS`

### Main Contracts
- `SHARIA_COMPLIANCE_ADDRESS`
- `SHARIA_SWAP_ADDRESS`
- `SHARIA_DCA_ADDRESS`

## Benefits

✅ **No duplicate deployments** - AMM deployed once, reused
✅ **Flexible** - Update main contracts without redeploying AMM
✅ **Easy** - All addresses in `.env`, no manual copying
✅ **Safe** - Scripts check for required addresses before running

## Redeploying

### To Redeploy AMM
```bash
# Remove AMM addresses from .env, then:
npm run deploy:amm
```

### To Redeploy Main Contracts Only
```bash
# Just run (reads existing AMM from .env):
npm run deploy:contracts
```

### To Redeploy Everything
```bash
# Remove all addresses from .env, then:
npm run deploy:testnet
```

## Troubleshooting

**Error: "AMM addresses not found in .env"**
- Run `npm run deploy:amm` first

**Want fresh AMM?**
- Remove AMM addresses from `.env`
- Run `npm run deploy:amm` again

**Lost your .env file?**
- Run `npm run deploy:testnet` - it will deploy everything fresh
