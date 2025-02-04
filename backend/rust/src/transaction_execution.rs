use crate::solana_interaction::SolanaInteraction;
use solana_sdk::{
    instruction::Instruction,
    signature::Signature,
    transaction::Transaction,
    compute_budget::ComputeBudgetInstruction,
};
use std::{
    time::{Duration, Instant},
    sync::Arc,
    str::FromStr,
};
use tokio::sync::Mutex;
use log::{info, warn, error};
use thiserror::Error;
use anyhow::Result;

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

impl std::fmt::Display for Priority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Priority::Low => write!(f, "LOW"),
            Priority::Medium => write!(f, "MEDIUM"),
            Priority::High => write!(f, "HIGH"),
            Priority::Critical => write!(f, "CRITICAL"),
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

#[derive(Clone)]
pub struct TransactionExecutor {
    solana: Arc<SolanaInteraction>,
    pending_transactions: Arc<Mutex<Vec<(Transaction, TransactionConfig)>>>,
}

impl TransactionExecutor {
    pub fn new(solana: Arc<SolanaInteraction>) -> Arc<Self> {
        Arc::new(Self {
            solana,
            pending_transactions: Arc::new(Mutex::new(Vec::new())),
        })
    }

    pub async fn execute_transaction(
        &self,
        instructions: Vec<Instruction>,
        priority: Priority,
        max_retries: u32
    ) -> Result<String, anyhow::Error> {
        let start_time = Instant::now();
        let mut retries = 0;

        // Ajoute les instructions de priorité
        let mut final_instructions = instructions;
        self.add_priority_instructions(&mut final_instructions, priority)
            .map_err(|e| anyhow::anyhow!("Erreur lors de l'ajout des instructions de priorité: {}", e))?;

        let signers = vec![self.solana.get_keypair()];
        loop {
            if start_time.elapsed() > Duration::from_secs(30) {
                return Err(anyhow::anyhow!(TransactionError::Timeout));
            }

            if retries >= max_retries {
                return Err(anyhow::anyhow!(TransactionError::MaxRetriesExceeded));
            }

            match self.solana.send_transaction(final_instructions.clone(), signers.clone()).await {
                Ok(signature) => {
                    info!(
                        "Transaction exécutée avec succès après {} retry(s): {}",
                        retries, signature
                    );
                    return Ok(signature.to_string());
                }
                Err(e) => {
                    warn!(
                        "Échec de la transaction (retry {}/{}): {}",
                        retries + 1,
                        max_retries,
                        e
                    );
                    retries += 1;
                    tokio::time::sleep(Duration::from_millis(500)).await;
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
    ) -> Vec<Result<Signature, anyhow::Error>> {
        let mut handles = Vec::new();

        for (instructions, config) in transactions {
            let executor = self.clone();
            let handle = tokio::spawn(async move {
                let mut tx_instructions = instructions.clone();
                executor.add_priority_instructions(&mut tx_instructions, config.priority)?;
                if config.simulation_required {
                    executor.solana.simulate_transaction(tx_instructions.clone())?;
                }
                executor.solana.send_transaction(tx_instructions, vec![executor.solana.get_keypair()]).await
            });
            handles.push(handle);
        }

        // Attend la fin de toutes les transactions
        let mut results = Vec::new();
        for handle in handles {
            results.push(handle.await.unwrap_or_else(|e| Err(anyhow::anyhow!(e))));
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
            pending.retain(|(_tx, _cfg)| {
                // TODO: Implémenter la logique de monitoring
                true
            });
        }
    }

    pub async fn process_transactions(&self) -> Result<(), anyhow::Error> {
        let mut pending = Vec::new();

        loop {
            // Traitement des transactions en attente
            pending.retain(|(_tx, _cfg): &(Transaction, TransactionConfig)| {
                // Logique de rétention
                true
            });

            // Attente de nouvelles transactions
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    }

    pub async fn execute_with_retry(
        self: Arc<Self>,
        instructions: Vec<Instruction>,
        config: TransactionConfig
    ) -> Result<Signature, anyhow::Error> {
        let handle = tokio::spawn(async move {
            let result = self.execute_transaction(instructions, config.priority, config.max_retries).await?;
            Signature::from_str(&result)
                .map_err(|e| anyhow::anyhow!("Impossible de parser la signature: {}", e))
        });

        // Gestion des erreurs en deux étapes :
        // 1. Gestion de l'erreur de JoinError
        // 2. Gestion de l'erreur de conversion de signature
        handle
            .await
            .map_err(|e| anyhow::anyhow!("La tâche a paniqué: {}", e))?
            .map_err(|e| anyhow::anyhow!("Erreur lors de l'exécution de la transaction: {}", e))
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
