import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Trade {
  id: string;
  tokenSymbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

interface TradesState {
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

const initialState: TradesState = {
  trades: [],
  loading: false,
  error: null,
};

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    addTrade(state, action: PayloadAction<Trade>) {
      state.trades.unshift(action.payload);
    },
    updateTrade(state, action: PayloadAction<{ id: string; updates: Partial<Trade> }>) {
      const trade = state.trades.find(t => t.id === action.payload.id);
      if (trade) {
        Object.assign(trade, action.payload.updates);
      }
    },
    setTrades(state, action: PayloadAction<Trade[]>) {
      state.trades = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { addTrade, updateTrade, setTrades, setLoading, setError } = tradesSlice.actions;
export default tradesSlice.reducer; 