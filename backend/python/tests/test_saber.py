import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from ..dex.saber import SaberMonitor
from ..utils.logging import BotLogger
from ..utils.solana import SolanaClient

@pytest.fixture
def saber_monitor():
    return SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=Mock(spec=BotLogger),
        update_interval=1.0,
        solana_client=Mock(spec=SolanaClient)
    )

@pytest.mark.asyncio
async def test_init_saber_monitor(saber_monitor):
    assert saber_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert saber_monitor.update_interval == 1.0
    assert not saber_monitor.is_monitoring

@pytest.mark.asyncio
async def test_fetch_pools():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_program_accounts = AsyncMock(return_value=[
        {
            "pubkey": "pool1",
            "account": {
                "data": {
                    "tokenA": "USDC",
                    "tokenB": "USDT",
                    "reserves": [1000, 1000]
                }
            }
        },
        {
            "pubkey": "pool2",
            "account": {
                "data": {
                    "tokenA": "SOL",
                    "tokenB": "USDC",
                    "reserves": [500, 10000]
                }
            }
        }
    ])

    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana
    )
    
    pools = await monitor.fetch_pools()
    assert len(pools) == 2
    assert pools[0]["pubkey"] == "pool1"
    assert pools[1]["pubkey"] == "pool2"

@pytest.mark.asyncio
async def test_get_pool_info():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_account_info = AsyncMock(return_value={
        "data": {
            "tokenA": "USDC",
            "tokenB": "USDT",
            "reserves": [1000, 1000],
            "fees": {"trading": 0.3, "admin": 0.0}
        }
    })

    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana
    )
    
    pool_info = await monitor.get_pool_info("pool1")
    assert pool_info["tokenA"] == "USDC"
    assert pool_info["tokenB"] == "USDT"
    assert pool_info["reserves"] == [1000, 1000]

@pytest.mark.asyncio
async def test_calculate_price():
    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=Mock(spec=SolanaClient)
    )
    
    pool_info = {
        "tokenA": "USDC",
        "tokenB": "USDT",
        "reserves": [1000, 1000]
    }
    
    price = monitor.calculate_price(pool_info)
    assert price == 1.0  # Prix attendu pour un pool stable USDC/USDT

@pytest.mark.asyncio
async def test_monitor_new_pools():
    mock_solana = Mock(spec=SolanaClient)
    initial_pools = [
        {"pubkey": "pool1", "data": {"tokenA": "USDC", "tokenB": "USDT"}},
        {"pubkey": "pool2", "data": {"tokenA": "SOL", "tokenB": "USDC"}}
    ]
    
    new_pools = [
        {"pubkey": "pool1", "data": {"tokenA": "USDC", "tokenB": "USDT"}},
        {"pubkey": "pool2", "data": {"tokenA": "SOL", "tokenB": "USDC"}},
        {"pubkey": "pool3", "data": {"tokenA": "ETH", "tokenB": "USDC"}}
    ]
    
    mock_solana.get_program_accounts = AsyncMock()
    mock_solana.get_program_accounts.side_effect = [initial_pools, new_pools]
    
    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Premier appel pour initialiser les pools
    await monitor.fetch_pools()
    
    # Deuxième appel qui devrait détecter le nouveau pool
    new_pool = await monitor.check_new_pools()
    assert len(new_pool) == 1
    assert new_pool[0]["pubkey"] == "pool3"

@pytest.mark.asyncio
async def test_monitor_price_changes():
    mock_solana = Mock(spec=SolanaClient)
    initial_pool = {
        "pubkey": "pool1",
        "data": {
            "tokenA": "USDC",
            "tokenB": "USDT",
            "reserves": [1000, 1000]
        }
    }
    
    updated_pool = {
        "pubkey": "pool1",
        "data": {
            "tokenA": "USDC",
            "tokenB": "USDT",
            "reserves": [1200, 800]  # Prix changé de 1.0 à 1.5
        }
    }
    
    mock_solana.get_account_info = AsyncMock()
    mock_solana.get_account_info.side_effect = [
        initial_pool["data"],
        updated_pool["data"]
    ]
    
    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Premier appel pour obtenir le prix initial
    initial_price = monitor.calculate_price(initial_pool["data"])
    assert initial_price == 1.0
    
    # Deuxième appel pour détecter le changement de prix
    updated_price = monitor.calculate_price(updated_pool["data"])
    assert updated_price == 1.5

@pytest.mark.asyncio
async def test_error_handling():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_program_accounts = AsyncMock(side_effect=Exception("RPC Error"))
    
    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Vérifie que l'erreur est gérée correctement
    pools = await monitor.fetch_pools()
    assert pools == []
    monitor.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_start_stop_monitoring():
    mock_solana = Mock(spec=SolanaClient)
    monitor = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        update_interval=0.1
    )
    
    # Démarre le monitoring
    monitoring_task = asyncio.create_task(monitor.start_monitoring())
    assert monitor.is_monitoring
    
    # Attend un peu pour permettre quelques itérations
    await asyncio.sleep(0.3)
    
    # Arrête le monitoring
    await monitor.stop_monitoring()
    assert not monitor.is_monitoring
    
    # Vérifie que la tâche s'est terminée proprement
    try:
        await monitoring_task
    except asyncio.CancelledError:
        pass  # Expected behavior 