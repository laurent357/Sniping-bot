export interface PoolMetrics {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  symbolA: string;
  symbolB: string;
  liquidity: number;
  volume24h: number;
  fees24h: number;
  apy: number;
  priceChange24h: number;
}

export interface TradingVolume {
  timestamp: string;
  volume: number;
}

export interface TokenPair {
  tokenA: string;
  tokenB: string;
  symbolA: string;
  symbolB: string;
  volume24h: number;
  trades24h: number;
  averageSlippage: number;
}

export interface JupiterStatistics {
  totalPools: number;
  totalVolume24h: number;
  totalTrades24h: number;
  averageSlippage24h: number;
  topPools: PoolMetrics[];
  volumeHistory: TradingVolume[];
  topPairs: TokenPair[];
} 