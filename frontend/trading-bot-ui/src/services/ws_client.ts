import { EventEmitter } from 'events';

export enum EventType {
  NEW_TOKEN = 'new_token',
  TRANSACTION_UPDATE = 'transaction_update',
  SECURITY_ALERT = 'security_alert',
  STATS_UPDATE = 'stats_update',
  POOL_UPDATE = 'pool_update',
  ERROR = 'error'
}

interface WSEvent {
  type: EventType;
  data: any;
  timestamp: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 1000; // Commence à 1 seconde
  private shouldReconnect: boolean = true;

  constructor(url: string = 'ws://localhost:8765') {
    super();
    this.url = url;
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connecté');
      this.reconnectAttempts = 0;
      this.reconnectTimeout = 1000;
      this.emit('connected');
    };

    this.ws.onclose = () => {
      console.log('WebSocket déconnecté');
      this.handleReconnect();
      this.emit('disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        this.handleEvent(wsEvent);
      } catch (error) {
        console.error('Erreur de parsing message:', error);
      }
    };
  }

  private handleEvent(event: WSEvent): void {
    // Émet l'événement spécifique et un événement générique
    this.emit(event.type, event.data);
    this.emit('message', event);

    // Gestion spéciale selon le type d'événement
    switch (event.type) {
      case EventType.SECURITY_ALERT:
        // Priorité haute pour les alertes de sécurité
        console.warn('Alerte de sécurité:', event.data);
        break;
      case EventType.ERROR:
        console.error('Erreur reçue:', event.data);
        break;
      default:
        console.log(`Événement ${event.type} reçu:`, event.data);
    }
  }

  private handleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Nombre maximum de tentatives de reconnexion atteint');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectTimeout}ms`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectTimeout);

    // Augmente le délai de reconnexion de manière exponentielle
    this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }

  public send(type: EventType, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSEvent = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket non connecté');
      this.emit('error', new Error('WebSocket non connecté'));
    }
  }

  // Méthodes utilitaires pour les types d'événements communs
  public subscribeToNewTokens(callback: (data: any) => void): void {
    this.on(EventType.NEW_TOKEN, callback);
  }

  public subscribeToTransactionUpdates(callback: (data: any) => void): void {
    this.on(EventType.TRANSACTION_UPDATE, callback);
  }

  public subscribeToSecurityAlerts(callback: (data: any) => void): void {
    this.on(EventType.SECURITY_ALERT, callback);
  }

  public subscribeToStatsUpdates(callback: (data: any) => void): void {
    this.on(EventType.STATS_UPDATE, callback);
  }

  public subscribeToPoolUpdates(callback: (data: any) => void): void {
    this.on(EventType.POOL_UPDATE, callback);
  }
}

// Export une instance singleton
export const wsClient = new WebSocketClient();

// Hook React pour utiliser le WebSocket
export const useWebSocket = () => {
  return wsClient;
}; 