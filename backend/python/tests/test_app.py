import pytest
from unittest.mock import Mock, patch
import json
from datetime import datetime
from pathlib import Path

from app import app, ipc_client

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_ipc():
    with patch('app.ipc_client') as mock:
        yield mock

def test_error_handler(client):
    """Test le gestionnaire d'erreurs global."""
    with patch('app.get_new_tokens', side_effect=Exception("Test error")):
        response = client.get('/api/v1/tokens/new')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert "error" in data
        assert "timestamp" in data
        assert data["error"] == "Test error"

def test_get_new_tokens(client):
    """Test l'endpoint des nouveaux tokens."""
    response = client.get('/api/v1/tokens/new')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "tokens" in data
    assert "timestamp" in data
    assert isinstance(data["tokens"], list)

def test_configure_filters(client):
    """Test l'endpoint de configuration des filtres."""
    test_config = {
        "min_liquidity": 1000,
        "max_slippage": 1.0
    }
    response = client.post(
        '/api/v1/filters/config',
        json=test_config
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "success"
    assert "timestamp" in data

def test_get_transaction_history(client):
    """Test l'endpoint de l'historique des transactions."""
    response = client.get('/api/v1/transactions/history')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "transactions" in data
    assert "timestamp" in data
    assert isinstance(data["transactions"], list)

def test_get_jupiter_stats(client):
    """Test l'endpoint des statistiques Jupiter."""
    response = client.get('/api/v1/stats/jupiter')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "stats" in data
    assert "timestamp" in data
    assert isinstance(data["stats"], dict)

@pytest.mark.asyncio
async def test_execute_transaction(client, mock_ipc):
    """Test l'endpoint d'exécution de transaction."""
    # Configure le mock
    mock_ipc.request_transaction.return_value = "test_signature"

    test_transaction = {
        "instructions": [1, 2, 3],
        "priority": "HIGH",
        "max_retries": 5
    }
    
    response = client.post(
        '/api/v1/transactions/execute',
        json=test_transaction
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["signature"] == "test_signature"
    assert data["status"] == "success"
    assert "timestamp" in data

    # Vérifie que le mock a été appelé avec les bons arguments
    mock_ipc.request_transaction.assert_called_once_with(
        instructions=bytes([1, 2, 3]),
        priority="HIGH",
        max_retries=5
    )

@pytest.mark.asyncio
async def test_check_security(client, mock_ipc):
    """Test l'endpoint de vérification de sécurité."""
    # Configure le mock
    mock_ipc.check_security.return_value = (True, None)

    response = client.get('/api/v1/security/check?token=TEST123&amount=1000000')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["is_safe"] is True
    assert data["reason"] is None
    assert "timestamp" in data

    # Vérifie que le mock a été appelé avec les bons arguments
    mock_ipc.check_security.assert_called_once_with(
        token="TEST123",
        amount=1000000
    )

@pytest.mark.asyncio
async def test_startup_shutdown(mock_ipc):
    """Test les fonctions de démarrage et d'arrêt."""
    # Test startup
    await app.before_first_request_funcs[0]()
    mock_ipc.connect.assert_called_once()

    # Test shutdown
    await app.teardown_appcontext_funcs[0](None)
    mock_ipc.close.assert_called_once()

def test_invalid_transaction_data(client):
    """Test la gestion des données de transaction invalides."""
    invalid_data = {
        "instructions": "invalid",  # Devrait être une liste
        "priority": "INVALID",     # Priorité invalide
        "max_retries": "invalid"   # Devrait être un nombre
    }
    
    response = client.post(
        '/api/v1/transactions/execute',
        json=invalid_data
    )
    
    assert response.status_code == 500
    data = json.loads(response.data)
    assert "error" in data

def test_invalid_security_check_params(client):
    """Test la gestion des paramètres invalides pour la vérification de sécurité."""
    response = client.get('/api/v1/security/check')  # Pas de paramètres
    assert response.status_code == 500
    data = json.loads(response.data)
    assert "error" in data

    response = client.get('/api/v1/security/check?token=TEST123&amount=invalid')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert "error" in data 