# Solana Token Sniping Bot

## Description
Bot de sniping haute performance pour l'écosystème Solana, spécialisé dans la détection et l'achat rapide de nouveaux tokens sur les DEX majeurs (Raydium, Orca, Saber).

## Fonctionnalités Principales
- 🔍 Détection ultra-rapide des nouveaux tokens
- ⚡ Exécution des transactions en moins de 500ms
- 🛡️ Analyse de sécurité des smart contracts
- 🤖 Système d'IA pour l'analyse des opportunités
- 🚫 Détection des honeypots
- 📊 Interface web pour le monitoring en temps réel

## Architecture Technique

### Backend
- **Python (Détection & Analyse)**
  - Monitoring DEX (raydium.py, orca.py, saber.py)
  - Analyse des tokens (filters.py, ai_analysis.py)
  - API Flask pour l'interface web
  - WebSockets pour les alertes en temps réel

- **Rust (Exécution)**
  - Interface Solana (solana_interaction.rs)
  - Exécution des transactions (transaction_execution.rs)
  - Sécurité (security.rs)

- **Base de données**
  - SQLite pour le stockage des transactions et logs

## Installation

### Prérequis
- Python 3.8+
- Rust 1.70+
- Node.js 16+
- Solana CLI

### Configuration
1. Cloner le repository
```bash
git clone <repository-url>
cd solana-sniping-bot
```

2. Créer un environnement virtuel
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
```

3. Installer les dépendances
```bash
pip install -r requirements.txt
```

4. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

## Structure du Projet
```
solana-sniping-bot/
├── backend/
│   ├── python/
│   │   ├── dex_monitoring/
│   │   ├── token_analysis/
│   │   └── utils/
│   ├── rust/
│   │   └── src/
│   └── database/
├── frontend/
├── docs/
└── tests/
```

## État du Projet

### Complété ✅
- Structure du projet initialisée
- Configuration des environnements Python et Rust
- Base de données configurée
- Scripts d'initialisation

### En Cours 🏗️
- Développement des modules de détection DEX
- Interface Solana en Rust
- Communication inter-modules

## Sécurité
- Gestion sécurisée des clés privées
- Validation automatique des smart contracts
- Limites de trading configurables
- Système de logs détaillé

## Utilisation

1. Démarrer l'application
```bash
python src/main.py
```

2. Accéder à l'interface web
```
http://localhost:5000
```

## Tests

```bash
pytest tests/
```

## Documentation
- Guide Utilisateur : docs/user_guide.md
- Documentation API : docs/api_documentation.md
- Architecture : docs/architecture_overview.md

## Support & Contact
- Email: support@example.com
- Forum: https://forum.example.com

## Licence
[Type de Licence]

## Développement Local

### Prérequis
- Node.js 18.x
- Python 3.9
- Rust 1.70+
- Docker et Docker Compose
- PostgreSQL 14
- Redis 7

### Configuration de l'environnement

1. **Cloner le repository**
```bash
git clone https://github.com/votre-repo/sniping-bot.git
cd sniping-bot
```

2. **Configuration des variables d'environnement**
```bash
# Copier les fichiers d'exemple
cp .env.example .env
cp frontend/trading-bot-ui/.env.example frontend/trading-bot-ui/.env
cp backend/.env.example backend/.env
```

3. **Installation des dépendances**

Frontend:
```bash
cd frontend/trading-bot-ui
npm install
```

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou `venv\Scripts\activate` sur Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

Module Rust:
```bash
cd solana-module
cargo build
```

### Lancement en mode développement

1. **Démarrer les services requis**
```bash
docker-compose -f docker-compose.dev.yml up -d postgres redis
```

2. **Lancer le backend**
```bash
cd backend
source venv/bin/activate
python src/main.py
```

3. **Lancer le module Rust**
```bash
cd solana-module
cargo run
```

4. **Lancer le frontend**
```bash
cd frontend/trading-bot-ui
npm start
```

L'application sera accessible sur :
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Module Rust: port 50051 (gRPC)

### Tests

Frontend:
```bash
cd frontend/trading-bot-ui
npm run test        # Tests unitaires
npm run test:e2e    # Tests E2E
npm run test:ci     # Tous les tests avec couverture
```

Backend:
```bash
cd backend
pytest              # Tests unitaires
pytest --cov=.      # Tests avec couverture
```

Module Rust:
```bash
cd solana-module
cargo test
```

### Debugging

1. **Frontend**
- Ouvrir Chrome DevTools (F12)
- Utiliser l'onglet "React Developer Tools" pour inspecter les composants
- Vérifier les logs dans la console
- Utiliser les points d'arrêt dans l'onglet Sources

2. **Backend**
- Utiliser les logs de debug:
```python
import logging
logging.debug("Message de debug")
```
- Lancer avec debugger:
```bash
python -m debugpy --listen 5678 src/main.py
```

3. **Module Rust**
- Utiliser les logs avec `tracing`:
```rust
use tracing::debug;
debug!("Message de debug");
```
- Lancer avec debugger:
```bash
RUST_LOG=debug cargo run
```

4. **Monitoring en temps réel**
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Kibana: http://localhost:5601

### Commandes utiles

**Docker:**
```bash
# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart <service>

# Nettoyer les volumes
docker-compose down -v
```

**Base de données:**
```bash
# Accéder à PostgreSQL
docker-compose exec postgres psql -U postgres trading_bot

# Réinitialiser la base
docker-compose down -v
docker-compose up -d postgres
```

**Redis:**
```bash
# Accéder à Redis CLI
docker-compose exec redis redis-cli

# Nettoyer le cache
docker-compose exec redis redis-cli FLUSHALL
```

### Résolution des problèmes courants

1. **Erreur de connexion à la base de données**
- Vérifier que PostgreSQL est en cours d'exécution
- Vérifier les variables d'environnement dans `.env`
- Vérifier les logs: `docker-compose logs postgres`

2. **Erreur de WebSocket**
- Vérifier que le backend est en cours d'exécution
- Vérifier la configuration CORS
- Vérifier les logs du backend

3. **Erreur de build frontend**
- Nettoyer le cache: `npm clean-cache`
- Supprimer node_modules: `rm -rf node_modules && npm install`
- Vérifier les versions des dépendances

4. **Erreur de communication avec le module Rust**
- Vérifier que le service gRPC est en cours d'exécution
- Vérifier les logs Rust
- Vérifier la configuration du port
