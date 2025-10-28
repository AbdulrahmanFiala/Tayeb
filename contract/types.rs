use ink::prelude::string::String;

/// Represents a Sharia-compliant coin
#[derive(Debug, Clone, PartialEq, parity_scale_codec::Encode, parity_scale_codec::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ShariaCoin {
    /// Coin identifier (e.g., address or ticker)
    pub id: String,
    /// Coin name
    pub name: String,
    /// Coin symbol/ticker
    pub symbol: String,
    /// Verification status by Sharia board
    pub verified: bool,
    /// Reason for compliance status
    pub compliance_reason: String,
}

/// Custom errors
#[derive(Debug, PartialEq, Eq, parity_scale_codec::Encode, parity_scale_codec::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Error {
    /// Coin not found in registry
    CoinNotFound,
    /// Coin is not Sharia compliant
    NotShariaCompliant,
    /// ETF not found
    ETFNotFound,
    /// DCA order not found
    DCAOrderNotFound,
    /// Insufficient balance
    InsufficientBalance,
    /// Unauthorized access
    Unauthorized,
    /// Invalid allocation percentage (must sum to 100)
    InvalidAllocation,
    /// ETF allocation coin not found
    InvalidCoinInAllocation,
    /// Order not ready for execution
    OrderNotReady,
    /// Order is not active
    OrderInactive,
    /// Start time is in the past
    InvalidStartTime,
    /// ETF not owned by user
    ETFNotOwnedByUser,
}

pub type Result<T> = core::result::Result<T, Error>;
