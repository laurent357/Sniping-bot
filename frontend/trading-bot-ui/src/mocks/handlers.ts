import { rest } from 'msw';
import { JupiterStatistics } from '../types/jupiter';

const mockJupiterStats: JupiterStatistics = {
  totalPools: 150,
  totalVolume24h: 1500000,
  totalTrades24h: 5000,
  averageSlippage24h: 0.15,
  topPools: [
    {
      poolAddress: '0x123',
      tokenA: '0xabc',
      tokenB: '0xdef',
      symbolA: 'SOL',
      symbolB: 'USDC',
      liquidity: 1000000,
      volume24h: 500000,
      fees24h: 1500,
      apy: 25.5,
      priceChange24h: 2.3,
    },
  ],
  volumeHistory: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    volume: 50000 + Math.random() * 20000,
  })),
  topPairs: [
    {
      tokenA: '0xabc',
      tokenB: '0xdef',
      symbolA: 'SOL',
      symbolB: 'USDC',
      volume24h: 500000,
      trades24h: 1200,
      averageSlippage: 0.12,
    },
  ],
};

export const handlers = [
  // GET /api/v1/tokens/new
  rest.get('/api/v1/tokens/new', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        tokens: [
          {
            address: 'token123',
            name: 'Test Token',
            symbol: 'TEST',
            price: '0.1',
            change24h: '+5.2%',
            volume24h: '1000000',
            timestamp: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  // POST /api/v1/filters/config
  rest.post('/api/v1/filters/config', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Configuration mise à jour',
      })
    );
  }),

  // GET /api/v1/transactions/history
  rest.get('/api/v1/transactions/history', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        transactions: [
          {
            id: 'tx1',
            type: 'BUY',
            token: 'TEST',
            amount: '100',
            price: '0.1',
            timestamp: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  // GET /api/v1/stats/jupiter
  rest.get('/api/v1/stats/jupiter', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalVolume: '1000000',
        poolCount: 100,
        activeTraders: 500,
        averageSlippage: '0.1%',
      })
    );
  }),

  // POST /api/v1/transactions/execute
  rest.post('/api/v1/transactions/execute', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        transactionId: 'tx123',
        status: 'COMPLETED',
      })
    );
  }),

  // GET /api/v1/security/check
  rest.get('/api/v1/security/check', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'SECURE',
        checks: {
          honeypot: false,
          contractVerified: true,
          riskLevel: 'LOW',
        },
      })
    );
  }),
];
