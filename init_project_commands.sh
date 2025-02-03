#!/bin/bash

# Création de la structure du projet
echo "🚀 Création de la structure du projet..."
mkdir -p solana_trading_bot/{backend/{python,rust,database},frontend,docs,tests/{unit,integration,end_to_end}}

# Initialisation du dépôt Git
echo "📦 Initialisation du dépôt Git..."
cd solana_trading_bot
git init

# Création du .gitignore
echo "📝 Création du .gitignore..."
cat > .gitignore << EOL
# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.env

# Rust
target/
Cargo.lock
**/*.rs.bk

# Node/Frontend
node_modules/
dist/
.DS_Store

# IDE
.idea/
.vscode/
*.swp

# Database
*.db
*.sqlite3

# Logs
*.log
EOL

# Création du README.md
echo "📚 Création du README.md..."
cat > README.md << EOL
# Bot de Trading Solana

Bot de trading automatisé pour l'écosystème Solana, surveillant les DEX (Raydium, Orca, Saber) et exécutant des transactions.

## Architecture

- Backend:
  - Python: Surveillance DEX et analyse
  - Rust: Interaction blockchain et exécution
  - SQLite: Stockage données
- Frontend: Interface web (React/Vue)

## Installation

\`\`\`bash
# Instructions d'installation à venir
\`\`\`

## Documentation

Voir le dossier \`docs/\` pour plus d'informations.
EOL

# Configuration de l'environnement Python
echo "🐍 Configuration de l'environnement Python..."
cd backend/python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Installation des dépendances Python
echo "📦 Installation des dépendances Python..."
cat > requirements.txt << EOL
solana-py
cryptography
flask
websockets
python-dotenv
pytest
black
flake8
EOL
pip install -r requirements.txt

# Initialisation du projet Rust
echo "🦀 Configuration de l'environnement Rust..."
cd ../rust
cargo init
cat > Cargo.toml << EOL
[package]
name = "solana_trading_bot"
version = "0.1.0"
edition = "2021"

[dependencies]
solana-sdk = "1.17"
anchor-client = "0.28"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dotenv = "0.15"
log = "0.4"
env_logger = "0.10"
EOL

# Retour à la racine du projet
cd ../..

# Configuration de la base de données
echo "🗄️ Configuration de la base de données..."
cd backend/database
cat > init_db.sql << EOL
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    dex TEXT NOT NULL,
    token_address TEXT NOT NULL,
    price REAL NOT NULL,
    volume REAL NOT NULL,
    transaction_hash TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,
    message TEXT NOT NULL
);
EOL

# Création du fichier .env
cd ../..
cat > .env << EOL
# Configuration Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PATH=/path/to/wallet.json

# Configuration Base de données
DATABASE_PATH=backend/database/trading_bot.db

# Configuration API
API_PORT=5000
API_HOST=localhost

# Configuration WebSocket
WS_PORT=8765
WS_HOST=localhost
EOL

echo "✨ Initialisation terminée! Prochaines étapes:"
echo "1. Configurer votre wallet Solana"
echo "2. Ajuster les variables d'environnement dans .env"
echo "3. Initialiser la base de données avec init_db.sql"
echo "4. Faire le premier commit Git"

# Instructions pour le premier commit
echo "
Pour faire le premier commit, exécutez:
git add .
git commit -m \"Initial commit: Project structure and configuration\"
" 