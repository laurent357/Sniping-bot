from typing import Dict, List, Optional, Any, Tuple
import aiohttp
import asyncio
import json
from datetime import datetime, timedelta
from ..utils.logging import BotLogger
from decimal import Decimal

class SnipingOpportunity:
    def __init__(self, 
                 token_address: str,
                 pool_id: str,
                 price: Decimal,
                 liquidity: Decimal,
                 volume_24h: Decimal,
                 price_change_1h: Decimal,
                 estimated_profit: Decimal,
                 risk_level: str):
        self.token_address = token_address
        self.pool_id = pool_id
        self.price = price
        self.liquidity = liquidity
        self.volume_24h = volume_24h
        self.price_change_1h = price_change_1h
        self.estimated_profit = estimated_profit
        self.risk_level = risk_level
        self.timestamp = datetime.now()

class JupiterMonitor:
    """Moniteur pour Jupiter DEX Aggregator"""
    
    def __init__(self, 
                 rpc_url: str,
                 logger: Optional[BotLogger] = None,
                 update_interval: float = 1.0,
                 min_liquidity_usd: float = 1000.0,
                 min_volume_24h: float = 5000.0,
                 max_price_impact: float = 2.0,
                 min_profit_threshold: float = 0.5,
                 jupiter_api_url: str = "https://quote-api.jup.ag/v6"):
        """
        Initialise le moniteur Jupiter avec les paramètres de sniping
        
        Args:
            rpc_url: URL du point de terminaison RPC Solana
            logger: Instance du logger
            update_interval: Intervalle de mise à jour en secondes
            min_liquidity_usd: Liquidité minimale en USD
            min_volume_24h: Volume minimum sur 24h en USD
            max_price_impact: Impact prix maximum acceptable en %
            min_profit_threshold: Profit minimum attendu en %
            jupiter_api_url: URL de base de l'API Jupiter
        """
        self.rpc_url = rpc_url
        self.logger = logger or BotLogger()
        self.update_interval = update_interval
        self.min_liquidity_usd = Decimal(str(min_liquidity_usd))
        self.min_volume_24h = Decimal(str(min_volume_24h))
        self.max_price_impact = Decimal(str(max_price_impact))
        self.min_profit_threshold = Decimal(str(min_profit_threshold))
        self.jupiter_api_url = jupiter_api_url
        self.token_list_url = "https://token.jup.ag/all"
        
        # Cache des pools et tokens
        self.pools_cache: Dict[str, Dict[str, Any]] = {}
        self.tokens_cache: Dict[str, Dict[str, Any]] = {}
        self.price_history: Dict[str, List[Tuple[datetime, Decimal]]] = {}
        
        # État du moniteur
        self.is_running = False
        self.last_update = None
        
        # Callbacks pour les opportunités
        self.opportunity_callbacks = []
        
        self.logger.info(
            f"JupiterMonitor initialisé avec: "
            f"update_interval={update_interval}s, "
            f"min_liquidity=${min_liquidity_usd:,.2f}, "
            f"min_volume_24h=${min_volume_24h:,.2f}, "
            f"max_price_impact={max_price_impact}%, "
            f"min_profit={min_profit_threshold}%"
        )

    def add_opportunity_callback(self, callback):
        """Ajoute un callback pour les nouvelles opportunités"""
        self.opportunity_callbacks.append(callback)

    async def _fetch_jupiter_data(self, endpoint: str, base_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Récupère les données depuis l'API Jupiter
        
        Args:
            endpoint: Point de terminaison de l'API
            base_url: URL de base optionnelle (si différente de self.jupiter_api_url)
            
        Returns:
            Données JSON ou None si erreur
        """
        try:
            url = f"{base_url or self.jupiter_api_url}/{endpoint}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        self.logger.error(
                            f"Erreur API Jupiter {response.status}: {await response.text()}"
                        )
                        return None
                        
        except Exception as e:
            self.logger.error(f"Erreur lors de l'appel à Jupiter: {str(e)}", exc_info=e)
            return None

    async def get_token_info(self, token_address: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un token
        
        Args:
            token_address: Adresse du token
            
        Returns:
            Informations du token ou None si non trouvé
        """
        # Vérifie le cache
        if token_address in self.tokens_cache:
            return self.tokens_cache[token_address]
            
        # Récupère la liste des tokens si pas en cache
        if not self.tokens_cache:
            tokens_data = await self._fetch_jupiter_data("", base_url=self.token_list_url)
            if tokens_data:
                for token in tokens_data:
                    self.tokens_cache[token["address"]] = token
        
        return self.tokens_cache.get(token_address)

    async def get_pool_info(self, pool_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un pool
        
        Args:
            pool_id: Identifiant du pool
            
        Returns:
            Informations du pool ou None si non trouvé
        """
        # Vérifie le cache
        if pool_id in self.pools_cache:
            return self.pools_cache[pool_id]
            
        # Récupère les infos du pool
        pool_data = await self._fetch_jupiter_data(f"pool/{pool_id}")
        if pool_data:
            self.pools_cache[pool_id] = pool_data
            return pool_data
            
        return None

    async def get_quote(self,
                       input_mint: str,
                       output_mint: str,
                       amount: int,
                       slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        """
        Récupère un devis pour un swap
        
        Args:
            input_mint: Token d'entrée
            output_mint: Token de sortie
            amount: Montant en lamports
            slippage_bps: Slippage maximum en points de base (1 bp = 0.01%)
            
        Returns:
            Devis ou None si erreur
        """
        try:
            params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": str(amount),
                "slippageBps": slippage_bps
            }
            
            quote_data = await self._fetch_jupiter_data(f"quote?{aiohttp.FormData(params)}")
            if quote_data:
                return quote_data
                
            return None
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération du devis: {str(e)}", exc_info=e)
            return None

    async def get_swap_route(self,
                           input_mint: str,
                           output_mint: str,
                           amount: int,
                           slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        """
        Récupère la meilleure route pour un swap
        
        Args:
            input_mint: Token d'entrée
            output_mint: Token de sortie
            amount: Montant en lamports
            slippage_bps: Slippage maximum en points de base
            
        Returns:
            Route optimale ou None si erreur
        """
        try:
            params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": str(amount),
                "slippageBps": slippage_bps,
                "onlyDirectRoutes": False,
                "asLegacyTransaction": False
            }
            
            route_data = await self._fetch_jupiter_data(f"swap-route?{aiohttp.FormData(params)}")
            if route_data:
                return route_data
                
            return None
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération de la route: {str(e)}", exc_info=e)
            return None

    async def analyze_pool(self, pool: Dict[str, Any]) -> Optional[SnipingOpportunity]:
        """
        Analyse un pool pour détecter une opportunité de sniping
        
        Args:
            pool: Données du pool
            
        Returns:
            SnipingOpportunity si une opportunité est détectée, None sinon
        """
        try:
            # Vérifie la liquidité minimale
            liquidity = Decimal(str(pool.get("liquidity_usd", 0)))
            if liquidity < self.min_liquidity_usd:
                return None

            # Vérifie le volume 24h
            volume_24h = Decimal(str(pool.get("volume_24h_usd", 0)))
            if volume_24h < self.min_volume_24h:
                return None

            # Récupère l'historique des prix
            token_address = pool["token_address"]
            current_price = Decimal(str(pool.get("price_usd", 0)))
            
            # Calcule la variation de prix sur 1h
            price_history = self.price_history.get(token_address, [])
            if price_history:
                hour_ago = datetime.now() - timedelta(hours=1)
                old_prices = [p for t, p in price_history if t >= hour_ago]
                if old_prices:
                    price_change_1h = ((current_price - old_prices[0]) / old_prices[0]) * 100
                else:
                    price_change_1h = Decimal("0")
            else:
                price_change_1h = Decimal("0")

            # Vérifie l'impact prix
            quote = await self.get_quote(
                pool["input_mint"],
                pool["output_mint"],
                int(1e9)  # 1 SOL en lamports
            )
            if quote:
                price_impact = Decimal(str(quote.get("priceImpactPct", 100)))
                if price_impact > self.max_price_impact:
                    return None

                # Estime le profit potentiel
                estimated_profit = self.estimate_profit(
                    current_price,
                    price_impact,
                    volume_24h,
                    liquidity
                )

                if estimated_profit > self.min_profit_threshold:
                    # Crée l'opportunité
                    return SnipingOpportunity(
                        token_address=token_address,
                        pool_id=pool["id"],
                        price=current_price,
                        liquidity=liquidity,
                        volume_24h=volume_24h,
                        price_change_1h=price_change_1h,
                        estimated_profit=estimated_profit,
                        risk_level=self.calculate_risk_level(
                            price_impact,
                            liquidity,
                            volume_24h
                        )
                    )

            return None

        except Exception as e:
            self.logger.error(f"Erreur lors de l'analyse du pool: {str(e)}", exc_info=e)
            return None

    def estimate_profit(self,
                       current_price: Decimal,
                       price_impact: Decimal,
                       volume_24h: Decimal,
                       liquidity: Decimal) -> Decimal:
        """
        Estime le profit potentiel d'une opportunité
        
        Args:
            current_price: Prix actuel du token
            price_impact: Impact prix en %
            volume_24h: Volume sur 24h
            liquidity: Liquidité du pool
            
        Returns:
            Profit estimé en %
        """
        # Formule simplifiée pour l'estimation du profit
        # Vous pouvez ajuster cette formule selon votre stratégie
        volume_score = min(volume_24h / (liquidity * Decimal("2")), Decimal("1"))
        impact_score = (Decimal("100") - price_impact) / Decimal("100")
        base_profit = Decimal("3")  # 3% de profit de base attendu
        
        return base_profit * volume_score * impact_score

    def calculate_risk_level(self,
                           price_impact: Decimal,
                           liquidity: Decimal,
                           volume_24h: Decimal) -> str:
        """
        Calcule le niveau de risque d'une opportunité
        
        Args:
            price_impact: Impact prix en %
            liquidity: Liquidité du pool
            volume_24h: Volume sur 24h
            
        Returns:
            Niveau de risque (LOW, MEDIUM, HIGH)
        """
        risk_score = 0
        
        # Impact prix
        if price_impact > Decimal("1"):
            risk_score += 2
        elif price_impact > Decimal("0.5"):
            risk_score += 1
            
        # Liquidité
        if liquidity < self.min_liquidity_usd * Decimal("2"):
            risk_score += 2
        elif liquidity < self.min_liquidity_usd * Decimal("5"):
            risk_score += 1
            
        # Volume
        if volume_24h < self.min_volume_24h * Decimal("2"):
            risk_score += 2
        elif volume_24h < self.min_volume_24h * Decimal("5"):
            risk_score += 1
            
        if risk_score >= 4:
            return "HIGH"
        elif risk_score >= 2:
            return "MEDIUM"
        else:
            return "LOW"

    async def monitor_new_pools(self):
        """Surveille l'apparition de nouveaux pools et analyse les opportunités"""
        try:
            while self.is_running:
                # Récupère la liste des pools
                pools_data = await self._fetch_jupiter_data("price")
                if pools_data:
                    # Analyse chaque pool
                    for pool in pools_data:
                        pool_id = pool["id"]
                        
                        # Vérifie si c'est un nouveau pool ou si les métriques ont changé
                        if (pool_id not in self.pools_cache or
                            self.pools_cache[pool_id].get("price_usd") != pool.get("price_usd") or
                            self.pools_cache[pool_id].get("liquidity_usd") != pool.get("liquidity_usd")):
                            
                            # Analyse le pool
                            opportunity = await self.analyze_pool(pool)
                            
                            if opportunity:
                                self.logger.info(
                                    f"Opportunité détectée: {pool_id}, "
                                    f"Prix: ${opportunity.price:,.6f}, "
                                    f"Profit estimé: {opportunity.estimated_profit:.2f}%, "
                                    f"Risque: {opportunity.risk_level}"
                                )
                                
                                # Notifie les observateurs
                                for callback in self.opportunity_callbacks:
                                    await callback(opportunity)
                            
                            # Met à jour le cache
                            self.pools_cache[pool_id] = pool
                            
                            # Met à jour l'historique des prix
                            token_address = pool["token_address"]
                            if token_address not in self.price_history:
                                self.price_history[token_address] = []
                            self.price_history[token_address].append(
                                (datetime.now(), Decimal(str(pool.get("price_usd", 0))))
                            )
                            
                            # Garde seulement 24h d'historique
                            cutoff = datetime.now() - timedelta(hours=24)
                            self.price_history[token_address] = [
                                (t, p) for t, p in self.price_history[token_address]
                                if t >= cutoff
                            ]
                
                self.last_update = datetime.now()
                await asyncio.sleep(self.update_interval)
                
        except Exception as e:
            self.logger.error(f"Erreur dans la surveillance des pools: {str(e)}", exc_info=e)
            self.is_running = False

    async def start(self):
        """Démarre la surveillance"""
        if not self.is_running:
            self.is_running = True
            self.logger.info("Démarrage de la surveillance Jupiter")
            await self.monitor_new_pools()

    async def stop(self):
        """Arrête la surveillance"""
        if self.is_running:
            self.is_running = False
            self.logger.info("Arrêt de la surveillance Jupiter")

# Exemple d'utilisation
if __name__ == "__main__":
    async def main():
        # Configuration depuis les variables d'environnement dans un vrai cas
        RPC_URL = "https://api.mainnet-beta.solana.com"
        
        # Crée le moniteur
        monitor = JupiterMonitor(RPC_URL)
        
        try:
            # Démarre la surveillance
            await monitor.start()
            
            # Laisse tourner pendant 1 heure
            await asyncio.sleep(3600)
            
        except KeyboardInterrupt:
            # Arrête proprement sur Ctrl+C
            await monitor.stop()
            
        except Exception as e:
            print(f"Erreur: {str(e)}")
            
        finally:
            # S'assure que tout est bien arrêté
            if monitor.is_running:
                await monitor.stop()
    
    asyncio.run(main()) 