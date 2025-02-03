import { configureStore } from '@reduxjs/toolkit';
import orderBookReducer from './slices/orderBookSlice';
import tradesReducer from './slices/tradesSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    orderBook: orderBookReducer,
    trades: tradesReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 