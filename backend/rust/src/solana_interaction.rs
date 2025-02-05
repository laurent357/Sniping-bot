use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
    transaction::Transaction,
    instruction::Instruction,
    program_pack::Pack,
};
use solana_program::program_error::ProgramError;
use anyhow::{Result, Context};
use log::{info, error};
use std::sync::Arc;

/// Structure principale pour l'interaction avec Solana
pub struct SolanaInteraction {
    /// Client RPC Solana
    rpc_client: Arc<RpcClient>,
    /// Keypair pour signer les transactions
    keypair: Arc<Keypair>,
}

impl Clone for SolanaInteraction {
    fn clone(&self) -> Self {
        Self {
            rpc_client: self.rpc_client.clone(),
            keypair: self.keypair.clone(),
        }
    }
}

impl SolanaInteraction {
    /// Crée une nouvelle instance de SolanaInteraction
    pub fn new(rpc_url: &str, keypair: &Keypair) -> Self {
        let rpc_client = RpcClient::new_with_commitment(
            rpc_url.to_string(),
            CommitmentConfig::confirmed(),
        );
        
        // Créer une copie du Keypair en utilisant ses bytes
        let keypair_bytes = keypair.to_bytes();
        let keypair_copy = Keypair::from_bytes(&keypair_bytes)
            .expect("Failed to create keypair from bytes");
        
        Self {
            rpc_client: Arc::new(rpc_client),
            keypair: Arc::new(keypair_copy),
        }
    }
    
    /// Récupère le solde d'un compte
    pub fn get_balance(&self, pubkey: &Pubkey) -> Result<u64> {
        self.rpc_client
            .get_balance(pubkey)
            .context("Failed to get balance")
    }
    
    /// Récupère les informations d'un compte
    pub fn get_account_info(&self, pubkey: &Pubkey) -> Result<Option<solana_sdk::account::Account>> {
        Ok(self.rpc_client.get_account(pubkey).ok())
    }
    
    /// Envoie une transaction
    pub async fn send_transaction(
        &self,
        instructions: Vec<Instruction>,
        signers: Vec<&Keypair>,
    ) -> Result<Signature> {
        let recent_blockhash = self.rpc_client
            .get_latest_blockhash()
            .context("Failed to get recent blockhash")?;
            
        let mut transaction = Transaction::new_with_payer(
            &instructions,
            Some(&self.keypair.pubkey()),
        );
        
        transaction.sign(&signers, recent_blockhash);
        
        self.rpc_client
            .send_and_confirm_transaction_with_spinner(&transaction)
            .context("Failed to send transaction")
    }
    
    /// Simule une transaction avant de l'envoyer
    pub fn simulate_transaction(&self, instructions: Vec<Instruction>) -> Result<()> {
        // Récupère le dernier blockhash
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        
        // Crée la transaction
        let mut transaction = Transaction::new_with_payer(
            &instructions,
            Some(&self.keypair.pubkey())
        );
        
        // Définit le blockhash
        transaction.sign(&[&self.keypair], recent_blockhash);
        
        // Simule la transaction
        match self.rpc_client.simulate_transaction(&transaction) {
            Ok(result) => {
                if let Some(err) = result.value.err {
                    error!("Erreur lors de la simulation: {:?}", err);
                    return Err(ProgramError::Custom(0).into());
                }
                info!("Simulation réussie");
                Ok(())
            }
            Err(e) => {
                error!("Erreur lors de la simulation: {}", e);
                Err(e.into())
            }
        }
    }
    
    /// Vérifie si une transaction est confirmée
    pub async fn confirm_transaction(&self, signature: &Signature) -> Result<bool> {
        self.rpc_client
            .confirm_transaction_with_spinner(
                signature,
                &self.rpc_client.get_latest_blockhash()?,
                CommitmentConfig::confirmed(),
            )
            .map(|_| true)
            .context("Failed to confirm transaction")
    }
    
    /// Crée un compte token
    pub async fn create_token_account(
        &self,
        token_mint: &Pubkey,
        owner: &Pubkey,
    ) -> Result<Pubkey> {
        let account = Keypair::new();
        let space = spl_token::state::Account::get_packed_len();
        let rent = self.rpc_client
            .get_minimum_balance_for_rent_exemption(space)?;
            
        let create_account_ix = solana_sdk::system_instruction::create_account(
            &self.keypair.pubkey(),
            &account.pubkey(),
            rent,
            space as u64,
            &spl_token::id(),
        );
        
        let init_account_ix = spl_token::instruction::initialize_account(
            &spl_token::id(),
            &account.pubkey(),
            token_mint,
            owner,
        )?;
        
        let instructions = vec![create_account_ix, init_account_ix];
        let signers = vec![&self.keypair, &account];
        
        self.send_transaction(instructions, signers).await?;
        
        Ok(account.pubkey())
    }
    
    /// Récupère la balance d'un token
    pub fn get_token_account_balance(&self, token_account: &Pubkey) -> Result<u64> {
        let account = self.rpc_client
            .get_token_account(token_account)?
            .context("Token account not found")?;
            
        Ok(account.token_amount.amount.parse()?)
    }
    
    /// Récupère la balance d'un token
    pub fn get_token_balance(&self, token_account: &Pubkey) -> Result<u64> {
        self.get_token_account_balance(token_account)
    }
    
    /// Récupère les informations d'un compte et effectue un swap de tokens
    pub async fn swap_tokens(
        &self,
        _source_token: &Pubkey,
        _destination_token: &Pubkey,
        _amount: u64,
        _slippage: f64,
    ) -> Result<Signature> {
        // TODO: Implémenter la logique de swap via Jupiter
        unimplemented!("Swap functionality not yet implemented")
    }

    /// Récupère une référence au keypair
    pub fn get_keypair(&self) -> &Keypair {
        &self.keypair
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_new_solana_interaction() {
        let keypair = Keypair::new();
        let interaction = SolanaInteraction::new(
            "https://api.mainnet-beta.solana.com",
            &keypair
        );
        assert_eq!(interaction.rpc_client.commitment, CommitmentConfig::confirmed());
    }
    
    // TODO: Ajouter plus de tests
}
