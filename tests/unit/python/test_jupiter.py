import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from backend.python.dex_monitoring.jupiter import JupiterMonitor
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def jupiter_monitor(mock_logger):
    """Crée une instance de JupiterMonitor avec un mock logger"""
    return JupiterMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=mock_logger,
        update_interval=1.0,
        min_liquidity_usd=1000.0
    )

@pytest.fixture
def sample_token_data():
    """Exemple de données de token"""
    return {
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "chainId": 101,
        "decimals": 6,
        "name": "USD Coin",
        "symbol": "USDC",
        "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        "tags": ["stablecoin"]
    }

@pytest.fixture
def sample_pool_data():
    """Exemple de données de pool"""
    return {
        "id": "pool123",
        "name": "USDC-SOL",
        "tokens": [
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
            "So11111111111111111111111111111111111111112"    # SOL
        ],
        "liquidity_usd": 1000000.0,
        "volume_24h": 500000.0,
        "fee_bps": 30
    }

@pytest.fixture
def sample_quote_data():
    """Exemple de données de devis"""
    return {
        "inputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "outputMint": "So11111111111111111111111111111111111111112",
        "inAmount": "1000000",  # 1 USDC
        "outAmount": "12345678",  # ~0.012 SOL
        "otherAmountThreshold": "12222222",
        "swapMode": "ExactIn",
        "slippageBps": 50,
        "priceImpactPct": 0.1,
        "routePlan": [
            {
                "swapInfo": {
                    "ammKey": "pool123",
                    "label": "Orca",
                    "inputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "outputMint": "So11111111111111111111111111111111111111112",
                    "inAmount": "1000000",
                    "outAmount": "12345678",
                    "feeAmount": "300",
                    "feeMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                }
            }
        ]
    }

@pytest.mark.asyncio
async def test_initialization(jupiter_monitor, mock_logger):
    """Teste l'initialisation du moniteur"""
    assert jupiter_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert jupiter_monitor.update_interval == 1.0
    assert jupiter_monitor.min_liquidity_usd == 1000.0
    assert not jupiter_monitor.is_running
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_fetch_jupiter_data_success(jupiter_monitor):
    """Teste la récupération réussie des données Jupiter"""
    mock_response = {"data": "test"}
    
    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 200
        mock_get.return_value.__aenter__.return_value.json = \
            asyncio.coroutine(lambda: mock_response)
        
        data = await jupiter_monitor._fetch_jupiter_data("test")
        assert data == mock_response

@pytest.mark.asyncio
async def test_fetch_jupiter_data_error(jupiter_monitor, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des données"""
    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value.status = 500
        mock_get.return_value.__aenter__.return_value.text = \
            asyncio.coroutine(lambda: "Internal Server Error")
        
        data = await jupiter_monitor._fetch_jupiter_data("test")
        assert data is None
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_get_token_info_cached(jupiter_monitor, sample_token_data):
    """Teste la récupération des infos token depuis le cache"""
    token_address = sample_token_data["address"]
    jupiter_monitor.tokens_cache[token_address] = sample_token_data
    
    token_info = await jupiter_monitor.get_token_info(token_address)
    assert token_info == sample_token_data

@pytest.mark.asyncio
async def test_get_token_info_api(jupiter_monitor, sample_token_data):
    """Teste la récupération des infos token depuis l'API"""
    token_address = sample_token_data["address"]
    
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     return_value=[sample_token_data]):
        token_info = await jupiter_monitor.get_token_info(token_address)
        assert token_info == sample_token_data

@pytest.mark.asyncio
async def test_get_pool_info_cached(jupiter_monitor, sample_pool_data):
    """Teste la récupération des infos pool depuis le cache"""
    pool_id = sample_pool_data["id"]
    jupiter_monitor.pools_cache[pool_id] = sample_pool_data
    
    pool_info = await jupiter_monitor.get_pool_info(pool_id)
    assert pool_info == sample_pool_data

@pytest.mark.asyncio
async def test_get_pool_info_api(jupiter_monitor, sample_pool_data):
    """Teste la récupération des infos pool depuis l'API"""
    pool_id = sample_pool_data["id"]
    
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     return_value=sample_pool_data):
        pool_info = await jupiter_monitor.get_pool_info(pool_id)
        assert pool_info == sample_pool_data

@pytest.mark.asyncio
async def test_get_quote(jupiter_monitor, sample_quote_data):
    """Teste la récupération d'un devis"""
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     return_value=sample_quote_data):
        quote = await jupiter_monitor.get_quote(
            input_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            output_mint="So11111111111111111111111111111111111111112",
            amount=1000000
        )
        assert quote == sample_quote_data

@pytest.mark.asyncio
async def test_get_swap_route(jupiter_monitor, sample_quote_data):
    """Teste la récupération d'une route de swap"""
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     return_value=sample_quote_data):
        route = await jupiter_monitor.get_swap_route(
            input_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            output_mint="So11111111111111111111111111111111111111112",
            amount=1000000
        )
        assert route == sample_quote_data

@pytest.mark.asyncio
async def test_monitor_new_pools(jupiter_monitor, sample_pool_data, mock_logger):
    """Teste la surveillance des nouveaux pools"""
    mock_pools = [sample_pool_data]
    
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     return_value=mock_pools):
        # Démarre la surveillance
        jupiter_monitor.is_running = True
        monitor_task = asyncio.create_task(jupiter_monitor.monitor_new_pools())
        
        # Attend un peu
        await asyncio.sleep(0.1)
        
        # Arrête la surveillance
        jupiter_monitor.is_running = False
        await monitor_task
        
        # Vérifie que le pool a été détecté
        assert sample_pool_data["id"] in jupiter_monitor.pools_cache
        mock_logger.info.assert_called()

@pytest.mark.asyncio
async def test_monitor_new_pools_error(jupiter_monitor, mock_logger):
    """Teste la gestion d'erreur dans la surveillance"""
    with patch.object(jupiter_monitor, '_fetch_jupiter_data',
                     side_effect=Exception("Test error")):
        # Démarre la surveillance
        jupiter_monitor.is_running = True
        await jupiter_monitor.monitor_new_pools()
        
        # Vérifie que l'erreur a été gérée
        assert not jupiter_monitor.is_running
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_start_stop(jupiter_monitor, mock_logger):
    """Teste le démarrage et l'arrêt du moniteur"""
    # Mock monitor_new_pools pour qu'il ne bloque pas
    with patch.object(jupiter_monitor, 'monitor_new_pools',
                     side_effect=lambda: None):
        # Démarre
        await jupiter_monitor.start()
        assert jupiter_monitor.is_running
        
        # Arrête
        await jupiter_monitor.stop()
        assert not jupiter_monitor.is_running
        
        # Vérifie les logs
        assert mock_logger.info.call_count == 2 