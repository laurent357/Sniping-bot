import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from ..dex.jupiter import JupiterMonitor
from ..dex.saber import SaberMonitor
from ..dex.orca import OrcaMonitor
from ..utils.logging import BotLogger
from ..utils.solana import SolanaClient

@pytest.fixture
def mock_solana():
    return Mock(spec=SolanaClient)

@pytest.fixture
def mock_logger():
    return Mock(spec=BotLogger)

@pytest.fixture
def monitors(mock_solana, mock_logger):
    jupiter = JupiterMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=mock_logger,
        update_interval=1.0
    )
    
    saber = SaberMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=mock_logger,
        update_interval=1.0
    )
    
    orca = OrcaMonitor(
        rpc_url="https://api.mainnet-beta.solana.com",
        solana_client=mock_solana,
        logger=mock_logger,
        update_interval=1.0
    )
    
    return jupiter, saber, orca

@pytest.mark.asyncio
async def test_concurrent_monitoring(monitors, mock_solana):
    jupiter, saber, orca = monitors
    
    # Configure mock responses
    mock_solana.get_program_accounts = AsyncMock()
    mock_solana.get_program_accounts.side_effect = [
        # Jupiter pools
        [{"pubkey": "jupiter1", "account": {"data": {"tokenA": "SOL", "tokenB": "USDC"}}}],
        # Saber pools
        [{"pubkey": "saber1", "account": {"data": {"tokenA": "USDC", "tokenB": "USDT"}}}],
        # Orca whirlpools
        [{"pubkey": "orca1", "account": {"data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "sqrtPrice": "1234567890",
            "tickCurrentIndex": 100
        }}}]
    ]
    
    # Démarrer tous les moniteurs
    tasks = [
        asyncio.create_task(jupiter.start_monitoring()),
        asyncio.create_task(saber.start_monitoring()),
        asyncio.create_task(orca.start_monitoring())
    ]
    
    # Attendre que tous les moniteurs soient démarrés
    await asyncio.sleep(0.1)
    assert all(monitor.is_monitoring for monitor in [jupiter, saber, orca])
    
    # Arrêter tous les moniteurs
    await asyncio.gather(
        jupiter.stop_monitoring(),
        saber.stop_monitoring(),
        orca.stop_monitoring()
    )
    
    assert not any(monitor.is_monitoring for monitor in [jupiter, saber, orca])
    
    # Nettoyer les tâches
    for task in tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass

@pytest.mark.asyncio
async def test_cross_dex_price_comparison(monitors, mock_solana):
    jupiter, saber, orca = monitors
    
    # Configurer les mocks pour simuler des prix différents sur chaque DEX
    mock_solana.get_program_accounts = AsyncMock()
    mock_solana.get_program_accounts.side_effect = [
        # Jupiter: SOL/USDC à 20
        [{"pubkey": "jupiter1", "account": {"data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "reserves": [1, 20]
        }}}],
        # Saber: SOL/USDC à 22
        [{"pubkey": "saber1", "account": {"data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "reserves": [1, 22]
        }}}],
        # Orca: SOL/USDC à 21
        [{"pubkey": "orca1", "account": {"data": {
            "tokenA": "SOL",
            "tokenB": "USDC",
            "sqrtPrice": "4605510559",  # Approximativement 21 USDC/SOL
            "tickCurrentIndex": 100
        }}}]
    ]
    
    # Récupérer les pools de chaque DEX
    jupiter_pools = await jupiter.fetch_pools()
    saber_pools = await saber.fetch_pools()
    orca_pools = await orca.fetch_whirlpools()
    
    # Vérifier que nous avons bien un pool pour chaque DEX
    assert len(jupiter_pools) == 1
    assert len(saber_pools) == 1
    assert len(orca_pools) == 1
    
    # Calculer les prix
    jupiter_price = jupiter.calculate_price(jupiter_pools[0]["account"]["data"])
    saber_price = saber.calculate_price(saber_pools[0]["account"]["data"])
    orca_price = orca.calculate_price(orca_pools[0]["account"]["data"])
    
    # Vérifier que les prix sont différents
    assert jupiter_price != saber_price != orca_price
    
    # Vérifier que les prix sont dans des limites raisonnables
    assert 19 <= jupiter_price <= 23
    assert 19 <= saber_price <= 23
    assert 19 <= orca_price <= 23

@pytest.mark.asyncio
async def test_error_propagation(monitors, mock_solana):
    jupiter, saber, orca = monitors
    
    # Simuler une erreur RPC
    mock_solana.get_program_accounts = AsyncMock(side_effect=Exception("RPC Error"))
    
    # Vérifier que l'erreur est gérée correctement par chaque moniteur
    jupiter_pools = await jupiter.fetch_pools()
    saber_pools = await saber.fetch_pools()
    orca_pools = await orca.fetch_whirlpools()
    
    assert jupiter_pools == []
    assert saber_pools == []
    assert orca_pools == []
    
    # Vérifier que les erreurs ont été loggées
    assert monitors[0].logger.error.call_count == 1
    assert monitors[1].logger.error.call_count == 1
    assert monitors[2].logger.error.call_count == 1

@pytest.mark.asyncio
async def test_new_pool_detection_across_dexes(monitors, mock_solana):
    jupiter, saber, orca = monitors
    
    # Premier appel : pools initiaux
    mock_solana.get_program_accounts = AsyncMock()
    mock_solana.get_program_accounts.side_effect = [
        # Jupiter: 1 pool
        [{"pubkey": "jupiter1", "data": {"tokenA": "SOL", "tokenB": "USDC"}}],
        # Saber: 1 pool
        [{"pubkey": "saber1", "data": {"tokenA": "USDC", "tokenB": "USDT"}}],
        # Orca: 1 pool
        [{"pubkey": "orca1", "data": {"tokenA": "SOL", "tokenB": "USDC"}}]
    ]
    
    # Initialiser l'état des pools
    await jupiter.fetch_pools()
    await saber.fetch_pools()
    await orca.fetch_whirlpools()
    
    # Deuxième appel : nouveaux pools
    mock_solana.get_program_accounts.side_effect = [
        # Jupiter: +1 pool
        [
            {"pubkey": "jupiter1", "data": {"tokenA": "SOL", "tokenB": "USDC"}},
            {"pubkey": "jupiter2", "data": {"tokenA": "ETH", "tokenB": "USDC"}}
        ],
        # Saber: +1 pool
        [
            {"pubkey": "saber1", "data": {"tokenA": "USDC", "tokenB": "USDT"}},
            {"pubkey": "saber2", "data": {"tokenA": "BTC", "tokenB": "USDC"}}
        ],
        # Orca: +1 pool
        [
            {"pubkey": "orca1", "data": {"tokenA": "SOL", "tokenB": "USDC"}},
            {"pubkey": "orca2", "data": {"tokenA": "RAY", "tokenB": "USDC"}}
        ]
    ]
    
    # Vérifier la détection des nouveaux pools
    new_jupiter_pools = await jupiter.check_new_pools()
    new_saber_pools = await saber.check_new_pools()
    new_orca_pools = await orca.check_new_whirlpools()
    
    assert len(new_jupiter_pools) == 1
    assert len(new_saber_pools) == 1
    assert len(new_orca_pools) == 1
    
    assert new_jupiter_pools[0]["pubkey"] == "jupiter2"
    assert new_saber_pools[0]["pubkey"] == "saber2"
    assert new_orca_pools[0]["pubkey"] == "orca2" 