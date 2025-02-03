import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const TESTNET_URL = 'https://api.testnet.solana.com';
const WALLET_PATH = path.join(__dirname, '../config/testnet-wallet.json');
const CONFIG_PATH = path.join(__dirname, '../config/testnet-config.json');

async function setupTestnet() {
  console.log('🚀 Configuration du testnet en cours...');

  // 1. Création de la connexion au testnet
  const connection = new Connection(TESTNET_URL, 'confirmed');
  console.log('✅ Connexion au testnet établie');

  // 2. Création ou chargement du wallet de test
  let wallet: Keypair;
  try {
    if (fs.existsSync(WALLET_PATH)) {
      const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
      wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
      console.log('✅ Wallet de test existant chargé');
    } else {
      wallet = Keypair.generate();
      fs.mkdirSync(path.dirname(WALLET_PATH), { recursive: true });
      fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(wallet.secretKey)));
      console.log('✅ Nouveau wallet de test créé');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création/chargement du wallet:', error);
    process.exit(1);
  }

  // 3. Demande de SOL de test
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
      const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
      console.log('✅ SOL de test reçus');
    } else {
      console.log('✅ Le wallet dispose déjà de SOL suffisants');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la demande de SOL:', error);
    process.exit(1);
  }

  // 4. Configuration RPC et autres paramètres
  const config = {
    rpc: {
      endpoint: TESTNET_URL,
      commitment: 'confirmed',
      wsEndpoint: 'wss://api.testnet.solana.com/',
    },
    wallet: {
      publicKey: wallet.publicKey.toString(),
    },
    test: {
      maxTransactionAmount: 0.1 * LAMPORTS_PER_SOL,
      defaultSlippage: 0.5,
      minLiquidity: 1000 * LAMPORTS_PER_SOL,
    },
  };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Configuration sauvegardée');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration:', error);
    process.exit(1);
  }

  // 5. Vérification de la connexion
  try {
    const slot = await connection.getSlot();
    console.log(`✅ Connexion testée avec succès (slot actuel: ${slot})`);
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la connexion:', error);
    process.exit(1);
  }

  console.log('✅ Configuration du testnet terminée avec succès!');
  console.log(`📝 Configuration sauvegardée dans: ${CONFIG_PATH}`);
  console.log(`🔑 Wallet sauvegardé dans: ${WALLET_PATH}`);
  console.log(`📊 Adresse du wallet: ${wallet.publicKey.toString()}`);
}

// Exécution du script
setupTestnet().catch((error) => {
  console.error('❌ Erreur lors de la configuration:', error);
  process.exit(1);
}); 