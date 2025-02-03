# Guide de Déploiement - Solana Trading Bot

Ce guide détaille les étapes pour déployer le bot de trading en production.

## Architecture de Déploiement

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

## Prérequis Production

- Serveur Ubuntu 20.04 LTS
- 8GB RAM minimum
- 4 vCPUs minimum
- 100GB SSD
- Domaine configuré avec DNS

## Configuration Serveur

### 1. Sécurité de base
```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Configuration firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Configuration SSH
sudo nano /etc/ssh/sshd_config
# Modifier :
# PermitRootLogin no
# PasswordAuthentication no
sudo systemctl restart sshd
```

### 2. Installation Docker
```bash
# Installation Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installation Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Configuration Docker

### 1. Structure des fichiers
```
deployment/
├── docker-compose.yml
├── .env
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   └── gunicorn.conf.py
├── frontend/
│   └── Dockerfile
└── rust/
    └── Dockerfile
```

### 2. Docker Compose
```yaml
version: '3.8'

services:
  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build: ./frontend
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      - POSTGRES_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
      - rust
      - ollama

  rust:
    build: ./rust
    environment:
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
    volumes:
      - ./wallet:/app/wallet

  ollama:
    image: ollama/ollama
    volumes:
      - ./ollama:/root/.ollama

  db:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Déploiement

### 1. Préparation
```bash
# Clone du repository
git clone https://github.com/votre-repo/sniping-bot.git
cd sniping-bot

# Configuration des variables d'environnement
cp .env.example .env
nano .env
```

### 2. SSL avec Let's Encrypt
```bash
# Installation Certbot
sudo apt install certbot python3-certbot-nginx

# Obtention du certificat
sudo certbot --nginx -d votredomaine.com
```

### 3. Déploiement initial
```bash
# Build et démarrage des conteneurs
docker-compose build
docker-compose up -d

# Vérification des logs
docker-compose logs -f
```

## Monitoring

### 1. Prometheus & Grafana
```bash
# Installation Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Installation Grafana
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### 2. Logging
```bash
# Installation ELK Stack
docker-compose -f elk-stack.yml up -d
```

## Maintenance

### 1. Backup
```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d)
docker-compose exec db pg_dump -U postgres trading_bot > backup_$DATE.sql
tar -czf config_$DATE.tar.gz .env docker-compose.yml
```

### 2. Mise à jour
```bash
# Pull des dernières modifications
git pull origin main

# Rebuild et redémarrage
docker-compose down
docker-compose build
docker-compose up -d
```

## Scaling

### 1. Horizontal Scaling
```bash
# Scaling des services
docker-compose up -d --scale backend=3 --scale rust=2
```

### 2. Load Balancer (HAProxy)
```bash
# Installation HAProxy
sudo apt install haproxy

# Configuration
sudo nano /etc/haproxy/haproxy.cfg
```

## Sécurité

### 1. Secrets Management
- Utilisation de Docker Secrets
- Vault pour les clés API

### 2. Monitoring Sécurité
- Fail2ban
- CrowdSec
- Monitoring des logs

## Troubleshooting

### 1. Vérification des services
```bash
# Status des conteneurs
docker-compose ps

# Logs des services
docker-compose logs service_name

# Utilisation ressources
docker stats
```

### 2. Problèmes courants
1. Erreur de connexion DB
```bash
docker-compose restart db
docker-compose exec db pg_isready
```

2. Problèmes de mémoire
```bash
# Vérification mémoire
free -h
docker system prune
```

3. Problèmes réseau
```bash
# Test connectivité
docker network ls
docker network inspect sniping-bot_default
``` 