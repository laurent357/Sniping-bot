import pytest
import asyncio
from unittest.mock import Mock, patch
from backend.python.transaction_analysis.filters import TokenFilter, TokenMetrics, RiskLevel
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def token_filter(mock_logger):
    """Crée une instance de TokenFilter avec un mock logger"""
    return TokenFilter(
        rpc_url="https://api.mainnet-beta.solana.com",
        logger=mock_logger,
        min_liquidity_usd=1000.0,
        min_holder_count=10,
        max_supply_threshold=1_000_000_000,
        min_market_cap_usd=10000.0
    )

@pytest.fixture
def sample_token_metrics():
    """Crée un exemple de métriques de token"""
    return TokenMetrics(
        address="token123",
        name="Test Token",
        symbol="TEST",
        decimals=9,
        total_supply=1_000_000.0,
        holder_count=100,
        liquidity_usd=10000.0,
        price_usd=1.0,
        market_cap_usd=1_000_000.0,
        volume_24h_usd=100000.0,
        is_mintable=False,
        has_verified_source=True,
        risk_level=RiskLevel.LOW,
        risk_factors=[]
    )

@pytest.mark.asyncio
async def test_initialization(token_filter, mock_logger):
    """Teste l'initialisation du filtre"""
    assert token_filter.rpc_url == "https://api.mainnet-beta.solana.com"
    assert token_filter.min_liquidity_usd == 1000.0
    assert token_filter.min_holder_count == 10
    assert token_filter.max_supply_threshold == 1_000_000_000
    assert token_filter.min_market_cap_usd == 10000.0
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_get_token_program_data_success(token_filter):
    """Teste la récupération des données du programme token avec succès"""
    mock_response = {
        "result": {
            "value": {
                "data": ["base64data"],
                "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            }
        }
    }
    
    with patch.object(token_filter.client, 'get_account_info',
                     return_value=mock_response):
        data = await token_filter.get_token_program_data("token123")
        assert data is not None
        assert "data" in data
        assert "owner" in data

@pytest.mark.asyncio
async def test_get_token_program_data_error(token_filter, mock_logger):
    """Teste la gestion d'erreur lors de la récupération des données token"""
    with patch.object(token_filter.client, 'get_account_info',
                     side_effect=Exception("RPC Error")):
        data = await token_filter.get_token_program_data("token123")
        assert data is None
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_get_holder_count(token_filter):
    """Teste la récupération du nombre de holders"""
    holder_count = await token_filter.get_holder_count("token123")
    assert isinstance(holder_count, int)
    assert holder_count >= 0

@pytest.mark.asyncio
async def test_check_contract_verification(token_filter):
    """Teste la vérification du contrat"""
    is_verified = await token_filter.check_contract_verification("token123")
    assert isinstance(is_verified, bool)

def test_analyze_supply_distribution(token_filter):
    """Teste l'analyse de la distribution du supply"""
    total_supply = 1_000_000.0
    holder_data = [
        {"address": "holder1", "balance": 200_000.0},  # 20%
        {"address": "holder2", "balance": 150_000.0},  # 15%
        {"address": "holder3", "balance": 100_000.0},  # 10%
        # ... autres holders avec de plus petites balances
    ]
    
    risk_factors = token_filter.analyze_supply_distribution(total_supply, holder_data)
    assert isinstance(risk_factors, list)
    assert len(risk_factors) > 0
    assert any("20%" in factor for factor in risk_factors)

def test_calculate_risk_level_low_risk(token_filter, sample_token_metrics):
    """Teste le calcul du niveau de risque pour un token à faible risque"""
    risk_level = token_filter.calculate_risk_level(sample_token_metrics)
    assert risk_level == RiskLevel.LOW

def test_calculate_risk_level_high_risk(token_filter, sample_token_metrics):
    """Teste le calcul du niveau de risque pour un token à haut risque"""
    # Modifie les métriques pour créer un scénario à haut risque
    sample_token_metrics.liquidity_usd = 100.0
    sample_token_metrics.holder_count = 5
    sample_token_metrics.market_cap_usd = 1000.0
    sample_token_metrics.has_verified_source = False
    
    risk_level = token_filter.calculate_risk_level(sample_token_metrics)
    assert risk_level == RiskLevel.CRITICAL

@pytest.mark.asyncio
async def test_analyze_token_success(token_filter, mock_logger):
    """Teste l'analyse complète d'un token avec succès"""
    # Mock toutes les fonctions nécessaires
    with patch.object(token_filter, 'get_token_program_data',
                     return_value={"data": "mock_data"}), \
         patch.object(token_filter, 'get_holder_count',
                     return_value=100), \
         patch.object(token_filter, 'check_contract_verification',
                     return_value=True):
        
        metrics = await token_filter.analyze_token("token123")
        assert metrics is not None
        assert isinstance(metrics, TokenMetrics)
        assert metrics.address == "token123"
        mock_logger.info.assert_called()

@pytest.mark.asyncio
async def test_analyze_token_failure(token_filter, mock_logger):
    """Teste l'analyse d'un token avec erreur"""
    with patch.object(token_filter, 'get_token_program_data',
                     return_value=None):
        metrics = await token_filter.analyze_token("token123")
        assert metrics is None
        mock_logger.warning.assert_called_once()

@pytest.mark.asyncio
async def test_filter_token_accept(token_filter, mock_logger, sample_token_metrics):
    """Teste l'acceptation d'un token valide"""
    with patch.object(token_filter, 'analyze_token',
                     return_value=sample_token_metrics):
        is_accepted = await token_filter.filter_token("token123")
        assert is_accepted is True
        mock_logger.info.assert_called_with("Token token123 accepté")

@pytest.mark.asyncio
async def test_filter_token_reject_low_liquidity(token_filter, mock_logger, sample_token_metrics):
    """Teste le rejet d'un token avec liquidité insuffisante"""
    sample_token_metrics.liquidity_usd = 100.0
    
    with patch.object(token_filter, 'analyze_token',
                     return_value=sample_token_metrics):
        is_accepted = await token_filter.filter_token("token123")
        assert is_accepted is False
        assert any("liquidité insuffisante" in str(call) 
                  for call in mock_logger.info.call_args_list)

@pytest.mark.asyncio
async def test_filter_token_reject_high_risk(token_filter, mock_logger, sample_token_metrics):
    """Teste le rejet d'un token à haut risque"""
    sample_token_metrics.risk_level = RiskLevel.HIGH
    
    with patch.object(token_filter, 'analyze_token',
                     return_value=sample_token_metrics):
        is_accepted = await token_filter.filter_token("token123")
        assert is_accepted is False
        assert any("risque trop élevé" in str(call) 
                  for call in mock_logger.info.call_args_list) 