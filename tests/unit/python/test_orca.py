import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from backend.python.dex_monitoring.orca import OrcaMonitor
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def orca_monitor(mock_logger):
    """Crée une instance de OrcaMonitor avec un mock logger"""
    return OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=mock_logger,
        min_liquidity=1000.0,
        update_interval=1.0
    )

@pytest.mark.asyncio
async def test_initialization(orca_monitor, mock_logger):
    """Teste l'initialisation du moniteur"""
    assert orca_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert orca_monitor.min_liquidity == 1000.0
    assert orca_monitor.update_interval == 1.0
    assert not orca_monitor.is_running
    assert isinstance(orca_monitor.known_pools, dict)
    assert orca_monitor.ORCA_PROGRAM_ID == "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP"
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_context_manager(orca_monitor):
    """Teste le context manager"""
    async with orca_monitor as monitor:
        assert monitor == orca_monitor
        assert not monitor.is_running

@pytest.mark.asyncio
async def test_get_program_accounts_success(orca_monitor):
    """Teste la récupération des comptes avec succès"""
    mock_response = {
        "result": [
            {
                "pubkey": "pool1",
                "account": {
                    "data": ["base64data"],
                    "executable": False,
                    "lamports": 1000000,
                    "owner": "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
                    "rentEpoch": 0
                }
            }
        ]
    }
    
    with patch.object(orca_monitor.client, 'get_program_accounts', 
                     return_value=mock_response):
        accounts = await orca_monitor.get_program_accounts()
        assert len(accounts) == 1
        assert accounts[0]["pubkey"] == "pool1"

@pytest.mark.asyncio
async def test_get_program_accounts_error(orca_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des comptes"""
    with patch.object(orca_monitor.client, 'get_program_accounts', 
                     side_effect=Exception("RPC Error")):
        accounts = await orca_monitor.get_program_accounts()
        assert len(accounts) == 0
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_parse_pool_data(orca_monitor):
    """Teste le parsing des données de pool"""
    mock_account = {
        "pubkey": "pool1",
        "account": {
            "data": ["base64data"]
        }
    }
    
    result = orca_monitor.parse_pool_data(mock_account)
    assert result is not None
    assert result["address"] == "pool1"
    assert result["dex"] == "orca"
    assert "timestamp" in result
    assert isinstance(result["timestamp"], str)

@pytest.mark.asyncio
async def test_get_pool_tokens_info_success(orca_monitor):
    """Teste la récupération des informations sur les tokens"""
    mock_response = {
        "result": {
            "value": {
                "data": ["base64data"],
                "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            }
        }
    }
    
    with patch.object(orca_monitor.client, 'get_account_info',
                     return_value=mock_response):
        token_info = await orca_monitor.get_pool_tokens_info("token_mint_address")
        assert token_info is not None
        assert "mint" in token_info
        assert "decimals" in token_info
        assert "supply" in token_info

@pytest.mark.asyncio
async def test_get_pool_tokens_info_error(orca_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des infos token"""
    with patch.object(orca_monitor.client, 'get_account_info',
                     side_effect=Exception("RPC Error")):
        token_info = await orca_monitor.get_pool_tokens_info("token_mint_address")
        assert token_info is None
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_process_new_pool(orca_monitor, mock_logger):
    """Teste le traitement d'un nouveau pool"""
    pool_data = {
        "address": "new_pool",
        "token_a": "SOL",
        "token_b": "USDC",
        "liquidity": 10000.0,
        "timestamp": datetime.now().isoformat(),
        "dex": "orca"
    }
    
    await orca_monitor.process_new_pool(pool_data)
    
    # Vérifie que le pool a été ajouté au cache
    assert "new_pool" in orca_monitor.known_pools
    assert orca_monitor.known_pools["new_pool"] == pool_data
    
    # Vérifie les logs
    mock_logger.info.assert_called_once()
    mock_logger.trade.assert_called_once()

@pytest.mark.asyncio
async def test_monitor_pools(orca_monitor, mock_logger):
    """Teste la boucle de surveillance des pools"""
    mock_accounts = [{
        "pubkey": "pool1",
        "account": {"data": ["data"]}
    }]
    
    # Mock pour get_program_accounts
    with patch.object(orca_monitor, 'get_program_accounts',
                     return_value=mock_accounts):
        # Démarre la surveillance
        orca_monitor.is_running = True
        
        # Crée une tâche pour la surveillance
        monitor_task = asyncio.create_task(orca_monitor.monitor_pools())
        
        # Attend un peu pour laisser le temps à la boucle de s'exécuter
        await asyncio.sleep(0.1)
        
        # Arrête la surveillance
        orca_monitor.is_running = False
        await monitor_task
        
        # Vérifie les appels aux logs
        assert mock_logger.info.call_count >= 1
        assert "pool1" in str(mock_logger.info.call_args_list)

@pytest.mark.asyncio
async def test_start_stop(orca_monitor, mock_logger):
    """Teste le démarrage et l'arrêt du moniteur"""
    # Mock monitor_pools pour éviter la boucle infinie
    with patch.object(orca_monitor, 'monitor_pools'):
        # Test démarrage
        await orca_monitor.start()
        assert orca_monitor.is_running
        mock_logger.info.assert_called_with("Démarrage du moniteur Orca")
        
        # Test arrêt
        await orca_monitor.stop()
        assert not orca_monitor.is_running
        assert "Arrêt du moniteur Orca" in str(mock_logger.info.call_args_list) 