import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { webSocketService } from '../../services/websocket';
import { WebSocketEventType } from '../../types/websocket';

// Mock du service WebSocket
jest.mock('../../services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    onConnectionChange: jest.fn(),
  },
}));

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait se connecter automatiquement au montage si autoConnect est true', () => {
    renderHook(() =>
      useWebSocket({ type: WebSocketEventType.PRICE_UPDATE, autoConnect: true })
    );
    expect(webSocketService.connect).toHaveBeenCalled();
  });

  it('ne devrait pas se connecter automatiquement si autoConnect est false', () => {
    renderHook(() =>
      useWebSocket({ type: WebSocketEventType.PRICE_UPDATE, autoConnect: false })
    );
    expect(webSocketService.connect).not.toHaveBeenCalled();
  });

  it('devrait s\'abonner au type d\'événement spécifié', () => {
    const onMessage = jest.fn();
    renderHook(() =>
      useWebSocket({
        type: WebSocketEventType.PRICE_UPDATE,
        onMessage,
      })
    );
    expect(webSocketService.subscribe).toHaveBeenCalledWith(
      WebSocketEventType.PRICE_UPDATE,
      expect.any(Function)
    );
  });

  it('devrait permettre la connexion et déconnexion manuelle', () => {
    const { result } = renderHook(() =>
      useWebSocket({ type: WebSocketEventType.PRICE_UPDATE, autoConnect: false })
    );

    act(() => {
      result.current.connect();
    });
    expect(webSocketService.connect).toHaveBeenCalled();

    act(() => {
      result.current.disconnect();
    });
    expect(webSocketService.disconnect).toHaveBeenCalled();
  });
}); 