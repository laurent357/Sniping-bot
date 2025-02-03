import { useEffect, useRef, useCallback } from 'react';
import { WS_POOLING_CONFIG, PERFORMANCE_METRICS } from '../config/performance';

interface WebSocketOptions {
  url: string;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

interface WebSocketMetrics {
  latency: number;
  messageCount: number;
  errorCount: number;
  reconnectCount: number;
  lastMessageTime: number;
}

export const useWebSocketWithPerformance = ({
  url,
  onMessage,
  onError,
  onClose,
  onOpen
}: WebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const metricsRef = useRef<WebSocketMetrics>({
    latency: 0,
    messageCount: 0,
    errorCount: 0,
    reconnectCount: 0,
    lastMessageTime: 0
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        retryCountRef.current = 0;
        onOpen?.();

        // Mesure de la latence avec ping/pong
        setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const startTime = performance.now();
            wsRef.current.send('ping');
            wsRef.current.onmessage = (event) => {
              if (event.data === 'pong') {
                metricsRef.current.latency = performance.now() - startTime;
              }
            };
          }
        }, 30000); // Toutes les 30 secondes
      };

      wsRef.current.onmessage = (event) => {
        const now = performance.now();
        metricsRef.current.messageCount++;
        metricsRef.current.lastMessageTime = now;

        // Vérification de la performance
        const messageInterval = now - metricsRef.current.lastMessageTime;
        if (messageInterval > PERFORMANCE_METRICS.thresholds.wsMessageDelay) {
          console.warn('WebSocket message delay exceeded threshold:', messageInterval);
        }

        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          metricsRef.current.errorCount++;
        }
      };

      wsRef.current.onerror = (error) => {
        metricsRef.current.errorCount++;
        onError?.(error);
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        onClose?.();
        
        // Tentative de reconnexion
        if (retryCountRef.current < WS_POOLING_CONFIG.maxRetries) {
          retryCountRef.current++;
          metricsRef.current.reconnectCount++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, WS_POOLING_CONFIG.reconnectInterval * retryCountRef.current);
        } else {
          console.error('Max WebSocket reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      metricsRef.current.errorCount++;
    }
  }, [url, onMessage, onError, onClose, onOpen]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Retourne les métriques de performance
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  return {
    sendMessage: useCallback((data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    }, []),
    getMetrics,
    reconnect: connect
  };
}; 