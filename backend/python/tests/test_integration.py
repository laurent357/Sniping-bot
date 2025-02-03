import pytest
import asyncio
import json
from pathlib import Path
import subprocess
import time
from typing import AsyncGenerator
import signal

from ipc_client import IPCClient, IPCMessage, MessageType

@pytest.fixture
async def rust_server() -> AsyncGenerator[None, None]:
    """Démarre le serveur Rust pour les tests."""
    # Lance le serveur Rust en arrière-plan
    process = subprocess.Popen(
        ["cargo", "run", "--manifest-path", "../rust/Cargo.toml"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Attend que le serveur démarre
    time.sleep(2)
    
    try:
        yield
    finally:
        # Arrête proprement le serveur
        process.send_signal(signal.SIGTERM)
        process.wait()

@pytest.fixture
async def ipc_client() -> AsyncGenerator[IPCClient, None]:
    """Crée un client IPC pour les tests."""
    socket_path = Path("/tmp/trading_bot.sock")
    client = IPCClient(socket_path)
    try:
        await client.connect()
        yield client
    finally:
        await client.close()

@pytest.mark.asyncio
async def test_transaction_request_integration(rust_server, ipc_client):
    """Test l'intégration de la requête de transaction."""
    # Prépare une instruction de test
    test_instructions = bytes([1, 2, 3, 4])
    
    # Envoie la requête
    signature = await ipc_client.request_transaction(
        instructions=test_instructions,
        priority="HIGH",
        max_retries=3
    )
    
    # Vérifie la réponse
    assert signature is not None
    assert isinstance(signature, str)
    assert len(signature) > 0

@pytest.mark.asyncio
async def test_security_check_integration(rust_server, ipc_client):
    """Test l'intégration de la vérification de sécurité."""
    # Prépare les données de test
    test_token = "SOL123"
    test_amount = 1000000000  # 1 SOL
    
    # Envoie la requête
    is_safe, reason = await ipc_client.check_security(
        token=test_token,
        amount=test_amount
    )
    
    # Vérifie la réponse
    assert isinstance(is_safe, bool)
    if not is_safe:
        assert reason is not None
        assert isinstance(reason, str)

@pytest.mark.asyncio
async def test_error_handling_integration(rust_server, ipc_client):
    """Test la gestion des erreurs d'intégration."""
    # Test avec un montant invalide
    is_safe, reason = await ipc_client.check_security(
        token="SOL123",
        amount=-1  # Montant invalide
    )
    
    assert not is_safe
    assert reason is not None
    assert "invalide" in reason.lower()

@pytest.mark.asyncio
async def test_multiple_requests(rust_server, ipc_client):
    """Test l'envoi de plusieurs requêtes en parallèle."""
    # Prépare plusieurs requêtes
    requests = [
        ipc_client.request_transaction(
            instructions=bytes([i, i+1, i+2]),
            priority="MEDIUM",
            max_retries=3
        )
        for i in range(5)
    ]
    
    # Exécute les requêtes en parallèle
    responses = await asyncio.gather(*requests)
    
    # Vérifie les réponses
    for signature in responses:
        assert signature is not None
        assert isinstance(signature, str)
        assert len(signature) > 0

@pytest.mark.asyncio
async def test_large_data_transfer(rust_server, ipc_client):
    """Test le transfert de grandes quantités de données."""
    # Crée des instructions de grande taille
    large_instructions = bytes([i % 256 for i in range(1024 * 1024)])  # 1MB
    
    # Envoie la requête
    signature = await ipc_client.request_transaction(
        instructions=large_instructions,
        priority="LOW",
        max_retries=1
    )
    
    # Vérifie la réponse
    assert signature is not None
    assert isinstance(signature, str)
    assert len(signature) > 0 