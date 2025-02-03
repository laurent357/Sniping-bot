import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from backend.python.dex_monitoring.raydium import RaydiumMonitor
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def raydium_monitor(mock_logger):
    """Crée une instance de RaydiumMonitor avec un mock logger"""
    return RaydiumMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=mock_logger,
        min_liquidity=1000.0,
        update_interval=1.0
    )

@pytest.mark.asyncio
async def test_initialization(raydium_monitor, mock_logger):
    """Teste l'initialisation du moniteur"""
    assert raydium_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert raydium_monitor.min_liquidity == 1000.0
    assert raydium_monitor.update_interval == 1.0
    assert not raydium_monitor.is_running
    assert isinstance(raydium_monitor.known_pools, dict)
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_context_manager(raydium_monitor):
    """Teste le context manager"""
    async with raydium_monitor as monitor:
        assert monitor == raydium_monitor
        assert not monitor.is_running

@pytest.mark.asyncio
async def test_get_program_accounts_success(raydium_monitor):
    """Teste la récupération des comptes avec succès"""
    mock_response = {
        "result": [
            {
                "pubkey": "pool1",
                "account": {
                    "data": ["base64data"],
                    "executable": False,
                    "lamports": 1000000,
                    "owner": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
                    "rentEpoch": 0
                }
            }
        ]
    }
    
    with patch.object(raydium_monitor.client, 'get_program_accounts', 
                     return_value=mock_response):
        accounts = await raydium_monitor.get_program_accounts()
        assert len(accounts) == 1
        assert accounts[0]["pubkey"] == "pool1"

@pytest.mark.asyncio
async def test_get_program_accounts_error(raydium_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des comptes"""
    with patch.object(raydium_monitor.client, 'get_program_accounts', 
                     side_effect=Exception("RPC Error")):
        accounts = await raydium_monitor.get_program_accounts()
        assert len(accounts) == 0
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_parse_pool_data(raydium_monitor):
    """Teste le parsing des données de pool"""
    mock_account = {
        "pubkey": "pool1",
        "account": {
            "data": ["base64data"]
        }
    }
    
    result = raydium_monitor.parse_pool_data(mock_account)
    assert result is not None
    assert result["address"] == "pool1"
    assert "timestamp" in result
    assert isinstance(result["timestamp"], str)

@pytest.mark.asyncio
async def test_process_new_pool(raydium_monitor, mock_logger):
    """Teste le traitement d'un nouveau pool"""
    pool_data = {
        "address": "new_pool",
        "token_a": "SOL",
        "token_b": "USDC",
        "liquidity": 10000.0,
        "timestamp": datetime.now().isoformat()
    }
    
    await raydium_monitor.process_new_pool(pool_data)
    
    # Vérifie que le pool a été ajouté au cache
    assert "new_pool" in raydium_monitor.known_pools
    assert raydium_monitor.known_pools["new_pool"] == pool_data
    
    # Vérifie les logs
    mock_logger.info.assert_called_once()
    mock_logger.trade.assert_called_once()

@pytest.mark.asyncio
async def test_monitor_pools(raydium_monitor, mock_logger):
    """Teste la boucle de surveillance des pools"""
    mock_accounts = [{
        "pubkey": "pool1",
        "account": {"data": ["data"]}
    }]
    
    # Mock pour get_program_accounts
    with patch.object(raydium_monitor, 'get_program_accounts',
                     return_value=mock_accounts):
        # Démarre la surveillance
        raydium_monitor.is_running = True
        
        # Crée une tâche pour la surveillance
        monitor_task = asyncio.create_task(raydium_monitor.monitor_pools())
        
        # Attend un peu pour laisser le temps à la boucle de s'exécuter
        await asyncio.sleep(0.1)
        
        # Arrête la surveillance
        raydium_monitor.is_running = False
        await monitor_task
        
        # Vérifie les appels aux logs
        assert mock_logger.info.call_count >= 1
        assert "pool1" in str(mock_logger.info.call_args_list)

@pytest.mark.asyncio
async def test_start_stop(raydium_monitor, mock_logger):
    """Teste le démarrage et l'arrêt du moniteur"""
    # Mock monitor_pools pour éviter la boucle infinie
    with patch.object(raydium_monitor, 'monitor_pools'):
        # Test démarrage
        await raydium_monitor.start()
        assert raydium_monitor.is_running
        mock_logger.info.assert_called_with("Démarrage du moniteur Raydium")
        
        # Test arrêt
        await raydium_monitor.stop()
        assert not raydium_monitor.is_running
        assert "Arrêt du moniteur Raydium" in str(mock_logger.info.call_args_list) 