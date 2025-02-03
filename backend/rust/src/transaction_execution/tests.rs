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
        TransactionExecutor {}
        impl TransactionExecutorTrait for TransactionExecutor {
            fn simulate_transaction(&self, transaction: &Transaction) -> Result<SimulationResult, ExecutionError>;
            fn execute_transaction(&self, transaction: &Transaction) -> Result<Signature, ExecutionError>;
            fn get_gas_estimate(&self, transaction: &Transaction) -> Result<u64, ExecutionError>;
        }
    }

    #[test]
    fn test_create_transaction() {
        let payer = Keypair::new();
        let recipient = Keypair::new();
        let amount = 1000;

        let instruction = system_instruction::transfer(
            &payer.pubkey(),
            &recipient.pubkey(),
            amount,
        );

        let result = create_transaction(
            &[instruction],
            &payer,
            &[&payer],
            None, // Pas de priorité spécifique
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_simulate_before_execution() {
        let mut mock_executor = MockTransactionExecutor::new();
        let transaction = Transaction::default();

        // Test simulation réussie
        mock_executor
            .expect_simulate_transaction()
            .with(eq(transaction.clone()))
            .times(1)
            .returning(|_| Ok(SimulationResult {
                gas_used: 1000,
                success: true,
                logs: vec![],
            }));

        let result = simulate_before_execution(&mock_executor, &transaction);
        assert!(result.is_ok());

        // Test simulation échouée
        mock_executor
            .expect_simulate_transaction()
            .with(eq(transaction.clone()))
            .times(1)
            .returning(|_| Ok(SimulationResult {
                gas_used: 1000,
                success: false,
                logs: vec!["Error".to_string()],
            }));

        let result = simulate_before_execution(&mock_executor, &transaction);
        assert!(result.is_err());
    }

    #[test]
    fn test_execute_with_retry() {
        let mut mock_executor = MockTransactionExecutor::new();
        let transaction = Transaction::default();
        let max_retries = 3;

        // Test exécution réussie au premier essai
        mock_executor
            .expect_execute_transaction()
            .with(eq(transaction.clone()))
            .times(1)
            .returning(|_| Ok(Signature::default()));

        let result = execute_with_retry(&mock_executor, &transaction, max_retries);
        assert!(result.is_ok());

        // Test exécution réussie après plusieurs essais
        mock_executor
            .expect_execute_transaction()
            .with(eq(transaction.clone()))
            .times(2)
            .returning(|_| Err(ExecutionError::TransactionError));
        mock_executor
            .expect_execute_transaction()
            .with(eq(transaction.clone()))
            .times(1)
            .returning(|_| Ok(Signature::default()));

        let result = execute_with_retry(&mock_executor, &transaction, max_retries);
        assert!(result.is_ok());

        // Test échec après max_retries
        mock_executor
            .expect_execute_transaction()
            .with(eq(transaction.clone()))
            .times(max_retries)
            .returning(|_| Err(ExecutionError::TransactionError));

        let result = execute_with_retry(&mock_executor, &transaction, max_retries);
        assert!(result.is_err());
    }

    #[test]
    fn test_optimize_gas_fees() {
        let mut mock_executor = MockTransactionExecutor::new();
        let transaction = Transaction::default();

        mock_executor
            .expect_get_gas_estimate()
            .with(eq(transaction.clone()))
            .times(1)
            .returning(|_| Ok(1000));

        let result = optimize_gas_fees(&mock_executor, &transaction);
        assert!(result.is_ok());
        assert!(result.unwrap() >= 1000);
    }

    #[test]
    fn test_handle_transaction_error() {
        // Test erreur de simulation
        let error = ExecutionError::SimulationFailed("Test error".to_string());
        let result = handle_transaction_error(&error);
        assert!(result.contains("simulation"));

        // Test erreur de gas
        let error = ExecutionError::InsufficientGas;
        let result = handle_transaction_error(&error);
        assert!(result.contains("gas"));

        // Test erreur générique
        let error = ExecutionError::TransactionError;
        let result = handle_transaction_error(&error);
        assert!(!result.is_empty());
    }
} 