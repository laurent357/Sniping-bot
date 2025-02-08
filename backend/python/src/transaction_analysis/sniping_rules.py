from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional
from enum import Enum
import json

class RuleOperator(Enum):
    GREATER_THAN = ">"
    LESS_THAN = "<"
    EQUAL_TO = "="
    NOT_EQUAL_TO = "!="
    GREATER_EQUAL = ">="
    LESS_EQUAL = "<="

@dataclass
class SnipingRule:
    """Règle de sniping individuelle"""
    metric: str  # ex: "price", "liquidity", "volume_24h"
    operator: RuleOperator
    value: Decimal
    priority: int  # 1-5, 5 étant la plus haute priorité

@dataclass
class SnipingStrategy:
    """Ensemble de règles formant une stratégie"""
    name: str
    description: str
    rules: List[SnipingRule]
    min_profit: Decimal
    max_loss: Decimal
    position_size: Decimal  # en SOL
    max_slippage: Decimal  # en %
    enabled: bool = True

class SnipingRuleEngine:
    """Moteur d'évaluation des règles de sniping"""
    
    def __init__(self):
        self.strategies: List[SnipingStrategy] = []
        
    def add_strategy(self, strategy: SnipingStrategy):
        """Ajoute une nouvelle stratégie"""
        self.strategies.append(strategy)
        
    def remove_strategy(self, strategy_name: str):
        """Supprime une stratégie par son nom"""
        self.strategies = [s for s in self.strategies if s.name != strategy_name]
        
    def evaluate_opportunity(self, opportunity) -> Optional[SnipingStrategy]:
        """
        Évalue une opportunité contre toutes les stratégies actives
        
        Args:
            opportunity: L'opportunité à évaluer
            
        Returns:
            La première stratégie qui correspond, ou None si aucune ne correspond
        """
        for strategy in self.strategies:
            if not strategy.enabled:
                continue
                
            if self._evaluate_strategy(strategy, opportunity):
                return strategy
                
        return None
        
    def _evaluate_strategy(self, strategy: SnipingStrategy, opportunity) -> bool:
        """
        Évalue si une opportunité correspond à une stratégie
        
        Args:
            strategy: La stratégie à évaluer
            opportunity: L'opportunité à évaluer
            
        Returns:
            True si l'opportunité correspond à la stratégie
        """
        # Vérifie d'abord les critères de base
        if opportunity.estimated_profit < strategy.min_profit:
            return False
            
        # Vérifie chaque règle
        for rule in sorted(strategy.rules, key=lambda x: x.priority, reverse=True):
            if not self._evaluate_rule(rule, opportunity):
                return False
                
        return True
        
    def _evaluate_rule(self, rule: SnipingRule, opportunity) -> bool:
        """
        Évalue une règle individuelle
        
        Args:
            rule: La règle à évaluer
            opportunity: L'opportunité à évaluer
            
        Returns:
            True si la règle est satisfaite
        """
        try:
            # Récupère la valeur de la métrique
            metric_value = getattr(opportunity, rule.metric)
            
            # Compare selon l'opérateur
            if rule.operator == RuleOperator.GREATER_THAN:
                return metric_value > rule.value
            elif rule.operator == RuleOperator.LESS_THAN:
                return metric_value < rule.value
            elif rule.operator == RuleOperator.EQUAL_TO:
                return metric_value == rule.value
            elif rule.operator == RuleOperator.NOT_EQUAL_TO:
                return metric_value != rule.value
            elif rule.operator == RuleOperator.GREATER_EQUAL:
                return metric_value >= rule.value
            elif rule.operator == RuleOperator.LESS_EQUAL:
                return metric_value <= rule.value
                
            return False
            
        except AttributeError:
            return False
            
    def save_strategies(self, filepath: str):
        """Sauvegarde les stratégies dans un fichier JSON"""
        strategies_data = []
        for strategy in self.strategies:
            rules_data = [
                {
                    "metric": rule.metric,
                    "operator": rule.operator.value,
                    "value": str(rule.value),
                    "priority": rule.priority
                }
                for rule in strategy.rules
            ]
            
            strategy_data = {
                "name": strategy.name,
                "description": strategy.description,
                "rules": rules_data,
                "min_profit": str(strategy.min_profit),
                "max_loss": str(strategy.max_loss),
                "position_size": str(strategy.position_size),
                "max_slippage": str(strategy.max_slippage),
                "enabled": strategy.enabled
            }
            strategies_data.append(strategy_data)
            
        with open(filepath, 'w') as f:
            json.dump(strategies_data, f, indent=2)
            
    def load_strategies(self, filepath: str):
        """Charge les stratégies depuis un fichier JSON"""
        with open(filepath, 'r') as f:
            strategies_data = json.load(f)
            
        self.strategies = []
        for strategy_data in strategies_data:
            rules = [
                SnipingRule(
                    metric=rule["metric"],
                    operator=RuleOperator(rule["operator"]),
                    value=Decimal(rule["value"]),
                    priority=rule["priority"]
                )
                for rule in strategy_data["rules"]
            ]
            
            strategy = SnipingStrategy(
                name=strategy_data["name"],
                description=strategy_data["description"],
                rules=rules,
                min_profit=Decimal(strategy_data["min_profit"]),
                max_loss=Decimal(strategy_data["max_loss"]),
                position_size=Decimal(strategy_data["position_size"]),
                max_slippage=Decimal(strategy_data["max_slippage"]),
                enabled=strategy_data["enabled"]
            )
            self.strategies.append(strategy)

# Exemple de stratégie de base
def create_default_strategy() -> SnipingStrategy:
    """Crée une stratégie de sniping par défaut"""
    rules = [
        SnipingRule(
            metric="liquidity",
            operator=RuleOperator.GREATER_THAN,
            value=Decimal("10000"),  # $10k minimum de liquidité
            priority=5
        ),
        SnipingRule(
            metric="volume_24h",
            operator=RuleOperator.GREATER_THAN,
            value=Decimal("5000"),  # $5k minimum de volume
            priority=4
        ),
        SnipingRule(
            metric="price_change_1h",
            operator=RuleOperator.GREATER_THAN,
            value=Decimal("5"),  # 5% minimum de hausse
            priority=3
        ),
        SnipingRule(
            metric="estimated_profit",
            operator=RuleOperator.GREATER_THAN,
            value=Decimal("2"),  # 2% minimum de profit
            priority=2
        )
    ]
    
    return SnipingStrategy(
        name="Default Strategy",
        description="Stratégie de base pour le sniping",
        rules=rules,
        min_profit=Decimal("2"),
        max_loss=Decimal("1"),
        position_size=Decimal("0.1"),  # 0.1 SOL par position
        max_slippage=Decimal("1")  # 1% de slippage maximum
    ) 