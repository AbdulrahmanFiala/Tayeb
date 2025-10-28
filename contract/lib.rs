#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub mod types;

#[ink::contract]
mod sharia_compliant_platform {
    use ink::prelude::vec::Vec;
    use ink::prelude::string::String;
    use ink::storage::Mapping;
    use crate::types::{ShariaCoin, Error, Result};

    /// Represents an ETF (Exchange Traded Fund)
    #[derive(Debug, Clone, PartialEq, parity_scale_codec::Encode, parity_scale_codec::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ETF {
        pub id: u32,
        pub name: String,
        pub description: String,
        pub creator: ink::primitives::H160,
        pub allocations: Vec<(String, u8)>,
        pub is_template: bool,
        pub total_value: Balance,
    }

    /// Represents a DCA (Dollar Cost Averaging) order
    #[derive(Debug, Clone, parity_scale_codec::Encode, parity_scale_codec::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct DCAOrder {
        pub id: u32,
        pub owner: ink::primitives::H160,
        pub coin_id: String,
        pub amount_per_interval: Balance,
        pub interval_blocks: u32,
        pub intervals_completed: u32,
        pub total_intervals: u32,
        pub next_execution_block: u32,
        pub start_timestamp: u64,
        pub is_active: bool,
    }

    /// Main contract storage
    #[ink(storage)]
    pub struct ShariaPlatform {
        pub owner: ink::primitives::H160,
        pub sharia_coins: Mapping<String, ShariaCoin>,
        pub etfs: Mapping<u32, ETF>,
        pub template_etfs: Mapping<u32, ETF>,
        pub next_etf_id: u32,
        pub user_etf_subscriptions: Mapping<ink::primitives::H160, Vec<u32>>,
        pub dca_orders: Mapping<u32, DCAOrder>,
        pub user_dca_orders: Mapping<ink::primitives::H160, Vec<u32>>,
        pub next_dca_order_id: u32,
        pub balances: Mapping<ink::primitives::H160, Balance>,
        pub coin_ids: Vec<String>,
    }

    impl ShariaPlatform {
        // ============================================================================
        // CONSTRUCTOR & INITIALIZATION
        // ============================================================================

        #[ink(constructor)]
        pub fn new() -> Self {
            let owner = Self::env().caller();
            let mut instance = Self {
                owner,
                sharia_coins: Mapping::new(),
                coin_ids: Vec::new(),
                etfs: Mapping::new(),
                template_etfs: Mapping::new(),
                next_etf_id: 1,
                user_etf_subscriptions: Mapping::new(),
                dca_orders: Mapping::new(),
                user_dca_orders: Mapping::new(),
                next_dca_order_id: 1,
                balances: Mapping::new(),
            };
            instance.initialize_template_etfs();
            instance
        }

        fn initialize_template_etfs(&mut self) {
            let etf1 = ETF {
                id: 1,
                name: String::from("Major Sharia Coins ETF"),
                description: String::from("Diversified portfolio of major Sharia-compliant cryptocurrencies"),
                creator: self.owner,
                allocations: vec![
                    (String::from("BTC"), 40),
                    (String::from("ETH"), 30),
                    (String::from("BNB"), 15),
                    (String::from("XRP"), 15),
                ],
                is_template: true,
                total_value: 0,
            };
            self.template_etfs.insert(1, &etf1);

            let etf2 = ETF {
                id: 2,
                name: String::from("Sharia Stablecoins ETF"),
                description: String::from("Portfolio focused on Sharia-compliant stablecoins"),
                creator: self.owner,
                allocations: vec![
                    (String::from("USDT"), 50),
                    (String::from("USDC"), 30),
                    (String::from("DAI"), 20),
                ],
                is_template: true,
                total_value: 0,
            };
            self.template_etfs.insert(2, &etf2);

            let etf3 = ETF {
                id: 3,
                name: String::from("DeFi Sharia ETF"),
                description: String::from("Decentralized finance tokens that comply with Sharia principles"),
                creator: self.owner,
                allocations: vec![
                    (String::from("ETH"), 50),
                    (String::from("BNB"), 25),
                    (String::from("ADA"), 15),
                    (String::from("DOT"), 10),
                ],
                is_template: true,
                total_value: 0,
            };
            self.template_etfs.insert(3, &etf3);
        }

        fn ensure_owner(&self) -> Result<()> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }
            Ok(())
        }

        // ============================================================================
        // COIN MANAGEMENT
        // ============================================================================

        #[ink(message)]
        pub fn register_sharia_coin(
            &mut self,
            coin_id: String,
            name: String,
            symbol: String,
            compliance_reason: String,
        ) -> Result<()> {
            self.ensure_owner()?;
            let coin = ShariaCoin {
                id: coin_id.clone(),
                name,
                symbol,
                verified: true,
                compliance_reason,
            };
            self.sharia_coins.insert(coin_id.clone(), &coin);
            if !self.coin_ids.contains(&coin_id) {
                self.coin_ids.push(coin_id);
            }
            Ok(())
        }

        #[ink(message)]
        pub fn remove_sharia_coin(&mut self, coin_id: String) -> Result<()> {
            self.ensure_owner()?;
            if self.sharia_coins.contains(&coin_id) {
                self.sharia_coins.remove(&coin_id);
                if let Some(pos) = self.coin_ids.iter().position(|x| x == &coin_id) {
                    self.coin_ids.remove(pos);
                }
                Ok(())
            } else {
                Err(Error::CoinNotFound)
            }
        }

        #[ink(message)]
        pub fn get_sharia_coins(&self) -> Vec<ShariaCoin> {
            let mut coins = Vec::new();
            for coin_id in &self.coin_ids {
                if let Some(coin) = self.sharia_coins.get(coin_id) {
                    coins.push(coin);
                }
            }
            coins
        }

        #[ink(message)]
        pub fn is_sharia_compliant(&self, coin_id: String) -> bool {
            self.sharia_coins.get(&coin_id)
                .map(|coin| coin.verified)
                .unwrap_or(false)
        }

        // ============================================================================
        // ETF MANAGEMENT
        // ============================================================================

        #[ink(message)]
        pub fn create_etf(
            &mut self,
            name: String,
            description: String,
            allocations: Vec<(String, u8)>,
        ) -> Result<u32> {
            let total: u16 = allocations.iter().map(|(_, p)| *p as u16).sum();
            if total != 100 {
                return Err(Error::InvalidAllocation);
            }
            for (coin_id, _) in &allocations {
                if !self.is_sharia_compliant(coin_id.clone()) {
                    return Err(Error::InvalidCoinInAllocation);
                }
            }
            let creator = self.env().caller();
            let etf_id = self.next_etf_id;
            self.next_etf_id += 1;
            let etf = ETF {
                id: etf_id,
                name,
                description,
                creator,
                allocations,
                is_template: false,
                total_value: 0,
            };
            self.etfs.insert(etf_id, &etf);
            let mut user_etfs = self.user_etf_subscriptions.get(creator).unwrap_or_default();
            user_etfs.push(etf_id);
            self.user_etf_subscriptions.insert(creator, &user_etfs);
            Ok(etf_id)
        }

        #[ink(message)]
        pub fn create_template_etf(
            &mut self,
            name: String,
            description: String,
            allocations: Vec<(String, u8)>,
        ) -> Result<u32> {
            self.ensure_owner()?;
            let total: u16 = allocations.iter().map(|(_, p)| *p as u16).sum();
            if total != 100 {
                return Err(Error::InvalidAllocation);
            }
            for (coin_id, _) in &allocations {
                if !self.is_sharia_compliant(coin_id.clone()) {
                    return Err(Error::InvalidCoinInAllocation);
                }
            }
            let template_id = self.next_etf_id;
            self.next_etf_id += 1;
            let template = ETF {
                id: template_id,
                name,
                description,
                creator: self.owner,
                allocations,
                is_template: true,
                total_value: 0,
            };
            self.template_etfs.insert(template_id, &template);
            Ok(template_id)
        }

        #[ink(message)]
        pub fn subscribe_to_template_etf(&mut self, template_etf_id: u32, investment_amount: Balance) -> Result<u32> {
            let template = self.template_etfs.get(template_etf_id).ok_or(Error::ETFNotFound)?;
            let creator = self.env().caller();
            let user_balance = self.balances.get(creator).unwrap_or(0);
            if user_balance < investment_amount {
                return Err(Error::InsufficientBalance);
            }
            let etf_id = self.next_etf_id;
            self.next_etf_id += 1;
            let etf = ETF {
                id: etf_id,
                name: template.name.clone(),
                description: template.description.clone(),
                creator,
                allocations: template.allocations.clone(),
                is_template: false,
                total_value: investment_amount,
            };
            if investment_amount > 0 {
                self.balances.insert(creator, &(user_balance - investment_amount));
            }
            self.etfs.insert(etf_id, &etf);
            let mut user_etfs = self.user_etf_subscriptions.get(creator).unwrap_or_default();
            user_etfs.push(etf_id);
            self.user_etf_subscriptions.insert(creator, &user_etfs);
            Ok(etf_id)
        }

        #[ink(message)]
        pub fn get_etf(&self, etf_id: u32) -> Option<ETF> {
            self.etfs.get(etf_id)
        }

        #[ink(message)]
        pub fn get_template_etfs(&self) -> Vec<ETF> {
            let mut templates = Vec::new();
            for id in 1..=10 {
                if let Some(etf) = self.template_etfs.get(id) {
                    templates.push(etf);
                }
            }
            templates
        }

        #[ink(message)]
        pub fn get_user_etfs(&self, user: ink::primitives::H160) -> Vec<ETF> {
            let order_ids = self.user_etf_subscriptions.get(user).unwrap_or_default();
            let mut etfs = Vec::new();
            for id in order_ids {
                if let Some(etf) = self.etfs.get(id) {
                    etfs.push(etf);
                }
            }
            etfs
        }

        #[ink(message)]
        pub fn invest_in_etf(&mut self, etf_id: u32, amount: Balance) -> Result<()> {
            let caller = self.env().caller();
            let mut etf = self.etfs.get(etf_id).ok_or(Error::ETFNotFound)?;
            if etf.creator != caller {
                return Err(Error::ETFNotOwnedByUser);
            }
            let user_balance = self.balances.get(caller).unwrap_or(0);
            if user_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(caller, &(user_balance - amount));
            etf.total_value += amount;
            self.etfs.insert(etf_id, &etf);
            Ok(())
        }

        // ============================================================================
        // DCA (DOLLAR COST AVERAGING)
        // ============================================================================

        #[ink(message)]
        pub fn create_dca_order(
            &mut self,
            coin_id: String,
            amount_per_interval: Balance,
            interval_blocks: u32,
            total_intervals: u32,
            start_timestamp: u64,
        ) -> Result<u32> {
            if !self.is_sharia_compliant(coin_id.clone()) {
                return Err(Error::NotShariaCompliant);
            }
            let current_timestamp = self.env().block_timestamp();
            if start_timestamp < current_timestamp {
                return Err(Error::InvalidStartTime);
            }
            let caller = self.env().caller();
            let current_block = self.env().block_number();
            let order_id = self.next_dca_order_id;
            self.next_dca_order_id += 1;
            let order = DCAOrder {
                id: order_id,
                owner: caller,
                coin_id,
                amount_per_interval,
                interval_blocks,
                intervals_completed: 0,
                total_intervals,
                next_execution_block: current_block + interval_blocks,
                start_timestamp,
                is_active: true,
            };
            self.dca_orders.insert(order_id, &order);
            let mut user_orders = self.user_dca_orders.get(caller).unwrap_or_default();
            user_orders.push(order_id);
            self.user_dca_orders.insert(caller, &user_orders);
            Ok(order_id)
        }

        #[ink(message, payable)]
        pub fn execute_dca_order(&mut self, order_id: u32) -> Result<()> {
            let mut order = self.dca_orders.get(order_id).ok_or(Error::DCAOrderNotFound)?;
            if !order.is_active {
                return Err(Error::OrderInactive);
            }
            let current_timestamp = self.env().block_timestamp();
            if current_timestamp < order.start_timestamp {
                return Err(Error::OrderNotReady);
            }
            let current_block = self.env().block_number();
            if current_block < order.next_execution_block {
                return Err(Error::OrderNotReady);
            }
            let user_balance = self.balances.get(order.owner).unwrap_or(0);
            if user_balance < order.amount_per_interval {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(order.owner, &(user_balance - order.amount_per_interval));
            order.intervals_completed += 1;
            order.next_execution_block = current_block + order.interval_blocks;
            if order.total_intervals > 0 && order.intervals_completed >= order.total_intervals {
                order.is_active = false;
            }
            self.dca_orders.insert(order_id, &order);
            Ok(())
        }

        #[ink(message)]
        pub fn cancel_dca_order(&mut self, order_id: u32) -> Result<()> {
            let mut order = self.dca_orders.get(order_id).ok_or(Error::DCAOrderNotFound)?;
            let caller = self.env().caller();
            if order.owner != caller {
                return Err(Error::Unauthorized);
            }
            order.is_active = false;
            self.dca_orders.insert(order_id, &order);
            Ok(())
        }

        #[ink(message)]
        pub fn get_dca_order(&self, order_id: u32) -> Option<DCAOrder> {
            self.dca_orders.get(order_id)
        }

        #[ink(message)]
        pub fn get_user_dca_orders(&self, user: ink::primitives::H160) -> Vec<DCAOrder> {
            let order_ids = self.user_dca_orders.get(user).unwrap_or_default();
            let mut orders = Vec::new();
            for id in order_ids {
                if let Some(order) = self.dca_orders.get(id) {
                    orders.push(order);
                }
            }
            orders
        }

        // ============================================================================
        // INVESTMENT OPERATIONS
        // ============================================================================

        #[ink(message)]
        pub fn invest_once(&mut self, coin_id: String, amount: Balance) -> Result<()> {
            if !self.is_sharia_compliant(coin_id.clone()) {
                return Err(Error::NotShariaCompliant);
            }
            let caller = self.env().caller();
            let user_balance = self.balances.get(caller).unwrap_or(0);
            if user_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(caller, &(user_balance - amount));
            Ok(())
        }

        #[ink(message, payable)]
        pub fn deposit(&mut self) -> Result<()> {
            let caller = self.env().caller();
            let amount = self.env().transferred_value();
            let current_balance = self.balances.get(caller).unwrap_or(0);
            let amount_u128: u128 = amount.try_into().unwrap_or(0);
            self.balances.insert(caller, &(current_balance + amount_u128));
            Ok(())
        }

        #[ink(message)]
        pub fn get_balance(&self, user: ink::primitives::H160) -> Balance {
            self.balances.get(user).unwrap_or(0)
        }
    }

    impl Default for ShariaPlatform {
        fn default() -> Self {
            Self::new()
        }
    }
}
