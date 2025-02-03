import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(__dirname, '../config/testnet-config.json');
const WALLET_PATH = path.join(__dirname, '../config/testnet-wallet.json');

async function deployTestContracts() {
  console.log('🚀 Déploiement des smart contracts de test...');

  // 1. Chargement de la configuration
  if (!fs.existsSync(CONFIG_PATH) || !fs.existsSync(WALLET_PATH)) {
    console.error('❌ Configuration ou wallet non trouvé. Exécutez d\'abord setup_testnet.ts');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  // 2. Connexion au testnet
  const connection = new Connection(config.rpc.endpoint, config.rpc.commitment);
  console.log('✅ Connexion au testnet établie');

  // 3. Création d'un programme de test simple
  const programId = Keypair.generate();
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: programId.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(0),
      space: 0,
      programId: SystemProgram.programId,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet, programId]
    );
    console.log('✅ Programme de test déployé avec succès');
    console.log(`📝 Signature de la transaction: ${signature}`);
    console.log(`📊 Programme ID: ${programId.publicKey.toString()}`);

    // 4. Mise à jour de la configuration
    config.test.programId = programId.publicKey.toString();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Configuration mise à jour avec le Programme ID');

    // 5. Vérification du déploiement
    const accountInfo = await connection.getAccountInfo(programId.publicKey);
    if (accountInfo) {
      console.log('✅ Déploiement vérifié avec succès');
    } else {
      throw new Error('Le programme n\'a pas été déployé correctement');
    }
  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
    process.exit(1);
  }

  // 6. Création de tokens de test (si nécessaire)
  try {
    // TODO: Implémenter la création de tokens de test pour les swaps
    console.log('⚠️ La création de tokens de test sera implémentée dans une prochaine version');
  } catch (error) {
    console.error('❌ Erreur lors de la création des tokens:', error);
  }

  console.log('✅ Déploiement des smart contracts de test terminé avec succès!');
}

// Exécution du script
deployTestContracts().catch((error) => {
  console.error('❌ Erreur lors du déploiement:', error);
  process.exit(1);
}); 