export const TEST_WALLET = {
    publicKey: 'GkWJ9tUxLHCTGEoSqpVUFzF9zqJqpWYTHqR9BVTYR6Hn',
    privateKey: new Uint8Array([/* ... */]) // Mock private key for testing
};

export const API_ENDPOINTS = {
    jupiter: 'https://quote-api.jup.ag/v4',
    solana: 'https://api.mainnet-beta.solana.com'
};

export const TEST_TOKENS = {
    USDC: {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin'
    },
    SOL: {
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana'
    }
};

export const TEST_DELAYS = {
    networkResponse: 500,
    transactionConfirmation: 2000,
    uiUpdate: 1000
};

export const TEST_VALUES = {
    defaultAmount: '100',
    defaultSlippage: '1',
    highSlippage: '5',
    insufficientAmount: '1000000'
}; 