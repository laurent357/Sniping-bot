from typing import Dict, List, Optional, Tuple
from datetime import datetime
import asyncio
from decimal import Decimal
import json
from ..ipc_client import IPCClient
from ..utils.logging import BotLogger
from ..transaction_analysis.sniping_rules import (
    SnipingRuleEngine,
    SnipingStrategy,
    create_default_strategy
)

class SnipingService:
    def __init__(self, ipc_client: IPCClient, logger: Optional[BotLogger] = None):
        self.ipc_client = ipc_client
        self.logger = logger or BotLogger()
        self.rule_engine = SnipingRuleEngine()
        self.rule_engine.add_strategy(create_default_strategy())
        self.transactions: List[Dict] = []
        self.active_orders: List[Dict] = []

    async def execute_sniping(self, opportunity: Dict) -> Dict:
        """Exécute une transaction de sniping"""
        try:
            # Vérifie la sécurité
            is_safe, reason = await self.ipc_client.check_security(
                token=opportunity["token_address"],
                amount=int(float(opportunity["price"]) * 1e9)  # Convertit en lamports
            )

            if not is_safe:
                return {
                    "success": False,
                    "error": f"Échec de la vérification de sécurité: {reason}",
                    "timestamp": datetime.utcnow().isoformat()
                }

            # Prépare la transaction
            instructions = self._prepare_sniping_instructions(opportunity)
            
            # Exécute via le module Rust
            signature = await self.ipc_client.request_transaction(
                instructions=instructions,
                priority="HIGH",
                max_retries=3
            )

            # Enregistre la transaction
            tx = {
                "signature": signature,
                "token_address": opportunity["token_address"],
                "amount": float(opportunity["price"]),
                "estimated_profit": float(opportunity["estimated_profit"]),
                "status": "pending",
                "timestamp": datetime.utcnow().isoformat()
            }
            self.transactions.append(tx)
            self.active_orders.append(tx)

            return {
                "success": True,
                "signature": signature,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Erreur lors de l'exécution du sniping: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def _prepare_sniping_instructions(self, opportunity: Dict) -> bytes:
        """Prépare les instructions de la transaction"""
        # TODO: Implémenter la création des instructions réelles
        # Pour l'instant, retourne des données mockées
        mock_instructions = {
            "type": "sniping",
            "token": opportunity["token_address"],
            "amount": float(opportunity["price"]),
            "slippage": 1.0
        }
        return json.dumps(mock_instructions).encode()

    async def get_transaction_history(self, 
                                    status: Optional[str] = None,
                                    limit: int = 100) -> List[Dict]:
        """Récupère l'historique des transactions"""
        filtered_txs = self.transactions
        
        if status:
            filtered_txs = [tx for tx in filtered_txs if tx["status"] == status]
            
        # Trie par timestamp décroissant
        sorted_txs = sorted(
            filtered_txs,
            key=lambda x: x["timestamp"],
            reverse=True
        )
        
        return sorted_txs[:limit]

    async def get_active_orders(self) -> List[Dict]:
        """Récupère les ordres actifs"""
        return self.active_orders

    async def update_transaction_status(self, signature: str, status: str):
        """Met à jour le statut d'une transaction"""
        for tx in self.transactions:
            if tx["signature"] == signature:
                tx["status"] = status
                if status in ["completed", "failed"]:
                    self.active_orders = [
                        order for order in self.active_orders
                        if order["signature"] != signature
                    ]
                break

    async def get_strategies(self) -> List[Dict]:
        """Récupère les stratégies configurées"""
        return [
            {
                "name": strategy.name,
                "description": strategy.description,
                "min_profit": float(strategy.min_profit),
                "max_loss": float(strategy.max_loss),
                "position_size": float(strategy.position_size),
                "max_slippage": float(strategy.max_slippage),
                "enabled": strategy.enabled,
                "rules": [
                    {
                        "metric": rule.metric,
                        "operator": rule.operator.value,
                        "value": float(rule.value),
                        "priority": rule.priority
                    }
                    for rule in strategy.rules
                ]
            }
            for strategy in self.rule_engine.strategies
        ]

    async def update_strategy(self, strategy_data: Dict) -> Dict:
        """Met à jour une stratégie"""
        try:
            strategy = SnipingStrategy(
                name=strategy_data["name"],
                description=strategy_data["description"],
                rules=strategy_data["rules"],
                min_profit=Decimal(str(strategy_data["min_profit"])),
                max_loss=Decimal(str(strategy_data["max_loss"])),
                position_size=Decimal(str(strategy_data["position_size"])),
                max_slippage=Decimal(str(strategy_data["max_slippage"])),
                enabled=strategy_data.get("enabled", True)
            )
            
            # Supprime l'ancienne stratégie si elle existe
            self.rule_engine.remove_strategy(strategy.name)
            # Ajoute la nouvelle stratégie
            self.rule_engine.add_strategy(strategy)
            
            return {
                "success": True,
                "message": f"Stratégie {strategy.name} mise à jour",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la mise à jour de la stratégie: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            } 