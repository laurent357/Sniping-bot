use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub enum WalletType {
    /// Utilise un wallet Phantom existant via sa clé privée
    Phantom,
    /// Crée un nouveau wallet dédié
    Dedicated,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletConfig {
    /// Type de wallet à utiliser
    pub wallet_type: WalletType,
    /// Chemin vers le fichier de clé privée (pour wallet dédié)
    pub keypair_path: Option<PathBuf>,
    /// Clé privée encodée en base58 (pour Phantom)
    pub private_key: Option<String>,
} 