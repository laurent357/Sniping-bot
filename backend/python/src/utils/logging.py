import logging
import sys
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler
import json
from typing import Optional, Dict, Any

class BotLogger:
    """Gestionnaire de logs centralisé pour le bot de trading"""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Configuration des fichiers de logs
        self.log_file = self.log_dir / "bot.log"
        self.error_file = self.log_dir / "error.log"
        self.trade_file = self.log_dir / "trades.log"
        
        # Configuration du logger principal
        self.logger = logging.getLogger("SolanaTradingBot")
        self.logger.setLevel(logging.DEBUG)
        
        # Formatter pour les logs standards
        standard_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Formatter pour les logs de trading (JSON)
        trade_formatter = logging.Formatter(
            '%(asctime)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Handler pour la console
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(standard_formatter)
        
        # Handler pour les logs généraux
        file_handler = RotatingFileHandler(
            self.log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(standard_formatter)
        
        # Handler pour les erreurs
        error_handler = RotatingFileHandler(
            self.error_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(standard_formatter)
        
        # Handler pour les trades
        trade_handler = RotatingFileHandler(
            self.trade_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        trade_handler.setLevel(logging.INFO)
        trade_handler.setFormatter(trade_formatter)
        
        # Ajout des handlers au logger
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(error_handler)
        
        # Logger spécifique pour les trades
        self.trade_logger = logging.getLogger("TradeLogger")
        self.trade_logger.setLevel(logging.INFO)
        self.trade_logger.addHandler(trade_handler)
    
    def _format_trade_log(self, data: Dict[str, Any]) -> str:
        """Formate les données de trading en JSON"""
        return json.dumps({
            "timestamp": datetime.now().isoformat(),
            **data
        })
    
    def debug(self, message: str) -> None:
        """Log un message de debug"""
        self.logger.debug(message)
    
    def info(self, message: str) -> None:
        """Log un message d'information"""
        self.logger.info(message)
    
    def warning(self, message: str) -> None:
        """Log un avertissement"""
        self.logger.warning(message)
    
    def error(self, message: str, exc_info: Optional[Exception] = None) -> None:
        """Log une erreur"""
        self.logger.error(message, exc_info=exc_info)
    
    def critical(self, message: str, exc_info: Optional[Exception] = None) -> None:
        """Log une erreur critique"""
        self.logger.critical(message, exc_info=exc_info)
    
    def trade(self, trade_data: Dict[str, Any]) -> None:
        """Log une transaction de trading"""
        self.trade_logger.info(self._format_trade_log(trade_data))

# Exemple d'utilisation:
if __name__ == "__main__":
    # Initialisation du logger
    logger = BotLogger()
    
    # Exemples de logs
    logger.info("Bot démarré")
    logger.debug("Configuration chargée")
    logger.warning("Slippage élevé détecté")
    
    try:
        raise ValueError("Exemple d'erreur")
    except Exception as e:
        logger.error("Une erreur est survenue", exc_info=e)
    
    # Exemple de log de trading
    logger.trade({
        "type": "buy",
        "token": "SOL/USDC",
        "price": 100.50,
        "amount": 1.5,
        "dex": "Raydium"
    })
