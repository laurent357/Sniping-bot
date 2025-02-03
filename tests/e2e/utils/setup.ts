import { Page } from '@playwright/test';
import { mockWebSocket } from '../mocks/api';

export const setupE2E = async (page: Page) => {
    // Configuration de base
    await page.setViewportSize({ width: 1280, height: 720 });

    // Injection des mocks
    await mockWebSocket(page);

    // Intercepter les appels console pour le debugging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`Page Error: ${msg.text()}`);
        }
    });

    // Gestion des erreurs non capturées
    page.on('pageerror', error => {
        console.error(`Page Error: ${error.message}`);
    });

    // Gestion des requêtes échouées
    page.on('requestfailed', request => {
        console.error(`Failed request: ${request.url()}`);
    });

    // Configuration du localStorage
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('language', 'fr');
    });

    // Configuration des timeouts
    await page.setDefaultTimeout(10000);
    await page.setDefaultNavigationTimeout(20000);

    // Attendre que l'application soit chargée
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="app-container"]', { state: 'visible' });
}; 