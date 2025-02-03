export interface DetailedTransaction {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  price: number;
  totalValue: number;
  status: 'completed' | 'pending' | 'failed';
  hash: string;
  gasUsed?: number;
  gasPrice?: number;
  slippage?: number;
  pool?: string;
  route?: string[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'buy' | 'sell' | 'all';
  status?: 'completed' | 'pending' | 'failed' | 'all';
  token?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionStats {
  totalTransactions: number;
  successRate: number;
  averageSlippage: number;
  totalVolume: number;
  profitLoss: number;
}

export interface PaginatedTransactions {
  transactions: DetailedTransaction[];
  total: number;
  page: number;
  pageSize: number;
  stats: TransactionStats;
} 