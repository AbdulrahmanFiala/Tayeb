# Configuration Files

This directory contains centralized configuration files for the Tayeb platform.

## Files

### `halaCoins.json`
Single source of truth for all Initial Hala Coins configuration. This file:
- Defines all 16 Initial Hala Coins with metadata
- Stores deployed token contract addresses (updated by `deploy-tokens.ts`)
- Can be imported by both backend scripts and frontend

### `deployedContracts.json`
Stores all deployed contract addresses (AMM + Main contracts). This file:
- Contains Factory, Router, WETH addresses (updated by `deploy-amm-core.ts`)
- Contains all token addresses (updated by `deploy-tokens.ts`)
- Contains all pair addresses (updated by `create-pairs.ts`)
- Contains ShariaCompliance, ShariaSwap, ShariaDCA addresses (updated by `deploy-core.ts`)
- Includes deployment metadata (date, deployer, block number)
- Can be imported by frontend for connecting to contracts

## Coin Management Workflow

### Contract is Source of Truth

The ShariaCompliance contract is the authoritative source for coin registrations. When you add/remove coins on-chain:

1. **Owner calls contract functions:**
   - `registerShariaCoin()` - Add new coin
   - `removeShariaCoin()` - Remove coin (sets permissible: false in JSON)
   - `updateComplianceStatus()` - Update coin status

2. **Sync JSON from contract:**
   - Manual: Run `npm run sync:coins`
   - Auto: Run `npm run listen:events` (continuous listener)

