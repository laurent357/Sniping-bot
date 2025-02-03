import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from ..transaction_analysis.ai_analysis import TokenAIAnalyzer, AIRiskLevel, AIAnalysisResult
from ..utils.logging import BotLogger

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
async def test_concurrent_analysis():
    """Test la capacité à gérer plusieurs analyses simultanées."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    mock_response = '''
    {
        "risk_level": "SAFE",
        "confidence": 0.95,
        "risk_factors": [],
        "details": {}
    }
    '''
    
    with patch.object(analyzer, "_call_ollama", return_value=mock_response):
        # Lancer 10 analyses simultanées
        tasks = [
            analyzer.analyze_contract(f"contract_{i}", f"token_{i}")
            for i in range(10)
        ]
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 10
        assert all(r["risk_level"] == "SAFE" for r in results)

@pytest.mark.asyncio
async def test_cache_expiration():
    """Test l'expiration correcte du cache."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger),
        cache_duration_minutes=1
    )
    
    mock_responses = [
        '''{"risk_level": "SAFE", "confidence": 0.9, "risk_factors": []}''',
        '''{"risk_level": "SUSPICIOUS", "confidence": 0.8, "risk_factors": ["New pattern"]}'''
    ]
    
    with patch.object(analyzer, "_call_ollama") as mock_call:
        mock_call.side_effect = mock_responses
        
        # Première analyse
        result1 = await analyzer.analyze_contract("contract", "token")
        assert result1["risk_level"] == "SAFE"
        
        # Attendre l'expiration du cache
        await asyncio.sleep(61)
        
        # Deuxième analyse - devrait appeler l'API
        result2 = await analyzer.analyze_contract("contract", "token")
        assert result2["risk_level"] == "SUSPICIOUS"
        assert mock_call.call_count == 2

@pytest.mark.asyncio
async def test_complex_risk_analysis():
    """Test l'analyse de risque avec des patterns complexes."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    # Simuler différents types d'analyses
    contract_analysis = {
        "risk_level": "SUSPICIOUS",
        "confidence": 0.8,
        "risk_factors": ["Unlimited mint"]
    }
    
    transaction_analysis = {
        "risk_level": "DANGEROUS",
        "confidence": 0.9,
        "risk_factors": ["Wash trading"]
    }
    
    distribution_analysis = {
        "risk_level": "SAFE",
        "confidence": 0.95,
        "risk_factors": []
    }
    
    # Le niveau final devrait être DANGEROUS (le plus élevé)
    final_risk = analyzer._calculate_overall_risk([
        contract_analysis,
        transaction_analysis,
        distribution_analysis
    ])
    
    assert final_risk == AIRiskLevel.DANGEROUS

@pytest.mark.asyncio
async def test_timeout_handling():
    """Test la gestion des timeouts."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger),
        timeout_seconds=1
    )
    
    async def slow_response():
        await asyncio.sleep(2)
        return "response"
    
    with patch.object(analyzer, "_call_ollama", side_effect=slow_response):
        result = await analyzer.analyze_contract("contract", "token")
        assert "error" in result
        assert "timeout" in result["error"].lower()

@pytest.mark.asyncio
async def test_retry_mechanism():
    """Test le mécanisme de retry sur erreur temporaire."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    call_count = 0
    async def mock_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Temporary error")
        return '''{"risk_level": "SAFE", "confidence": 0.9, "risk_factors": []}'''
    
    with patch.object(analyzer, "_call_ollama", side_effect=mock_call):
        result = await analyzer.analyze_contract("contract", "token")
        assert result["risk_level"] == "SAFE"
        assert call_count == 3

@pytest.mark.asyncio
async def test_pattern_recognition():
    """Test la reconnaissance de patterns de scam."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    # Simuler un pattern de rugpull
    transactions = [
        {"type": "mint", "amount": 1000000, "timestamp": "2024-01-01T00:00:00"},
        {"type": "transfer", "amount": 500000, "timestamp": "2024-01-01T00:01:00"},
        {"type": "burn", "amount": 400000, "timestamp": "2024-01-01T00:02:00"},
        {"type": "transfer", "amount": 100000, "timestamp": "2024-01-01T00:03:00"}
    ]
    
    mock_response = '''
    {
        "risk_level": "DANGEROUS",
        "confidence": 0.95,
        "risk_factors": ["Rugpull pattern detected", "Suspicious burn after transfer"],
        "details": {
            "pattern_analysis": "Classic rugpull pattern: mint -> transfer -> burn",
            "timing_analysis": "Suspicious rapid sequence of operations"
        }
    }
    '''
    
    with patch.object(analyzer, "_call_ollama", return_value=mock_response):
        result = await analyzer.analyze_transactions(transactions, "token")
        assert result["risk_level"] == "DANGEROUS"
        assert "Rugpull pattern detected" in result["risk_factors"]

@pytest.mark.asyncio
async def test_distributed_token_analysis():
    """Test l'analyse de distribution de tokens."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    distribution = {
        "total_supply": 1000000,
        "holders": [
            {"address": "whale1", "balance": 400000},  # 40%
            {"address": "whale2", "balance": 300000},  # 30%
            {"address": "normal1", "balance": 50000},  # 5%
            {"address": "normal2", "balance": 30000},  # 3%
            # ... autres petits holders
        ]
    }
    
    mock_response = '''
    {
        "risk_level": "SUSPICIOUS",
        "confidence": 0.85,
        "risk_factors": ["High concentration", "Whale dominance"],
        "details": {
            "concentration_analysis": "70% held by top 2 wallets",
            "distribution_pattern": "Highly centralized"
        }
    }
    '''
    
    with patch.object(analyzer, "_call_ollama", return_value=mock_response):
        result = await analyzer.analyze_distribution(distribution, "token")
        assert result["risk_level"] == "SUSPICIOUS"
        assert "High concentration" in result["risk_factors"]

@pytest.mark.asyncio
async def test_prompt_optimization():
    """Test l'optimisation des prompts pour différents scénarios."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    # Test différents types de prompts
    contract_prompt = analyzer._generate_contract_prompt("contract_code")
    assert "analyze the following smart contract" in contract_prompt.lower()
    assert "security vulnerabilities" in contract_prompt.lower()
    
    transaction_prompt = analyzer._generate_transaction_prompt([{"type": "transfer"}])
    assert "analyze the following transaction pattern" in transaction_prompt.lower()
    assert "suspicious activities" in transaction_prompt.lower()
    
    distribution_prompt = analyzer._generate_distribution_prompt({"holders": []})
    assert "analyze the token distribution" in distribution_prompt.lower()
    assert "concentration risk" in distribution_prompt.lower()

@pytest.mark.asyncio
async def test_performance_monitoring():
    """Test le monitoring des performances de l'analyse."""
    analyzer = TokenAIAnalyzer(
        ollama_host="http://localhost:11434",
        logger=Mock(spec=BotLogger)
    )
    
    with patch.object(analyzer, "_call_ollama") as mock_call:
        mock_call.return_value = '''{"risk_level": "SAFE", "confidence": 0.9, "risk_factors": []}'''
        
        start_time = datetime.now()
        await analyzer.analyze_contract("contract", "token")
        duration = (datetime.now() - start_time).total_seconds()
        
        assert duration < 1.0  # L'analyse devrait être rapide
        analyzer.logger.info.assert_called() 