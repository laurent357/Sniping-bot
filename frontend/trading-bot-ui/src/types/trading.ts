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
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  tokenPair: string;
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

export interface TradingState {
  orderBook: OrderBook;
  trades: Trade[];
  selectedToken: TokenInfo | null;
  tokens: TokenInfo[];
  loading: boolean;
  error: string | null;
}
