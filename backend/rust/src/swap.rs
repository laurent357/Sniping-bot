use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use solana_program::instruction::Instruction;
use solana_sdk::signature::Keypair;
use solana_sdk::transaction::Transaction;
use solana_client::rpc_client::RpcClient;
use anyhow::{Result, Context};
use serde::{Serialize, Deserialize};
use std::str::FromStr;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct SwapParams {
    pub input_token: String,
    pub output_token: String,
    pub amount_in: u64,
    pub min_amount_out: u64,
    pub slippage: f64,
    pub deadline: i64,
}

#[derive(Debug)]
pub struct SwapResult {
    pub signature: String,
    pub amount_in: u64,
    pub amount_out: u64,
    pub price_impact: f64,
    pub success: bool,
    pub error: Option<String>,
}

pub struct SwapManager {
    rpc_client: RpcClient,
    wallet: Keypair,
    commitment: String,
}

impl SwapManager {
    pub fn new(rpc_url: &str, wallet: Keypair, commitment: &str) -> Self {
        let rpc_client = RpcClient::new_with_timeout(
            rpc_url.to_string(),
            Duration::from_secs(30),
        );
        
        Self {
            rpc_client,
            wallet,
            commitment: commitment.to_string(),
        }
    }
    
    pub async fn swap(&self, params: SwapParams) -> Result<SwapResult> {
        // Valider les paramètres
        self.validate_params(&params)?;
        
        // Vérifier la balance
        self.check_balance(&params.input_token, params.amount_in)
            .context("Failed to check balance")?;
        
        // Construire l'instruction de swap
        let swap_ix = self.build_swap_instruction(&params)
            .context("Failed to build swap instruction")?;
        
        // Créer et signer la transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()
            .context("Failed to get recent blockhash")?;
            
        let transaction = Transaction::new_signed_with_payer(
            &[swap_ix],
            Some(&self.wallet.pubkey()),
            &[&self.wallet],
            recent_blockhash,
        );
        
        // Simuler la transaction
        self.simulate_swap(&transaction)
            .context("Swap simulation failed")?;
        
        // Envoyer la transaction
        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)
            .context("Failed to send transaction")?;
            
        // Vérifier le résultat
        let result = self.verify_swap_result(&signature, &params)
            .context("Failed to verify swap result")?;
            
        Ok(result)
    }
    
    fn validate_params(&self, params: &SwapParams) -> Result<()> {
        if params.amount_in == 0 {
            anyhow::bail!("Amount in must be greater than 0");
        }
        
        if params.min_amount_out == 0 {
            anyhow::bail!("Min amount out must be greater than 0");
        }
        
        if params.slippage <= 0.0 || params.slippage > 100.0 {
            anyhow::bail!("Invalid slippage percentage");
        }
        
        if params.deadline < chrono::Utc::now().timestamp() {
            anyhow::bail!("Deadline has passed");
        }
        
        Ok(())
    }
    
    fn check_balance(&self, token: &str, amount: u64) -> Result<()> {
        let token_pubkey = Pubkey::from_str(token)
            .context("Invalid token address")?;
            
        let balance = self.rpc_client.get_token_account_balance(
            &token_pubkey
        )?;
        
        if balance.amount.parse::<u64>()? < amount {
            anyhow::bail!("Insufficient balance");
        }
        
        Ok(())
    }
    
    fn build_swap_instruction(&self, params: &SwapParams) -> Result<Instruction> {
        // Construire l'instruction en fonction du DEX
        // Exemple avec Jupiter:
        let program_id = Pubkey::from_str("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB")
            .context("Invalid program ID")?;
            
        let input_token = Pubkey::from_str(&params.input_token)
            .context("Invalid input token")?;
            
        let output_token = Pubkey::from_str(&params.output_token)
            .context("Invalid output token")?;
            
        // Construire les données de l'instruction
        let data = vec![
            0, // Index de l'instruction
            params.amount_in.to_le_bytes().to_vec(),
            params.min_amount_out.to_le_bytes().to_vec(),
        ].concat();
        
        // Construire les comptes nécessaires
        let accounts = vec![
            AccountMeta::new(self.wallet.pubkey(), true),
            AccountMeta::new_readonly(input_token, false),
            AccountMeta::new(output_token, false),
        ];
        
        Ok(Instruction {
            program_id,
            accounts,
            data,
        })
    }
    
    async fn simulate_swap(&self, transaction: &Transaction) -> Result<()> {
        let simulation = self.rpc_client.simulate_transaction(transaction)
            .context("Simulation failed")?;
            
        if let Some(err) = simulation.value.err {
            anyhow::bail!("Simulation error: {:?}", err);
        }
        
        // Vérifier les logs de simulation pour le slippage
        if let Some(logs) = simulation.value.logs {
            for log in logs {
                if log.contains("Price impact too high") {
                    anyhow::bail!("Price impact exceeds slippage tolerance");
                }
            }
        }
        
        Ok(())
    }
    
    async fn verify_swap_result(
        &self,
        signature: &str,
        params: &SwapParams
    ) -> Result<SwapResult> {
        // Attendre la confirmation
        self.rpc_client.confirm_transaction(signature)
            .context("Transaction confirmation failed")?;
            
        // Récupérer les détails de la transaction
        let tx_details = self.rpc_client.get_transaction(
            &signature.parse()?,
            self.rpc_client.commitment()
        )?;
        
        // Analyser les logs pour extraire les montants
        let (amount_out, price_impact) = self.parse_swap_logs(&tx_details)
            .context("Failed to parse swap logs")?;
            
        Ok(SwapResult {
            signature: signature.to_string(),
            amount_in: params.amount_in,
            amount_out,
            price_impact,
            success: true,
            error: None,
        })
    }
    
    fn parse_swap_logs(&self, tx_details: &EncodedConfirmedTransaction) -> Result<(u64, f64)> {
        let logs = tx_details.transaction.meta.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No transaction metadata"))?.log_messages.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No log messages"))?;
            
        let mut amount_out = 0;
        let mut price_impact = 0.0;
        
        for log in logs {
            if log.contains("Program log: Amount out:") {
                amount_out = log.split(":").last()
                    .ok_or_else(|| anyhow::anyhow!("Invalid amount out log"))?
                    .trim()
                    .parse()?;
            }
            if log.contains("Program log: Price impact:") {
                price_impact = log.split(":").last()
                    .ok_or_else(|| anyhow::anyhow!("Invalid price impact log"))?
                    .trim()
                    .parse()?;
            }
        }
        
        Ok((amount_out, price_impact))
    }
} 