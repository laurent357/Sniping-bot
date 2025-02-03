import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from backend.python.transaction_analysis.ai_analysis import (
    TokenAIAnalyzer,
    AIAnalysisResult,
    AIRiskLevel
)
from backend.python.utils.logging import BotLogger

@pytest.fixture
def mock_logger():
    """Crée un mock du logger"""
    return Mock(spec=BotLogger)

@pytest.fixture
def ai_analyzer(mock_logger):
    """Crée une instance de TokenAIAnalyzer avec un mock logger"""
    return TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=mock_logger,
        model_name="mistral",
        timeout_seconds=30,
        cache_duration_minutes=60
    )

@pytest.fixture
def sample_contract_code():
    """Exemple de code de contrat"""
    return """
    pub contract Token {
        pub var totalSupply: UFix64
        pub var name: String
        pub var symbol: String
        
        init() {
            self.totalSupply = 1000000.0
            self.name = "Test Token"
            self.symbol = "TEST"
        }
    }
    """

@pytest.fixture
def sample_transactions():
    """Exemple de transactions"""
    return [
        {
            "type": "transfer",
            "from": "wallet1",
            "to": "wallet2",
            "amount": 1000.0,
            "timestamp": "2024-03-20T10:00:00Z"
        },
        {
            "type": "swap",
            "from_token": "SOL",
            "to_token": "TEST",
            "amount_in": 1.0,
            "amount_out": 1000.0,
            "timestamp": "2024-03-20T10:01:00Z"
        }
    ]

@pytest.fixture
def sample_distribution():
    """Exemple de distribution de tokens"""
    return {
        "total_supply": 1000000.0,
        "holders": {
            "wallet1": 200000.0,  # 20%
            "wallet2": 150000.0,  # 15%
            "wallet3": 100000.0,  # 10%
            "others": 550000.0    # 55%
        }
    }

@pytest.mark.asyncio
async def test_initialization(ai_analyzer, mock_logger):
    """Teste l'initialisation de l'analyseur"""
    assert ai_analyzer.ollama_host == "http://localhost:11434"
    assert ai_analyzer.model_name == "mistral"
    assert ai_analyzer.timeout == 30
    assert ai_analyzer.cache_duration == 60
    mock_logger.info.assert_called_once()

@pytest.mark.asyncio
async def test_call_ollama_success(ai_analyzer):
    """Teste l'appel réussi à Ollama"""
    mock_response = {"response": "Analyse complétée avec succès"}
    
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_post.return_value.__aenter__.return_value.status = 200
        mock_post.return_value.__aenter__.return_value.json = \
            asyncio.coroutine(lambda: mock_response)
        
        response = await ai_analyzer._call_ollama("Test prompt")
        assert response == "Analyse complétée avec succès"

@pytest.mark.asyncio
async def test_call_ollama_error(ai_analyzer, mock_logger):
    """Teste la gestion d'erreur d'Ollama"""
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_post.return_value.__aenter__.return_value.status = 500
        mock_post.return_value.__aenter__.return_value.text = \
            asyncio.coroutine(lambda: "Internal Server Error")
        
        response = await ai_analyzer._call_ollama("Test prompt")
        assert response is None
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_contract_success(ai_analyzer, sample_contract_code):
    """Teste l'analyse réussie d'un contrat"""
    mock_response = {
        "response": '{"risk_level": "SAFE", "issues": []}'
    }
    
    with patch.object(ai_analyzer, '_call_ollama',
                     return_value=mock_response["response"]):
        result = await ai_analyzer.analyze_contract(
            sample_contract_code,
            "token123"
        )
        assert result["risk_level"] == "SAFE"
        assert result["issues"] == []

@pytest.mark.asyncio
async def test_analyze_transactions_success(ai_analyzer, sample_transactions):
    """Teste l'analyse réussie des transactions"""
    mock_response = {
        "response": '{"risk_level": "SUSPICIOUS", "patterns": ["Large transfers"]}'
    }
    
    with patch.object(ai_analyzer, '_call_ollama',
                     return_value=mock_response["response"]):
        result = await ai_analyzer.analyze_transactions(
            sample_transactions,
            "token123"
        )
        assert result["risk_level"] == "SUSPICIOUS"
        assert "Large transfers" in result["patterns"]

@pytest.mark.asyncio
async def test_analyze_distribution_success(ai_analyzer, sample_distribution):
    """Teste l'analyse réussie de la distribution"""
    mock_response = {
        "response": '{"risk_level": "MEDIUM", "concentration": "high"}'
    }
    
    with patch.object(ai_analyzer, '_call_ollama',
                     return_value=mock_response["response"]):
        result = await ai_analyzer.analyze_distribution(
            sample_distribution,
            "token123"
        )
        assert result["risk_level"] == "MEDIUM"
        assert result["concentration"] == "high"

@pytest.mark.asyncio
async def test_analyze_token_complete(ai_analyzer, 
                                    sample_contract_code,
                                    sample_transactions,
                                    sample_distribution):
    """Teste l'analyse complète d'un token"""
    mock_responses = [
        '{"risk_level": "SAFE", "issues": []}',
        '{"risk_level": "SUSPICIOUS", "patterns": ["Large transfers"]}',
        '{"risk_level": "MEDIUM", "concentration": "high"}'
    ]
    
    with patch.object(ai_analyzer, '_call_ollama',
                     side_effect=mock_responses):
        result = await ai_analyzer.analyze_token(
            "token123",
            sample_contract_code,
            sample_transactions,
            sample_distribution
        )
        
        assert isinstance(result, AIAnalysisResult)
        assert result.token_address == "token123"
        assert result.risk_level in [level for level in AIRiskLevel]
        assert result.confidence_score >= 0.0
        assert result.confidence_score <= 1.0
        assert isinstance(result.analysis_duration_ms, int)

@pytest.mark.asyncio
async def test_analyze_token_cache(ai_analyzer):
    """Teste le système de cache"""
    mock_response = {
        "response": '{"risk_level": "SAFE", "issues": []}'
    }
    
    with patch.object(ai_analyzer, '_call_ollama',
                     return_value=mock_response["response"]):
        # Première analyse
        result1 = await ai_analyzer.analyze_token("token123")
        
        # Deuxième analyse (devrait utiliser le cache)
        result2 = await ai_analyzer.analyze_token("token123")
        
        assert result1 == result2
        assert ai_analyzer._call_ollama.call_count == 1

@pytest.mark.asyncio
async def test_analyze_token_error(ai_analyzer, mock_logger):
    """Teste la gestion d'erreur lors de l'analyse"""
    with patch.object(ai_analyzer, '_call_ollama',
                     side_effect=Exception("Test error")):
        result = await ai_analyzer.analyze_token("token123")
        
        assert result.risk_level == AIRiskLevel.DANGEROUS
        assert result.confidence_score == 0.0
        assert "Erreur lors de l'analyse" in result.risk_factors
        mock_logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_calculate_risk_level(ai_analyzer):
    """Teste le calcul du niveau de risque"""
    analysis_results = [
        {"risk_level": "SAFE"},
        {"risk_level": "SUSPICIOUS"},
        {"risk_level": "DANGEROUS"}
    ]
    
    risk_level = ai_analyzer._calculate_risk_level(analysis_results)
    assert risk_level == AIRiskLevel.DANGEROUS

def test_parse_ai_response_success(ai_analyzer):
    """Teste le parsing réussi d'une réponse"""
    response = '{"risk_level": "SAFE", "issues": []}'
    result = ai_analyzer._parse_ai_response(response, "test")
    
    assert result["risk_level"] == "SAFE"
    assert result["issues"] == []

def test_parse_ai_response_error(ai_analyzer, mock_logger):
    """Teste la gestion d'erreur lors du parsing"""
    response = "Invalid JSON"
    result = ai_analyzer._parse_ai_response(response, "test")
    
    assert "error" in result
    assert result["raw_response"] == response
    mock_logger.error.assert_called_once() 