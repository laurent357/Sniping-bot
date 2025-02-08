import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { Token, Pool } from '../services/api';
import { Trade } from '../types/trading';

const mapTransactionToTrade = (tx: any): Trade => ({
  id: tx.hash,
  execution_price: tx.price,
  size: tx.amount,
  side: tx.type,
  timestamp: tx.timestamp,
  tokenPair: tx.token_symbol,
  status: tx.status === 'cancelled' ? 'failed' : tx.status,
  input_token: '', // Ces informations ne sont pas disponibles dans Transaction
  output_token: tx.token_symbol,
  amount: tx.amount
});

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
  async (params: { min_profit?: number }) => {
    return await api.getNewTokens(params);
  }
);

export const fetchPoolInfo = createAsyncThunk(
  'trading/fetchPoolInfo',
  async (poolId: string) => {
    return await api.getPoolInfo(poolId);
  }
);

export const fetchTransactionHistory = createAsyncThunk(
  'trading/fetchTransactionHistory',
  async (params?: { limit?: number; status?: string }) => {
    const transactions = await api.getTransactionHistory(params);
    return transactions.map(mapTransactionToTrade);
  }
);

export const executeTransaction = createAsyncThunk(
  'trading/executeTransaction',
  async (token: Token) => {
    return await api.executeTransaction(token);
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

    // fetchPoolInfo
    builder
      .addCase(fetchPoolInfo.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPoolInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pools = [action.payload];
      })
      .addCase(fetchPoolInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });

    // fetchTransactionHistory
    builder
      .addCase(fetchTransactionHistory.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades = action.payload;
      })
      .addCase(fetchTransactionHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });

    // executeTransaction
    builder
      .addCase(executeTransaction.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeTransaction.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(executeTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      });
  },
});

export const { setSelectedToken, addNewToken, updateTrade, clearError } = tradingSlice.actions;

export default tradingSlice.reducer;
