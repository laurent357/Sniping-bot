use super::*;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;
use solana_program::instruction::Instruction;
use mockall::predicate::*;
use mockall::mock;
use chrono::Utc;

mock! {
    RpcClient {
        fn get_latest_blockhash(&self) -> Result<Hash>;
        fn get_token_account_balance(&self, pubkey: &Pubkey) -> Result<UiTokenAmount>;
        fn simulate_transaction(&self, transaction: &Transaction) -> Result<RpcSimulateTransactionResult>;
        fn send_and_confirm_transaction(&self, transaction: &Transaction) -> Result<Signature>;
        fn get_transaction(&self, signature: &Signature, commitment_config: CommitmentConfig) -> Result<EncodedConfirmedTransaction>;
        fn confirm_transaction(&self, signature: &Signature) -> Result<bool>;
    }
}

#[tokio::test]
async fn test_swap_success() {
    let wallet = Keypair::new();
    let mock_client = MockRpcClient::new();
    
    // Configure les mocks
    mock_client.expect_get_latest_blockhash()
        .returning(|| Ok(Hash::default()));
        
    mock_client.expect_get_token_account_balance()
        .returning(|_| Ok(UiTokenAmount {
            amount: "1000000".to_string(),
            decimals: 6,
            ui_amount: Some(1.0),
            ui_amount_string: "1.0".to_string(),
        }));
        
    mock_client.expect_simulate_transaction()
        .returning(|_| Ok(RpcSimulateTransactionResult {
            err: None,
            logs: Some(vec![
                "Program log: Amount out: 950000".to_string(),
                "Program log: Price impact: 0.5".to_string(),
            ]),
            accounts: None,
            units_consumed: Some(0),
            return_data: None,
        }));
        
    mock_client.expect_send_and_confirm_transaction()
        .returning(|_| Ok(Signature::default()));
        
    mock_client.expect_get_transaction()
        .returning(|_, _| Ok(EncodedConfirmedTransaction {
            slot: 0,
            transaction: EncodedTransaction {
                signatures: vec![Signature::default().to_string()],
                message: EncodedMessage::default(),
            },
            meta: Some(EncodedTransactionMeta {
                log_messages: Some(vec![
                    "Program log: Amount out: 950000".to_string(),
                    "Program log: Price impact: 0.5".to_string(),
                ]),
                ..Default::default()
            }),
        }));
        
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await.unwrap();
    
    assert!(result.success);
    assert_eq!(result.amount_in, 1000000);
    assert_eq!(result.amount_out, 950000);
    assert_eq!(result.price_impact, 0.5);
}

#[tokio::test]
async fn test_swap_insufficient_balance() {
    let wallet = Keypair::new();
    let mock_client = MockRpcClient::new();
    
    mock_client.expect_get_token_account_balance()
        .returning(|_| Ok(UiTokenAmount {
            amount: "500000".to_string(),  // Balance insuffisante
            decimals: 6,
            ui_amount: Some(0.5),
            ui_amount_string: "0.5".to_string(),
        }));
        
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Insufficient balance"));
}

#[tokio::test]
async fn test_swap_high_price_impact() {
    let wallet = Keypair::new();
    let mock_client = MockRpcClient::new();
    
    mock_client.expect_get_token_account_balance()
        .returning(|_| Ok(UiTokenAmount {
            amount: "1000000".to_string(),
            decimals: 6,
            ui_amount: Some(1.0),
            ui_amount_string: "1.0".to_string(),
        }));
        
    mock_client.expect_get_latest_blockhash()
        .returning(|| Ok(Hash::default()));
        
    mock_client.expect_simulate_transaction()
        .returning(|_| Ok(RpcSimulateTransactionResult {
            err: None,
            logs: Some(vec![
                "Program log: Price impact too high".to_string(),
            ]),
            accounts: None,
            units_consumed: Some(0),
            return_data: None,
        }));
        
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Price impact exceeds slippage"));
}

#[tokio::test]
async fn test_swap_expired_deadline() {
    let wallet = Keypair::new();
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() - 60,  // Deadline passée
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Deadline has passed"));
}

#[tokio::test]
async fn test_swap_invalid_params() {
    let wallet = Keypair::new();
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    // Test amount_in = 0
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 0,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Amount in must be greater than 0"));
    
    // Test slippage invalide
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 101.0,  // Slippage > 100%
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Invalid slippage percentage"));
}

#[tokio::test]
async fn test_swap_simulation_error() {
    let wallet = Keypair::new();
    let mock_client = MockRpcClient::new();
    
    mock_client.expect_get_token_account_balance()
        .returning(|_| Ok(UiTokenAmount {
            amount: "1000000".to_string(),
            decimals: 6,
            ui_amount: Some(1.0),
            ui_amount_string: "1.0".to_string(),
        }));
        
    mock_client.expect_get_latest_blockhash()
        .returning(|| Ok(Hash::default()));
        
    mock_client.expect_simulate_transaction()
        .returning(|_| Ok(RpcSimulateTransactionResult {
            err: Some("Custom program error: 0x1".to_string()),
            logs: None,
            accounts: None,
            units_consumed: Some(0),
            return_data: None,
        }));
        
    let swap_manager = SwapManager::new(
        "https://api.mainnet-beta.solana.com",
        wallet,
        "confirmed",
    );
    
    let params = SwapParams {
        input_token: "TokenA11111111111111111111111111111111111".to_string(),
        output_token: "TokenB22222222222222222222222222222222222".to_string(),
        amount_in: 1000000,
        min_amount_out: 950000,
        slippage: 1.0,
        deadline: Utc::now().timestamp() + 60,
    };
    
    let result = swap_manager.swap(params).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Simulation error"));
} 