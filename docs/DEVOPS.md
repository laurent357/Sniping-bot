# Guide DevOps - Solana Trading Bot

Ce guide détaille les procédures DevOps pour le déploiement, la maintenance et le monitoring du bot de trading.

## Architecture

```
                                   [Load Balancer]
                                         │
                    ┌────────────────────┴───────────────────┐
                    │                                        │
             [Backend Python]                         [Frontend React]
                    │                                        │
         ┌──────────┴──────────┐                    [Nginx Server]
         │                     │
[Backend Rust]           [PostgreSQL]
         │                     │
   [Ollama AI]         [Redis Cache]
```

## Déploiement

### Prérequis
- Docker Engine 20.10+
- Docker Compose 2.0+
- 16GB RAM minimum
- 4 vCPUs minimum
- 200GB SSD
- Accès root au serveur

### Installation initiale
```bash
# Clone du repository
git clone https://github.com/votre-repo/sniping-bot.git
cd sniping-bot

# Configuration des variables d'environnement
cp .env.example .env
nano .env

# Démarrage des services
docker-compose up -d
```

### Configuration SSL
```bash
# Installation certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Obtention du certificat
certbot --nginx -d votredomaine.com
```

### Mise à jour des services
```bash
# Pull des dernières modifications
git pull origin main

# Rebuild et redémarrage des services
docker-compose down
docker-compose build
docker-compose up -d
```

## Monitoring

### Métriques système
- CPU, Mémoire, Disque
- Latence réseau
- Temps de réponse des services

### Métriques applicatives
- Nombre de trades
- Temps de traitement des ordres
- Taux de réussite des transactions
- Utilisation de l'API

### Configuration Prometheus
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'trading-bot'
    static_configs:
      - targets: ['backend:5000', 'rust:50051']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Dashboards Grafana
1. System Overview
   - Utilisation des ressources
   - Santé des services
   - Alertes actives

2. Trading Metrics
   - Volume de trades
   - Performance des exécutions
   - Analyse des erreurs

3. Application Performance
   - Latence API
   - Taux d'erreur
   - Utilisation cache

## Logging

### Configuration ELK Stack
```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### Rétention des logs
- Application logs: 30 jours
- Access logs: 90 jours
- Error logs: 180 jours
- Audit logs: 365 jours

### Alertes
1. Critiques
   - Service down
   - Erreur base de données
   - Perte connexion Solana

2. Warning
   - Haute utilisation CPU/RAM
   - Latence élevée
   - Taux d'erreur anormal

## Backup

### Base de données
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/db"

# Backup PostgreSQL
docker-compose exec -T db pg_dump -U postgres trading_bot > $BACKUP_DIR/db_$DATE.sql

# Compression
gzip $BACKUP_DIR/db_$DATE.sql

# Rotation (garde 30 jours)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

### Configuration
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/config"

# Backup des fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    .env \
    docker-compose.yml \
    monitoring/ \
    nginx/

# Rotation
find $BACKUP_DIR -name "config_*.tar.gz" -mtime +30 -delete
```

## Sécurité

### Hardening
1. Système
   ```bash
   # Update système
   apt-get update && apt-get upgrade -y
   
   # Configuration firewall
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw enable
   ```

2. Docker
   ```bash
   # Limiter les ressources
   docker update --cpu-quota=50000 trading-bot_backend
   docker update --memory=2G trading-bot_backend
   ```

3. Services
   - Utilisation de secrets
   - Rotation des clés API
   - Monitoring des accès

### Audit
- Scan des vulnérabilités
- Tests de pénétration
- Revue des logs

## Scaling

### Horizontal Scaling
```bash
# Scaling des services
docker-compose up -d --scale backend=3 --scale rust=2
```

### Load Balancing
```nginx
# nginx.conf
upstream backend {
    server backend:5000;
    server backend:5001;
    server backend:5002;
}
```

### Cache
```yaml
# Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Troubleshooting

### Problèmes courants
1. Service down
   ```bash
   # Vérification des logs
   docker-compose logs service_name
   
   # Restart service
   docker-compose restart service_name
   ```

2. Performance
   ```bash
   # Monitoring ressources
   docker stats
   
   # Nettoyage
   docker system prune
   ```

3. Base de données
   ```bash
   # Vérification connexion
   docker-compose exec db pg_isready
   
   # Vacuum
   docker-compose exec db vacuumdb -U postgres -d trading_bot
   ```

### Recovery
1. Service restoration
   ```bash
   # Rollback version
   git checkout last-working-commit
   docker-compose up -d
   ```

2. Database recovery
   ```bash
   # Restore from backup
   cat backup.sql | docker-compose exec -T db psql -U postgres trading_bot
   ``` 