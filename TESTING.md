# Testing Guide for Tayeb Sharia Platform

## ✅ Quick Start Testing

### 1. Run All Tests

```bash
cd contract
cargo test
```

Expected output: **2 tests passed** ✅

### 2. Run Specific Tests

```bash
# Test coin registration
cargo test test_register_sharia_coin

# Test DCA orders
cargo test test_create_dca_order
```

### 3. Run Tests with Output

```bash
cargo test -- --nocapture
```

## Available Tests

1. **test_register_sharia_coin** - Tests registering a Sharia-compliant coin
2. **test_create_dca_order** - Tests creating a DCA order

## Check Compilation

```bash
cd contract
cargo check
```

## Build the Contract

```bash
cd contract
cargo build --release
```

## Build for Deployment (requires cargo-contract)

```bash
# Install cargo-contract
cargo install cargo-contract --force

# Build the contract bundle
cd contract
cargo contract build
```

This generates:
- `target/ink/tayeb_contract.contract` - Contract bundle
- `target/ink/tayeb_contract.wasm` - WASM binary  
- `target/ink/metadata.json` - Contract metadata

## Next Steps for Full Testing

1. Set up a local Substrate node with `pallet-contracts`
2. Deploy the contract using `cargo contract instantiate`
3. Interact via Polkadot.js Apps or command line
4. Test all contract functions end-to-end

## Current Status

✅ Contract compiles successfully
✅ All unit tests pass
✅ Ready for deployment testing
