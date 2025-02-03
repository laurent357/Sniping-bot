# Guide d'Installation - Solana Trading Bot

Ce guide détaille les étapes nécessaires pour installer et configurer le bot de trading Solana.

## Prérequis

### Système
- Linux (Ubuntu 20.04+ recommandé) ou macOS
- Python 3.9+
- Rust 1.70+
- Node.js 18+
- Docker (optionnel)

### Dépendances système
```bash
# Ubuntu
sudo apt update
sudo apt install -y build-essential python3-dev python3-pip nodejs npm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Installation

### 1. Clone du repository
```bash
git clone https://github.com/votre-repo/sniping-bot.git
cd sniping-bot
```

### 2. Backend Python

```bash
# Création de l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/macOS
# ou
.\venv\Scripts\activate  # Windows

# Installation des dépendances
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Éditer .env avec vos clés API et configurations
```

### 3. Backend Rust

```bash
cd solana-module
cargo build --release
```

### 4. Frontend React

```bash
cd frontend/trading-bot-ui
npm install
```

## Configuration

### 1. Configuration Solana
- Créez un fichier `.env` dans le dossier racine :
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PATH=/chemin/vers/wallet.json
JUPITER_API_KEY=votre_cle_api
```

### 2. Configuration Base de données
```bash
# Installation de PostgreSQL
sudo apt install postgresql postgresql-contrib

# Création de la base de données
sudo -u postgres createdb trading_bot
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'votre_mot_de_passe';"
```

### 3. Configuration Ollama (pour l'analyse AI)
```bash
# Installation d'Ollama
curl https://ollama.ai/install.sh | sh

# Démarrage du service
systemctl start ollama

# Pull du modèle
ollama pull mistral
```

## Vérification de l'installation

1. Démarrage des services backend :
```bash
# Terminal 1 - Backend Python
source venv/bin/activate
python src/main.py

# Terminal 2 - Backend Rust
cd solana-module
cargo run --release
```

2. Démarrage du frontend :
```bash
# Terminal 3
cd frontend/trading-bot-ui
npm start
```

3. Vérification :
- Backend Python : http://localhost:5000/health
- Frontend : http://localhost:3000

## Dépannage

### Problèmes courants

1. Erreur de connexion à PostgreSQL
```bash
sudo service postgresql restart
```

2. Erreur de connexion à Solana
- Vérifiez votre connexion internet
- Vérifiez que votre RPC est accessible
- Vérifiez vos clés API

3. Erreur de compilation Rust
```bash
cargo clean
cargo update
cargo build --release
```

4. Erreur de dépendances Node.js
```bash
rm -rf node_modules package-lock.json
npm install
```

## Support

Pour tout problème ou question :
1. Consultez les issues GitHub
2. Vérifiez les logs dans `logs/`
3. Contactez l'équipe de support

## Mise à jour

Pour mettre à jour le bot :
```bash
git pull
pip install -r requirements.txt
cd solana-module && cargo update
cd frontend/trading-bot-ui && npm install
``` 