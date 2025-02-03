import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { webSocketService } from '../../services/websocket';

jest.mock('../../services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    onConnectionChange: jest.fn(() => jest.fn()),
  },
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('se connecte automatiquement au WebSocket par défaut', () => {
    renderHook(() => useWebSocket({ type: 'stats_update' }));
    expect(webSocketService.connect).toHaveBeenCalled();
  });

  it('ne se connecte pas automatiquement si autoConnect est false', () => {
    renderHook(() => useWebSocket({ type: 'stats_update', autoConnect: false }));
    expect(webSocketService.connect).not.toHaveBeenCalled();
  });

  it("souscrit au type d'événement spécifié", () => {
    renderHook(() => useWebSocket({ type: 'stats_update' }));
    expect(webSocketService.subscribe).toHaveBeenCalledWith('stats_update', expect.any(Function));
  });

  it("gère les changements d'état de connexion", () => {
    const { result } = renderHook(() => useWebSocket({ type: 'stats_update' }));

    const connectionHandler = (webSocketService.onConnectionChange as jest.Mock).mock.calls[0][0];

    act(() => {
      connectionHandler(true);
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      connectionHandler(false);
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('appelle le callback onMessage quand un message est reçu', () => {
    const onMessage = jest.fn();
    renderHook(() => useWebSocket({ type: 'stats_update', onMessage }));

    const messageHandler = (webSocketService.subscribe as jest.Mock).mock.calls[0][1];
    const testData = { test: 'data' };

    act(() => {
      messageHandler(testData);
    });

    expect(onMessage).toHaveBeenCalledWith(testData);
  });

  it('met à jour lastMessage quand un message est reçu', () => {
    const { result } = renderHook(() => useWebSocket({ type: 'stats_update' }));

    const messageHandler = (webSocketService.subscribe as jest.Mock).mock.calls[0][1];
    const testData = { test: 'data' };

    act(() => {
      messageHandler(testData);
    });

    expect(result.current.lastMessage).toEqual(testData);
  });

  it('se déconnecte proprement lors du démontage', () => {
    const unsubscribeMessage = jest.fn();
    const unsubscribeConnection = jest.fn();

    (webSocketService.subscribe as jest.Mock).mockReturnValue(unsubscribeMessage);
    (webSocketService.onConnectionChange as jest.Mock).mockReturnValue(unsubscribeConnection);

    const { unmount } = renderHook(() => useWebSocket({ type: 'stats_update' }));

    unmount();

    expect(unsubscribeMessage).toHaveBeenCalled();
    expect(unsubscribeConnection).toHaveBeenCalled();
  });

  it('fournit des fonctions connect et disconnect', () => {
    const { result } = renderHook(() => useWebSocket({ type: 'stats_update' }));

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
