export interface OrderBookEntry {
  price: number;
  size: number;
  total?: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  lastUpdateId: number;
}

export interface Trade {
  id: string;
  execution_price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: string;
  tokenPair: string;
  status: 'pending' | 'completed' | 'failed';
  input_token: string;
  output_token: string;
  amount: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply?: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  created_at: string;
  initial_price: number;
  initial_liquidity: number;
  pool_address: string;
  liquidity_usd: number;
  risk_score: number;
}

export interface TradingState {
  orderBook: OrderBook;
  trades: Trade[];
  selectedToken: TokenInfo | null;
  tokens: TokenInfo[];
  loading: boolean;
  error: string | null;
}
