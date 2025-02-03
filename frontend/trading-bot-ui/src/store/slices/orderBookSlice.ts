import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookState {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderBookState = {
  bids: [],
  asks: [],
  loading: false,
  error: null,
};

const orderBookSlice = createSlice({
  name: 'orderBook',
  initialState,
  reducers: {
    setOrderBook(state, action: PayloadAction<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>) {
      state.bids = action.payload.bids;
      state.asks = action.payload.asks;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setOrderBook, setLoading, setError } = orderBookSlice.actions;
export default orderBookSlice.reducer;
