# Guide du Développeur - Solana Token Sniping Bot

## Table des Matières
1. [URLs et Points d'Accès](#urls-et-points-daccès)
2. [Debugging](#debugging)
3. [Monitoring](#monitoring)
4. [Base de Données](#base-de-données)
5. [Logs et Métriques](#logs-et-métriques)
6. [Tests](#tests)
7. [Déploiement](#déploiement)
8. [Troubleshooting](#troubleshooting)

## URLs et Points d'Accès

### Services Principaux
- **Frontend (UI Trading Bot)**
  - URL: http://localhost:3002
  - WebSocket: ws://localhost:8765
  - Routes principales:
    - `/orderbook` - Order Book en temps réel
    - `/trades` - Historique des trades
    - `/settings` - Configuration du bot
    - `/metrics` - Métriques de performance

- **Backend API**
  - URL: http://localhost:5000
  - Documentation API: http://localhost:5000/docs
  - Endpoints clés:
    - `POST /api/v1/trades/execute` - Exécuter un trade
    - `GET /api/v1/tokens/analyze` - Analyser un token
    - `GET /api/v1/market/status` - État du marché
    - `POST /api/v1/bot/configure` - Configurer le bot

### Services de Monitoring
- **Grafana**
  - URL: http://localhost:3001
  - Credentials par défaut: admin/admin
  - Dashboards importants:
    - Trading Performance
    - System Health
    - Token Analysis
    - Market Overview

- **Prometheus**
  - URL: http://localhost:9090
  - Métriques clés:
    - `trade_execution_time`
    - `token_analysis_duration`
    - `market_liquidity`
    - `bot_performance`

- **Kibana**
  - URL: http://localhost:5601
  - Index patterns:
    - `trading-bot-*` - Logs applicatifs
    - `market-data-*` - Données de marché
    - `performance-*` - Métriques de performance

- **Elasticsearch**
  - URL: http://localhost:9200
  - API endpoints utiles:
    - `/_cat/indices` - Liste des indices
    - `/_cluster/health` - Santé du cluster

### Base de Données
- **PostgreSQL**
  - Port: 5433
  - URL: postgresql://postgres:postgres@localhost:5433/trading_bot
  - Tables principales:
    - `trades` - Historique des trades
    - `tokens` - Informations sur les tokens
    - `market_data` - Données de marché
    - `bot_config` - Configuration du bot

- **Redis**
  - Port: 6380
  - URL: redis://localhost:6380/0
  - Clés importantes:
    - `market:latest` - Dernières données de marché
    - `analysis:cache` - Cache d'analyse
    - `bot:status` - État du bot

## Debugging

### Frontend Debugging
1. **Chrome DevTools (F12)**
   - Console: Erreurs et logs
   - Network: Requêtes API et WebSocket
   - React DevTools: État des composants
   - Performance: Analyse des performances UI

2. **WebSocket Debugging**
   ```javascript
   // Dans la console du navigateur
   localStorage.setItem('debug', 'websocket:*');
   // Voir tous les événements WebSocket
   ```

3. **Redux DevTools**
   - État global de l'application
   - Actions et mutations
   - Time-travel debugging

### Backend Debugging
1. **Logs en temps réel**
   ```bash
   # Logs backend
   docker-compose logs -f backend
   
   # Logs spécifiques
   docker-compose logs -f backend | grep ERROR
   ```

2. **Debugging Python**
   ```bash
   # Lancer avec debugger
   python -m debugpy --listen 5678 src/main.py
   
   # Dans VS Code
   {
     "configurations": [{
       "name": "Python: Remote Attach",
       "type": "python",
       "request": "attach",
       "port": 5678,
       "host": "localhost"
     }]
   }
   ```

3. **Tests et Coverage**
   ```bash
   # Tests unitaires avec coverage
   pytest --cov=. --cov-report=html
   
   # Ouvrir le rapport
   open htmlcov/index.html
   ```

### Module Rust Debugging
1. **Logs Rust**
   ```bash
   # Activer les logs détaillés
   RUST_LOG=debug cargo run
   
   # Logs spécifiques
   RUST_LOG=solana_module=trace cargo run
   ```

2. **Debugging avec GDB**
   ```bash
   rust-gdb target/debug/solana-module
   ```

## Monitoring

### Grafana Dashboards
1. **Trading Performance**
   - Taux de réussite des trades
   - Temps d'exécution
   - Profits/Pertes
   - Volume de trading

2. **System Health**
   - Utilisation CPU/Mémoire
   - Latence réseau
   - Erreurs système
   - État des services

3. **Market Analysis**
   - Liquidité du marché
   - Volatilité des prix
   - Spread analysis
   - Volume par token

### Alerting
1. **Configuration des alertes**
   ```yaml
   # /monitoring/alerting/rules.yml
   groups:
     - name: trading_alerts
       rules:
         - alert: HighLatency
           expr: trade_execution_time > 1000
           for: 1m
   ```

2. **Canaux de notification**
   - Slack
   - Email
   - Telegram
   - Discord

## Base de Données

### PostgreSQL
1. **Connexion**
   ```bash
   psql -h localhost -p 5433 -U postgres -d trading_bot
   ```

2. **Requêtes utiles**
   ```sql
   -- Performances des trades
   SELECT date_trunc('day', created_at) as day,
          count(*) as total_trades,
          avg(profit_loss) as avg_pl
   FROM trades
   GROUP BY day
   ORDER BY day DESC;
   
   -- Analyse des tokens
   SELECT t.symbol,
          count(tr.id) as trade_count,
          avg(tr.profit_loss) as avg_profit
   FROM tokens t
   JOIN trades tr ON t.id = tr.token_id
   GROUP BY t.symbol
   ORDER BY avg_profit DESC;
   ```

### Redis
1. **Commandes utiles**
   ```bash
   # Connexion
   redis-cli -p 6380
   
   # Monitoring
   MONITOR
   
   # Statistiques
   INFO
   ```

2. **Patterns de clés**
   ```bash
   # Liste des clés
   KEYS *
   
   # Données de marché
   HGETALL market:latest
   
   # Cache d'analyse
   GET analysis:token:{token_id}
   ```

## Logs et Métriques

### Elasticsearch
1. **Requêtes utiles**
   ```bash
   # Santé du cluster
   curl localhost:9200/_cluster/health
   
   # Recherche dans les logs
   curl -X GET "localhost:9200/trading-bot-*/_search" -H 'Content-Type: application/json' -d'
   {
     "query": {
       "match": {
         "level": "ERROR"
       }
     }
   }'
   ```

### Kibana
1. **Visualisations importantes**
   - Heatmap des trades
   - Distribution des erreurs
   - Latence par endpoint
   - Volume de transactions

## Tests

### Frontend
```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

### Backend
```bash
# Tests unitaires
pytest

# Tests d'intégration
pytest tests/integration

# Tests de performance
locust -f tests/performance/locustfile.py
```

### Module Rust
```bash
# Tests unitaires
cargo test

# Tests d'intégration
cargo test --test '*'

# Benchmarks
cargo bench
```

## Troubleshooting

### Problèmes Courants

1. **Erreur WebSocket**
   ```bash
   # Vérifier les logs
   docker-compose logs -f backend | grep websocket
   
   # Redémarrer le service
   docker-compose restart backend
   ```

2. **Latence élevée**
   ```bash
   # Vérifier les métriques
   curl localhost:9090/api/v1/query?query=trade_execution_time
   
   # Analyser les logs
   docker-compose logs --tail=100 backend | grep "execution_time"
   ```

3. **Erreurs de base de données**
   ```bash
   # Vérifier la connexion
   pg_isready -h localhost -p 5433
   
   # Voir les connexions actives
   psql -h localhost -p 5433 -U postgres -c "SELECT * FROM pg_stat_activity;"
   ```

### Commandes de Maintenance

1. **Nettoyage**
   ```bash
   # Nettoyer les conteneurs
   docker-compose down -v
   
   # Nettoyer le cache
   redis-cli -p 6380 FLUSHALL
   
   # Reconstruire les images
   docker-compose build --no-cache
   ```

2. **Backup**
   ```bash
   # Backup PostgreSQL
   pg_dump -h localhost -p 5433 -U postgres trading_bot > backup.sql
   
   # Backup Redis
   redis-cli -p 6380 SAVE
   ```

3. **Restauration**
   ```bash
   # Restaurer PostgreSQL
   psql -h localhost -p 5433 -U postgres trading_bot < backup.sql
   
   # Restaurer Redis
   cp dump.rdb /data/dump.rdb
   docker-compose restart redis
   ```

## Ressources Additionnelles

### Documentation
- [Documentation API](http://localhost:5000/docs)
- [Documentation Technique](./docs/technical.md)
- [Guide de Déploiement](./docs/deployment.md)
- [Guide de Contribution](./CONTRIBUTING.md)

### Outils de Développement
- VS Code avec extensions:
  - Python
  - Rust
  - Docker
  - PostgreSQL
  - Redis
  - REST Client

### Scripts Utiles
- `scripts/setup.sh` - Installation initiale
- `scripts/debug.sh` - Configuration du debugging
- `scripts/monitor.sh` - Dashboard de monitoring
- `scripts/backup.sh` - Sauvegarde des données 