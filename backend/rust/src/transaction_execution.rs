use crate::solana_interaction::SolanaInteraction;
use solana_sdk::{
    instruction::Instruction,
    signature::Signature,
    commitment_config::CommitmentConfig,
    transaction::Transaction,
    compute_budget::ComputeBudgetInstruction,
};
use std::{
    error::Error,
    time::{Duration, Instant},
    sync::Arc,
};
use tokio::sync::Mutex;
use log::{info, warn, error};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TransactionError {
    #[error("Transaction timeout")]
    Timeout,
    #[error("Maximum retries exceeded")]
    MaxRetriesExceeded,
    #[error("Simulation failed: {0}")]
    SimulationFailed(String),
    #[error("Transaction failed: {0}")]
    TransactionFailed(String),
    #[error("Invalid priority level: {0}")]
    InvalidPriority(u64),
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

impl Priority {
    fn to_compute_units(&self) -> u32 {
        match self {
            Priority::Low => 200_000,
            Priority::Medium => 400_000,
            Priority::High => 600_000,
            Priority::Critical => 1_200_000,
        }
    }

    fn to_micro_lamports(&self) -> u64 {
        match self {
            Priority::Low => 1,
            Priority::Medium => 5,
            Priority::High => 10,
            Priority::Critical => 25,
        }
    }
}

pub struct TransactionConfig {
    pub priority: Priority,
    pub max_retries: u32,
    pub retry_delay: Duration,
    pub timeout: Duration,
    pub simulation_required: bool,
}

impl Default for TransactionConfig {
    fn default() -> Self {
        Self {
            priority: Priority::Medium,
            max_retries: 3,
            retry_delay: Duration::from_millis(500),
            timeout: Duration::from_secs(30),
            simulation_required: true,
        }
    }
}

pub struct TransactionExecutor {
    solana: Arc<SolanaInteraction>,
    pending_transactions: Arc<Mutex<Vec<(Transaction, TransactionConfig)>>>,
}

impl TransactionExecutor {
    pub fn new(solana: SolanaInteraction) -> Self {
        Self {
            solana: Arc::new(solana),
            pending_transactions: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn execute_transaction(
        &self,
        mut instructions: Vec<Instruction>,
        config: TransactionConfig,
    ) -> Result<Signature, Box<dyn Error>> {
        let start_time = Instant::now();
        let mut retries = 0;

        // Ajoute les instructions de priorité
        self.add_priority_instructions(&mut instructions, config.priority)?;

        // Simule si nécessaire
        if config.simulation_required {
            self.solana.simulate_transaction(instructions.clone())?;
        }

        loop {
            if start_time.elapsed() > config.timeout {
                return Err(Box::new(TransactionError::Timeout));
            }

            if retries >= config.max_retries {
                return Err(Box::new(TransactionError::MaxRetriesExceeded));
            }

            match self.solana.send_transaction(instructions.clone()) {
                Ok(signature) => {
                    info!(
                        "Transaction exécutée avec succès après {} retry(s): {}",
                        retries, signature
                    );
                    return Ok(signature);
                }
                Err(e) => {
                    warn!(
                        "Échec de la transaction (retry {}/{}): {}",
                        retries + 1,
                        config.max_retries,
                        e
                    );
                    retries += 1;
                    tokio::time::sleep(config.retry_delay).await;
                }
            }
        }
    }

    fn add_priority_instructions(
        &self,
        instructions: &mut Vec<Instruction>,
        priority: Priority,
    ) -> Result<(), TransactionError> {
        // Définit les unités de calcul
        instructions.insert(
            0,
            ComputeBudgetInstruction::set_compute_unit_limit(priority.to_compute_units()),
        );

        // Définit le prix des unités
        instructions.insert(
            1,
            ComputeBudgetInstruction::set_compute_unit_price(priority.to_micro_lamports()),
        );

        Ok(())
    }

    pub async fn execute_batch(
        &self,
        transactions: Vec<(Vec<Instruction>, TransactionConfig)>,
    ) -> Vec<Result<Signature, Box<dyn Error>>> {
        let mut handles = Vec::new();

        for (instructions, config) in transactions {
            let executor = self.clone();
            let handle = tokio::spawn(async move {
                executor.execute_transaction(instructions, config).await
            });
            handles.push(handle);
        }

        let mut results = Vec::new();
        for handle in handles {
            match handle.await {
                Ok(result) => results.push(result),
                Err(e) => results.push(Err(Box::new(TransactionError::TransactionFailed(
                    e.to_string(),
                )))),
            }
        }

        results
    }

    pub async fn monitor_pending_transactions(&self) {
        let mut interval = tokio::time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let mut pending = self.pending_transactions.lock().await;
            if pending.is_empty() {
                continue;
            }

            info!("Monitoring {} pending transactions", pending.len());
            
            // Traite les transactions en attente
            pending.retain(|(transaction, config)| {
                // TODO: Implémenter la logique de monitoring
                true
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::{
        signature::Keypair,
        system_instruction,
    };

    fn setup_test_executor() -> TransactionExecutor {
        let keypair = Keypair::new();
        let solana = SolanaInteraction::new(
            "https://api.devnet.solana.com",
            keypair,
        );
        TransactionExecutor::new(solana)
    }

    #[test]
    fn test_priority_compute_units() {
        assert_eq!(Priority::Low.to_compute_units(), 200_000);
        assert_eq!(Priority::Medium.to_compute_units(), 400_000);
        assert_eq!(Priority::High.to_compute_units(), 600_000);
        assert_eq!(Priority::Critical.to_compute_units(), 1_200_000);
    }

    #[test]
    fn test_priority_micro_lamports() {
        assert_eq!(Priority::Low.to_micro_lamports(), 1);
        assert_eq!(Priority::Medium.to_micro_lamports(), 5);
        assert_eq!(Priority::High.to_micro_lamports(), 10);
        assert_eq!(Priority::Critical.to_micro_lamports(), 25);
    }

    #[tokio::test]
    async fn test_add_priority_instructions() {
        let executor = setup_test_executor();
        let mut instructions = vec![];
        
        executor.add_priority_instructions(&mut instructions, Priority::Medium).unwrap();
        
        assert_eq!(instructions.len(), 2);
    }

    #[tokio::test]
    async fn test_transaction_config_default() {
        let config = TransactionConfig::default();
        
        assert_eq!(config.priority, Priority::Medium);
        assert_eq!(config.max_retries, 3);
        assert_eq!(config.retry_delay, Duration::from_millis(500));
        assert_eq!(config.timeout, Duration::from_secs(30));
        assert!(config.simulation_required);
    }

    // TODO: Ajouter plus de tests
}
