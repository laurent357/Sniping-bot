#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::{
        signature::{Keypair, Signer},
        system_program,
    };
    use solana_client::rpc_client::RpcClient;
    use mockall::predicate::*;
    use mockall::mock;

    // Création d'un mock pour RpcClient
    mock! {
        RpcConnection {}
        impl Clone for RpcConnection {
            fn clone(&self) -> Self;
        }
        trait RpcClientTrait {
            fn get_minimum_balance_for_rent_exemption(&self, data_len: usize) -> Result<u64, ClientError>;
            fn get_latest_blockhash(&self) -> Result<Hash, ClientError>;
            fn send_and_confirm_transaction(&self, transaction: &Transaction) -> Result<Signature, ClientError>;
        }
    }

    #[test]
    fn test_create_solana_connection() {
        let url = "http://localhost:8899".to_string();
        let connection = create_solana_connection(&url);
        assert!(connection.is_ok());
    }

    #[test]
    fn test_create_keypair_from_bytes() {
        let seed = [1u8; 32];
        let keypair = create_keypair_from_bytes(&seed);
        assert!(keypair.is_ok());
        
        let bad_seed = [1u8; 31]; // Mauvaise taille
        let bad_keypair = create_keypair_from_bytes(&bad_seed);
        assert!(bad_keypair.is_err());
    }

    #[test]
    fn test_sign_transaction() {
        let mut mock_rpc = MockRpcConnection::new();
        mock_rpc.expect_get_latest_blockhash()
            .times(1)
            .returning(|| Ok(Hash::default()));

        let payer = Keypair::new();
        let recipient = Keypair::new();
        
        let instruction = system_instruction::transfer(
            &payer.pubkey(),
            &recipient.pubkey(),
            1000,
        );

        let result = sign_transaction(
            &[instruction],
            &payer,
            &[&payer],
            &mock_rpc,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_signature() {
        let keypair = Keypair::new();
        let message = b"Test message";
        let signature = keypair.sign_message(message);
        
        let result = verify_signature(&signature, message, &keypair.pubkey());
        assert!(result);

        // Test avec un mauvais message
        let wrong_message = b"Wrong message";
        let result = verify_signature(&signature, wrong_message, &keypair.pubkey());
        assert!(!result);
    }

    #[test]
    fn test_get_account_balance() {
        let mut mock_rpc = MockRpcConnection::new();
        let pubkey = Pubkey::new_unique();
        
        mock_rpc.expect_get_balance()
            .with(eq(pubkey))
            .times(1)
            .returning(|_| Ok(1000));

        let balance = get_account_balance(&mock_rpc, &pubkey);
        assert!(balance.is_ok());
        assert_eq!(balance.unwrap(), 1000);
    }

    #[test]
    fn test_validate_transaction() {
        let payer = Keypair::new();
        let recipient = Keypair::new();
        
        let instruction = system_instruction::transfer(
            &payer.pubkey(),
            &recipient.pubkey(),
            1000,
        );

        let result = validate_transaction(
            &[instruction],
            &payer.pubkey(),
            1000,
        );

        assert!(result.is_ok());

        // Test avec un montant invalide
        let result = validate_transaction(
            &[instruction],
            &payer.pubkey(),
            0,
        );

        assert!(result.is_err());
    }
} 