export interface FilterConfig {
  minLiquidity: number;
  maxSlippage: number;
  minVolume24h: number;
  maxPriceImpact: number;
  blacklistedTokens: string[];
}

export interface TradingLimits {
  maxTransactionAmount: number;
  dailyTradingLimit: number;
  stopLoss: number;
  takeProfit: number;
  maxActivePositions: number;
}

export interface SecurityConfig {
  honeypotCheck: boolean;
  simulateBeforeExecution: boolean;
  maxGasPrice: number;
  minConfirmations: number;
}

export interface BotConfig {
  filters: FilterConfig;
  tradingLimits: TradingLimits;
  security: SecurityConfig;
  enabled: boolean;
}

export type ConfigSection = 'filters' | 'tradingLimits' | 'security'; 