import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const MAINNET_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEPLOY_CONFIG_PATH = path.join(__dirname, '../../config/deploy-config.json');
const WALLET_PATH = path.join(__dirname, '../../config/mainnet-wallet.json');

interface DeployConfig {
  version: string;
  environment: 'mainnet' | 'testnet' | 'devnet';
  rpc: {
    endpoint: string;
    wsEndpoint: string;
    commitment: string;
  };
  wallet: {
    publicKey: string;
  };
  services: {
    backend: {
      port: number;
      host: string;
    };
    frontend: {
      port: number;
      host: string;
    };
  };
  monitoring: {
    enabled: boolean;
    logLevel: string;
    alertThreshold: number;
  };
}

async function deploy() {
  console.log('🚀 Démarrage du déploiement...');

  // 1. Vérification des prérequis
  checkPrerequisites();

  // 2. Chargement ou création de la configuration
  const config = loadOrCreateConfig();

  // 3. Build du frontend
  buildFrontend();

  // 4. Build du backend
  buildBackend();

  // 5. Déploiement des services
  await deployServices(config);

  // 6. Configuration du monitoring
  setupMonitoring(config);

  // 7. Tests de santé
  await performHealthChecks(config);

  console.log('✅ Déploiement terminé avec succès!');
}

function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...');
  
  try {
    // Vérifier Node.js
    const nodeVersion = execSync('node --version').toString().trim();
    console.log(`✅ Node.js version: ${nodeVersion}`);

    // Vérifier npm
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`✅ npm version: ${npmVersion}`);

    // Vérifier l'existence des dossiers nécessaires
    const requiredDirs = ['frontend', 'backend', 'config'];
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(path.join(__dirname, '../../', dir))) {
        throw new Error(`Dossier ${dir} manquant`);
      }
    });
    console.log('✅ Structure de dossiers validée');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification des prérequis:', error);
    process.exit(1);
  }
}

function loadOrCreateConfig(): DeployConfig {
  console.log('📝 Chargement de la configuration...');
  
  const defaultConfig: DeployConfig = {
    version: '1.0.0',
    environment: 'mainnet',
    rpc: {
      endpoint: MAINNET_URL,
      wsEndpoint: MAINNET_URL.replace('https', 'wss'),
      commitment: 'confirmed',
    },
    wallet: {
      publicKey: '',
    },
    services: {
      backend: {
        port: 5000,
        host: 'localhost',
      },
      frontend: {
        port: 3000,
        host: 'localhost',
      },
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
      alertThreshold: 90,
    },
  };

  try {
    if (fs.existsSync(DEPLOY_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(DEPLOY_CONFIG_PATH, 'utf-8'));
      console.log('✅ Configuration chargée');
      return { ...defaultConfig, ...config };
    } else {
      fs.mkdirSync(path.dirname(DEPLOY_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(DEPLOY_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Nouvelle configuration créée');
      return defaultConfig;
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement de la configuration:', error);
    process.exit(1);
  }
}

function buildFrontend() {
  console.log('🏗️ Build du frontend...');
  
  try {
    process.chdir(path.join(__dirname, '../../frontend/trading-bot-ui'));
    execSync('npm install', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build du frontend terminé');
  } catch (error) {
    console.error('❌ Erreur lors du build du frontend:', error);
    process.exit(1);
  }
}

function buildBackend() {
  console.log('🏗️ Build du backend...');
  
  try {
    process.chdir(path.join(__dirname, '../../backend'));
    execSync('pip install -r requirements.txt', { stdio: 'inherit' });
    console.log('✅ Build du backend terminé');
  } catch (error) {
    console.error('❌ Erreur lors du build du backend:', error);
    process.exit(1);
  }
}

async function deployServices(config: DeployConfig) {
  console.log('🚀 Déploiement des services...');

  try {
    // Démarrer le backend
    const backendCmd = `python app.py --port ${config.services.backend.port} --host ${config.services.backend.host}`;
    execSync(backendCmd, { stdio: 'inherit', cwd: path.join(__dirname, '../../backend') });
    console.log('✅ Backend démarré');

    // Démarrer le frontend
    const frontendCmd = `serve -s build -l ${config.services.frontend.port}`;
    execSync(`npx ${frontendCmd}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../frontend/trading-bot-ui')
    });
    console.log('✅ Frontend démarré');

  } catch (error) {
    console.error('❌ Erreur lors du déploiement des services:', error);
    process.exit(1);
  }
}

function setupMonitoring(config: DeployConfig) {
  console.log('📊 Configuration du monitoring...');

  if (!config.monitoring.enabled) {
    console.log('⚠️ Monitoring désactivé dans la configuration');
    return;
  }

  try {
    // Créer le dossier de logs
    const logsDir = path.join(__dirname, '../../logs');
    fs.mkdirSync(logsDir, { recursive: true });

    // Configuration des logs
    const logConfig = {
      level: config.monitoring.logLevel,
      directory: logsDir,
      alertThreshold: config.monitoring.alertThreshold,
    };

    fs.writeFileSync(
      path.join(logsDir, 'monitoring-config.json'),
      JSON.stringify(logConfig, null, 2)
    );

    console.log('✅ Monitoring configuré');
  } catch (error) {
    console.error('❌ Erreur lors de la configuration du monitoring:', error);
    process.exit(1);
  }
}

async function performHealthChecks(config: DeployConfig) {
  console.log('🏥 Exécution des tests de santé...');

  try {
    // Vérifier le backend
    const backendUrl = `http://${config.services.backend.host}:${config.services.backend.port}/health`;
    const backendResponse = await fetch(backendUrl);
    if (!backendResponse.ok) throw new Error('Backend health check failed');
    console.log('✅ Backend en ligne');

    // Vérifier le frontend
    const frontendUrl = `http://${config.services.frontend.host}:${config.services.frontend.port}`;
    const frontendResponse = await fetch(frontendUrl);
    if (!frontendResponse.ok) throw new Error('Frontend health check failed');
    console.log('✅ Frontend en ligne');

    // Vérifier la connexion RPC
    const connection = new Connection(config.rpc.endpoint, config.rpc.commitment);
    const slot = await connection.getSlot();
    console.log(`✅ Connexion RPC validée (slot: ${slot})`);

  } catch (error) {
    console.error('❌ Erreur lors des tests de santé:', error);
    process.exit(1);
  }
}

// Exécution du script
deploy().catch((error) => {
  console.error('❌ Erreur lors du déploiement:', error);
  process.exit(1);
}); 