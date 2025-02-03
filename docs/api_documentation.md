# API Documentation - Sniping Bot

## Vue d'ensemble

L'API du Sniping Bot fournit une interface RESTful et WebSocket pour interagir avec le système de trading automatisé sur Solana.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentification

Toutes les requêtes API nécessitent un token JWT dans l'en-tête Authorization :

```
Authorization: Bearer <token>
```

## Endpoints

### Monitoring

#### GET /tokens/new
Récupère les nouveaux tokens détectés.

**Paramètres Query :**
- `min_liquidity`: (float, optionnel) Liquidité minimale en USD
- `time_range`: (string, optionnel) Période de temps ("1h", "24h", "7d")

**Réponse :**
```json
{
    "tokens": [
        {
            "address": "string",
            "symbol": "string",
            "name": "string",
            "liquidity_usd": "float",
            "created_at": "timestamp",
            "risk_score": "float"
        }
    ]
}
```

#### GET /pools/active
Liste les pools actifs.

**Paramètres Query :**
- `dex`: (string, optionnel) Filtre par DEX
- `min_volume`: (float, optionnel) Volume minimum en USD

**Réponse :**
```json
{
    "pools": [
        {
            "id": "string",
            "dex": "string",
            "token_a": "string",
            "token_b": "string",
            "liquidity_usd": "float",
            "volume_24h": "float"
        }
    ]
}
```

### Trading

#### POST /trades/execute
Exécute un trade.

**Body :**
```json
{
    "input_token": "string",
    "output_token": "string",
    "amount": "float",
    "slippage": "float",
    "route": "string"
}
```

**Réponse :**
```json
{
    "transaction_id": "string",
    "status": "string",
    "execution_price": "float",
    "timestamp": "timestamp"
}
```

#### GET /trades/history
Récupère l'historique des trades.

**Paramètres Query :**
- `start_date`: (timestamp, optionnel)
- `end_date`: (timestamp, optionnel)
- `status`: (string, optionnel) ["completed", "pending", "failed"]

**Réponse :**
```json
{
    "trades": [
        {
            "id": "string",
            "input_token": "string",
            "output_token": "string",
            "amount": "float",
            "execution_price": "float",
            "status": "string",
            "timestamp": "timestamp"
        }
    ]
}
```

### Analyse

#### GET /analysis/token/{token_address}
Analyse détaillée d'un token.

**Réponse :**
```json
{
    "token_info": {
        "address": "string",
        "name": "string",
        "symbol": "string",
        "decimals": "integer"
    },
    "risk_analysis": {
        "score": "float",
        "factors": ["string"],
        "warnings": ["string"]
    },
    "market_data": {
        "price_usd": "float",
        "volume_24h": "float",
        "liquidity_usd": "float",
        "holders": "integer"
    }
}
```

### WebSocket API

#### Connexion
```javascript
ws://localhost:5000/ws
```

#### Events

##### `token.new`
Notification de nouveau token.
```json
{
    "event": "token.new",
    "data": {
        "address": "string",
        "symbol": "string",
        "liquidity_usd": "float",
        "risk_score": "float"
    }
}
```

##### `trade.update`
Mise à jour de statut de trade.
```json
{
    "event": "trade.update",
    "data": {
        "transaction_id": "string",
        "status": "string",
        "execution_price": "float",
        "timestamp": "timestamp"
    }
}
```

## Codes d'erreur

- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Non autorisé
- `404`: Ressource non trouvée
- `429`: Trop de requêtes
- `500`: Erreur serveur

## Limites de rate

- 100 requêtes par minute par IP
- 1000 requêtes par heure par utilisateur authentifié
