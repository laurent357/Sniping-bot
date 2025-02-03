import pytest
from unittest.mock import Mock, patch, AsyncMock
from ..transaction_analysis.ai_analysis import TokenAIAnalyzer, AIRiskLevel, AIAnalysisResult
from ..utils.logging import BotLogger
from datetime import datetime

@pytest.fixture
def token_analyzer():
    return TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger),
        model_name="mistral",
        timeout_seconds=30,
        cache_duration_minutes=60
    )

@pytest.mark.asyncio
async def test_init_token_analyzer(token_analyzer):
    assert token_analyzer.ollama_host == "http://localhost:11434"
    assert token_analyzer.model_name == "mistral"
    assert token_analyzer.timeout == 30
    assert token_analyzer.cache_duration == 60
    assert isinstance(token_analyzer.analysis_cache, dict)

@pytest.mark.asyncio
async def test_call_ollama_success(token_analyzer):
    mock_response = {
        "response": "Analysis result"
    }
    
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_post_response = Mock()
        mock_post_response.status = 200
        mock_post_response.json = AsyncMock(return_value=mock_response)
        mock_post.return_value.__aenter__.return_value = mock_post_response
        
        result = await token_analyzer._call_ollama("Test prompt")
        assert result == "Analysis result"

@pytest.mark.asyncio
async def test_call_ollama_error(token_analyzer):
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_post_response = Mock()
        mock_post_response.status = 500
        mock_post_response.text = AsyncMock(return_value="Server Error")
        mock_post.return_value.__aenter__.return_value = mock_post_response
        
        result = await token_analyzer._call_ollama("Test prompt")
        assert result is None
        token_analyzer.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_contract(token_analyzer):
    mock_ai_response = '''
    {
        "risk_level": "SUSPICIOUS",
        "confidence": 0.85,
        "risk_factors": ["Unlimited mint", "Admin privileges"],
        "details": {
            "code_analysis": "Suspicious mint function found",
            "permissions": "Admin can pause transfers"
        }
    }
    '''
    
    with patch.object(token_analyzer, "_call_ollama") as mock_call:
        mock_call.return_value = mock_ai_response
        
        result = await token_analyzer.analyze_contract(
            "contract_code",
            "token_address"
        )
        
        assert "risk_level" in result
        assert result["risk_level"] == "SUSPICIOUS"
        assert len(result["risk_factors"]) == 2

@pytest.mark.asyncio
async def test_analyze_transactions(token_analyzer):
    mock_transactions = [
        {"type": "mint", "amount": 1000000},
        {"type": "transfer", "amount": 500000}
    ]
    
    mock_ai_response = '''
    {
        "risk_level": "SAFE",
        "confidence": 0.95,
        "risk_factors": [],
        "details": {
            "pattern_analysis": "Normal trading activity",
            "volume_analysis": "Consistent with market standards"
        }
    }
    '''
    
    with patch.object(token_analyzer, "_call_ollama") as mock_call:
        mock_call.return_value = mock_ai_response
        
        result = await token_analyzer.analyze_transactions(
            mock_transactions,
            "token_address"
        )
        
        assert "risk_level" in result
        assert result["risk_level"] == "SAFE"
        assert len(result["risk_factors"]) == 0

@pytest.mark.asyncio
async def test_analyze_distribution(token_analyzer):
    mock_distribution = {
        "top_holders": [
            {"address": "wallet1", "percentage": 50},
            {"address": "wallet2", "percentage": 30}
        ]
    }
    
    mock_ai_response = '''
    {
        "risk_level": "DANGEROUS",
        "confidence": 0.90,
        "risk_factors": ["High concentration", "Whale dominance"],
        "details": {
            "concentration_analysis": "Two wallets control 80%",
            "distribution_pattern": "Highly centralized"
        }
    }
    '''
    
    with patch.object(token_analyzer, "_call_ollama") as mock_call:
        mock_call.return_value = mock_ai_response
        
        result = await token_analyzer.analyze_distribution(
            mock_distribution,
            "token_address"
        )
        
        assert "risk_level" in result
        assert result["risk_level"] == "DANGEROUS"
        assert len(result["risk_factors"]) == 2

@pytest.mark.asyncio
async def test_cache_behavior(token_analyzer):
    mock_ai_response = '''
    {
        "risk_level": "SAFE",
        "confidence": 0.95,
        "risk_factors": [],
        "details": {}
    }
    '''
    
    with patch.object(token_analyzer, "_call_ollama") as mock_call:
        mock_call.return_value = mock_ai_response
        
        # Premier appel - doit appeler l'API
        result1 = await token_analyzer.analyze_contract(
            "contract_code",
            "token_address"
        )
        assert mock_call.call_count == 1
        
        # Deuxième appel - doit utiliser le cache
        result2 = await token_analyzer.analyze_contract(
            "contract_code",
            "token_address"
        )
        assert mock_call.call_count == 1  # Pas d'appel supplémentaire
        assert result1 == result2

@pytest.mark.asyncio
async def test_error_handling(token_analyzer):
    with patch.object(token_analyzer, "_call_ollama") as mock_call:
        mock_call.side_effect = Exception("API Error")
        
        result = await token_analyzer.analyze_contract(
            "contract_code",
            "token_address"
        )
        
        assert "error" in result
        token_analyzer.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_risk_level_calculation(token_analyzer):
    analysis_results = [
        {"risk_level": "SAFE", "confidence": 0.9},
        {"risk_level": "SUSPICIOUS", "confidence": 0.8},
        {"risk_level": "DANGEROUS", "confidence": 0.7}
    ]
    
    risk_level = token_analyzer._calculate_risk_level(analysis_results)
    assert risk_level == AIRiskLevel.DANGEROUS  # Prend le niveau le plus élevé 