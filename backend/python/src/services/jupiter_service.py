from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import asyncio
import time
from collections import deque
import logging
from ..dex_monitoring.jupiter import JupiterMonitor, SnipingOpportunity
from ..utils.logging import BotLogger
import aiohttp

class RateLimiter:
    def __init__(self, max_requests: int, time_window: float):
        self.max_requests = max_requests
        self.time_window = time_window  # en secondes
        self.requests = deque()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.time()
            
            # Supprime les requêtes plus anciennes que la fenêtre de temps
            while self.requests and now - self.requests[0] > self.time_window:
                self.requests.popleft()
            
            # Si nous avons atteint la limite, attend jusqu'à ce qu'une requête expire
            if len(self.requests) >= self.max_requests:
                wait_time = self.requests[0] + self.time_window - now
                if wait_time > 0:
                    logging.info(f"Rate limit atteint, attente de {wait_time:.2f} secondes")
                    await asyncio.sleep(wait_time)
                    return await self.acquire()
            
            # Ajoute la nouvelle requête
            self.requests.append(now)

class JupiterService:
    def __init__(self, rpc_url: str, logger: Optional[BotLogger] = None):
        self.monitor = JupiterMonitor(
            rpc_url=rpc_url,
            logger=logger,
            update_interval=5.0,  # Réduit la fréquence de mise à jour
            min_liquidity_usd=1000.0,
            min_volume_24h=5000.0,
            max_price_impact=2.0,
            min_profit_threshold=0.5
        )
        self.opportunities: List[SnipingOpportunity] = []
        self.monitor.add_opportunity_callback(self._handle_opportunity)
        # Rate limiter: 50 requêtes par minute (marge de sécurité)
        self.rate_limiter = RateLimiter(max_requests=50, time_window=60.0)
        
        # Cache pour les données
        self._cache = {}
        self._cache_ttl = 10  # secondes

    def _get_cache(self, key: str) -> Optional[Dict]:
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < self._cache_ttl:
                return data
            del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Dict):
        self._cache[key] = (data, time.time())

    async def start(self):
        """Démarre le monitoring Jupiter"""
        try:
            await self.monitor.start()
            logging.info("Service Jupiter démarré avec succès")
        except Exception as e:
            logging.error(f"Erreur lors du démarrage du service Jupiter: {e}")
            raise

    async def stop(self):
        """Arrête le monitoring Jupiter"""
        try:
            await self.monitor.stop()
            logging.info("Service Jupiter arrêté avec succès")
        except Exception as e:
            logging.error(f"Erreur lors de l'arrêt du service Jupiter: {e}")
            raise

    async def _handle_opportunity(self, opportunity: SnipingOpportunity):
        """Gère une nouvelle opportunité détectée"""
        try:
            await self.rate_limiter.acquire()
            self.opportunities.append(opportunity)
            # Garde seulement les opportunités des dernières 24h
            cutoff = datetime.now() - timedelta(hours=24)
            self.opportunities = [
                opp for opp in self.opportunities
                if opp.timestamp >= cutoff
            ]
        except Exception as e:
            logging.error(f"Erreur lors du traitement d'une opportunité: {e}")

    async def get_stats(self) -> Dict:
        """Récupère les statistiques Jupiter"""
        cache_key = "jupiter_stats"
        cached_data = self._get_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            await self.rate_limiter.acquire()
            pools_data = self.monitor.pools_cache
            tokens_data = self.monitor.tokens_cache
            
            total_liquidity = sum(
                Decimal(str(pool.get("liquidity_usd", 0)))
                for pool in pools_data.values()
            )
            total_volume_24h = sum(
                Decimal(str(pool.get("volume_24h_usd", 0)))
                for pool in pools_data.values()
            )
            
            slippages = []
            for opp in self.opportunities:
                if hasattr(opp, 'price_impact'):
                    slippages.append(float(opp.price_impact))
            avg_slippage = sum(slippages) / len(slippages) if slippages else 0

            stats = {
                "total_liquidity_usd": float(total_liquidity),
                "total_volume_24h_usd": float(total_volume_24h),
                "monitored_pools": len(pools_data),
                "monitored_tokens": len(tokens_data),
                "opportunities_24h": len(self.opportunities),
                "average_slippage": avg_slippage,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self._set_cache(cache_key, stats)
            return stats
        except Exception as e:
            logging.error(f"Erreur lors de la récupération des stats: {e}")
            raise

    async def get_opportunities(self, 
                              min_profit: Optional[float] = None,
                              max_risk: Optional[str] = None,
                              limit: int = 100) -> List[Dict]:
        """Récupère les opportunités de sniping"""
        try:
            await self.rate_limiter.acquire()
            filtered_opps = self.opportunities

            if min_profit is not None:
                filtered_opps = [
                    opp for opp in filtered_opps
                    if float(opp.estimated_profit) >= min_profit
                ]

            if max_risk is not None:
                risk_levels = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
                max_risk_level = risk_levels.get(max_risk.upper(), 2)
                filtered_opps = [
                    opp for opp in filtered_opps
                    if risk_levels.get(opp.risk_level.upper(), 2) <= max_risk_level
                ]

            sorted_opps = sorted(
                filtered_opps,
                key=lambda x: float(x.estimated_profit),
                reverse=True
            )

            return [
                {
                    "token_address": opp.token_address,
                    "pool_id": opp.pool_id,
                    "price": float(opp.price),
                    "liquidity": float(opp.liquidity),
                    "volume_24h": float(opp.volume_24h),
                    "price_change_1h": float(opp.price_change_1h),
                    "estimated_profit": float(opp.estimated_profit),
                    "risk_level": opp.risk_level,
                    "timestamp": opp.timestamp.isoformat()
                }
                for opp in sorted_opps[:limit]
            ]
        except Exception as e:
            logging.error(f"Erreur lors de la récupération des opportunités: {e}")
            raise

    async def get_pool_info(self, pool_id: str) -> Optional[Dict]:
        """Récupère les informations d'un pool"""
        cache_key = f"pool_{pool_id}"
        cached_data = self._get_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            await self.rate_limiter.acquire()
            pool_info = await self.monitor.get_pool_info(pool_id)
            if pool_info:
                self._set_cache(cache_key, pool_info)
            return pool_info
        except Exception as e:
            logging.error(f"Erreur lors de la récupération des infos du pool: {e}")
            raise

    async def get_token_info(self, token_address: str) -> Optional[Dict]:
        """Récupère les informations d'un token"""
        cache_key = f"token_{token_address}"
        cached_data = self._get_cache(cache_key)
        if cached_data:
            return cached_data

        try:
            await self.rate_limiter.acquire()
            token_info = await self.monitor.get_token_info(token_address)
            if token_info:
                self._set_cache(cache_key, token_info)
            return token_info
        except Exception as e:
            logging.error(f"Erreur lors de la récupération des infos du token: {e}")
            raise

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
            
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, ssl=False) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        self.logger.error(
                            f"Erreur API Jupiter {response.status}: {await response.text()}"
                        )
                        return None
                        
        except asyncio.TimeoutError:
            self.logger.error(f"Timeout lors de l'appel à Jupiter: {url}")
            return None
        except aiohttp.ClientError as e:
            self.logger.error(f"Erreur client lors de l'appel à Jupiter: {str(e)}")
            return None
        except Exception as e:
            self.logger.error(f"Erreur lors de l'appel à Jupiter: {str(e)}", exc_info=e)
            return None

    async def monitor_new_pools(self):
        """Surveille l'apparition de nouveaux pools et analyse les opportunités"""
        try:
            while self.is_running:
                try:
                    # Récupère la liste des pools
                    pools_data = await self._fetch_jupiter_data("price")
                    if pools_data:
                        # Analyse chaque pool
                        for pool in pools_data:
                            try:
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
                                            try:
                                                await callback(opportunity)
                                            except Exception as e:
                                                self.logger.error(f"Erreur dans le callback: {str(e)}")
                                    
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
                            except Exception as e:
                                self.logger.error(f"Erreur lors du traitement du pool {pool.get('id')}: {str(e)}")
                                continue
                    
                    self.last_update = datetime.now()
                    await asyncio.sleep(self.update_interval)
                except Exception as e:
                    self.logger.error(f"Erreur dans la boucle de surveillance: {str(e)}")
                    await asyncio.sleep(5)  # Attend un peu avant de réessayer
                
        except Exception as e:
            self.logger.error(f"Erreur fatale dans la surveillance des pools: {str(e)}", exc_info=e)
            self.is_running = False 