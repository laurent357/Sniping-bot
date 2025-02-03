import { WebSocketClient, EventType } from '../ws_client';

// Mock de WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  readyState: number = WebSocket.OPEN;

  constructor(url: string) {}

  close() {
    this.onclose?.();
  }

  send(data: string) {}
}

// Remplace l'implémentation globale de WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    wsClient = new WebSocketClient('ws://test.com');
    wsClient.connect();
    mockWs = (wsClient as any).ws;
  });

  afterEach(() => {
    wsClient.disconnect();
    jest.clearAllMocks();
  });

  test('devrait se connecter avec succès', () => {
    const connectSpy = jest.fn();
    wsClient.on('connected', connectSpy);

    mockWs.onopen?.();

    expect(connectSpy).toHaveBeenCalled();
  });

  test('devrait gérer la déconnexion', () => {
    const disconnectSpy = jest.fn();
    wsClient.on('disconnected', disconnectSpy);

    mockWs.onclose?.();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  test('devrait gérer les erreurs', () => {
    const errorSpy = jest.fn();
    wsClient.on('error', errorSpy);

    const testError = new Error('Test error');
    mockWs.onerror?.(testError);

    expect(errorSpy).toHaveBeenCalledWith(testError);
  });

  test('devrait traiter les messages reçus', () => {
    const messageSpy = jest.fn();
    wsClient.on(EventType.NEW_TOKEN, messageSpy);

    const testMessage = {
      type: EventType.NEW_TOKEN,
      data: { symbol: 'TEST', price: 1.0 },
      timestamp: new Date().toISOString(),
    };

    mockWs.onmessage?.({ data: JSON.stringify(testMessage) });

    expect(messageSpy).toHaveBeenCalledWith(testMessage.data);
  });

  test('devrait gérer les messages invalides', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockWs.onmessage?.({ data: 'invalid json' });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('devrait envoyer des messages correctement', () => {
    const sendSpy = jest.spyOn(mockWs, 'send');

    wsClient.send(EventType.NEW_TOKEN, { test: 'data' });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe(EventType.NEW_TOKEN);
    expect(sentData.data).toEqual({ test: 'data' });
  });

  test('devrait gérer les souscriptions aux événements', () => {
    const callback = jest.fn();
    wsClient.subscribeToNewTokens(callback);

    const testData = { symbol: 'TEST', price: 1.0 };
    wsClient.emit(EventType.NEW_TOKEN, testData);

    expect(callback).toHaveBeenCalledWith(testData);
  });

  test('devrait gérer la reconnexion', () => {
    jest.useFakeTimers();

    const connectSpy = jest.spyOn(wsClient, 'connect');
    mockWs.onclose?.();

    jest.advanceTimersByTime(1000);

    expect(connectSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('devrait limiter les tentatives de reconnexion', () => {
    jest.useFakeTimers();

    const maxAttempts = 5;
    for (let i = 0; i <= maxAttempts; i++) {
      mockWs.onclose?.();
      jest.advanceTimersByTime(1000 * Math.pow(2, i));
    }

    const failedSpy = jest.fn();
    wsClient.on('reconnect_failed', failedSpy);
    mockWs.onclose?.();

    expect(failedSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
