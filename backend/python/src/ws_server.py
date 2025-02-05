import asyncio
import json
import logging
from datetime import datetime
from typing import Set, Dict, Any
import websockets
from websockets.server import WebSocketServerProtocol
from dataclasses import dataclass, asdict
from enum import Enum

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EventType(Enum):
    NEW_TOKEN = "new_token"
    TRANSACTION_UPDATE = "transaction_update"
    SECURITY_ALERT = "security_alert"
    STATS_UPDATE = "stats_update"
    POOL_UPDATE = "pool_update"
    ERROR = "error"

@dataclass
class WSEvent:
    type: EventType
    data: Dict[str, Any]
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp
        })

class WebSocketServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.stats_update_task = None

    async def register(self, websocket: WebSocketServerProtocol):
        """Enregistre un nouveau client WebSocket."""
        self.clients.add(websocket)
        logger.info(f"Client connecté. Total clients: {len(self.clients)}")

        # Envoie les données initiales
        await self.send_initial_data(websocket)

    async def unregister(self, websocket: WebSocketServerProtocol):
        """Désenregistre un client WebSocket."""
        self.clients.remove(websocket)
        logger.info(f"Client déconnecté. Total clients: {len(self.clients)}")

    async def send_to_all(self, event: WSEvent):
        """Envoie un événement à tous les clients connectés."""
        if not self.clients:
            return

        message = event.to_json()
        await asyncio.gather(
            *[client.send(message) for client in self.clients],
            return_exceptions=True
        )

    async def send_initial_data(self, websocket: WebSocketServerProtocol):
        """Envoie les données initiales à un nouveau client."""
        try:
            # Envoie les statistiques actuelles
            stats_event = WSEvent(
                type=EventType.STATS_UPDATE,
                data={
                    "total_volume": 0,
                    "active_pools": 0,
                    "recent_transactions": []
                }
            )
            await websocket.send(stats_event.to_json())

        except Exception as e:
            logger.error(f"Erreur lors de l'envoi des données initiales: {e}")
            error_event = WSEvent(
                type=EventType.ERROR,
                data={"message": "Erreur lors de l'initialisation"}
            )
            await websocket.send(error_event.to_json())

    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Gère la connexion d'un client WebSocket."""
        await self.register(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    # TODO: Implémenter la logique de traitement des messages clients
                    logger.info(f"Message reçu: {data}")
                except json.JSONDecodeError:
                    logger.error("Message invalide reçu")
                    await websocket.send(WSEvent(
                        type=EventType.ERROR,
                        data={"message": "Format de message invalide"}
                    ).to_json())
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)

    async def start_stats_updates(self):
        """Démarre la tâche de mise à jour périodique des statistiques."""
        while True:
            try:
                # TODO: Récupérer les vraies statistiques
                stats_event = WSEvent(
                    type=EventType.STATS_UPDATE,
                    data={
                        "total_volume": 0,
                        "active_pools": 0,
                        "recent_transactions": []
                    }
                )
                await self.send_to_all(stats_event)
            except Exception as e:
                logger.error(f"Erreur lors de la mise à jour des stats: {e}")
            await asyncio.sleep(5)  # Mise à jour toutes les 5 secondes

    def start(self):
        """Démarre le serveur WebSocket."""
        server = websockets.serve(self.handle_client, self.host, self.port)
        self.stats_update_task = asyncio.create_task(self.start_stats_updates())
        logger.info(f"Serveur WebSocket démarré sur ws://{self.host}:{self.port}")
        return server

    async def stop(self):
        """Arrête le serveur WebSocket."""
        if self.stats_update_task:
            self.stats_update_task.cancel()
            try:
                await self.stats_update_task
            except asyncio.CancelledError:
                pass

        # Ferme toutes les connexions clients
        if self.clients:
            await asyncio.gather(
                *[client.close() for client in self.clients],
                return_exceptions=True
            )
        logger.info("Serveur WebSocket arrêté")

async def main():
    """Fonction principale pour démarrer le serveur."""
    server = WebSocketServer()
    async with await server.start():
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Arrêt du serveur...")
    except Exception as e:
        logger.error(f"Erreur fatale: {e}", exc_info=True) 