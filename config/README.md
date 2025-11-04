# Configuration Files

This directory contains centralized configuration files for the Tayeb platform.

## Files

### `halaCoins.json`
Single source of truth for all Initial Hala Coins configuration. This file:
- Defines all 16 Initial Hala Coins with metadata
- Stores deployed token contract addresses (updated by `deploy-amm.ts`)
- Can be imported by both backend scripts and frontend

### `deployedContracts.json`
Stores all deployed contract addresses (AMM + Main contracts). This file:
- Contains Factory, Router, WETH addresses (updated by `deploy-amm.ts`)
- Contains ShariaCompliance, ShariaSwap, ShariaDCA addresses (updated by `deploy-contracts.ts`)
- Includes deployment metadata (date, deployer, block number)
- Can be imported by frontend for connecting to contracts

**Structure:**
```json
{
  "coins": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "decimals": 8,
      "complianceReason": "Sharia compliance explanation",
      "description": "User-friendly description",
      "permissible": true, // Maps to contract's 'verified' field
      "addresses": {
        "moonbase": "0x..." // Automatically updated on deployment
      }
    }
  ],
  "stablecoins": ["USDT", "USDC"],
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "ISO timestamp",
    "network": "moonbase"
  }
}
```

### `types.ts`
TypeScript type definitions and helper functions:
- `HalaCoin` interface
- `HalaCoinsConfig` interface
- Helper functions: `getNonStablecoins()`, `getStablecoins()`, `getCoinBySymbol()`, etc.

## Usage

### Backend Scripts (TypeScript)

```typescript
import halaCoinsConfig from "../config/halaCoins.json";
import { HalaCoinsConfig, getNonStablecoins } from "../config/types";

const config = halaCoinsConfig as HalaCoinsConfig;
const nonStablecoins = getNonStablecoins(config);

// Deploy tokens
for (const coin of config.coins) {
  console.log(`Deploying ${coin.symbol} with ${coin.decimals} decimals`);
}
```

### Frontend (React/Vue/etc)

```javascript
import halaCoins from './config/halaCoins.json';
import deployedContracts from './config/deployedContracts.json';

// Display token list
halaCoins.coins.forEach(coin => {
  console.log(`${coin.name} (${coin.symbol})`);
  console.log(`Address: ${coin.addresses.moonbase}`);
  console.log(`Compliance: ${coin.complianceReason}`);
});

// Connect to contracts
const shariaSwap = new ethers.Contract(
  deployedContracts.main.shariaSwap,
  shariaSwapABI,
  provider
);
```
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

### Idempotent Deployment

Running `npm run deploy:contracts` multiple times is safe:
- Checks if coins already registered
- Skips existing coins
- Only registers new ones

### Permissible Flag

- `permissible: true` - Coin is registered and verified in contract
- `permissible: false` - Coin removed from contract (kept in JSON for history)

## Scripts Using This Config

- `scripts/deploy-amm.ts` - Reads `halaCoins.json`, deploys tokens, updates both JSON files
- `scripts/addLiquidity.ts` - Reads `halaCoins.json` for liquidity amounts
- `scripts/deploy-contracts.ts` - Reads `halaCoins.json` for token registration (idempotent), updates `deployedContracts.json`
- `scripts/sync-coins-from-contract.ts` - Syncs JSON from contract state (manual sync)
- `scripts/listen-coin-events.ts` - Listens to contract events and auto-syncs JSON (continuous)
- Frontend - Can import both JSON files for contract addresses and token metadata
