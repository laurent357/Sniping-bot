import { test, expect } from '@playwright/test';
import { setupE2E } from '../utils/setup';
import { mockSolanaRPC, mockJupiterAPI } from '../mocks/api';
import { TEST_WALLET } from '../constants';

test.describe('Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2E(page);
    await mockSolanaRPC();
    await mockJupiterAPI();
  });

  test('complete trading flow', async ({ page }) => {
    // 1. Connexion wallet
    await test.step('Connect wallet', async () => {
      await page.click('[data-testid="connect-wallet-button"]');
      await page.click('[data-testid="phantom-wallet-option"]');
      await expect(page.locator('[data-testid="wallet-address"]'))
        .toContainText(TEST_WALLET.publicKey);
    });

    // 2. Sélection des tokens
    await test.step('Select tokens', async () => {
      await page.click('[data-testid="input-token-select"]');
      await page.click('[data-testid="token-option-usdc"]');
      
      await page.click('[data-testid="output-token-select"]');
      await page.click('[data-testid="token-option-sol"]');

      await expect(page.locator('[data-testid="trading-pair"]'))
        .toContainText('USDC/SOL');
    });

    // 3. Configuration du trade
    await test.step('Configure trade', async () => {
      await page.fill('[data-testid="amount-input"]', '100');
      await page.fill('[data-testid="slippage-input"]', '1');
      
      // Vérification du calcul
      await expect(page.locator('[data-testid="output-amount"]'))
        .toContainText('1.25'); // Based on mock rate
    });

    // 4. Vérification OrderBook
    await test.step('Check orderbook', async () => {
      await expect(page.locator('[data-testid="orderbook-spread"]'))
        .toContainText('0.1%');
      
      const asks = page.locator('[data-testid="ask-row"]');
      const bids = page.locator('[data-testid="bid-row"]');
      
      await expect(asks).toHaveCount(10);
      await expect(bids).toHaveCount(10);
    });

    // 5. Exécution du trade
    await test.step('Execute trade', async () => {
      await page.click('[data-testid="execute-trade-button"]');
      
      // Confirmation dialog
      await expect(page.locator('[data-testid="confirmation-dialog"]'))
        .toBeVisible();
      await page.click('[data-testid="confirm-trade-button"]');
      
      // Attente de la confirmation
      await expect(page.locator('[data-testid="transaction-status"]'))
        .toContainText('Processing');
      
      // Vérification du succès
      await expect(page.locator('[data-testid="transaction-status"]'))
        .toContainText('Completed', { timeout: 10000 });
    });

    // 6. Vérification Transaction History
    await test.step('Check transaction history', async () => {
      const lastTrade = page.locator('[data-testid="trade-row"]').first();
      
      await expect(lastTrade.locator('[data-testid="trade-pair"]'))
        .toContainText('USDC/SOL');
      await expect(lastTrade.locator('[data-testid="trade-amount"]'))
        .toContainText('100');
      await expect(lastTrade.locator('[data-testid="trade-status"]'))
        .toContainText('Completed');
    });

    // 7. Vérification des balances
    await test.step('Check balances', async () => {
      const usdcBalance = page.locator('[data-testid="usdc-balance"]');
      const solBalance = page.locator('[data-testid="sol-balance"]');
      
      // Vérification des nouveaux soldes
      await expect(usdcBalance).toContainText('900.00');
      await expect(solBalance).toContainText('11.25');
    });
  });

  test('handles insufficient balance', async ({ page }) => {
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    await page.click('[data-testid="input-token-select"]');
    await page.click('[data-testid="token-option-usdc"]');
    
    // Tentative de trade avec un montant trop élevé
    await page.fill('[data-testid="amount-input"]', '1000000');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Insufficient balance');
    await expect(page.locator('[data-testid="execute-trade-button"]'))
      .toBeDisabled();
  });

  test('handles network errors', async ({ page }) => {
    // Simulation d'une erreur réseau
    await page.route('**/v4/quote', (route) => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      });
    });

    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    await page.click('[data-testid="input-token-select"]');
    await page.click('[data-testid="token-option-usdc"]');
    
    await page.fill('[data-testid="amount-input"]', '100');
    await page.click('[data-testid="execute-trade-button"]');

    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Network error');
    await expect(page.locator('[data-testid="retry-button"]'))
      .toBeVisible();
  });

  test('handles slippage protection', async ({ page }) => {
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    await page.click('[data-testid="input-token-select"]');
    await page.click('[data-testid="token-option-usdc"]');
    
    await page.fill('[data-testid="amount-input"]', '100');
    await page.fill('[data-testid="slippage-input"]', '0.1');

    // Simulation d'un changement de prix important
    await page.route('**/v4/quote', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          price: '80.0', // Prix significativement différent
          priceImpact: '5.2'
        })
      });
    });

    await page.click('[data-testid="execute-trade-button"]');

    await expect(page.locator('[data-testid="slippage-warning"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="confirm-trade-button"]'))
      .toBeDisabled();
  });
}); 