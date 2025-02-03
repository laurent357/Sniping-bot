import { rest } from 'msw';
import { server } from '../../mocks/server';

describe('API Endpoints', () => {
    test('GET /api/v1/tokens/new returns new tokens', async () => {
        const response = await fetch('/api/v1/tokens/new');
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.tokens).toBeDefined();
        expect(data.tokens.length).toBeGreaterThan(0);
        expect(data.tokens[0]).toHaveProperty('address');
    });

    test('POST /api/v1/filters/config updates configuration', async () => {
        const response = await fetch('/api/v1/filters/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                minLiquidity: 1000,
                maxSlippage: 2,
            }),
        });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    test('GET /api/v1/transactions/history returns transaction history', async () => {
        const response = await fetch('/api/v1/transactions/history');
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.transactions).toBeDefined();
        expect(Array.isArray(data.transactions)).toBe(true);
    });

    test('Error handling works correctly', async () => {
        // Override handler temporarily for testing error case
        server.use(
            rest.get('/api/v1/tokens/new', (req, res, ctx) => {
                return res(ctx.status(500), ctx.json({ error: 'Server error' }));
            })
        );

        const response = await fetch('/api/v1/tokens/new');
        expect(response.status).toBe(500);
        
        // Data should contain error message
        const data = await response.json();
        expect(data.error).toBeDefined();
    });
}); 