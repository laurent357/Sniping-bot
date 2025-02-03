import pytest
from pathlib import Path
import json
import tempfile
import shutil
from backend.python.utils.logging import BotLogger

@pytest.fixture
def temp_log_dir():
    """Crée un répertoire temporaire pour les logs"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def logger(temp_log_dir):
    """Crée une instance de BotLogger avec un répertoire temporaire"""
    return BotLogger(log_dir=temp_log_dir)

def test_log_directory_creation(temp_log_dir):
    """Teste la création du répertoire de logs"""
    logger = BotLogger(log_dir=temp_log_dir)
    assert Path(temp_log_dir).exists()
    assert Path(temp_log_dir, "bot.log").exists()
    assert Path(temp_log_dir, "error.log").exists()
    assert Path(temp_log_dir, "trades.log").exists()

def test_basic_logging(logger, temp_log_dir):
    """Teste les fonctions de log de base"""
    test_message = "Test message"
    logger.info(test_message)
    
    with open(Path(temp_log_dir, "bot.log")) as f:
        log_content = f.read()
        assert test_message in log_content

def test_error_logging(logger, temp_log_dir):
    """Teste le logging des erreurs"""
    error_message = "Test error"
    try:
        raise ValueError("Test exception")
    except Exception as e:
        logger.error(error_message, exc_info=e)
    
    with open(Path(temp_log_dir, "error.log")) as f:
        log_content = f.read()
        assert error_message in log_content
        assert "ValueError: Test exception" in log_content

def test_trade_logging(logger, temp_log_dir):
    """Teste le logging des transactions"""
    trade_data = {
        "type": "buy",
        "token": "SOL/USDC",
        "price": 100.50,
        "amount": 1.5,
        "dex": "Raydium"
    }
    logger.trade(trade_data)
    
    with open(Path(temp_log_dir, "trades.log")) as f:
        log_content = f.read()
        # Vérifie que les données du trade sont dans le log
        for value in trade_data.values():
            assert str(value) in log_content

def test_log_rotation(logger, temp_log_dir):
    """Teste la rotation des fichiers de log"""
    # Génère suffisamment de logs pour déclencher une rotation
    large_message = "X" * 1024 * 1024  # 1MB
    for _ in range(15):  # Devrait générer plus de 10MB
        logger.info(large_message)
    
    # Vérifie l'existence des fichiers de rotation
    log_files = list(Path(temp_log_dir).glob("bot.log*"))
    assert len(log_files) > 1  # Au moins le fichier principal et un backup

def test_multiple_log_levels(logger, temp_log_dir):
    """Teste les différents niveaux de log"""
    messages = {
        "debug": "Debug message",
        "info": "Info message",
        "warning": "Warning message",
        "error": "Error message",
        "critical": "Critical message"
    }
    
    for level, message in messages.items():
        getattr(logger, level)(message)
    
    with open(Path(temp_log_dir, "bot.log")) as f:
        log_content = f.read()
        for message in messages.values():
            assert message in log_content

def test_trade_log_format(logger, temp_log_dir):
    """Teste le format JSON des logs de trading"""
    trade_data = {
        "type": "sell",
        "token": "RAY/USDC",
        "price": 1.23,
        "amount": 100,
        "dex": "Raydium"
    }
    logger.trade(trade_data)
    
    with open(Path(temp_log_dir, "trades.log")) as f:
        log_content = f.read()
        # Extrait le JSON de la ligne de log
        json_str = log_content.split(" ", 2)[2]  # Ignore timestamp
        log_entry = json.loads(json_str)
        
        # Vérifie que toutes les données sont présentes
        for key, value in trade_data.items():
            assert log_entry[key] == value
        assert "timestamp" in log_entry 