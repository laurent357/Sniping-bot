import { useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ws, NewTokenEvent, TradeUpdateEvent } from '../services/websocket';
import { addNewToken, updateTrade } from '../store/tradingSlice';
import { Token, Trade } from '../types/trading';

interface WebSocketOptions<T> {
  type: string;
  onMessage: (data: T) => void;
}

const mapNewTokenEventToToken = (event: NewTokenEvent): Token => ({
  address: event.address,
  symbol: event.symbol,
  name: event.name,
  created_at: event.createdAt,
  initial_price: event.initialPrice,
  initial_liquidity: event.initialLiquidity,
  pool_address: event.poolAddress,
  liquidity_usd: event.liquidity_usd,
  risk_score: event.risk_score
});

const mapTradeUpdateEventToTrade = (event: TradeUpdateEvent): Trade => ({
  id: event.transaction_id,
  execution_price: event.execution_price,
  size: event.amount || 0,
  side: event.trade_type,
  timestamp: event.timestamp,
  tokenPair: `${event.input_token}/${event.output_token}`,
  status: event.status,
  input_token: event.input_token,
  output_token: event.output_token,
  amount: event.amount
});

export const useWebSocket = <T>({ type, onMessage }: WebSocketOptions<T>) => {
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const handleNewToken = useCallback(
    (event: NewTokenEvent) => {
      try {
        dispatch(addNewToken(mapNewTokenEventToToken(event)));
      } catch (err) {
        console.error('Erreur lors du traitement du nouveau token:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      }
    },
    [dispatch]
  );

  const handleTradeUpdate = useCallback(
    (event: TradeUpdateEvent) => {
      try {
        dispatch(updateTrade(mapTradeUpdateEventToTrade(event)));
      } catch (err) {
        console.error('Erreur lors du traitement de la mise à jour du trade:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    setConnectionStatus('connecting');
    ws.connect();

    ws.on('newToken', handleNewToken);
    ws.on('tradeUpdate', handleTradeUpdate);
    ws.on(type, onMessage);

    ws.on('connected', () => {
      setConnectionStatus('connected');
      setError(null);
    });

    ws.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    ws.on('error', error => {
      console.error('Erreur WebSocket:', error);
      setError(error instanceof Error ? error : new Error('Erreur WebSocket'));
    });

    return () => {
      ws.removeListener('newToken', handleNewToken);
      ws.removeListener('tradeUpdate', handleTradeUpdate);
      ws.removeListener(type, onMessage);
      ws.disconnect();
    };
  }, [handleNewToken, handleTradeUpdate, type, onMessage]);

  const reconnect = useCallback(() => {
    ws.disconnect();
    ws.connect();
  }, []);

  return {
    isConnected: ws.getConnectionState() === WebSocket.OPEN,
    connectionStatus,
    error,
    send: ws.send.bind(ws),
    reconnect,
  };
};
