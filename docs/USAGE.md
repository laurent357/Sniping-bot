# Guide d'Utilisation - Solana Trading Bot

Ce guide explique comment utiliser efficacement le bot de trading Solana.

## Interface Utilisateur

### Vue d'ensemble
L'interface est divisée en plusieurs sections principales :
- **Token Overview** : Vue d'ensemble des tokens surveillés
- **Trading Form** : Interface de trading
- **Order Book** : Carnet d'ordres en temps réel
- **Transaction History** : Historique des transactions

### Token Overview
- Affiche les statistiques en temps réel des tokens
- Indicateurs :
  - Prix actuel
  - Variation sur 24h
  - Volume
  - Liquidité
  - Score de risque AI

### Trading Form
1. Sélection des tokens :
   - Token d'entrée (ex: USDC)
   - Token de sortie (ex: SOL)
2. Configuration du trade :
   - Montant
   - Slippage maximum (%)
   - Type d'ordre (Market/Limit)
3. Validation et exécution

### Order Book
- Visualisation en temps réel des ordres
- Code couleur :
  - Vert : Ordres d'achat
  - Rouge : Ordres de vente
- Profondeur du marché
- Spread actuel

### Transaction History
- Liste des transactions effectuées
- Statut des transactions
- Lien vers l'explorateur Solana
- Filtres et recherche

## Configuration du Trading

### Paramètres de Risk Management
1. Stop Loss :
   ```json
   {
     "enabled": true,
     "percentage": 5,
     "trailing": false
   }
   ```

2. Take Profit :
   ```json
   {
     "enabled": true,
     "percentage": 10,
     "trailing": true
   }
   ```

### Stratégies de Trading

1. Sniping automatique :
   ```json
   {
     "enabled": true,
     "minLiquidity": 10000,
     "maxSlippage": 1,
     "minAIScore": 7
   }
   ```

2. DCA (Dollar Cost Averaging) :
   ```json
   {
     "enabled": false,
     "interval": "1h",
     "amount": 100,
     "maxOrders": 10
   }
   ```

## Analyse AI

### Scores de Risque
- 1-3 : Risque élevé
- 4-6 : Risque modéré
- 7-10 : Risque faible

### Facteurs analysés
1. Contrat
   - Code source vérifié
   - Permissions
   - Fonctions critiques
2. Liquidité
   - Profondeur du marché
   - Concentration des holders
3. Social
   - Activité Twitter
   - Holders actifs
   - Score de confiance

## Monitoring et Alertes

### Configuration des Alertes
```json
{
  "price": {
    "enabled": true,
    "threshold": 5,
    "interval": "5m"
  },
  "volume": {
    "enabled": true,
    "threshold": 50,
    "interval": "1h"
  },
  "risk": {
    "enabled": true,
    "minScore": 3
  }
}
```

### Notifications
- Email
- Webhook Discord
- Telegram

## Maintenance

### Sauvegarde
```bash
# Backup de la base de données
pg_dump trading_bot > backup.sql

# Backup des configurations
cp .env .env.backup
```

### Logs
- Location : `logs/`
- Rotation : quotidienne
- Rétention : 30 jours

## Bonnes Pratiques

1. Trading
   - Commencez avec de petits montants
   - Utilisez les stop loss
   - Surveillez les scores AI
   - Vérifiez la liquidité

2. Sécurité
   - Utilisez un wallet dédié
   - Activez 2FA
   - Surveillez les permissions
   - Faites des sauvegardes régulières

3. Performance
   - Surveillez l'utilisation CPU/RAM
   - Nettoyez les logs régulièrement
   - Optimisez les paramètres RPC

## Dépannage

### Erreurs Communes
1. "Insufficient liquidity"
   - Vérifiez la liquidité du pool
   - Réduisez le montant
   - Augmentez le slippage

2. "Transaction failed"
   - Vérifiez le solde SOL
   - Vérifiez la connexion RPC
   - Réessayez avec plus de slippage

3. "AI Analysis timeout"
   - Vérifiez le service Ollama
   - Augmentez le timeout
   - Réduisez la complexité 