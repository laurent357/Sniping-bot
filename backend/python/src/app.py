from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import asyncio
import logging
import os
from typing import Optional
from datetime import datetime, timedelta
import random
from functools import wraps

from .services.jupiter_service import JupiterService
from .services.sniping_service import SnipingService
from .utils.logging import BotLogger
from .ipc_client import IPCClient

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = BotLogger()

# Initialisation Flask
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://192.168.1.20", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "send_wildcard": False
    }
})

# Configuration
IPC_SOCKET_PATH = Path("/tmp/trading_bot.sock")
RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")

# Services
ipc_client = IPCClient(IPC_SOCKET_PATH)
jupiter_service = JupiterService(RPC_URL, logger)
sniping_service = SnipingService(ipc_client, logger)

# Event loop pour asyncio
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

def async_route(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        return loop.run_until_complete(f(*args, **kwargs))
    return wrapped

# Initialisation des services
@async_route
async def init_services():
    """Initialise les services au démarrage."""
    if not hasattr(app, '_services_initialized'):
        try:
            await jupiter_service.start()
            await ipc_client.connect()
            app._services_initialized = True
            logger.info("Services initialisés avec succès")
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation des services: {e}")
            raise

# Nettoyage à l'arrêt
@async_route
async def cleanup_services():
    """Arrête proprement les services."""
    try:
        await jupiter_service.stop()
        await ipc_client.close()
        logger.info("Services arrêtés avec succès")
    except Exception as e:
        logger.error(f"Erreur lors de l'arrêt des services: {e}")

# Enregistrement des fonctions de démarrage et d'arrêt
@app.before_request
def before_request():
    init_services()

@app.teardown_appcontext
def teardown(exception=None):
    if exception:
        logger.error(f"Erreur lors du teardown: {str(exception)}")
    cleanup_services()

# Middleware pour gérer les erreurs
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Erreur: {str(error)}", exc_info=True)
    return jsonify({
        "error": str(error),
        "timestamp": datetime.utcnow().isoformat()
    }), 500

# Routes API
@app.route("/api/v1/tokens/new", methods=["GET"])
def get_new_tokens():
    """Récupère la liste des nouveaux tokens."""
    logger.info("Requête reçue pour /api/v1/tokens/new")
    try:
        # Pour le test, on renvoie des données mockées
        mock_tokens = [
            {
                "address": f"TokenAddr{i}",
                "symbol": f"TKN{i}",
                "name": f"Token {i}",
                "price": random.uniform(0.1, 100),
                "liquidity_usd": random.uniform(10000, 1000000),
                "volume_24h": random.uniform(5000, 500000),
                "price_change_1h": random.uniform(-10, 10),
                "estimated_profit": random.uniform(1, 5),
                "risk_level": random.choice(["LOW", "MEDIUM", "HIGH"]),
                "timestamp": datetime.utcnow().isoformat()
            }
            for i in range(5)
        ]
        logger.info(f"Renvoi de {len(mock_tokens)} tokens mockés")
        return jsonify({
            "tokens": mock_tokens,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des nouveaux tokens: {e}")
        raise

@app.route("/api/v1/stats/jupiter", methods=["GET"])
def get_jupiter_stats():
    """Récupère les statistiques Jupiter."""
    logger.info("Requête reçue pour /api/v1/stats/jupiter")
    try:
        # Données mockées pour le test
        mock_stats = {
            "total_volume_24h_usd": 15000000,
            "average_slippage": 0.5,
            "total_pools": 1200,
            "active_pools": 800,
            "total_tokens": 2500,
            "new_tokens_24h": 45,
            "timestamp": datetime.utcnow().isoformat()
        }
        logger.info("Renvoi des stats mockées")
        return jsonify({
            "stats": mock_stats,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des stats Jupiter: {e}")
        raise

@app.route("/api/v1/transactions/history", methods=["GET"])
def get_transaction_history():
    """Récupère l'historique des transactions."""
    logger.info("Requête reçue pour /api/v1/transactions/history")
    try:
        # Données mockées pour le test
        mock_transactions = [
            {
                "hash": f"Tx{i}Hash",
                "timestamp": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                "token_symbol": f"TKN{i}",
                "type": random.choice(["buy", "sell"]),
                "amount": random.uniform(0.1, 10),
                "price": random.uniform(1, 100),
                "total": random.uniform(100, 1000),
                "estimated_profit": random.uniform(-5, 15),
                "status": random.choice(["completed", "pending", "failed"])
            }
            for i in range(10)
        ]
        logger.info(f"Renvoi de {len(mock_transactions)} transactions mockées")
        return jsonify({
            "transactions": mock_transactions,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique: {e}")
        raise

@app.route("/api/v1/transactions/active", methods=["GET"])
def get_active_orders():
    """Récupère les ordres actifs."""
    logger.info("Requête reçue pour /api/v1/transactions/active")
    try:
        # Données mockées pour le test
        mock_orders = [
            {
                "hash": f"ActiveTx{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "token_symbol": f"TKN{i}",
                "type": "buy",
                "amount": random.uniform(0.1, 5),
                "price": random.uniform(1, 50),
                "total": random.uniform(50, 500),
                "estimated_profit": random.uniform(1, 10),
                "status": "pending"
            }
            for i in range(3)
        ]
        logger.info(f"Renvoi de {len(mock_orders)} ordres actifs mockés")
        return jsonify({
            "orders": mock_orders,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des ordres actifs: {e}")
        raise

@app.route("/api/v1/transactions/execute", methods=["POST"])
@async_route
async def execute_transaction():
    """Exécute une transaction de sniping."""
    try:
        opportunity = request.json
        result = await sniping_service.execute_sniping(opportunity)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution de la transaction: {e}")
        raise

@app.route("/api/v1/strategies", methods=["GET"])
@async_route
async def get_strategies():
    """Récupère les stratégies configurées."""
    try:
        strategies = await sniping_service.get_strategies()
        return jsonify({
            "strategies": strategies,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des stratégies: {e}")
        raise

@app.route("/api/v1/strategies", methods=["POST"])
@async_route
async def update_strategy():
    """Met à jour une stratégie."""
    try:
        strategy_data = request.json
        result = await sniping_service.update_strategy(strategy_data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de la stratégie: {e}")
        raise

@app.route("/api/v1/pools/<pool_id>", methods=["GET"])
@async_route
async def get_pool_info(pool_id: str):
    """Récupère les informations d'un pool."""
    try:
        pool_info = await jupiter_service.get_pool_info(pool_id)
        if pool_info is None:
            return jsonify({
                "error": "Pool non trouvé",
                "timestamp": datetime.utcnow().isoformat()
            }), 404
        return jsonify({
            "pool": pool_info,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des infos du pool: {e}")
        raise

@app.route("/api/v1/tokens/<token_address>", methods=["GET"])
@async_route
async def get_token_info(token_address: str):
    """Récupère les informations d'un token."""
    try:
        token_info = await jupiter_service.get_token_info(token_address)
        if token_info is None:
            return jsonify({
                "error": "Token non trouvé",
                "timestamp": datetime.utcnow().isoformat()
            }), 404
        return jsonify({
            "token": token_info,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des infos du token: {e}")
        raise

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True) 