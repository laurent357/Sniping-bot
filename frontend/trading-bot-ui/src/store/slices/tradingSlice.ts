import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderBook, Trade, TokenInfo, TradingState } from '../../types/trading';

const initialState: TradingState = {
    orderBook: {
        asks: [],
        bids: [],
        lastUpdateId: 0
    },
    trades: [],
    selectedToken: null,
    tokens: [],
    loading: false,
    error: null
};

export const tradingSlice = createSlice({
    name: 'trading',
    initialState,
    reducers: {
        updateOrderBook: (state, action: PayloadAction<OrderBook>) => {
            state.orderBook = action.payload;
        },
        addTrade: (state, action: PayloadAction<Trade>) => {
            state.trades.unshift(action.payload);
            if (state.trades.length > 100) {
                state.trades.pop();
            }
        },
        setSelectedToken: (state, action: PayloadAction<TokenInfo | null>) => {
            state.selectedToken = action.payload;
        },
        updateTokens: (state, action: PayloadAction<TokenInfo[]>) => {
            state.tokens = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    }
});

export const {
    updateOrderBook,
    addTrade,
    setSelectedToken,
    updateTokens,
    setLoading,
    setError,
    clearError
} = tradingSlice.actions;

export default tradingSlice.reducer; 