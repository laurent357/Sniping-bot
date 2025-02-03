import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { Token, Trade, Pool } from '../services/api';

interface TradingState {
  tokens: Token[];
  trades: Trade[];
  pools: Pool[];
  selectedToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TradingState = {
  tokens: [],
  trades: [],
  pools: [],
  selectedToken: null,
  isLoading: false,
  error: null,
};

// Thunks
export const fetchNewTokens = createAsyncThunk(
  'trading/fetchNewTokens',
  async (params: { min_liquidity?: number; time_range?: '1h' | '24h' | '7d' }) => {
    return await api.getNewTokens(params);
  }
);

export const fetchActivePools = createAsyncThunk(
  'trading/fetchActivePools',
  async (params: { dex?: string; min_volume?: number }) => {
    return await api.getActivePools(params);
  }
);

export const fetchTradeHistory = createAsyncThunk(
  'trading/fetchTradeHistory',
  async (params?: {
    start_date?: string;
    end_date?: string;
    status?: 'completed' | 'pending' | 'failed';
  }) => {
    return await api.getTradeHistory(params);
  }
);

export const executeTrade = createAsyncThunk(
  'trading/executeTrade',
  async (params: {
    input_token: string;
    output_token: string;
    amount: number;
    slippage: number;
  }) => {
    return await api.executeTrade(params);
  }
);

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setSelectedToken(state, action: PayloadAction<string | null>) {
      state.selectedToken = action.payload;
    },
    addNewToken(state, action: PayloadAction<Token>) {
      if (!state.tokens.find(token => token.address === action.payload.address)) {
        state.tokens.unshift(action.payload);
      }
    },
    updateTrade(state, action: PayloadAction<Trade>) {
      const index = state.trades.findIndex(trade => trade.id === action.payload.id);
      if (index !== -1) {
        state.trades[index] = action.payload;
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // fetchNewTokens
    builder
      .addCase(fetchNewTokens.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNewTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload;
      })
      .addCase(fetchNewTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });

    // fetchActivePools
    builder
      .addCase(fetchActivePools.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActivePools.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pools = action.payload;
      })
      .addCase(fetchActivePools.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });

    // fetchTradeHistory
    builder
      .addCase(fetchTradeHistory.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTradeHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades = action.payload;
      })
      .addCase(fetchTradeHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });

    // executeTrade
    builder
      .addCase(executeTrade.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeTrade.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(executeTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });
  },
});

export const { setSelectedToken, addNewToken, updateTrade, clearError } = tradingSlice.actions;

export default tradingSlice.reducer;
