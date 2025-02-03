import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from ..dex.orca import OrcaMonitor
from ..utils.logging import BotLogger
from ..utils.solana import SolanaClient

@pytest.fixture
def orca_monitor():
    return OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=Mock(spec=BotLogger),
        update_interval=1.0,
        solana_client=Mock(spec=SolanaClient)
    )

@pytest.mark.asyncio
async def test_init_orca_monitor(orca_monitor):
    assert orca_monitor.rpc_url == "https://api.mainnet-beta.solana.com"
    assert orca_monitor.update_interval == 1.0
    assert not orca_monitor.is_monitoring

@pytest.mark.asyncio
async def test_fetch_whirlpools():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_program_accounts = AsyncMock(return_value=[
        {
            "pubkey": "whirlpool1",
            "account": {
                "data": {
                    "tokenA": "SOL",
                    "tokenB": "USDC",
                    "tickSpacing": 64,
                    "fee": 0.003,
                    "sqrtPrice": "1234567890"
                }
            }
        },
        {
            "pubkey": "whirlpool2",
            "account": {
                "data": {
                    "tokenA": "USDC",
                    "tokenB": "USDT",
                    "tickSpacing": 1,
                    "fee": 0.0001,
                    "sqrtPrice": "2345678901"
                }
            }
        }
    ])

    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana
    )
    
    whirlpools = await monitor.fetch_whirlpools()
    assert len(whirlpools) == 2
    assert whirlpools[0]["pubkey"] == "whirlpool1"
    assert whirlpools[1]["pubkey"] == "whirlpool2"

@pytest.mark.asyncio
async def test_get_whirlpool_info():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_account_info = AsyncMock(return_value={
        "data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "tickSpacing": 64,
            "fee": 0.003,
            "sqrtPrice": "1234567890",
            "liquidity": "1000000000",
            "tickCurrentIndex": 100
        }
    })

    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana
    )
    
    pool_info = await monitor.get_whirlpool_info("whirlpool1")
    assert pool_info["tokenA"] == "SOL"
    assert pool_info["tokenB"] == "USDC"
    assert pool_info["tickSpacing"] == 64

@pytest.mark.asyncio
async def test_calculate_price():
    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=Mock(spec=SolanaClient)
    )
    
    whirlpool_info = {
        "tokenA": "SOL",
        "tokenB": "USDC",
        "sqrtPrice": "1234567890",
        "tickCurrentIndex": 100
    }
    
    price = monitor.calculate_price(whirlpool_info)
    assert isinstance(price, float)
    assert price > 0

@pytest.mark.asyncio
async def test_monitor_new_whirlpools():
    mock_solana = Mock(spec=SolanaClient)
    initial_pools = [
        {"pubkey": "whirlpool1", "data": {"tokenA": "SOL", "tokenB": "USDC"}},
        {"pubkey": "whirlpool2", "data": {"tokenA": "USDC", "tokenB": "USDT"}}
    ]
    
    new_pools = [
        {"pubkey": "whirlpool1", "data": {"tokenA": "SOL", "tokenB": "USDC"}},
        {"pubkey": "whirlpool2", "data": {"tokenA": "USDC", "tokenB": "USDT"}},
        {"pubkey": "whirlpool3", "data": {"tokenA": "ETH", "tokenB": "USDC"}}
    ]
    
    mock_solana.get_program_accounts = AsyncMock()
    mock_solana.get_program_accounts.side_effect = [initial_pools, new_pools]
    
    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Premier appel pour initialiser les whirlpools
    await monitor.fetch_whirlpools()
    
    # Deuxième appel qui devrait détecter le nouveau whirlpool
    new_pool = await monitor.check_new_whirlpools()
    assert len(new_pool) == 1
    assert new_pool[0]["pubkey"] == "whirlpool3"

@pytest.mark.asyncio
async def test_monitor_price_changes():
    mock_solana = Mock(spec=SolanaClient)
    initial_pool = {
        "pubkey": "whirlpool1",
        "data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "sqrtPrice": "1234567890",
            "tickCurrentIndex": 100
        }
    }
    
    updated_pool = {
        "pubkey": "whirlpool1",
        "data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "sqrtPrice": "2345678901",  # Changed sqrt price
            "tickCurrentIndex": 150  # Changed tick index
        }
    }
    
    mock_solana.get_account_info = AsyncMock()
    mock_solana.get_account_info.side_effect = [
        initial_pool["data"],
        updated_pool["data"]
    ]
    
    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Premier appel pour obtenir le prix initial
    initial_price = monitor.calculate_price(initial_pool["data"])
    
    # Deuxième appel pour détecter le changement de prix
    updated_price = monitor.calculate_price(updated_pool["data"])
    
    assert initial_price != updated_price

@pytest.mark.asyncio
async def test_error_handling():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_program_accounts = AsyncMock(side_effect=Exception("RPC Error"))
    
    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=Mock(spec=BotLogger)
    )
    
    # Vérifie que l'erreur est gérée correctement
    whirlpools = await monitor.fetch_whirlpools()
    assert whirlpools == []
    monitor.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_start_stop_monitoring():
    mock_solana = Mock(spec=SolanaClient)
    monitor = OrcaMonitor(
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

@pytest.mark.asyncio
async def test_tick_array_handling():
    mock_solana = Mock(spec=SolanaClient)
    mock_solana.get_account_info = AsyncMock(return_value={
        "data": {
            "startTickIndex": 0,
            "ticks": [
                {"liquidityNet": "1000", "liquidityGross": "1000"},
                {"liquidityNet": "-500", "liquidityGross": "500"},
                {"liquidityNet": "200", "liquidityGross": "200"}
            ]
        }
    })

    monitor = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana
    )
    
    tick_array = await monitor.get_tick_array("tick_array1")
    assert len(tick_array["ticks"]) == 3
    assert tick_array["startTickIndex"] == 0 