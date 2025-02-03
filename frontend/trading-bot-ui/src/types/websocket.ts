export enum WebSocketEventType {
  PRICE_UPDATE = 'PRICE_UPDATE',
  TRANSACTION_UPDATE = 'TRANSACTION_UPDATE',
  ERROR = 'ERROR',
  CONNECTION_STATUS = 'CONNECTION_STATUS'
}

export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
}

export interface WebSocketError {
  code: number;
  message: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
}

export interface TransactionUpdate {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  details: any;
}

export interface NewTokenEvent {
  address: string;
  symbol: string;
  name: string;
  initialPrice: number;
  initialLiquidity: number;
  poolAddress: string;
  createdAt: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxRetries: number;
} 