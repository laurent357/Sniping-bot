use serde::{Serialize, Deserialize};
use tokio::{
    net::{UnixListener, UnixStream},
    io::{AsyncReadExt, AsyncWriteExt},
};
use std::{
    error::Error,
    path::PathBuf,
};
use log::{info, error};
use thiserror::Error;
use tokio::sync::mpsc;

#[derive(Error, Debug)]
pub enum IPCError {
    #[error("Erreur de connexion: {0}")]
    ConnectionError(String),
    #[error("Erreur de sérialisation: {0}")]
    SerializationError(String),
    #[error("Erreur de réception: {0}")]
    ReceiveError(String),
    #[error("Canal fermé")]
    ChannelClosed,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum IPCMessage {
    ExecuteTransaction {
        instructions: Vec<u8>,
        priority: u8,
    },
    TransactionResult {
        success: bool,
        signature: Option<String>,
        error: Option<String>,
    },
    SecurityCheck {
        token: String,
        amount: u64,
    },
    SecurityResponse {
        is_safe: bool,
        reason: Option<String>,
    },
}

pub struct IPCServer {
    socket_path: PathBuf,
    tx: mpsc::Sender<IPCMessage>,
    rx: mpsc::Receiver<IPCMessage>,
}

impl IPCServer {
    pub fn new(socket_path: PathBuf) -> Self {
        let (tx, rx) = mpsc::channel(100);
        Self {
            socket_path,
            tx,
            rx,
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn Error>> {
        // Supprime le socket s'il existe déjà
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)?;
        }

        let listener = UnixListener::bind(&self.socket_path)?;
        info!("Serveur IPC démarré sur {:?}", self.socket_path);

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let sender = self.tx.clone();
                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_connection(stream, sender).await {
                            error!("Erreur de gestion de connexion: {}", e);
                        }
                    });
                }
                Err(e) => {
                    error!("Erreur d'acceptation de connexion: {}", e);
                }
            }
        }
    }

    async fn handle_connection(
        mut stream: UnixStream,
        sender: mpsc::Sender<IPCMessage>,
    ) -> Result<(), Box<dyn Error>> {
        let mut buffer = Vec::new();
        stream.read_to_end(&mut buffer).await?;

        let message: IPCMessage = serde_json::from_slice(&buffer)?;
        sender.send(message).await.map_err(|_| IPCError::ChannelClosed)?;

        Ok(())
    }

    pub async fn send_response(&self, message: IPCMessage) -> Result<(), Box<dyn Error>> {
        let mut stream = UnixStream::connect(&self.socket_path).await?;
        let data = serde_json::to_vec(&message)?;
        stream.write_all(&data).await?;
        Ok(())
    }

    pub async fn receive_message(&mut self) -> Result<IPCMessage, Box<dyn Error>> {
        self.rx.recv().await.ok_or_else(|| Box::new(IPCError::ChannelClosed) as Box<dyn Error>)
    }

    pub async fn send(&self, message: IPCMessage) -> Result<(), mpsc::error::SendError<IPCMessage>> {
        self.tx.send(message).await
    }

    pub async fn receive(&mut self) -> Option<IPCMessage> {
        self.rx.recv().await
    }
}

impl Clone for IPCServer {
    fn clone(&self) -> Self {
        let (tx, rx) = mpsc::channel(100);
        Self {
            socket_path: self.socket_path.clone(),
            tx,
            rx,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use tokio::fs;

    #[tokio::test]
    async fn test_ipc_server_creation() {
        let dir = tempdir().unwrap();
        let socket_path = dir.path().join("test.sock");
        let server = IPCServer::new(socket_path.clone());
        
        assert!(!socket_path.exists());
        
        // Démarre le serveur en background
        let server_handle = tokio::spawn(async move {
            server.start().await.unwrap();
        });
        
        // Attend un peu que le serveur démarre
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        assert!(socket_path.exists());
        
        // Nettoie
        server_handle.abort();
        fs::remove_file(socket_path).await.unwrap();
    }

    #[tokio::test]
    async fn test_message_serialization() {
        let message = IPCMessage::TransactionRequest {
            instructions: vec![1, 2, 3],
            priority: "HIGH".to_string(),
            max_retries: 3,
        };

        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: IPCMessage = serde_json::from_str(&serialized).unwrap();

        match deserialized {
            IPCMessage::TransactionRequest { instructions, priority, max_retries } => {
                assert_eq!(instructions, vec![1, 2, 3]);
                assert_eq!(priority, "HIGH");
                assert_eq!(max_retries, 3);
            }
            _ => panic!("Mauvais type de message désérialisé"),
        }
    }
} 