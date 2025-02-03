import { Page } from '@playwright/test';
import { API_ENDPOINTS, TEST_TOKENS } from '../constants';

export const mockSolanaRPC = async (page: Page) => {
    await page.route(API_ENDPOINTS.solana, async (route) => {
        const request = route.request();
        const body = JSON.parse(request.postData() || '{}');

        switch (body.method) {
            case 'getBalance':
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: body.id,
                        result: { value: 10000000000 } // 10 SOL
                    })
                });
                break;

            case 'getTokenAccountBalance':
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: body.id,
                        result: {
                            value: {
                                amount: '1000000000', // 1000 USDC
                                decimals: 6
                            }
                        }
                    })
                });
                break;

            default:
                await route.continue();
        }
    });
};

export const mockJupiterAPI = async (page: Page) => {
    // Mock quote endpoint
    await page.route(`${API_ENDPOINTS.jupiter}/quote`, async (route) => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify({
                inputMint: TEST_TOKENS.USDC.mint,
                outputMint: TEST_TOKENS.SOL.mint,
                inAmount: '100000000', // 100 USDC
                outAmount: '1250000000', // 1.25 SOL
                otherAmountThreshold: '1237500000', // 1.2375 SOL (1% slippage)
                swapMode: 'ExactIn',
                priceImpactPct: '0.1',
                marketInfos: [
                    {
                        id: 'mock_market',
                        label: 'Mock Market',
                        inputMint: TEST_TOKENS.USDC.mint,
                        outputMint: TEST_TOKENS.SOL.mint,
                        notEnoughLiquidity: false,
                        inAmount: '100000000',
                        outAmount: '1250000000',
                        priceImpactPct: '0.1',
                        lpFee: {
                            amount: '300000', // 0.3%
                            mint: TEST_TOKENS.USDC.mint
                        }
                    }
                ]
            })
        });
    });

    // Mock swap endpoint
    await page.route(`${API_ENDPOINTS.jupiter}/swap`, async (route) => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify({
                swapTransaction: 'mock_encoded_transaction',
                lastValidBlockHeight: 123456789,
                prioritizationFeeLamports: 5000
            })
        });
    });
};

export const mockWebSocket = async (page: Page) => {
    await page.evaluate(() => {
        // @ts-ignore
        window.mockWebSocket = class extends WebSocket {
            constructor(url: string) {
                super(url);
                setTimeout(() => {
                    this.dispatchEvent(new Event('open'));
                }, 100);
            }

            send(data: string) {
                super.send(data);
                // Mock orderbook updates
                setTimeout(() => {
                    this.dispatchEvent(new MessageEvent('message', {
                        data: JSON.stringify({
                            type: 'orderbook',
                            data: {
                                asks: Array.from({ length: 10 }, (_, i) => ({
                                    price: (80 + i).toString(),
                                    size: '100'
                                })),
                                bids: Array.from({ length: 10 }, (_, i) => ({
                                    price: (79 - i).toString(),
                                    size: '100'
                                }))
                            }
                        })
                    }));
                }, 200);
            }
        };
    });
}; 