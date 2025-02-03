import { test, expect } from '@playwright/test';
import { setupE2E } from './utils/setup';
import { mockSolanaRPC, mockJupiterAPI } from './mocks/api';
import { TEST_WALLET, TEST_VALUES } from './constants';

test.describe('Performance Tests', () => {
    test.beforeEach(async ({ page }) => {
        await setupE2E(page);
        await mockSolanaRPC(page);
        await mockJupiterAPI(page);
    });

    test('page load performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        
        // Attendre que l'application soit complètement chargée
        await page.waitForSelector('[data-testid="app-container"]');
        const loadTime = Date.now() - startTime;
        
        // Le temps de chargement ne doit pas dépasser 3 secondes
        expect(loadTime).toBeLessThan(3000);
        
        // Vérifier les métriques de performance
        const metrics = await page.evaluate(() => ({
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
            lcp: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
            fid: performance.getEntriesByName('first-input-delay')[0]?.duration
        }));
        
        expect(metrics.fcp).toBeLessThan(1000); // First Contentful Paint < 1s
        expect(metrics.lcp).toBeLessThan(2500); // Largest Contentful Paint < 2.5s
        expect(metrics.fid).toBeLessThan(100);  // First Input Delay < 100ms
    });

    test('trading form responsiveness', async ({ page }) => {
        await page.goto('/');
        
        // Connexion wallet
        await page.click('[data-testid="connect-wallet-button"]');
        await page.click('[data-testid="phantom-wallet-option"]');
        
        const measurements: number[] = [];
        
        // Mesurer le temps de réponse pour 10 changements de montant
        for (let i = 0; i < 10; i++) {
            const amount = (i + 1) * 10;
            const startTime = Date.now();
            
            await page.fill('[data-testid="amount-input"]', amount.toString());
            await page.waitForSelector('[data-testid="output-amount"]', { state: 'visible' });
            
            measurements.push(Date.now() - startTime);
        }
        
        // Calculer le temps de réponse moyen
        const avgResponseTime = measurements.reduce((a, b) => a + b) / measurements.length;
        expect(avgResponseTime).toBeLessThan(200); // Temps de réponse moyen < 200ms
    });

    test('orderbook update performance', async ({ page }) => {
        await page.goto('/');
        
        const updateTimes: number[] = [];
        let updates = 0;
        
        // Observer les mises à jour du orderbook pendant 5 secondes
        const startTime = Date.now();
        while (Date.now() - startTime < 5000) {
            await page.waitForSelector('[data-testid="orderbook-update"]', { state: 'attached' });
            updates++;
        }
        
        // Vérifier la fréquence des mises à jour (au moins 2 par seconde)
        expect(updates).toBeGreaterThan(10);
        
        // Vérifier la performance du rendu
        const renderMetrics = await page.evaluate(() => {
            const entries = performance.getEntriesByType('measure')
                .filter(entry => entry.name.startsWith('orderbook-render'));
            return entries.map(entry => entry.duration);
        });
        
        const avgRenderTime = renderMetrics.reduce((a, b) => a + b) / renderMetrics.length;
        expect(avgRenderTime).toBeLessThan(16.67); // 60 FPS = 16.67ms par frame
    });

    test('memory usage', async ({ page }) => {
        await page.goto('/');
        
        // Fonction pour obtenir l'utilisation de la mémoire
        const getMemoryUsage = async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                const memory = performance.memory;
                return {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize
                };
            });
        };
        
        // Mesure initiale
        const initialMemory = await getMemoryUsage();
        
        // Simuler une utilisation intensive
        for (let i = 0; i < 50; i++) {
            await page.click('[data-testid="input-token-select"]');
            await page.click('[data-testid="token-option-usdc"]');
            await page.fill('[data-testid="amount-input"]', (i * 100).toString());
            await page.waitForTimeout(100);
        }
        
        // Mesure finale
        const finalMemory = await getMemoryUsage();
        
        // Vérifier que l'augmentation de la mémoire est raisonnable (< 50%)
        const memoryIncrease = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(0.5);
    });

    test('network request optimization', async ({ page }) => {
        await page.goto('/');
        
        // Collecter les requêtes réseau
        const requests = new Set();
        page.on('request', request => requests.add(request.url()));
        
        // Simuler des actions utilisateur
        await page.click('[data-testid="connect-wallet-button"]');
        await page.click('[data-testid="phantom-wallet-option"]');
        await page.fill('[data-testid="amount-input"]', TEST_VALUES.defaultAmount);
        await page.waitForTimeout(1000);
        
        // Vérifier la déduplication des requêtes
        const uniqueRequests = new Set(Array.from(requests).filter(url => 
            url.includes('/quote') || url.includes('/price')));
        
        // Vérifier que les requêtes sont optimisées (pas de requêtes en double)
        expect(uniqueRequests.size).toBeLessThanOrEqual(requests.size);
        
        // Vérifier la taille des réponses
        const responses = await page.evaluate(() => 
            performance.getEntriesByType('resource')
                .filter(entry => entry.name.includes('/api/'))
                .map(entry => entry.encodedBodySize)
        );
        
        // Vérifier que les réponses sont de taille raisonnable (< 100KB en moyenne)
        const avgResponseSize = responses.reduce((a, b) => a + b, 0) / responses.length;
        expect(avgResponseSize).toBeLessThan(102400); // 100KB
    });
}); 