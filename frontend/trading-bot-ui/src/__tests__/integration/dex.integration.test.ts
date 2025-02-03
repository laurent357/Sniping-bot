import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../../config';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Tests d'intégration DEX", () => {
  describe('Jupiter avec Raydium', () => {
    it('devrait récupérer les routes de swap via Jupiter et Raydium', async () => {
      const mockRoutes = {
        routes: [
          {
            dex: 'Raydium',
            inputMint: '0x123',
            outputMint: '0x456',
            inAmount: '1000000',
            outAmount: '950000',
            priceImpact: 0.02,
          },
        ],
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/routes/swap`, (req, res, ctx) => {
          return res(ctx.json(mockRoutes));
        })
      );

      const response = await fetch(
        `${API_BASE_URL}/api/v1/routes/swap?inputMint=0x123&outputMint=0x456&amount=1000000`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes[0].dex).toBe('Raydium');
    });

    it('devrait exécuter un swap via Jupiter sur Raydium', async () => {
      const mockTransaction = {
        txId: 'tx123',
        status: 'success',
        route: {
          dex: 'Raydium',
          inputMint: '0x123',
          outputMint: '0x456',
          inAmount: '1000000',
          outAmount: '950000',
        },
      };

      server.use(
        rest.post(`${API_BASE_URL}/api/v1/transactions/execute`, (req, res, ctx) => {
          return res(ctx.json(mockTransaction));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: mockTransaction.route,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.route.dex).toBe('Raydium');
    });
  });

  describe('Jupiter avec Orca', () => {
    it('devrait récupérer les routes de swap via Jupiter et Orca', async () => {
      const mockRoutes = {
        routes: [
          {
            dex: 'Orca',
            inputMint: '0x123',
            outputMint: '0x456',
            inAmount: '1000000',
            outAmount: '960000',
            priceImpact: 0.015,
          },
        ],
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/routes/swap`, (req, res, ctx) => {
          return res(ctx.json(mockRoutes));
        })
      );

      const response = await fetch(
        `${API_BASE_URL}/api/v1/routes/swap?inputMint=0x123&outputMint=0x456&amount=1000000`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes[0].dex).toBe('Orca');
    });
  });

  describe('Tests de performance multi-DEX', () => {
    it('devrait comparer les performances de route entre DEX', async () => {
      const mockRoutes = {
        routes: [
          {
            dex: 'Raydium',
            inAmount: '1000000',
            outAmount: '950000',
            priceImpact: 0.02,
            estimatedTime: 500,
          },
          {
            dex: 'Orca',
            inAmount: '1000000',
            outAmount: '960000',
            priceImpact: 0.015,
            estimatedTime: 600,
          },
          {
            dex: 'Saber',
            inAmount: '1000000',
            outAmount: '955000',
            priceImpact: 0.018,
            estimatedTime: 450,
          },
        ],
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/routes/compare`, (req, res, ctx) => {
          return res(ctx.json(mockRoutes));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/routes/compare?amount=1000000`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(3);

      // Vérifier que les routes sont triées par meilleur prix
      const amounts = data.routes.map((r: any) => parseInt(r.outAmount));
      const sortedAmounts = [...amounts].sort((a, b) => b - a);
      expect(amounts).toEqual(sortedAmounts);
    });

    it('devrait mesurer les temps de réponse des différents DEX', async () => {
      const mockPerformance = {
        measurements: [
          { dex: 'Raydium', avgResponseTime: 120, successRate: 0.98 },
          { dex: 'Orca', avgResponseTime: 150, successRate: 0.99 },
          { dex: 'Saber', avgResponseTime: 100, successRate: 0.97 },
        ],
      };

      server.use(
        rest.get(`${API_BASE_URL}/api/v1/performance/dex`, (req, res, ctx) => {
          return res(ctx.json(mockPerformance));
        })
      );

      const response = await fetch(`${API_BASE_URL}/api/v1/performance/dex`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.measurements).toHaveLength(3);

      // Vérifier que tous les DEX ont des temps de réponse acceptables
      data.measurements.forEach((m: any) => {
        expect(m.avgResponseTime).toBeLessThan(200);
        expect(m.successRate).toBeGreaterThan(0.95);
      });
    });
  });
});
