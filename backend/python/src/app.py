from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import asyncio
import logging
from typing import Optional
from datetime import datetime

from ipc_client import IPCClient

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialisation Flask
app = Flask(__name__)
CORS(app)

# Configuration
IPC_SOCKET_PATH = Path("/tmp/trading_bot.sock")
ipc_client = IPCClient(IPC_SOCKET_PATH)

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
async def get_new_tokens():
    """Récupère la liste des nouveaux tokens."""
    try:
        # TODO: Implémenter la logique de récupération des nouveaux tokens
        return jsonify({
            "tokens": [],
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des nouveaux tokens: {e}")
        raise

@app.route("/api/v1/filters/config", methods=["POST"])
async def configure_filters():
    """Configure les filtres de trading."""
    try:
        config = request.json
        # TODO: Valider et appliquer la configuration
        return jsonify({
            "status": "success",
            "message": "Configuration mise à jour",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la configuration des filtres: {e}")
        raise

@app.route("/api/v1/transactions/history", methods=["GET"])
async def get_transaction_history():
    """Récupère l'historique des transactions."""
    try:
        # TODO: Implémenter la récupération de l'historique
        return jsonify({
            "transactions": [],
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique: {e}")
        raise

@app.route("/api/v1/stats/jupiter", methods=["GET"])
async def get_jupiter_stats():
    """Récupère les statistiques Jupiter."""
    try:
        # TODO: Implémenter la récupération des stats
        return jsonify({
            "stats": {},
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des stats Jupiter: {e}")
        raise

@app.route("/api/v1/transactions/execute", methods=["POST"])
async def execute_transaction():
    """Exécute une transaction."""
    try:
        transaction_data = request.json
        instructions = transaction_data.get("instructions")
        priority = transaction_data.get("priority", "MEDIUM")
        max_retries = transaction_data.get("max_retries", 3)

        signature = await ipc_client.request_transaction(
            instructions=bytes(instructions),
            priority=priority,
            max_retries=max_retries
        )

        return jsonify({
            "signature": signature,
            "status": "success" if signature else "error",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution de la transaction: {e}")
        raise

@app.route("/api/v1/security/check", methods=["GET"])
async def check_security():
    """Vérifie la sécurité d'un token."""
    try:
        token = request.args.get("token")
        amount = int(request.args.get("amount", 0))

        is_safe, reason = await ipc_client.check_security(
            token=token,
            amount=amount
        )

        return jsonify({
            "is_safe": is_safe,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Erreur lors de la vérification de sécurité: {e}")
        raise

# Startup et shutdown
@app.before_first_request
async def startup():
    """Initialise les connexions au démarrage."""
    try:
        await ipc_client.connect()
        logger.info("Application démarrée avec succès")
    except Exception as e:
        logger.error(f"Erreur au démarrage: {e}")
        raise

@app.teardown_appcontext
async def shutdown(exception=None):
    """Nettoie les ressources à l'arrêt."""
    try:
        await ipc_client.close()
        logger.info("Application arrêtée avec succès")
    except Exception as e:
        logger.error(f"Erreur à l'arrêt: {e}")

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False  # Désactivé pour éviter les doubles connexions IPC
    ) 