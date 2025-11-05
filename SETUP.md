# Tayeb Setup Guide - Moonbase Alpha Testnet

## 🚀 Get Started in 5 Minutes

Deploy the Sharia-compliant DeFi platform on Moonbase Alpha testnet with custom AMM.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Then edit `.env` and add your private key:

```bash
# Open in your editor
nano .env
# or
code .env
```

**How to get your private key from MetaMask:**
1. Open MetaMask
2. Click the three dots menu
3. Select "Account details"
4. Click "Export Private Key"
5. Enter your password
6. Copy the private key (starts with `0x`)

⚠️ **IMPORTANT**: Never commit your `.env` file or share your private key!

### 3. Get Testnet Tokens

Visit the Moonbase Alpha faucet to get free DEV tokens:
- **Faucet**: https://faucet.moonbeam.network/
- You'll need DEV tokens for deployment and testing

### 4. Compile Contracts

```bash
npm run compile
```

You should see:
```
✅ Compiled x Solidity files successfully
```

### 5. Run Tests

```bash
npm test
```

You should see:
```
✅ x passing
```

### 6. Deploy to Testnet

```bash
npm run deploy:testnet
```

This will deploy to Moonbase Alpha:

**Core Contracts:**
- ShariaCompliance
- ShariaSwap
- ShariaDCA

**Custom AMM (Automatic):**
- SimpleFactory (creates pairs)
- SimpleRouter (routes swaps)
- SimplePair contracts (liquidity pools)
- MockERC20 tokens for all 16 Initial Hala Coins (BTC, ETH, USDT, USDC, etc.)

The deployment script automatically:
1. Deploys the custom AMM infrastructure
2. Deploys all Initial Hala Coin tokens
3. Creates token pairs (each coin with USDT and USDC = 28 pairs total)
4. Mints mock tokens to deployer
5. Registers all coins from `config/halaCoins.json` in ShariaCompliance
6. Registers token addresses in ShariaSwap and ShariaDCA
7. **Saves all addresses to JSON config files** (frontend-ready)

**All addresses are saved automatically!** Check `config/deployedContracts.json` and `config/halaCoins.json`.

### 7. Add Liquidity (Required)

After deployment, add liquidity to enable swaps:

```bash
npx hardhat run scripts/addLiquidity.ts --network moonbase
```

This will:
- Read addresses from JSON configs automatically (no manual editing!)
- Add liquidity to all pairs (each Initial Hala Coin with USDT and USDC)
- Enable token swaps across all pairs

## 📋 Post-Deployment

✅ **All addresses are automatically saved!** Check `config/deployedContracts.json` and `config/halaCoins.json`.

For detailed information on:
- **Accessing deployed addresses**: See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)
- **Coin management**: See [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md#coin-management-contract-driven) or [config/README.md](./config/README.md)
- **Frontend integration**: See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)

## 🔍 Verify Contracts (Optional)

Verify all contracts on Moonscan:

```bash
# Make sure ETHERSCAN_API_KEY is set in your .env file
npm run verify:all
```

> **Note**: Get your API key from [etherscan.io/mapidashboard](https://etherscan.io/apidashboard) and add it to `.env` as `ETHERSCAN_API_KEY`.

For detailed verification information and troubleshooting, see [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md#verification).


## 🛠️ Development Workflow

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet (when ready)
npm run deploy:testnet --network moonbeam

# Start local node (for testing)
npx hardhat node

# Deploy to local node
npm run deploy --network localhost
```

## 📚 Next Steps

- **Usage Examples**: See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for code examples and integration guides
- **Deployment Details**: See [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) for deployment architecture and advanced topics
- **Configuration**: See [config/README.md](./config/README.md) for config file details
- **Full Documentation**: See [README.md](./README.md) for comprehensive platform overview

## 📚 Resources

- **Moonbeam Docs**: https://docs.moonbeam.network/
- **Hardhat Docs**: https://hardhat.org/docs