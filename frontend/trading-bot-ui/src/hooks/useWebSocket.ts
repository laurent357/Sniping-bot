import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { ws, NewTokenEvent, TradeUpdateEvent } from '../services/websocket';
import { addNewToken, updateTrade } from '../store/tradingSlice';

interface WebSocketOptions<T> {
  type: string;
  onMessage: (data: T) => void;
}

export const useWebSocket = <T>({ type, onMessage }: WebSocketOptions<T>) => {
  const dispatch = useDispatch();

  const handleNewToken = useCallback(
    (event: NewTokenEvent) => {
      dispatch(addNewToken(event));
    },
    [dispatch]
  );

  const handleTradeUpdate = useCallback(
    (event: TradeUpdateEvent) => {
      dispatch(updateTrade(event));
    },
    [dispatch]
  );

  useEffect(() => {
    // Connexion au WebSocket
    ws.connect();

    // Écouteurs d'événements
    ws.on('newToken', handleNewToken);
    ws.on('tradeUpdate', handleTradeUpdate);
    ws.on(type, onMessage);

    ws.on('connected', () => {
      console.log('WebSocket connecté');
    });

    ws.on('disconnected', () => {
      console.log('WebSocket déconnecté');
    });

    ws.on('error', error => {
      console.error('Erreur WebSocket:', error);
    });

    // Nettoyage
    return () => {
      ws.removeListener('newToken', handleNewToken);
      ws.removeListener('tradeUpdate', handleTradeUpdate);
      ws.removeListener(type, onMessage);
      ws.disconnect();
    };
  }, [handleNewToken, handleTradeUpdate, type, onMessage]);

  return {
    isConnected: ws.readyState === WebSocket.OPEN,
    send: ws.send.bind(ws),
  };
};
