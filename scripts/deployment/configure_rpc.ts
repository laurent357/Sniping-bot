import { Connection } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(__dirname, '../../config/deploy-config.json');
const RPC_TEST_TIMEOUT = 5000; // 5 secondes

interface RPCConfig {
  endpoint: string;
  wsEndpoint: string;
  commitment: string;
  performance?: {
    avgLatency?: number;
    successRate?: number;
    lastTest?: string;
  };
}

async function configureRPC() {
  console.log('🔧 Configuration du RPC Solana...');

  // 1. Charger la configuration existante
  const config = loadConfig();

  // 2. Tester les endpoints RPC disponibles
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    process.env.SOLANA_RPC_URL,
  ].filter(Boolean) as string[];

  console.log('🔍 Test des endpoints RPC disponibles...');

  const rpcResults = await Promise.all(
    rpcEndpoints.map(async (endpoint) => {
      try {
        const result = await testRPCEndpoint(endpoint);
        return { endpoint, ...result };
      } catch (error) {
        console.log(`❌ Échec pour ${endpoint}:`, error);
        return null;
      }
    })
  );

  // 3. Sélectionner le meilleur RPC
  const validResults = rpcResults.filter(Boolean);
  if (validResults.length === 0) {
    throw new Error('Aucun endpoint RPC valide trouvé');
  }

  const bestRPC = validResults.sort((a, b) => 
    (a?.performance.avgLatency || Infinity) - (b?.performance.avgLatency || Infinity)
  )[0];

  // 4. Mettre à jour la configuration
  config.rpc = {
    endpoint: bestRPC.endpoint,
    wsEndpoint: bestRPC.endpoint.replace('https', 'wss'),
    commitment: 'confirmed',
    performance: bestRPC.performance,
  };

  // 5. Sauvegarder la configuration
  saveConfig(config);

  console.log('✅ Configuration RPC terminée');
  console.log(`📡 Endpoint sélectionné: ${config.rpc.endpoint}`);
  console.log(`⚡ Latence moyenne: ${config.rpc.performance?.avgLatency}ms`);
  console.log(`📊 Taux de succès: ${config.rpc.performance?.successRate}%`);
}

async function testRPCEndpoint(endpoint: string) {
  console.log(`🔍 Test de ${endpoint}...`);
  
  const connection = new Connection(endpoint, 'confirmed');
  const startTime = Date.now();
  let successCount = 0;
  const testCount = 5;

  const latencies: number[] = [];

  for (let i = 0; i < testCount; i++) {
    try {
      const testStart = Date.now();
      await Promise.race([
        connection.getSlot(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), RPC_TEST_TIMEOUT)
        ),
      ]);
      
      const latency = Date.now() - testStart;
      latencies.push(latency);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s entre les tests
    } catch (error) {
      console.log(`❌ Test ${i + 1} échoué pour ${endpoint}`);
    }
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const successRate = (successCount / testCount) * 100;

  return {
    performance: {
      avgLatency,
      successRate,
      lastTest: new Date().toISOString(),
    },
  };
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    throw new Error('Configuration file not found');
  } catch (error) {
    console.error('❌ Erreur lors du chargement de la configuration:', error);
    process.exit(1);
  }
}

function saveConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Configuration sauvegardée');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration:', error);
    process.exit(1);
  }
}

// Exécution du script
configureRPC().catch((error) => {
  console.error('❌ Erreur lors de la configuration RPC:', error);
  process.exit(1);
}); 