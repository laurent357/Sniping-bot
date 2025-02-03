import { EventEmitter } from 'events';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketEvent<T = any> {
  event: string;
  data: T;
}

export interface NewTokenEvent {
  address: string;
  symbol: string;
  liquidity_usd: number;
  risk_score: number;
}

export interface TradeUpdateEvent {
  transaction_id: string;
  status: 'pending' | 'completed' | 'failed';
  execution_price: number;
  timestamp: string;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connecté');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onclose = () => {
      console.log('WebSocket déconnecté');
      this.emit('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = error => {
      console.error('Erreur WebSocket:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = event => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Erreur de parsing message:', error);
      }
    };
  }

  private handleMessage(message: WebSocketEvent): void {
    switch (message.event) {
      case 'token.new':
        this.emit('newToken', message.data as NewTokenEvent);
        break;
      case 'trade.update':
        this.emit('tradeUpdate', message.data as TradeUpdateEvent);
        break;
      default:
        console.warn('Event non géré:', message.event);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;
      console.log(
        `Tentative de reconnexion ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
      );
      this.connect();
    }, this.config.reconnectInterval);
  }

  send(event: string, data: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    this.ws.send(
      JSON.stringify({
        event,
        data,
      })
    );
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export une instance unique
export const ws = new WebSocketService({
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws',
});
