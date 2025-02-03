export interface TradingStats {
  totalVolume: number;
  dailyVolume: number;
  successRate: number;
  profitLoss: number;
  activePositions: number;
  avgSlippage: number;
}

export interface PerformanceData {
  timestamp: string;
  value: number;
  type: 'profit' | 'volume';
}

export interface Transaction {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  tokenSymbol: string;
  amount: number;
  price: number;
  status: 'completed' | 'pending' | 'failed';
  hash: string;
}

export interface TokenMetrics {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
}
