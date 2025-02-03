use solana_sniping_bot::{
    init_logging,
    SolanaInteraction,
    TransactionExecutor,
    SecurityManager,
    ipc::{IPCServer, IPCMessage},
};
use solana_sdk::{
    signature::Keypair,
    signer::Signer,
};
use std::{error::Error, path::PathBuf};
use log::{info, error};
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialise le logging
    init_logging()?;
    info!("Démarrage du module Solana...");
    
    // Configuration depuis les variables d'environnement
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string());
        
    // Crée un nouveau keypair pour les tests
    // TODO: Charger depuis un fichier sécurisé
    let keypair = Keypair::new();
    info!("Pubkey: {}", keypair.pubkey());
    
    // Initialise les composants
    let solana = SolanaInteraction::new(&rpc_url, keypair.clone());
    let executor = TransactionExecutor::new(solana.clone());
    let security = SecurityManager::new();
    
    // Vérifie la connexion
    match solana.get_balance(&keypair.pubkey()) {
        Ok(balance) => {
            info!("Connexion établie. Balance: {} SOL", balance as f64 / 1e9);
        }
        Err(e) => {
            error!("Erreur de connexion: {}", e);
            return Err(e.into());
        }
    }
    
    // Configure le serveur IPC
    let socket_path = PathBuf::from("/tmp/trading_bot.sock");
    let ipc_server = IPCServer::new(socket_path);
    
    // Crée un canal pour la communication entre les threads
    let (tx, mut rx) = mpsc::channel(100);
    let server_tx = tx.clone();
    
    // Lance le serveur IPC dans un thread séparé
    tokio::spawn(async move {
        if let Err(e) = ipc_server.start().await {
            error!("Erreur du serveur IPC: {}", e);
        }
    });
    
    // Boucle principale de traitement des messages
    info!("En attente des messages IPC...");
    while let Some(message) = rx.recv().await {
        match message {
            IPCMessage::TransactionRequest { instructions, priority, max_retries } => {
                info!("Réception d'une requête de transaction");
                let result = executor.execute_transaction(&instructions, &priority, max_retries).await;
                match result {
                    Ok(signature) => {
                        let response = IPCMessage::TransactionResponse {
                            signature: Some(signature.to_string()),
                            error: None,
                        };
                        if let Err(e) = server_tx.send(response).await {
                            error!("Erreur d'envoi de réponse: {}", e);
                        }
                    }
                    Err(e) => {
                        let response = IPCMessage::TransactionResponse {
                            signature: None,
                            error: Some(e.to_string()),
                        };
                        if let Err(e) = server_tx.send(response).await {
                            error!("Erreur d'envoi de réponse: {}", e);
                        }
                    }
                }
            }
            IPCMessage::SecurityCheck { token, amount } => {
                info!("Réception d'une requête de vérification de sécurité");
                let (is_safe, reason) = security.check_transaction_security(&token, amount).await;
                let response = IPCMessage::SecurityResponse {
                    is_safe,
                    reason,
                };
                if let Err(e) = server_tx.send(response).await {
                    error!("Erreur d'envoi de réponse: {}", e);
                }
            }
            _ => {
                error!("Message IPC non reconnu");
            }
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_main_initialization() {
        assert!(init_logging().is_ok());
    }
}
