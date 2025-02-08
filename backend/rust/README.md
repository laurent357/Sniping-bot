# Solana Sniping Bot - Documentation Wallet

## Configuration

### Configuration avec .env

1. Copiez le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```

2. Modifiez le fichier `.env` avec vos paramètres :
   ```bash
   # Pour un wallet dédié
   WALLET_TYPE=dedicated
   
   # OU pour un wallet Phantom
   WALLET_TYPE=phantom
   PHANTOM_PRIVATE_KEY=votre_clé_privée
   ```

3. Ne commitez JAMAIS le fichier `.env` dans Git

### Types de Wallets

Le bot supporte deux types de wallets :

### 1. Wallet Phantom Existant

Pour utiliser un wallet Phantom existant :

1. Exportez la clé privée depuis Phantom :
   - Ouvrez Phantom
   - Allez dans Paramètres > Exporter Clé Privée
   - Entrez votre mot de passe pour révéler la clé

2. Configurez les variables d'environnement :
   ```bash
   export WALLET_TYPE=phantom
   export PHANTOM_PRIVATE_KEY=votre_clé_privée
   ```

### 2. Wallet Dédié

Pour utiliser un nouveau wallet dédié (par défaut) :

1. Le bot créera automatiquement un nouveau wallet dans `wallet/keypair.json`
2. Assurez-vous de transférer des fonds vers ce wallet avant de l'utiliser

Configuration :
```bash
export WALLET_TYPE=dedicated
```

## Sécurité

- Le fichier `.env` contient toutes les clés sensibles et ne doit JAMAIS être commité
- En production, utilisez des secrets Docker ou Kubernetes
- Pour le wallet dédié, le fichier keypair est chiffré
- Limitez les fonds dans le wallet de trading aux montants nécessaires

## Recommandations

1. **Développement** :
   - Utilisez un wallet Phantom de test avec des fonds limités
   - Activez le mode devnet : `export SOLANA_RPC_URL=https://api.devnet.solana.com`

2. **Production** :
   - Créez un wallet dédié
   - Transférez uniquement les fonds nécessaires
   - Utilisez des limites de trading
   - Surveillez régulièrement l'activité

## Dépannage

1. **Erreur "Invalid private key"** :
   - Vérifiez le format de la clé privée (base58)
   - Réexportez la clé depuis Phantom

2. **Erreur "Insufficient funds"** :
   - Vérifiez le solde avec `solana balance`
   - Transférez des fonds si nécessaire

3. **Erreur "Invalid keypair file"** :
   - Vérifiez les permissions du fichier
   - Recréez le wallet si nécessaire

## Déploiement

1. **Développement local** :
   ```bash
   cp .env.example .env
   # Modifiez .env selon vos besoins
   docker-compose up --build
   ```

2. **Production** :
   ```bash
   cp .env.example .env.prod
   # Modifiez .env.prod avec les valeurs de production
   docker-compose --env-file .env.prod up -d
   ``` 