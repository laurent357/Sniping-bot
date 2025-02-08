#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::{
        signature::{Keypair, Signer},
        system_instruction,
        transaction::Transaction,
    };
    use mockall::predicate::*;
    use mockall::mock;

    mock! {
        SecurityChecker {}
        impl SecurityCheckerTrait for SecurityChecker {
            fn check_honeypot(&self, token_address: &Pubkey) -> Result<bool, SecurityError>;
            fn validate_pool(&self, pool_address: &Pubkey) -> Result<bool, SecurityError>;
            fn check_token_contract(&self, token_address: &Pubkey) -> Result<TokenSecurity, SecurityError>;
        }
    }

    #[test]
    fn test_validate_transaction_security() {
        let transaction = Transaction::default();
        let limits = TradingLimits {
            max_transaction_amount: 1000,
            daily_limit: 5000,
            max_slippage: 1.0,
        };

        // Test transaction valide
        let result = validate_transaction_security(&transaction, &limits, 500.0, 0.5);
        assert!(result.is_ok());

        // Test montant trop élevé
        let result = validate_transaction_security(&transaction, &limits, 1500.0, 0.5);
        assert!(result.is_err());

        // Test slippage trop élevé
        let result = validate_transaction_security(&transaction, &limits, 500.0, 1.5);
        assert!(result.is_err());
    }

    #[test]
    fn test_check_token_security() {
        let mut mock_checker = MockSecurityChecker::new();
        let token_address = Pubkey::new_unique();

        // Test token sécurisé
        mock_checker
            .expect_check_token_contract()
            .with(eq(token_address))
            .times(1)
            .returning(|_| Ok(TokenSecurity {
                is_verified: true,
                has_mint_function: false,
                has_blacklist: false,
                total_supply: 1_000_000,
                holder_count: 1000,
            }));

        let result = check_token_security(&mock_checker, &token_address);
        assert!(result.is_ok());
        assert!(result.unwrap().is_verified);

        // Test token non sécurisé
        mock_checker
            .expect_check_token_contract()
            .with(eq(token_address))
            .times(1)
            .returning(|_| Ok(TokenSecurity {
                is_verified: false,
                has_mint_function: true,
                has_blacklist: true,
                total_supply: 1_000_000,
                holder_count: 10,
            }));

        let result = check_token_security(&mock_checker, &token_address);
        assert!(result.is_err());
    }

    #[test]
    fn test_detect_honeypot() {
        let mut mock_checker = MockSecurityChecker::new();
        let token_address = Pubkey::new_unique();
        let pool_address = Pubkey::new_unique();

        // Test pool légitime
        mock_checker
            .expect_check_honeypot()
            .with(eq(token_address))
            .times(1)
            .returning(|_| Ok(false));
        mock_checker
            .expect_validate_pool()
            .with(eq(pool_address))
            .times(1)
            .returning(|_| Ok(true));

        let result = detect_honeypot(&mock_checker, &token_address, &pool_address);
        assert!(result.is_ok());
        assert!(!result.unwrap());

        // Test honeypot détecté
        mock_checker
            .expect_check_honeypot()
            .with(eq(token_address))
            .times(1)
            .returning(|_| Ok(true));

        let result = detect_honeypot(&mock_checker, &token_address, &pool_address);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_validate_trading_limits() {
        let limits = TradingLimits {
            max_transaction_amount: 1000,
            daily_limit: 5000,
            max_slippage: 1.0,
        };

        // Test dans les limites
        let result = validate_trading_limits(500.0, 3000.0, 0.5, &limits);
        assert!(result.is_ok());

        // Test montant transaction trop élevé
        let result = validate_trading_limits(1500.0, 3000.0, 0.5, &limits);
        assert!(result.is_err());

        // Test limite journalière dépassée
        let result = validate_trading_limits(500.0, 5500.0, 0.5, &limits);
        assert!(result.is_err());

        // Test slippage trop élevé
        let result = validate_trading_limits(500.0, 3000.0, 1.5, &limits);
        assert!(result.is_err());
    }

    #[test]
    fn test_secure_key_management() {
        let keypair = Keypair::new();
        let password = "test_password";

        // Test encryption/decryption
        let encrypted = encrypt_private_key(&keypair, password);
        assert!(encrypted.is_ok());

        let decrypted = decrypt_private_key(&encrypted.unwrap(), password);
        assert!(decrypted.is_ok());
        assert_eq!(decrypted.unwrap().pubkey(), keypair.pubkey());

        // Test mauvais mot de passe
        let decrypted = decrypt_private_key(&encrypted.unwrap(), "wrong_password");
        assert!(decrypted.is_err());
    }

    #[tokio::test]
    async fn test_phantom_wallet_setup() {
        let security = SecurityManager::new();
        let keypair = Keypair::new();
        let private_key = bs58::encode(keypair.to_bytes()).into_string();
        
        let config = WalletConfig {
            wallet_type: WalletType::Phantom,
            keypair_path: None,
            private_key: Some(private_key),
        };
        
        let result = security.setup_wallet(&config).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), keypair.pubkey());
    }

    #[tokio::test]
    async fn test_dedicated_wallet_setup() {
        let security = SecurityManager::new();
        let temp_dir = tempdir().unwrap();
        let keypair_path = temp_dir.path().join("wallet.json");
        
        let config = WalletConfig {
            wallet_type: WalletType::Dedicated,
            keypair_path: Some(keypair_path.clone()),
            private_key: None,
        };
        
        // Test création nouveau wallet
        let result = security.setup_wallet(&config).await;
        assert!(result.is_ok());
        let pubkey = result.unwrap();
        
        // Vérifie que le fichier existe
        assert!(keypair_path.exists());
        
        // Test chargement wallet existant
        let result2 = security.setup_wallet(&config).await;
        assert!(result2.is_ok());
        assert_eq!(result2.unwrap(), pubkey);
    }

    #[tokio::test]
    async fn test_invalid_wallet_config() {
        let security = SecurityManager::new();
        
        // Test Phantom sans clé privée
        let config = WalletConfig {
            wallet_type: WalletType::Phantom,
            keypair_path: None,
            private_key: None,
        };
        let result = security.setup_wallet(&config).await;
        assert!(result.is_err());
        
        // Test Dedicated sans chemin
        let config = WalletConfig {
            wallet_type: WalletType::Dedicated,
            keypair_path: None,
            private_key: None,
        };
        let result = security.setup_wallet(&config).await;
        assert!(result.is_err());
    }
} 