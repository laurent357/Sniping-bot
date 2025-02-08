pub mod solana_interaction;
pub mod transaction_execution;
pub mod security;
pub mod ipc;
pub mod config;
pub mod sniping_executor;

use log::LevelFilter;
use std::error::Error;

/// Initialise le logging
pub fn init_logging() -> Result<(), Box<dyn Error>> {
    env_logger::Builder::new()
        .filter_level(LevelFilter::Info)
        .format_timestamp_millis()
        .init();
    Ok(())
}

/// Exporte les types principaux
pub use solana_interaction::SolanaInteraction;
pub use transaction_execution::TransactionExecutor;
pub use security::SecurityManager;
pub use ipc::{IPCServer, IPCMessage};
pub use config::{WalletConfig, WalletType};
pub use sniping_executor::{SnipingExecutor, SnipingConfig, SnipingError};

// Re-export des types Solana couramment utilisés
pub use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    transaction::Transaction,
    instruction::Instruction,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_logging() {
        assert!(init_logging().is_ok());
    }
} 