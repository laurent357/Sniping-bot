from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from ..utils.logging import BotLogger

class RiskLevel(Enum):
    """Niveaux de risque pour un token"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class TokenMetrics:
    """Métriques d'analyse pour un token"""
    address: str
    name: str
    symbol: str
    decimals: int
    total_supply: float
    holder_count: int
    liquidity_usd: float
    price_usd: float
    market_cap_usd: float
    volume_24h_usd: float
    is_mintable: bool
    has_verified_source: bool
    risk_level: RiskLevel
    risk_factors: List[str]

class TokenFilter:
    """Filtre et analyse les tokens pour détecter les risques potentiels"""
    
    def __init__(self, 
                 rpc_url: str,
                 logger: Optional[BotLogger] = None,
                 min_liquidity_usd: float = 1000.0,
                 min_holder_count: int = 10,
                 max_supply_threshold: float = 1_000_000_000,
                 min_market_cap_usd: float = 10000.0):
        """
        Initialise le filtre de tokens
        
        Args:
            rpc_url: URL du point de terminaison RPC Solana
            logger: Instance du logger
            min_liquidity_usd: Liquidité minimale en USD
            min_holder_count: Nombre minimum de holders
            max_supply_threshold: Supply maximum acceptable
            min_market_cap_usd: Market cap minimum en USD
        """
        self.rpc_url = rpc_url
        self.logger = logger or BotLogger()
        self.min_liquidity_usd = min_liquidity_usd
        self.min_holder_count = min_holder_count
        self.max_supply_threshold = max_supply_threshold
        self.min_market_cap_usd = min_market_cap_usd
        
        # Client RPC Solana
        self.client = AsyncClient(rpc_url, commitment=Confirmed)
        
        self.logger.info(f"TokenFilter initialisé avec RPC: {rpc_url}")
    
    async def get_token_program_data(self, token_address: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les données du programme token
        
        Args:
            token_address: Adresse du token à analyser
            
        Returns:
            Données du programme token ou None si erreur
        """
        try:
            response = await self.client.get_account_info(token_address)
            if response["result"]["value"]:
                return response["result"]["value"]
            return None
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération des données token: {str(e)}", exc_info=e)
            return None
    
    async def get_holder_count(self, token_address: str) -> int:
        """
        Récupère le nombre de holders d'un token
        
        Args:
            token_address: Adresse du token
            
        Returns:
            Nombre de holders
        """
        try:
            # TODO: Implémenter la récupération du nombre de holders
            # Cette fonction nécessitera probablement :
            # 1. Récupérer tous les comptes associés au token
            # 2. Filtrer les comptes avec un solde > 0
            # 3. Compter le nombre de comptes uniques
            return 0
            
        except Exception as e:
            self.logger.error(f"Erreur lors du comptage des holders: {str(e)}", exc_info=e)
            return 0
    
    async def check_contract_verification(self, token_address: str) -> bool:
        """
        Vérifie si le contrat du token est vérifié
        
        Args:
            token_address: Adresse du token
            
        Returns:
            True si le contrat est vérifié, False sinon
        """
        try:
            # TODO: Implémenter la vérification du contrat
            # Cette fonction nécessitera probablement :
            # 1. Vérifier si le code source est disponible
            # 2. Vérifier si le code est vérifié sur un explorateur
            return False
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la vérification du contrat: {str(e)}", exc_info=e)
            return False
    
    def analyze_supply_distribution(self, 
                                  total_supply: float,
                                  holder_data: List[Dict[str, float]]) -> List[str]:
        """
        Analyse la distribution du supply entre les holders
        
        Args:
            total_supply: Supply total du token
            holder_data: Liste des holders avec leurs balances
            
        Returns:
            Liste des facteurs de risque identifiés
        """
        risk_factors = []
        
        try:
            if not holder_data:
                return ["Données de distribution non disponibles"]
            
            # Calcule le pourcentage détenu par le plus gros holder
            max_balance = max(h["balance"] for h in holder_data)
            max_percentage = (max_balance / total_supply) * 100
            
            # Calcule la concentration des top holders
            top_10_balance = sum(sorted([h["balance"] for h in holder_data], reverse=True)[:10])
            top_10_percentage = (top_10_balance / total_supply) * 100
            
            # Ajoute les facteurs de risque
            if max_percentage > 20:
                risk_factors.append(f"Un seul holder détient {max_percentage:.1f}% du supply")
            
            if top_10_percentage > 50:
                risk_factors.append(f"Les 10 plus gros holders détiennent {top_10_percentage:.1f}% du supply")
            
            return risk_factors
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'analyse de la distribution: {str(e)}", exc_info=e)
            return ["Erreur lors de l'analyse de la distribution"]
    
    def calculate_risk_level(self, metrics: TokenMetrics) -> RiskLevel:
        """
        Calcule le niveau de risque global d'un token
        
        Args:
            metrics: Métriques du token
            
        Returns:
            Niveau de risque calculé
        """
        risk_score = 0
        
        # Liquidité
        if metrics.liquidity_usd < self.min_liquidity_usd:
            risk_score += 2
        elif metrics.liquidity_usd < self.min_liquidity_usd * 2:
            risk_score += 1
        
        # Nombre de holders
        if metrics.holder_count < self.min_holder_count:
            risk_score += 2
        elif metrics.holder_count < self.min_holder_count * 2:
            risk_score += 1
        
        # Market cap
        if metrics.market_cap_usd < self.min_market_cap_usd:
            risk_score += 2
        elif metrics.market_cap_usd < self.min_market_cap_usd * 2:
            risk_score += 1
        
        # Vérification du contrat
        if not metrics.has_verified_source:
            risk_score += 2
        
        # Token mintable
        if metrics.is_mintable:
            risk_score += 1
        
        # Conversion du score en niveau de risque
        if risk_score >= 6:
            return RiskLevel.CRITICAL
        elif risk_score >= 4:
            return RiskLevel.HIGH
        elif risk_score >= 2:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    async def analyze_token(self, token_address: str) -> Optional[TokenMetrics]:
        """
        Analyse complète d'un token
        
        Args:
            token_address: Adresse du token à analyser
            
        Returns:
            Métriques du token ou None si erreur
        """
        try:
            self.logger.info(f"Début de l'analyse du token: {token_address}")
            
            # Récupère les données de base du token
            token_data = await self.get_token_program_data(token_address)
            if not token_data:
                self.logger.warning(f"Données du token non trouvées: {token_address}")
                return None
            
            # Récupère le nombre de holders
            holder_count = await self.get_holder_count(token_address)
            
            # Vérifie si le contrat est vérifié
            has_verified_source = await self.check_contract_verification(token_address)
            
            # TODO: Récupérer ces données depuis une source de prix (ex: CoinGecko)
            price_usd = 0.0
            volume_24h_usd = 0.0
            liquidity_usd = 0.0
            
            # Crée les métriques
            metrics = TokenMetrics(
                address=token_address,
                name="TODO",  # À récupérer
                symbol="TODO",  # À récupérer
                decimals=9,  # À récupérer
                total_supply=0.0,  # À récupérer
                holder_count=holder_count,
                liquidity_usd=liquidity_usd,
                price_usd=price_usd,
                market_cap_usd=0.0,  # À calculer
                volume_24h_usd=volume_24h_usd,
                is_mintable=True,  # À vérifier
                has_verified_source=has_verified_source,
                risk_level=RiskLevel.HIGH,  # Sera mis à jour
                risk_factors=[]  # Sera mis à jour
            )
            
            # Calcule le niveau de risque
            metrics.risk_level = self.calculate_risk_level(metrics)
            
            # Log le résultat
            self.logger.info(
                f"Analyse terminée pour {token_address}: "
                f"Risque={metrics.risk_level.value}, "
                f"Holders={metrics.holder_count}, "
                f"Liquidité=${metrics.liquidity_usd:,.2f}"
            )
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'analyse du token: {str(e)}", exc_info=e)
            return None
    
    async def filter_token(self, token_address: str) -> bool:
        """
        Filtre un token selon les critères définis
        
        Args:
            token_address: Adresse du token à filtrer
            
        Returns:
            True si le token passe les filtres, False sinon
        """
        try:
            # Analyse le token
            metrics = await self.analyze_token(token_address)
            if not metrics:
                return False
            
            # Applique les filtres
            if metrics.liquidity_usd < self.min_liquidity_usd:
                self.logger.info(f"Token {token_address} rejeté: liquidité insuffisante")
                return False
            
            if metrics.holder_count < self.min_holder_count:
                self.logger.info(f"Token {token_address} rejeté: trop peu de holders")
                return False
            
            if metrics.market_cap_usd < self.min_market_cap_usd:
                self.logger.info(f"Token {token_address} rejeté: market cap trop faible")
                return False
            
            if metrics.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                self.logger.info(f"Token {token_address} rejeté: risque trop élevé")
                return False
            
            self.logger.info(f"Token {token_address} accepté")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors du filtrage du token: {str(e)}", exc_info=e)
            return False

# Exemple d'utilisation
if __name__ == "__main__":
    async def main():
        # Configuration depuis les variables d'environnement dans un vrai cas
        RPC_URL = "https://api.mainnet-beta.solana.com"
        
        # Crée le filtre
        token_filter = TokenFilter(RPC_URL)
        
        # Exemple de token à analyser
        token_address = "YOUR_TOKEN_ADDRESS"
        
        # Analyse le token
        metrics = await token_filter.analyze_token(token_address)
        if metrics:
            print(f"Niveau de risque: {metrics.risk_level.value}")
            print(f"Facteurs de risque: {metrics.risk_factors}")
        
        # Filtre le token
        is_accepted = await token_filter.filter_token(token_address)
        print(f"Token accepté: {is_accepted}")
    
    asyncio.run(main())
