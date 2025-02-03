use solana_sdk::{
    signature::Keypair,
    transaction::Transaction,
    pubkey::Pubkey,
    signer::Signer,
};
use std::{
    error::Error,
    fs::File,
    io::{Read, Write},
    path::Path,
    collections::HashMap,
    sync::Arc,
};
use tokio::sync::RwLock;
use log::{info, warn, error};
use thiserror::Error;
use serde::{Serialize, Deserialize};
use anyhow;

#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Invalid keypair file")]
    InvalidKeypairFile,
    #[error("Trading limit exceeded: {0}")]
    TradingLimitExceeded(String),
    #[error("Honeypot detected: {0}")]
    HoneypotDetected(String),
    #[error("Unauthorized transaction: {0}")]
    UnauthorizedTransaction(String),
    #[error("Invalid signature: {0}")]
    InvalidSignature(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TradingLimits {
    pub max_transaction_size: u64,
    pub daily_trading_limit: u64,
    pub max_slippage_percent: f64,
    pub min_liquidity_usd: f64,
}

impl Default for TradingLimits {
    fn default() -> Self {
        Self {
            max_transaction_size: 10_000_000_000, // 10 SOL
            daily_trading_limit: 100_000_000_000, // 100 SOL
            max_slippage_percent: 1.0,            // 1%
            min_liquidity_usd: 10000.0,          // $10,000
        }
    }
}

#[derive(Debug)]
pub struct SecurityManager {
    keypairs: Arc<RwLock<HashMap<Pubkey, Keypair>>>,
    trading_limits: Arc<RwLock<TradingLimits>>,
    daily_trading_volume: Arc<RwLock<HashMap<Pubkey, u64>>>,
    honeypot_tokens: Arc<RwLock<HashMap<Pubkey, String>>>,
}

impl SecurityManager {
    pub fn new() -> Self {
        Self {
            keypairs: Arc::new(RwLock::new(HashMap::new())),
            trading_limits: Arc::new(RwLock::new(TradingLimits::default())),
            daily_trading_volume: Arc::new(RwLock::new(HashMap::new())),
            honeypot_tokens: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn load_keypair_from_file(&self, path: &Path) -> Result<Pubkey, Box<dyn Error>> {
        let mut file = File::open(path)?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)?;

        let keypair = Keypair::from_bytes(&bytes)
            .map_err(|_| SecurityError::InvalidKeypairFile)?;
        
        let pubkey = keypair.pubkey();
        self.keypairs.write().await.insert(pubkey, keypair);
        
        info!("Keypair chargé: {}", pubkey);
        Ok(pubkey)
    }

    pub async fn save_keypair_to_file(&self, pubkey: &Pubkey, path: &Path) -> Result<(), Box<dyn Error>> {
        let keypairs = self.keypairs.read().await;
        let keypair = keypairs.get(pubkey)
            .ok_or_else(|| SecurityError::InvalidKeypairFile)?;
        
        let mut file = File::create(path)?;
        file.write_all(&keypair.to_bytes())?;
        
        info!("Keypair sauvegardé: {}", pubkey);
        Ok(())
    }

    pub async fn validate_transaction(
        &self,
        transaction: &Transaction,
        amount: u64,
    ) -> Result<(), Box<dyn Error>> {
        // Vérifie les signatures
        if !transaction.verify() {
            return Err(Box::new(SecurityError::InvalidSignature(
                "Signature de transaction invalide".to_string()
            )));
        }

        // Vérifie les limites de trading
        let limits = self.trading_limits.read().await;
        if amount > limits.max_transaction_size {
            return Err(Box::new(SecurityError::TradingLimitExceeded(
                format!("Montant {} dépasse la limite {}", 
                    amount, limits.max_transaction_size)
            )));
        }

        // Vérifie le volume quotidien
        let mut volumes = self.daily_trading_volume.write().await;
        let daily_volume = volumes
            .entry(transaction.message.account_keys[0])
            .or_insert(0);
        *daily_volume += amount;

        if *daily_volume > limits.daily_trading_limit {
            return Err(Box::new(SecurityError::TradingLimitExceeded(
                "Limite quotidienne dépassée".to_string()
            )));
        }

        Ok(())
    }

    pub async fn check_honeypot(&self, token: &Pubkey) -> Result<(), Box<dyn Error>> {
        let honeypots = self.honeypot_tokens.read().await;
        if let Some(reason) = honeypots.get(token) {
            return Err(Box::new(SecurityError::HoneypotDetected(
                format!("Token {} est un honeypot: {}", token, reason)
            )));
        }
        Ok(())
    }

    pub async fn mark_as_honeypot(&self, token: Pubkey, reason: String) {
        self.honeypot_tokens.write().await.insert(token, reason);
        warn!("Token marqué comme honeypot: {}", token);
    }

    pub async fn update_trading_limits(&self, new_limits: TradingLimits) {
        let mut limits = self.trading_limits.write().await;
        *limits = new_limits;
        info!("Limites de trading mises à jour");
    }

    pub async fn reset_daily_volumes(&self) {
        self.daily_trading_volume.write().await.clear();
        info!("Volumes quotidiens réinitialisés");
    }

    /// Vérifie une transaction
    pub fn verify_transaction(&self, transaction: &Transaction) -> Result<(), anyhow::Error> {
        match transaction.verify() {
            Ok(_) => Ok(()),
            Err(e) => {
                error!("Transaction invalide: {}", e);
                Err(anyhow::anyhow!("Transaction invalide"))
            }
        }
    }

    /// Récupère une keypair par sa pubkey
    pub async fn get_keypair(&self, pubkey: &Pubkey) -> Option<Keypair> {
        self.keypairs.read().await.get(pubkey).map(|kp| {
            let bytes = kp.to_bytes();
            Keypair::from_bytes(&bytes).ok()
        }).flatten()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_keypair_file_operations() {
        let security = SecurityManager::new();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_keypair");
        
        // Crée un keypair
        let keypair = Keypair::new();
        let pubkey = keypair.pubkey();
        
        // Sauvegarde
        security.keypairs.write().await.insert(pubkey, keypair);
        assert!(security.save_keypair_to_file(&pubkey, &file_path).await.is_ok());
        
        // Charge
        let loaded_pubkey = security.load_keypair_from_file(&file_path).await.unwrap();
        assert_eq!(pubkey, loaded_pubkey);
    }

    #[tokio::test]
    async fn test_trading_limits() {
        let security = SecurityManager::new();
        let keypair = Keypair::new();
        
        // Crée une transaction de test
        let transaction = Transaction::new_with_payer(
            &[],
            Some(&keypair.pubkey()),
        );
        
        // Test avec un montant valide
        assert!(security.validate_transaction(&transaction, 1_000_000).await.is_ok());
        
        // Test avec un montant dépassant la limite
        assert!(security.validate_transaction(&transaction, 1_000_000_000_000).await.is_err());
    }

    #[tokio::test]
    async fn test_honeypot_detection() {
        let security = SecurityManager::new();
        let token = Pubkey::new_unique();
        
        // Marque comme honeypot
        security.mark_as_honeypot(token, "Test reason".to_string()).await;
        
        // Vérifie la détection
        assert!(security.check_honeypot(&token).await.is_err());
        
        // Vérifie un token normal
        let normal_token = Pubkey::new_unique();
        assert!(security.check_honeypot(&normal_token).await.is_ok());
    }

    #[tokio::test]
    async fn test_trading_limits_update() {
        let security = SecurityManager::new();
        let new_limits = TradingLimits {
            max_transaction_size: 5_000_000_000,
            daily_trading_limit: 50_000_000_000,
            max_slippage_percent: 0.5,
            min_liquidity_usd: 20000.0,
        };
        
        security.update_trading_limits(new_limits.clone()).await;
        
        let limits = security.trading_limits.read().await;
        assert_eq!(limits.max_transaction_size, new_limits.max_transaction_size);
        assert_eq!(limits.daily_trading_limit, new_limits.daily_trading_limit);
        assert_eq!(limits.max_slippage_percent, new_limits.max_slippage_percent);
        assert_eq!(limits.min_liquidity_usd, new_limits.min_liquidity_usd);
    }
}
