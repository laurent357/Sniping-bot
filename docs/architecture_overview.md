# Architecture du Solana Token Sniping Bot

## Vue d'ensemble

Le bot est construit sur une architecture hybride Python/Rust pour optimiser à la fois la flexibilité et la performance.

```
[Frontend Web] <-> [API Flask] <-> [Python Core] <-> [Rust Engine] <-> [Solana Network]
```

## Composants Principaux

### 1. Module de Détection (Python)
- **Composants**:
  - `dex_monitoring/raydium.py`: Surveillance Raydium
  - `dex_monitoring/orca.py`: Surveillance Orca
  - `dex_monitoring/saber.py`: Surveillance Saber
- **Responsabilités**:
  - Détection des nouveaux pools de liquidité
  - Analyse en temps réel des prix
  - Filtrage initial des opportunités

### 2. Module d'Analyse (Python)
- **Composants**:
  - `token_analysis/filters.py`: Filtres de sécurité
  - `token_analysis/ai_analysis.py`: Analyse prédictive
- **Responsabilités**:
  - Validation des smart contracts
  - Détection des honeypots
  - Scoring des opportunités

### 3. Module d'Exécution (Rust)
- **Composants**:
  - `src/solana_interaction.rs`: Interface Solana
  - `src/transaction_execution.rs`: Exécution
  - `src/security.rs`: Sécurité
- **Responsabilités**:
  - Communication avec la blockchain
  - Exécution rapide des transactions
  - Gestion sécurisée des clés

### 4. Interface Web (Flask/React)
- **Composants**:
  - API REST Flask
  - Frontend React
  - WebSockets
- **Responsabilités**:
  - Configuration du bot
  - Monitoring en temps réel
  - Visualisation des performances

## Flux de Données

1. **Détection**:
   ```
   DEX -> Python Monitors -> Event Queue
   ```

2. **Analyse**:
   ```
   Event Queue -> Analysis Module -> Trading Decisions
   ```

3. **Exécution**:
   ```
   Trading Decisions -> Rust Engine -> Solana Network
   ```

## Base de Données

### Structure
- Tables principales:
  - `transactions`: Historique des transactions
  - `tokens`: Informations sur les tokens
  - `logs`: Journal système
  - `settings`: Configuration du bot

### Schéma
```sql
transactions:
  - id (PRIMARY KEY)
  - timestamp
  - token_address
  - price
  - volume
  - status

tokens:
  - address (PRIMARY KEY)
  - name
  - first_seen
  - risk_score
  - status

logs:
  - id (PRIMARY KEY)
  - timestamp
  - level
  - message
```

## Sécurité

### Mesures Implémentées
1. Chiffrement des clés privées
2. Validation des smart contracts
3. Limites de trading
4. Monitoring des transactions

### Points d'Attention
- Protection contre les rugpulls
- Validation des pools de liquidité
- Limites de slippage
- Timeouts de transaction

## Performance

### Objectifs
- Détection < 100ms
- Analyse < 200ms
- Exécution < 200ms
- Total < 500ms

### Optimisations
1. Utilisation de Rust pour les opérations critiques
2. Cache en mémoire pour les données fréquentes
3. Connexions WebSocket persistantes
4. Parallélisation des analyses
