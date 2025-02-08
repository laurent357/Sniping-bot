use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Signature,
    compute_budget::ComputeBudgetInstruction,
    signer::Signer,
};
use std::{
    sync::Arc,
    time::{Duration, Instant},
    error::Error as StdError,
};
use tokio::sync::Mutex;
use log::{info, warn, error};
use thiserror::Error;
use crate::solana_interaction::SolanaInteraction;

#[derive(Debug)]
pub struct SnipingOpportunity {
    pub token_address: Pubkey,
    pub required_balance: u64,
    pub price_impact: f64,
    pub estimated_profit: f64,
}

#[derive(Debug)]
pub struct PendingTransaction {
    pub signature: Signature,
    pub timestamp: Instant,
    pub instructions: Vec<Instruction>,
}

#[derive(Error, Debug)]
pub enum SnipingError {
    #[error("Transaction timeout")]
    Timeout,
    #[error("Maximum retries exceeded")]
    MaxRetriesExceeded,
    #[error("Insufficient funds")]
    InsufficientFunds,
    #[error("Price impact too high: {0}%")]
    PriceImpactTooHigh(f64),
    #[error("Transaction failed: {0}")]
    TransactionFailed(String),
    #[error("Insufficient balance")]
    InsufficientBalance,
}

impl From<anyhow::Error> for SnipingError {
    fn from(err: anyhow::Error) -> Self {
        SnipingError::TransactionFailed(err.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct SnipingConfig {
    pub max_retries: u32,
    pub retry_delay: Duration,
    pub timeout: Duration,
    pub max_price_impact: f64,
    pub priority_fee: u64,
    pub compute_units: u32,
}

impl Default for SnipingConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_delay: Duration::from_millis(100),
            timeout: Duration::from_secs(10),
            max_price_impact: 2.0,  // 2%
            priority_fee: 10_000,   // 0.00001 SOL
            compute_units: 1_200_000,
        }
    }
}

pub struct SnipingExecutor {
    solana: Arc<SolanaInteraction>,
    config: SnipingConfig,
    pending_transactions: Arc<Mutex<Vec<PendingTransaction>>>,
}

impl SnipingExecutor {
    pub fn new(solana: Arc<SolanaInteraction>, config: Option<SnipingConfig>) -> Arc<Self> {
        Arc::new(Self {
            solana,
            config: config.unwrap_or_default(),
            pending_transactions: Arc::new(Mutex::new(Vec::new())),
        })
    }

    fn prepare_instructions(&self, opportunity: &SnipingOpportunity) -> Result<Vec<Instruction>, Box<dyn StdError>> {
        let mut instructions = vec![];
        
        // Ajouter les instructions de base
        instructions.push(
            ComputeBudgetInstruction::set_compute_unit_limit(self.config.compute_units)
        );
        instructions.push(
            ComputeBudgetInstruction::set_compute_unit_price(self.config.priority_fee)
        );
        
        // TODO: Ajouter les instructions spécifiques au sniping
        // Ces instructions dépendront de votre logique de trading
        
        Ok(instructions)
    }

    pub async fn execute_sniping_transaction(
        &self,
        instructions: Vec<Instruction>,
        estimated_profit: f64,
    ) -> Result<Signature, Box<dyn StdError>> {
        let start_time = Instant::now();
        let mut retries = 0;

        // Ajoute les instructions de priorité
        let mut final_instructions = vec![
            ComputeBudgetInstruction::set_compute_unit_limit(self.config.compute_units),
            ComputeBudgetInstruction::set_compute_unit_price(self.config.priority_fee),
        ];
        final_instructions.extend(instructions);

        loop {
            if start_time.elapsed() > self.config.timeout {
                return Err(Box::new(SnipingError::Timeout));
            }

            if retries >= self.config.max_retries {
                return Err(Box::new(SnipingError::MaxRetriesExceeded));
            }

            // Simule d'abord la transaction
            if let Err(e) = self.solana.simulate_transaction(final_instructions.clone()) {
                error!("Échec de la simulation: {}", e);
                return Err(Box::new(SnipingError::TransactionFailed(e.to_string())));
            }

            // Exécute la transaction
            match self.solana.send_transaction(
                final_instructions.clone(),
                vec![self.solana.get_keypair()]
            ).await {
                Ok(signature) => {
                    info!(
                        "Transaction de sniping exécutée: {}, profit estimé: {}%",
                        signature, estimated_profit
                    );
                    let mut pending = self.pending_transactions.lock().await;
                    pending.push(PendingTransaction {
                        signature,
                        timestamp: Instant::now(),
                        instructions: final_instructions.clone(),
                    });
                    return Ok(signature);
                }
                Err(e) => {
                    warn!(
                        "Échec de la transaction (retry {}/{}): {}",
                        retries + 1,
                        self.config.max_retries,
                        e
                    );
                    retries += 1;
                    tokio::time::sleep(self.config.retry_delay).await;
                }
            }
        }
    }

    pub async fn validate_sniping_opportunity(
        &self,
        _token_address: &Pubkey,  // Préfixé avec _ car non utilisé pour l'instant
        amount: u64,
        price_impact: f64,
    ) -> Result<(), Box<dyn StdError>> {
        // Vérifie le solde
        let balance = self.solana.get_balance(&self.solana.get_keypair().pubkey())?;
        if balance < amount {
            return Err(Box::new(SnipingError::InsufficientFunds));
        }

        // Vérifie l'impact prix
        if price_impact > self.config.max_price_impact {
            return Err(Box::new(SnipingError::PriceImpactTooHigh(price_impact)));
        }

        Ok(())
    }

    pub async fn execute_sniping(&self, opportunity: &SnipingOpportunity) -> Result<(), Box<dyn StdError>> {
        // Vérifie le solde avant d'exécuter
        let balance = self.solana.get_balance(&self.solana.get_keypair().pubkey())?;
        if balance < opportunity.required_balance {
            return Err(Box::new(SnipingError::InsufficientBalance));
        }

        // Prépare les instructions
        let final_instructions = self.prepare_instructions(opportunity)?;

        // Simule d'abord la transaction
        if let Err(e) = self.solana.simulate_transaction(final_instructions.clone()) {
            return Err(Box::new(SnipingError::TransactionFailed(e.to_string())));
        }

        // Si la simulation réussit, envoie la transaction
        match self.solana.send_transaction(
            final_instructions.clone(),
            vec![self.solana.get_keypair()]
        ).await {
            Ok(signature) => {
                info!("Transaction envoyée avec succès: {}", signature);
                let mut pending = self.pending_transactions.lock().await;
                pending.push(PendingTransaction {
                    signature,
                    timestamp: Instant::now(),
                    instructions: final_instructions,
                });
                Ok(())
            }
            Err(e) => Err(Box::new(SnipingError::from(e)))
        }
    }

    pub async fn monitor_pending_transactions(&self) {
        let mut interval = tokio::time::interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            let mut pending = self.pending_transactions.lock().await;
            if pending.is_empty() {
                continue;
            }

            info!("Monitoring {} transactions en attente", pending.len());
            
            let mut i = 0;
            while i < pending.len() {
                match self.solana.confirm_transaction(&pending[i].signature).await {
                    Ok(true) => {
                        info!("Transaction confirmée: {}", pending[i].signature);
                        pending.remove(i);
                    }
                    Ok(false) => {
                        i += 1;
                    }
                    Err(e) => {
                        error!("Erreur de confirmation: {}", e);
                        i += 1;
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::{
        system_instruction,
        signer::Signer,
    };

    #[tokio::test]
    async fn test_sniping_executor() {
        let keypair = Keypair::new();
        let rpc_url = "https://api.devnet.solana.com".to_string();
        
        let solana = Arc::new(SolanaInteraction::new(&rpc_url, &keypair));
        let config = SnipingConfig {
            max_retries: 1,
            retry_delay: Duration::from_millis(100),
            timeout: Duration::from_secs(5),
            max_price_impact: 1.0,
            priority_fee: 5_000,
            compute_units: 600_000,
        };
        
        let executor = SnipingExecutor::new(solana, Some(config));
        
        // Crée une transaction de test
        let recipient = Pubkey::new_unique();
        let instructions = vec![
            system_instruction::transfer(
                &keypair.pubkey(),
                &recipient,
                1_000_000  // 0.001 SOL
            )
        ];
        
        // Test avec un profit estimé de 5%
        let result = executor.execute_sniping_transaction(instructions, 5.0).await;
        assert!(result.is_err());  // Devrait échouer car pas de fonds sur le compte de test
    }

    #[tokio::test]
    async fn test_validate_opportunity() {
        let keypair = Keypair::new();
        let rpc_url = "https://api.devnet.solana.com".to_string();
        
        let solana = Arc::new(SolanaInteraction::new(&rpc_url, &keypair));
        let executor = SnipingExecutor::new(solana, None);
        
        let token = Pubkey::new_unique();
        
        // Test avec un impact prix trop élevé
        let result = executor.validate_sniping_opportunity(&token, 1_000_000, 5.0).await;
        assert!(result.is_err());
        
        // Test avec un montant trop élevé
        let result = executor.validate_sniping_opportunity(&token, 1_000_000_000_000, 1.0).await;
        assert!(result.is_err());
    }
} 