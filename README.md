# Tayeb - Sharia Compliant Platform

A decentralized platform built with Ink! smart contracts for Sharia-compliant cryptocurrency investment.

## Features

### 1. Sharia-Compliant Coin Registry
- Register and manage Sharia-compliant cryptocurrencies
- Verified coin status with compliance documentation
- Admin-controlled registry to ensure only compliant coins are listed

### 2. Dollar Cost Averaging (DCA)
- Automated DCA into Sharia-compliant coins
- Configurable intervals and amounts
- Set total intervals or unlimited DCA

### 3. Custom ETF Creation
- Create your own Sharia-compliant ETFs
- Define allocations across multiple Sharia-compliant coins
- Allocations must sum to 100%

### 4. Template ETFs
- Pre-built Sharia-compliant ETF templates:
  - **Major Sharia Coins ETF**: Diversified portfolio of major cryptocurrencies
  - **Sharia Stablecoins ETF**: Portfolio focused on Sharia-compliant stablecoins
  - **DeFi Sharia ETF**: Decentralized finance tokens complying with Sharia principles
- Subscribe to template ETFs instantly

## Smart Contract Functions

### Coin Management (Admin Only)
- `register_sharia_coin(coin_id, name, symbol, compliance_reason)` - Register a new Sharia-compliant coin
- `remove_sharia_coin(coin_id)` - Remove a coin from registry
- `get_sharia_coins()` - Get all registered Sharia-compliant coins
- `is_sharia_compliant(coin_id)` - Check if a coin is Sharia compliant

### ETF Management
- `create_etf(name, description, allocations)` - Create a custom ETF
- `subscribe_to_template_etf(template_etf_id)` - Subscribe to a template ETF
- `get_etf(etf_id)` - Get ETF details
- `get_template_etfs()` - Get all available template ETFs
- `get_user_etfs(user)` - Get all ETFs owned by a user

### DCA Orders
- `create_dca_order(coin_id, amount_per_interval, interval_blocks, total_intervals)` - Create a DCA order
- `execute_dca_order(order_id)` - Execute a DCA order (anyone can call when conditions are met)
- `cancel_dca_order(order_id)` - Cancel your DCA order
- `get_dca_order(order_id)` - Get DCA order details
- `get_user_dca_orders(user)` - Get all DCA orders for a user

### Balance Management
- `deposit()` - Deposit funds to the platform (payable)
- `get_balance(user)` - Get user balance

## Building

```bash
cd contract
cargo contract build
```

## Testing

```bash
cd contract
cargo test
```

## Deployment & Interaction

### Prerequisites

1. **Install cargo-contract** (if not already installed):
```bash
cargo install cargo-contract --force
```

2. **Set up a Substrate node** with `pallet-contracts` enabled, or use:
   - **Contracts UI**: https://contracts-ui.substrate.io/ (for testnets)
   - **Local node**: Follow [Ink! Getting Started Guide](https://use.ink/getting-started/setup)

### Deploying the Contract

#### Option 1: Using cargo-contract (CLI)

```bash
cd contract

# Upload code (returns code hash)
cargo contract upload --suri //Alice --url ws://127.0.0.1:9944

# Instantiate contract
cargo contract instantiate \
  --constructor new \
  --suri //Alice \
  --url ws://127.0.0.1:9944 \
  --gas 100000000000 \
  --proof-size 100000000000
```

#### Option 2: Using Contracts UI (Recommended for Web UI)

The dedicated Contracts UI works with any Substrate chain that supports WASM contracts (e.g., Rococo, Shibuya, or your local node).

1. Visit **https://contracts-ui.substrate.io/**
2. Connect your wallet or import account
3. Select or enter your chain's RPC endpoint (e.g., `ws://127.0.0.1:9944` for local node)
4. Click **Upload Contract**
5. Upload the `.contract` file: `contract/target/ink/tayeb_contract.contract`
6. Click **Next** → **Instantiate**
7. Select `new()` constructor
8. Set initial endowment (e.g., 0.1 DOT) and gas limits
9. Click **Submit** and sign the transaction

**Supported Networks:**
- Local development node (`ws://127.0.0.1:9944`)
- Rococo Testnet
- Shibuya (Astar testnet)
- Any chain with `pallet-contracts` enabled


### Interacting with the Contract

#### Using cargo-contract CLI

Replace `<CONTRACT_ADDRESS>` with your deployed contract address.

```bash
# Register a Sharia-compliant coin (as owner)
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message register_sharia_coin \
  --args "BTC" "Bitcoin" "BTC" "Digital gold" \
  --suri //Alice \
  --url ws://127.0.0.1:9944

# Get all Sharia coins (query - no transaction)
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message get_sharia_coins \
  --suri //Bob \
  --url ws://127.0.0.1:9944 \
  --dry-run

# Create a DCA order
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message create_dca_order \
  --args "BTC" 1000000000 100 12 \
  --suri //Bob \
  --url ws://127.0.0.1:9944

# Create an ETF
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message create_etf \
  --args "My ETF" "Description" '(vec![("BTC".to_string(), 60), ("ETH".to_string(), 40)])' \
  --suri //Bob \
  --url ws://127.0.0.1:9944

# Get template ETFs (query)
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message get_template_etfs \
  --suri //Bob \
  --url ws://127.0.0.1:9944 \
  --dry-run
```

#### Using Contracts UI (Web Interface)

1. Go to **https://contracts-ui.substrate.io/**
2. Connect your account
3. Find your deployed contract in the contracts list
4. Click on the contract name
5. Click on any message (function) to call it
6. Fill in parameters and click **Execute**
7. Sign the transaction with your wallet

### Example Workflow

1. **Deploy Contract** (as Alice - becomes owner)
```bash
cargo contract instantiate --constructor new --suri //Alice
```

2. **Register Coins** (as Alice - owner only)
```bash
cargo contract call --contract <ADDRESS> --message register_sharia_coin \
  --args "BTC" "Bitcoin" "BTC" "Digital gold" --suri //Alice

cargo contract call --contract <ADDRESS> --message register_sharia_coin \
  --args "ETH" "Ethereum" "ETH" "Utility token" --suri //Alice
```

3. **User Creates DCA Order** (as Bob)
```bash
cargo contract call --contract <ADDRESS> --message create_dca_order \
  --args "BTC" 1000000000 100 12 --suri //Bob
```

4. **Query Data** (no transaction needed)
```bash
cargo contract call --contract <ADDRESS> --message get_sharia_coins --dry-run
cargo contract call --contract <ADDRESS> --message get_template_etfs --dry-run
```

### Contract Artifacts Location

After building, find your contract artifacts in:
```
contract/target/ink/
  - tayeb_contract.contract  (code + metadata - use for deployment)
  - tayeb_contract.json      (metadata/ABI for frontend)
  - tayeb_contract.polkavm   (Polkavm binary)
```

### Gas & Fees

- **Upload code**: ~5-10 DOT (testnet) / varies by chain
- **Instantiate**: ~2-5 DOT (testnet) / varies by chain  
- **Transaction calls**: ~0.001-0.01 DOT (testnet) / varies by chain
- Adjust gas limits based on function complexity

### Troubleshooting

- **Connection issues**: Ensure your Substrate node is running
- **Account issues**: Make sure you have sufficient balance for gas
- **Contract not found**: Verify contract address and chain endpoint
- **Permission denied**: Check if you're the owner for admin functions

## Note

This contract is built with Ink! v6.0.0-alpha.4. Some storage patterns may need adjustments based on the final Ink! v6 release requirements.
