import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../../config';

// Configuration du serveur MSW pour les tests
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Endpoints Integration Tests', () => {
  describe('GET /api/v1/tokens/new', () => {
    it('devrait récupérer la liste des nouveaux tokens', async () => {
      const mockTokens = [
        {
          address: '0x123',
          symbol: 'TEST',
          name: 'Test Token',
          initialPrice: 0.001,
          timestamp: Date.now(),
        },
      ];

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/tokens/new`, (req, res, ctx) => {
          return res(ctx.json(mockTokens));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/tokens/new`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTokens);
    });

    it('devrait gérer les erreurs de requête', async () => {
      server.use(
        rest.get(`${API_BASE_URL}/api/v1/tokens/new`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/tokens/new`);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/filters/config', () => {
    it('devrait mettre à jour la configuration des filtres', async () => {
      const mockConfig = {
        minLiquidity: 1000,
        maxSlippage: 0.5,
        targetDEX: ['Jupiter', 'Raydium'],
      };

      server.use(
        rest.post(`${API_BASE_URL}/api/v1/filters/config`, async (req, res, ctx) => {
          const body = await req.json();
          expect(body).toEqual(mockConfig);
          return res(ctx.json({ success: true }));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/filters/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConfig),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });
  });

  describe('GET /api/v1/transactions/history', () => {
    it("devrait récupérer l'historique des transactions", async () => {
      const mockHistory = [
        {
          id: 'tx1',
          tokenAddress: '0x123',
          amount: '100',
          price: '0.001',
          timestamp: Date.now(),
          status: 'completed',
        },
      ];

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/transactions/history`, (req, res, ctx) => {
          return res(ctx.json(mockHistory));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/history`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockHistory);
    });
  });

  describe('GET /api/v1/stats/jupiter', () => {
    it('devrait récupérer les statistiques Jupiter', async () => {
      const mockStats = {
        volume24h: 1000000,
        trades24h: 500,
        avgSlippage: 0.1,
        topPools: [],
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/stats/jupiter`, (req, res, ctx) => {
          return res(ctx.json(mockStats));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/stats/jupiter`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStats);
    });
  });

  describe('POST /api/v1/transactions/execute', () => {
    it('devrait exécuter une transaction', async () => {
      const mockTransaction = {
        tokenAddress: '0x123',
        amount: '100',
        slippage: 0.1,
      };

      server.use(
        rest.post(`${API_BASE_URL}/api/v1/transactions/execute`, async (req, res, ctx) => {
          const body = await req.json();
          expect(body).toEqual(mockTransaction);
          return res(ctx.json({ txId: 'tx123', status: 'pending' }));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockTransaction),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('txId');
      expect(data).toHaveProperty('status');
    });
  });

  describe('GET /api/v1/security/check', () => {
    it('devrait vérifier le statut de sécurité', async () => {
      const mockSecurityStatus = {
        status: 'secure',
        checks: {
          honeypot: false,
          rugpull: false,
          contractVerified: true,
        },
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/security/check`, (req, res, ctx) => {
          return res(ctx.json(mockSecurityStatus));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/security/check`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSecurityStatus);
    });
  });
});
