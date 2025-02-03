import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from ..dex_monitoring.jupiter import JupiterMonitor
from ..utils.logging import BotLogger

@pytest.fixture
def jupiter_monitor():
    return JupiterMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=Mock(spec=BotLogger),
        update_interval=1.0,
        min_liquidity_usd=1000.0
    )

@pytest.mark.asyncio
async def test_init_jupiter_monitor(jupiter_monitor):
    assert jupiter_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert jupiter_monitor.update_interval == 1.0
    assert jupiter_monitor.min_liquidity_usd == 1000.0
    assert not jupiter_monitor.is_running

@pytest.mark.asyncio
async def test_fetch_jupiter_data(jupiter_monitor):
    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {"test": "data"}
        mock_get.return_value.__aenter__.return_value = mock_response
        
        result = await jupiter_monitor._fetch_jupiter_data("test-endpoint")
        assert result == {"test": "data"}

@pytest.mark.asyncio
async def test_fetch_jupiter_data_error(jupiter_monitor):
    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_response = Mock()
        mock_response.status = 500
        mock_response.text = AsyncMock(return_value="Internal Server Error")
        mock_get.return_value.__aenter__.return_value = mock_response
        
        result = await jupiter_monitor._fetch_jupiter_data("test-endpoint")
        assert result is None
        jupiter_monitor.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_get_token_info(jupiter_monitor):
    test_token = {
        "address": "test_token_address",
        "symbol": "TEST",
        "decimals": 9
    }
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.return_value = [test_token]
        result = await jupiter_monitor.get_token_info("test_token_address")
        assert result == test_token

@pytest.mark.asyncio
async def test_get_token_info_cache(jupiter_monitor):
    test_token = {
        "address": "test_token_address",
        "symbol": "TEST",
        "decimals": 9
    }
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.return_value = [test_token]
        
        # Premier appel - doit appeler l'API
        result1 = await jupiter_monitor.get_token_info("test_token_address")
        assert result1 == test_token
        mock_fetch.assert_called_once()
        
        # Deuxième appel - doit utiliser le cache
        result2 = await jupiter_monitor.get_token_info("test_token_address")
        assert result2 == test_token
        mock_fetch.assert_called_once()  # Toujours appelé une seule fois

@pytest.mark.asyncio
async def test_get_pool_info(jupiter_monitor):
    test_pool = {
        "id": "test_pool_id",
        "liquidity_usd": 1500.0
    }
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.return_value = test_pool
        result = await jupiter_monitor.get_pool_info("test_pool_id")
        assert result == test_pool

@pytest.mark.asyncio
async def test_monitor_new_pools(jupiter_monitor):
    test_pools = [
        {"id": "pool1", "liquidity_usd": 2000.0},
        {"id": "pool2", "liquidity_usd": 500.0}
    ]
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.return_value = test_pools
        jupiter_monitor.is_running = True
        
        # Simule une itération de surveillance
        await asyncio.sleep(0.1)
        jupiter_monitor.is_running = False
        
        assert "pool1" in jupiter_monitor.pools_cache
        assert "pool2" not in jupiter_monitor.pools_cache  # Liquidité trop faible

@pytest.mark.asyncio
async def test_monitor_new_pools_error_handling(jupiter_monitor):
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.side_effect = Exception("API Error")
        jupiter_monitor.is_running = True
        
        # Simule une itération avec erreur
        await asyncio.sleep(0.1)
        jupiter_monitor.is_running = False
        
        jupiter_monitor.logger.error.assert_called()

@pytest.mark.asyncio
async def test_monitor_new_pools_updates_existing(jupiter_monitor):
    initial_pools = [
        {"id": "pool1", "liquidity_usd": 2000.0}
    ]
    updated_pools = [
        {"id": "pool1", "liquidity_usd": 2500.0}
    ]
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        # Premier appel
        mock_fetch.return_value = initial_pools
        jupiter_monitor.is_running = True
        await asyncio.sleep(0.1)
        
        assert jupiter_monitor.pools_cache["pool1"]["liquidity_usd"] == 2000.0
        
        # Deuxième appel avec mise à jour
        mock_fetch.return_value = updated_pools
        await asyncio.sleep(0.1)
        jupiter_monitor.is_running = False
        
        assert jupiter_monitor.pools_cache["pool1"]["liquidity_usd"] == 2500.0

@pytest.mark.asyncio
async def test_start_stop(jupiter_monitor):
    with patch.object(jupiter_monitor, "monitor_new_pools") as mock_monitor:
        # Test start
        await jupiter_monitor.start()
        assert jupiter_monitor.is_running
        mock_monitor.assert_called_once()
        
        # Test stop
        await jupiter_monitor.stop()
        assert not jupiter_monitor.is_running

@pytest.mark.asyncio
async def test_concurrent_monitoring(jupiter_monitor):
    test_pools = [
        {"id": f"pool{i}", "liquidity_usd": 2000.0} for i in range(5)
    ]
    
    with patch.object(jupiter_monitor, "_fetch_jupiter_data") as mock_fetch:
        mock_fetch.return_value = test_pools
        
        # Démarre plusieurs tâches de surveillance
        tasks = [
            jupiter_monitor.monitor_new_pools(),
            jupiter_monitor.monitor_new_pools(),
            jupiter_monitor.monitor_new_pools()
        ]
        
        jupiter_monitor.is_running = True
        await asyncio.sleep(0.2)
        jupiter_monitor.is_running = False
        
        # Vérifie que les pools sont correctement ajoutés
        assert len(jupiter_monitor.pools_cache) == 5
        for i in range(5):
            assert f"pool{i}" in jupiter_monitor.pools_cache 