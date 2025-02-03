import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from backend.python.dex_monitoring.saber import SaberMonitor
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def saber_monitor(mock_logger):
    """Crée une instance de SaberMonitor avec un mock logger"""
    return SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=mock_logger,
        min_liquidity=1000.0,
        update_interval=1.0
    )

@pytest.mark.asyncio
async def test_initialization(saber_monitor, mock_logger):
    """Teste l'initialisation du moniteur"""
    assert saber_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert saber_monitor.min_liquidity == 1000.0
    assert saber_monitor.update_interval == 1.0
    assert not saber_monitor.is_running
    assert isinstance(saber_monitor.known_pools, dict)
    assert saber_monitor.SABER_PROGRAM_ID == "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ"
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_context_manager(saber_monitor):
    """Teste le context manager"""
    async with saber_monitor as monitor:
        assert monitor == saber_monitor
        assert not monitor.is_running

@pytest.mark.asyncio
async def test_get_program_accounts_success(saber_monitor):
    """Teste la récupération des comptes avec succès"""
    mock_response = {
        "result": [
            {
                "pubkey": "pool1",
                "account": {
                    "data": ["base64data"],
                    "executable": False,
                    "lamports": 1000000,
                    "owner": "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ",
                    "rentEpoch": 0
                }
            }
        ]
    }
    
    with patch.object(saber_monitor.client, 'get_program_accounts', 
                     return_value=mock_response):
        accounts = await saber_monitor.get_program_accounts()
        assert len(accounts) == 1
        assert accounts[0]["pubkey"] == "pool1"

@pytest.mark.asyncio
async def test_get_program_accounts_error(saber_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des comptes"""
    with patch.object(saber_monitor.client, 'get_program_accounts', 
                     side_effect=Exception("RPC Error")):
        accounts = await saber_monitor.get_program_accounts()
        assert len(accounts) == 0
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_parse_pool_data(saber_monitor):
    """Teste le parsing des données de pool"""
    mock_account = {
        "pubkey": "pool1",
        "account": {
            "data": ["base64data"]
        }
    }
    
    result = saber_monitor.parse_pool_data(mock_account)
    assert result is not None
    assert result["address"] == "pool1"
    assert result["dex"] == "saber"
    assert "timestamp" in result
    assert isinstance(result["timestamp"], str)

@pytest.mark.asyncio
async def test_get_pool_tokens_info_success(saber_monitor):
    """Teste la récupération des informations sur les tokens"""
    mock_response = {
        "result": {
            "value": {
                "data": ["base64data"],
                "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            }
        }
    }
    
    with patch.object(saber_monitor.client, 'get_account_info',
                     return_value=mock_response):
        token_info = await saber_monitor.get_pool_tokens_info("token_mint_address")
        assert token_info is not None
        assert "mint" in token_info
        assert "decimals" in token_info
        assert "supply" in token_info

@pytest.mark.asyncio
async def test_get_pool_tokens_info_error(saber_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des infos token"""
    with patch.object(saber_monitor.client, 'get_account_info',
                     side_effect=Exception("RPC Error")):
        token_info = await saber_monitor.get_pool_tokens_info("token_mint_address")
        assert token_info is None
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_get_pool_liquidity(saber_monitor):
    """Teste le calcul de la liquidité"""
    liquidity = await saber_monitor.get_pool_liquidity("pool_address")
    assert isinstance(liquidity, float)
    assert liquidity >= 0

@pytest.mark.asyncio
async def test_process_new_pool(saber_monitor, mock_logger):
    """Teste le traitement d'un nouveau pool"""
    pool_data = {
        "address": "new_pool",
        "token_a": "SOL",
        "token_b": "USDC",
        "liquidity": 10000.0,
        "timestamp": datetime.now().isoformat(),
        "dex": "saber"
    }
    
    # Mock get_pool_liquidity pour retourner une liquidité valide
    with patch.object(saber_monitor, 'get_pool_liquidity', return_value=10000.0):
        await saber_monitor.process_new_pool(pool_data)
        
        # Vérifie que le pool a été ajouté au cache
        assert "new_pool" in saber_monitor.known_pools
        assert saber_monitor.known_pools["new_pool"] == pool_data
        
        # Vérifie les logs
        mock_logger.info.assert_called_once()
        mock_logger.trade.assert_called_once()

@pytest.mark.asyncio
async def test_process_new_pool_insufficient_liquidity(saber_monitor, mock_logger):
    """Teste le rejet d'un pool avec liquidité insuffisante"""
    pool_data = {
        "address": "new_pool",
        "token_a": "SOL",
        "token_b": "USDC",
        "liquidity": 100.0,
        "timestamp": datetime.now().isoformat(),
        "dex": "saber"
    }
    
    # Mock get_pool_liquidity pour retourner une liquidité insuffisante
    with patch.object(saber_monitor, 'get_pool_liquidity', return_value=100.0):
        await saber_monitor.process_new_pool(pool_data)
        
        # Vérifie que le pool n'a pas été ajouté au cache
        assert "new_pool" not in saber_monitor.known_pools
        
        # Vérifie qu'aucun log de trade n'a été émis
        mock_logger.trade.assert_not_called()

@pytest.mark.asyncio
async def test_monitor_pools(saber_monitor, mock_logger):
    """Teste la boucle de surveillance des pools"""
    mock_accounts = [{
        "pubkey": "pool1",
        "account": {"data": ["data"]}
    }]
    
    # Mock pour get_program_accounts et get_pool_liquidity
    with patch.object(saber_monitor, 'get_program_accounts',
                     return_value=mock_accounts), \
         patch.object(saber_monitor, 'get_pool_liquidity',
                     return_value=2000.0):
        # Démarre la surveillance
        saber_monitor.is_running = True
        
        # Crée une tâche pour la surveillance
        monitor_task = asyncio.create_task(saber_monitor.monitor_pools())
        
        # Attend un peu pour laisser le temps à la boucle de s'exécuter
        await asyncio.sleep(0.1)
        
        # Arrête la surveillance
        saber_monitor.is_running = False
        await monitor_task
        
        # Vérifie les appels aux logs
        assert mock_logger.info.call_count >= 1
        assert "pool1" in str(mock_logger.info.call_args_list)

@pytest.mark.asyncio
async def test_start_stop(saber_monitor, mock_logger):
    """Teste le démarrage et l'arrêt du moniteur"""
    # Mock monitor_pools pour éviter la boucle infinie
    with patch.object(saber_monitor, 'monitor_pools'):
        # Test démarrage
        await saber_monitor.start()
        assert saber_monitor.is_running
        mock_logger.info.assert_called_with("Démarrage du moniteur Saber")
        
        # Test arrêt
        await saber_monitor.stop()
        assert not saber_monitor.is_running
        assert "Arrêt du moniteur Saber" in str(mock_logger.info.call_args_list) 