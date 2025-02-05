from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any
import aiohttp
import asyncio
import json
from datetime import datetime
from ..utils.logging import BotLogger

class AIRiskLevel(Enum):
    """Niveaux de risque identifiés par l'IA"""
    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    DANGEROUS = "DANGEROUS"
    SCAM = "SCAM"

@dataclass
class AIAnalysisResult:
    """Résultat de l'analyse IA d'un token"""
    token_address: str
    risk_level: AIRiskLevel
    confidence_score: float
    risk_factors: List[str]
    analysis_details: Dict[str, Any]
    timestamp: datetime
    model_used: str
    analysis_duration_ms: int

class TokenAIAnalyzer:
    """Analyse les tokens en utilisant des modèles IA via Ollama"""
    
    def __init__(self, 
                 ollama_host: str = "http://localhost:11434",
                 logger: Optional[BotLogger] = None,
                 model_name: str = "mistral",
                 timeout_seconds: int = 30,
                 cache_duration_minutes: int = 60):
        """
        Initialise l'analyseur IA
        
        Args:
            ollama_host: URL du serveur Ollama
            logger: Instance du logger
            model_name: Nom du modèle à utiliser
            timeout_seconds: Timeout des requêtes en secondes
            cache_duration_minutes: Durée de validité du cache en minutes
        """
        self.ollama_host = ollama_host
        self.logger = logger or BotLogger()
        self.model_name = model_name
        self.timeout = timeout_seconds
        self.cache_duration = cache_duration_minutes
        self.analysis_cache: Dict[str, AIAnalysisResult] = {}
        
        self.logger.info(
            f"TokenAIAnalyzer initialisé avec: model={model_name}, "
            f"host={ollama_host}"
        )
        
        # Prompts prédéfinis pour différents types d'analyse
        self.prompts = {
            "contract_analysis": """
            Analysez ce contrat de token Solana et identifiez les risques potentiels:
            - Recherchez les fonctions malveillantes
            - Vérifiez les permissions d'administration
            - Identifiez les mécanismes de taxation
            - Détectez les honeypots potentiels
            
            Contrat: {contract_code}
            """,
            
            "transaction_pattern": """
            Analysez ces transactions récentes et identifiez les patterns suspects:
            - Mouvements de fonds anormaux
            - Wash trading potentiel
            - Manipulation de prix
            - Activité de bot suspecte
            
            Transactions: {transactions}
            """,
            
            "token_distribution": """
            Analysez la distribution des tokens et identifiez les risques:
            - Concentration excessive
            - Wallets liés
            - Vesting suspects
            - Mouvements coordonnés
            
            Distribution: {distribution_data}
            """
        }

    async def _call_ollama(self, 
                          prompt: str,
                          system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Appelle le serveur Ollama
        
        Args:
            prompt: Prompt principal
            system_prompt: Prompt système optionnel
            
        Returns:
            Réponse du modèle ou None si erreur
        """
        try:
            url = f"{self.ollama_host}/api/generate"
            
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=self.timeout) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("response")
                    else:
                        self.logger.error(
                            f"Erreur Ollama {response.status}: {await response.text()}"
                        )
                        return None
                        
        except Exception as e:
            self.logger.error(f"Erreur lors de l'appel à Ollama: {str(e)}", exc_info=e)
            return None

    def _parse_ai_response(self, 
                          response: str,
                          analysis_type: str) -> Dict[str, Any]:
        """
        Parse la réponse du modèle
        
        Args:
            response: Réponse brute du modèle
            analysis_type: Type d'analyse effectuée
            
        Returns:
            Données structurées extraites de la réponse
        """
        try:
            # TODO: Implémenter un parsing plus robuste basé sur le type d'analyse
            # Pour l'instant, on suppose que la réponse est bien structurée
            return json.loads(response)
        except Exception as e:
            self.logger.error(f"Erreur de parsing de la réponse IA: {str(e)}", exc_info=e)
            return {
                "error": "Impossible de parser la réponse",
                "raw_response": response
            }

    def _calculate_risk_level(self, analysis_results: List[Dict[str, Any]]) -> AIRiskLevel:
        """
        Calcule le niveau de risque global
        
        Args:
            analysis_results: Résultats des différentes analyses
            
        Returns:
            Niveau de risque calculé
        """
        # TODO: Implémenter une logique plus sophistiquée
        # Pour l'instant, on prend le niveau le plus élevé
        risk_scores = {
            "SAFE": 0,
            "SUSPICIOUS": 1,
            "DANGEROUS": 2,
            "SCAM": 3
        }
        
        max_risk = 0
        for result in analysis_results:
            risk = result.get("risk_level", "SAFE")
            max_risk = max(max_risk, risk_scores.get(risk, 0))
        
        for level in AIRiskLevel:
            if risk_scores[level.value] == max_risk:
                return level
        
        return AIRiskLevel.SAFE

    async def analyze_contract(self, 
                             contract_code: str,
                             token_address: str) -> Dict[str, Any]:
        """
        Analyse le code du contrat
        
        Args:
            contract_code: Code source du contrat
            token_address: Adresse du token
            
        Returns:
            Résultats de l'analyse du contrat
        """
        prompt = self.prompts["contract_analysis"].format(
            contract_code=contract_code
        )
        
        response = await self._call_ollama(
            prompt=prompt,
            system_prompt="Vous êtes un expert en sécurité des smart contracts Solana. "
                        "Analysez ce contrat et identifiez les risques potentiels."
        )
        
        if response:
            return self._parse_ai_response(response, "contract_analysis")
        return {"error": "Analyse du contrat échouée"}

    async def analyze_transactions(self, 
                                 transactions: List[Dict[str, Any]],
                                 token_address: str) -> Dict[str, Any]:
        """
        Analyse les patterns de transaction
        
        Args:
            transactions: Liste des transactions à analyser
            token_address: Adresse du token
            
        Returns:
            Résultats de l'analyse des transactions
        """
        prompt = self.prompts["transaction_pattern"].format(
            transactions=json.dumps(transactions, indent=2)
        )
        
        response = await self._call_ollama(
            prompt=prompt,
            system_prompt="Vous êtes un expert en analyse de transactions blockchain. "
                        "Identifiez les patterns suspects dans ces transactions."
        )
        
        if response:
            return self._parse_ai_response(response, "transaction_pattern")
        return {"error": "Analyse des transactions échouée"}

    async def analyze_distribution(self, 
                                 distribution_data: Dict[str, Any],
                                 token_address: str) -> Dict[str, Any]:
        """
        Analyse la distribution des tokens
        
        Args:
            distribution_data: Données de distribution des tokens
            token_address: Adresse du token
            
        Returns:
            Résultats de l'analyse de distribution
        """
        prompt = self.prompts["token_distribution"].format(
            distribution_data=json.dumps(distribution_data, indent=2)
        )
        
        response = await self._call_ollama(
            prompt=prompt,
            system_prompt="Vous êtes un expert en tokenomics. "
                        "Analysez cette distribution et identifiez les risques."
        )
        
        if response:
            return self._parse_ai_response(response, "token_distribution")
        return {"error": "Analyse de la distribution échouée"}

    async def analyze_token(self, 
                          token_address: str,
                          contract_code: Optional[str] = None,
                          transactions: Optional[List[Dict[str, Any]]] = None,
                          distribution_data: Optional[Dict[str, Any]] = None) -> AIAnalysisResult:
        """
        Analyse complète d'un token
        
        Args:
            token_address: Adresse du token
            contract_code: Code source du contrat (optionnel)
            transactions: Transactions récentes (optionnel)
            distribution_data: Données de distribution (optionnel)
            
        Returns:
            Résultat complet de l'analyse
        """
        start_time = datetime.now()
        
        try:
            # Vérifie le cache
            if token_address in self.analysis_cache:
                cached_result = self.analysis_cache[token_address]
                cache_age = (datetime.now() - cached_result.timestamp).total_seconds() / 60
                
                if cache_age < self.cache_duration:
                    self.logger.info(f"Utilisation du cache pour {token_address}")
                    return cached_result
            
            self.logger.info(f"Début de l'analyse IA pour {token_address}")
            
            # Lance les analyses en parallèle
            analysis_tasks = []
            
            if contract_code:
                analysis_tasks.append(self.analyze_contract(contract_code, token_address))
            
            if transactions:
                analysis_tasks.append(self.analyze_transactions(transactions, token_address))
            
            if distribution_data:
                analysis_tasks.append(self.analyze_distribution(distribution_data, token_address))
            
            # Attend les résultats
            analysis_results = await asyncio.gather(*analysis_tasks)
            
            # Agrège les résultats
            risk_level = self._calculate_risk_level(analysis_results)
            
            # Calcule la durée
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Crée le résultat
            result = AIAnalysisResult(
                token_address=token_address,
                risk_level=risk_level,
                confidence_score=0.8,  # TODO: Calculer un vrai score
                risk_factors=[],  # TODO: Agréger les facteurs de risque
                analysis_details={
                    "contract": analysis_results[0] if contract_code else None,
                    "transactions": analysis_results[1] if transactions else None,
                    "distribution": analysis_results[2] if distribution_data else None
                },
                timestamp=datetime.now(),
                model_used=self.model_name,
                analysis_duration_ms=duration_ms
            )
            
            # Met en cache
            self.analysis_cache[token_address] = result
            
            self.logger.info(
                f"Analyse IA terminée pour {token_address}: "
                f"risk={risk_level.value}, duration={duration_ms}ms"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'analyse IA: {str(e)}", exc_info=e)
            return AIAnalysisResult(
                token_address=token_address,
                risk_level=AIRiskLevel.DANGEROUS,
                confidence_score=0.0,
                risk_factors=["Erreur lors de l'analyse"],
                analysis_details={"error": str(e)},
                timestamp=datetime.now(),
                model_used=self.model_name,
                analysis_duration_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )

# Exemple d'utilisation
if __name__ == "__main__":
    async def main():
        # Crée l'analyseur
        analyzer = TokenAIAnalyzer()
        
        # Exemple de token à analyser
        token_address = "YOUR_TOKEN_ADDRESS"
        contract_code = "// Code du contrat"
        transactions = [{"type": "transfer", "amount": 1000}]
        distribution = {"holders": {"wallet1": 1000}}
        
        # Analyse le token
        result = await analyzer.analyze_token(
            token_address,
            contract_code,
            transactions,
            distribution
        )
        
        print(f"Niveau de risque: {result.risk_level.value}")
        print(f"Facteurs de risque: {result.risk_factors}")
        print(f"Durée analyse: {result.analysis_duration_ms}ms")
    
    asyncio.run(main())
