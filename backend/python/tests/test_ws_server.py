import pytest
import asyncio
import json
import websockets
from datetime import datetime
from unittest.mock import Mock, patch

from ws_server import WebSocketServer, WSEvent, EventType

@pytest.fixture
async def ws_server():
    server = WebSocketServer("localhost", 8765)
    async with await server.start():
        yield server
        await server.stop()

@pytest.fixture
async def ws_client():
    async with websockets.connect("ws://localhost:8765") as websocket:
        yield websocket

@pytest.mark.asyncio
async def test_ws_event():
    """Test la classe WSEvent."""
    event = WSEvent(
        type=EventType.NEW_TOKEN,
        data={"symbol": "TEST", "price": 1.0}
    )
    
    # Vérifie que le timestamp est généré
    assert event.timestamp is not None
    
    # Vérifie la sérialisation JSON
    json_str = event.to_json()
    data = json.loads(json_str)
    assert data["type"] == "new_token"
    assert data["data"]["symbol"] == "TEST"
    assert data["data"]["price"] == 1.0
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_client_connection(ws_server, ws_client):
    """Test la connexion d'un client."""
    # Attend les données initiales
    message = await ws_client.recv()
    data = json.loads(message)
    
    assert data["type"] == "stats_update"
    assert "total_volume" in data["data"]
    assert "active_pools" in data["data"]
    assert "recent_transactions" in data["data"]

@pytest.mark.asyncio
async def test_invalid_message(ws_server, ws_client):
    """Test l'envoi d'un message invalide."""
    await ws_client.send("invalid json")
    
    response = await ws_client.recv()
    data = json.loads(response)
    
    assert data["type"] == "error"
    assert "message" in data["data"]

@pytest.mark.asyncio
async def test_broadcast(ws_server):
    """Test la diffusion des messages à tous les clients."""
    # Crée plusieurs clients
    clients = []
    for _ in range(3):
        client = await websockets.connect("ws://localhost:8765")
        clients.append(client)
        # Ignore les messages initiaux
        await client.recv()

    # Envoie un message de test
    test_event = WSEvent(
        type=EventType.SECURITY_ALERT,
        data={"message": "Test alert"}
    )
    await ws_server.send_to_all(test_event)

    # Vérifie que tous les clients reçoivent le message
    for client in clients:
        message = await client.recv()
        data = json.loads(message)
        assert data["type"] == "security_alert"
        assert data["data"]["message"] == "Test alert"

    # Nettoie
    for client in clients:
        await client.close()

@pytest.mark.asyncio
async def test_stats_updates(ws_server, ws_client):
    """Test les mises à jour périodiques des statistiques."""
    # Attend le premier message de stats
    message = await ws_client.recv()
    data = json.loads(message)
    assert data["type"] == "stats_update"
    
    # Attend la prochaine mise à jour
    message = await ws_client.recv()
    data = json.loads(message)
    assert data["type"] == "stats_update"

@pytest.mark.asyncio
async def test_client_disconnect(ws_server):
    """Test la déconnexion d'un client."""
    client = await websockets.connect("ws://localhost:8765")
    assert len(ws_server.clients) == 1
    
    await client.close()
    await asyncio.sleep(0.1)  # Attend la propagation de la déconnexion
    assert len(ws_server.clients) == 0

@pytest.mark.asyncio
async def test_server_shutdown(ws_server, ws_client):
    """Test l'arrêt propre du serveur."""
    assert ws_server.stats_update_task is not None
    assert not ws_server.stats_update_task.done()
    
    await ws_server.stop()
    assert ws_server.stats_update_task.done()
    
    # Vérifie que le client est déconnecté
    with pytest.raises(websockets.exceptions.ConnectionClosed):
        await ws_client.recv()

@pytest.mark.asyncio
async def test_multiple_events(ws_server, ws_client):
    """Test l'envoi de différents types d'événements."""
    events = [
        WSEvent(type=EventType.NEW_TOKEN, data={"symbol": "TEST1"}),
        WSEvent(type=EventType.TRANSACTION_UPDATE, data={"txid": "0x123"}),
        WSEvent(type=EventType.POOL_UPDATE, data={"pool": "TEST/SOL"}),
    ]
    
    for event in events:
        await ws_server.send_to_all(event)
        
        response = await ws_client.recv()
        data = json.loads(response)
        assert data["type"] == event.type.value
        assert data["data"] == event.data 