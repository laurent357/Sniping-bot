from typing import Dict, List, Optional, Any
import aiohttp
import asyncio
import json
from datetime import datetime
from ..utils.logging import BotLogger

class JupiterMonitor:
    """Moniteur pour Jupiter DEX Aggregator"""
    
    def __init__(self, 
                 rpc_url: str,
                 logger: Optional[BotLogger] = None,
                 update_interval: float = 1.0,
                 min_liquidity_usd: float = 1000.0,
                 jupiter_api_url: str = "https://quote-api.jup.ag/v6"):
        """
        Initialise le moniteur Jupiter
        
        Args:
            rpc_url: URL du point de terminaison RPC Solana
            logger: Instance du logger
            update_interval: Intervalle de mise à jour en secondes
            min_liquidity_usd: Liquidité minimale en USD
            jupiter_api_url: URL de base de l'API Jupiter
        """
        self.rpc_url = rpc_url
        self.logger = logger or BotLogger()
        self.update_interval = update_interval
        self.min_liquidity_usd = min_liquidity_usd
        self.jupiter_api_url = jupiter_api_url
        
        # Cache des pools et tokens
        self.pools_cache: Dict[str, Dict[str, Any]] = {}
        self.tokens_cache: Dict[str, Dict[str, Any]] = {}
        
        # État du moniteur
        self.is_running = False
        self.last_update = None
        
        self.logger.info(
            f"JupiterMonitor initialisé avec: "
            f"update_interval={update_interval}s, "
            f"min_liquidity=${min_liquidity_usd:,.2f}"
        )

    async def _fetch_jupiter_data(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les données depuis l'API Jupiter
        
        Args:
            endpoint: Point de terminaison de l'API
            
        Returns:
            Données JSON ou None si erreur
        """
        try:
            url = f"{self.jupiter_api_url}/{endpoint}"
            
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
            tokens_data = await self._fetch_jupiter_data("tokens")
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

    async def monitor_new_pools(self):
        """Surveille l'apparition de nouveaux pools"""
        try:
            while self.is_running:
                # Récupère la liste des pools
                pools_data = await self._fetch_jupiter_data("pools")
                if pools_data:
                    # Vérifie les nouveaux pools
                    for pool in pools_data:
                        pool_id = pool["id"]
                        if pool_id not in self.pools_cache:
                            # Nouveau pool détecté
                            self.pools_cache[pool_id] = pool
                            
                            # Vérifie la liquidité
                            if pool.get("liquidity_usd", 0) >= self.min_liquidity_usd:
                                self.logger.info(
                                    f"Nouveau pool détecté: {pool_id}, "
                                    f"Liquidité: ${pool['liquidity_usd']:,.2f}"
                                )
                                
                                # TODO: Notifier les observateurs
                
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