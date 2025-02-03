import { WebSocket, Server } from 'mock-socket';
import { WS_BASE_URL, WS_EVENTS } from '../../config';
import { useWebSocket } from '../../hooks/useWebSocket';
import { renderHook, act } from '@testing-library/react';

// Mock de WebSocket global
(global as any).WebSocket = WebSocket;

describe('WebSocket Integration Tests', () => {
  let mockServer: Server;

  beforeEach(() => {
    mockServer = new Server(WS_BASE_URL);
  });

  afterEach(() => {
    mockServer.close();
  });

  describe('Tests de connexion/déconnexion', () => {
    it('devrait se connecter au serveur WebSocket', async () => {
      let connected = false;
      mockServer.on('connection', () => {
        connected = true;
      });

      const { result } = renderHook(() => useWebSocket({ type: WS_EVENTS.PRICE_UPDATE }));

      // Attendre la connexion
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(connected).toBe(true);
      expect(result.current.isConnected).toBe(true);
    });

    it('devrait se déconnecter proprement', async () => {
      const { result } = renderHook(() => useWebSocket({ type: WS_EVENTS.PRICE_UPDATE }));

      // Attendre la connexion
      await new Promise(resolve => setTimeout(resolve, 100));

      act(() => {
        result.current.disconnect();
      });

      // Attendre la déconnexion
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Tests de mise à jour des prix', () => {
    it('devrait recevoir les mises à jour de prix', async () => {
      const mockPriceUpdate = {
        type: WS_EVENTS.PRICE_UPDATE,
        data: {
          symbol: 'TEST',
          price: 1.23,
          change24h: 5.67,
        },
        timestamp: Date.now(),
      };

      const onMessage = jest.fn();
      renderHook(() =>
        useWebSocket({
          type: WS_EVENTS.PRICE_UPDATE,
          onMessage,
        })
      );

      // Attendre la connexion
      await new Promise(resolve => setTimeout(resolve, 100));

      mockServer.emit('message', JSON.stringify(mockPriceUpdate));

      // Attendre le traitement du message
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onMessage).toHaveBeenCalledWith(mockPriceUpdate.data);
    });
  });

  describe('Tests de notifications de transactions', () => {
    it('devrait recevoir les notifications de transactions', async () => {
      const mockTransactionUpdate = {
        type: WS_EVENTS.TRANSACTION_UPDATE,
        data: {
          txId: 'tx123',
          status: 'completed',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      const onMessage = jest.fn();
      renderHook(() =>
        useWebSocket({
          type: WS_EVENTS.TRANSACTION_UPDATE,
          onMessage,
        })
      );

      // Attendre la connexion
      await new Promise(resolve => setTimeout(resolve, 100));

      mockServer.emit('message', JSON.stringify(mockTransactionUpdate));

      // Attendre le traitement du message
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onMessage).toHaveBeenCalledWith(mockTransactionUpdate.data);
    });
  });

  describe('Tests de gestion des erreurs', () => {
    it('devrait gérer la reconnexion automatique', async () => {
      let connectionCount = 0;
      mockServer.on('connection', () => {
        connectionCount++;
      });

      renderHook(() =>
        useWebSocket({
          type: WS_EVENTS.PRICE_UPDATE,
          autoConnect: true,
        })
      );

      // Attendre la première connexion
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simuler une déconnexion
      mockServer.close();

      // Recréer le serveur
      mockServer = new Server(WS_BASE_URL);

      // Attendre la reconnexion
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(connectionCount).toBeGreaterThan(1);
    });

    it('devrait gérer les timeouts de connexion', async () => {
      mockServer.close();
      const { result } = renderHook(() =>
        useWebSocket({
          type: WS_EVENTS.PRICE_UPDATE,
          autoConnect: true,
        })
      );

      // Attendre la tentative de connexion
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(result.current.isConnected).toBe(false);
    });
  });
});
