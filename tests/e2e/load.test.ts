import { test, expect } from '@playwright/test';
import { setupE2E } from './utils/setup';
import { mockSolanaRPC, mockJupiterAPI } from './mocks/api';
import { TEST_VALUES } from './constants';

test.describe('Load Tests', () => {
    test.beforeEach(async ({ page }) => {
        await setupE2E(page);
        await mockSolanaRPC(page);
        await mockJupiterAPI(page);
    });

    test('concurrent trades handling', async ({ page }) => {
        await page.goto('/');
        
        // Connexion wallet
        await page.click('[data-testid="connect-wallet-button"]');
        await page.click('[data-testid="phantom-wallet-option"]');
        
        // Préparer 10 trades simultanés
        const trades = Array.from({ length: 10 }, (_, i) => ({
            amount: (i + 1) * 100,
            slippage: 1
        }));
        
        // Exécuter les trades en parallèle
        const startTime = Date.now();
        await Promise.all(trades.map(async trade => {
            await page.fill('[data-testid="amount-input"]', trade.amount.toString());
            await page.fill('[data-testid="slippage-input"]', trade.slippage.toString());
            await page.click('[data-testid="execute-trade-button"]');
            await page.click('[data-testid="confirm-trade-button"]');
            await page.waitForSelector('[data-testid="transaction-status"]', {
                state: 'visible',
                timeout: 30000
            });
        }));
        
        const totalTime = Date.now() - startTime;
        
        // Vérifier que tous les trades sont complétés
        const completedTrades = await page.locator('[data-testid="trade-row"]').count();
        expect(completedTrades).toBe(10);
        
        // Vérifier le temps moyen par trade (< 3s)
        const avgTradeTime = totalTime / trades.length;
        expect(avgTradeTime).toBeLessThan(3000);
    });

    test('websocket connection stability', async ({ page }) => {
        await page.goto('/');
        
        const disconnections = [];
        let messageCount = 0;
        
        // Observer les événements WebSocket pendant 30 secondes
        const startTime = Date.now();
        while (Date.now() - startTime < 30000) {
            // Compter les messages reçus
            await page.waitForSelector('[data-testid="orderbook-update"]', {
                state: 'attached',
                timeout: 1000
            }).then(() => {
                messageCount++;
            }).catch(() => {
                disconnections.push(Date.now() - startTime);
            });
        }
        
        // Vérifier la stabilité de la connexion
        expect(disconnections.length).toBeLessThan(3); // Max 2 déconnexions
        expect(messageCount).toBeGreaterThan(100); // Au moins 100 messages en 30s
    });

    test('multiple user simulation', async ({ browser }) => {
        // Simuler 5 utilisateurs simultanés
        const users = await Promise.all(Array.from({ length: 5 }, async () => {
            const context = await browser.newContext();
            const page = await context.newPage();
            await setupE2E(page);
            await mockSolanaRPC(page);
            await mockJupiterAPI(page);
            return page;
        }));
        
        // Actions simultanées pour chaque utilisateur
        await Promise.all(users.map(async (page, index) => {
            await page.goto('/');
            
            // Connexion et configuration
            await page.click('[data-testid="connect-wallet-button"]');
            await page.click('[data-testid="phantom-wallet-option"]');
            
            // Simuler différentes actions
            for (let i = 0; i < 5; i++) {
                await page.fill('[data-testid="amount-input"]', ((index + 1) * 100).toString());
                await page.waitForSelector('[data-testid="output-amount"]', { state: 'visible' });
                await page.waitForTimeout(500);
            }
        }));
        
        // Vérifier les performances pour chaque utilisateur
        for (const page of users) {
            // Vérifier la réactivité de l'interface
            const responseTime = await page.evaluate(() => {
                const entries = performance.getEntriesByType('measure')
                    .filter(entry => entry.name === 'ui-response');
                return entries.reduce((acc, entry) => acc + entry.duration, 0) / entries.length;
            });
            
            expect(responseTime).toBeLessThan(100); // Temps de réponse < 100ms
            
            // Vérifier l'utilisation mémoire
            const memoryUsage = await page.evaluate(() => {
                // @ts-ignore
                return performance.memory.usedJSHeapSize;
            });
            
            expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB par utilisateur
            
            await page.close();
        }
    });

    test('rapid order updates handling', async ({ page }) => {
        await page.goto('/');
        
        // Simuler des mises à jour rapides du orderbook (100 updates/sec)
        const updates = [];
        const duration = 5000; // 5 secondes
        const startTime = Date.now();
        
        while (Date.now() - startTime < duration) {
            await page.evaluate(() => {
                window.dispatchEvent(new CustomEvent('orderbook-update', {
                    detail: {
                        timestamp: Date.now(),
                        asks: Array.from({ length: 10 }, (_, i) => ({
                            price: (80 + Math.random()).toString(),
                            size: '100'
                        })),
                        bids: Array.from({ length: 10 }, (_, i) => ({
                            price: (79 - Math.random()).toString(),
                            size: '100'
                        }))
                    }
                }));
            });
            
            updates.push(Date.now());
            await page.waitForTimeout(10); // 10ms entre chaque update
        }
        
        // Calculer le taux de mise à jour effectif
        const updateRate = updates.length / (duration / 1000);
        expect(updateRate).toBeGreaterThan(50); // Au moins 50 updates/sec
        
        // Vérifier la performance du rendu
        const renderTimes = await page.evaluate(() => {
            return performance.getEntriesByType('measure')
                .filter(entry => entry.name === 'orderbook-render')
                .map(entry => entry.duration);
        });
        
        const avgRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
        expect(avgRenderTime).toBeLessThan(16.67); // 60 FPS
    });
}); 