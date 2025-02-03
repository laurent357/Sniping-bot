import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material';
import { OrderBook } from '../OrderBook';
import tradingReducer, { updateOrderBook } from '../../store/slices/tradingSlice';
import { theme } from '../../theme';

const createTestStore = () => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
  });
};

describe('OrderBook Component', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderOrderBook = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <OrderBook tokenPair="SOL/USDC" />
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders the order book title', () => {
    renderOrderBook();
    expect(screen.getByText('Order Book - SOL/USDC')).toBeInTheDocument();
  });

  it('displays empty order book initially', () => {
    renderOrderBook();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('displays order book data correctly', () => {
    renderOrderBook();

    store.dispatch(
      updateOrderBook({
        asks: [
          { price: 22.5, size: 100 },
          { price: 22.6, size: 200 },
        ],
        bids: [
          { price: 22.4, size: 150 },
          { price: 22.3, size: 250 },
        ],
        lastUpdateId: 1,
      })
    );

    // Vérifier les prix
    expect(screen.getByText('22.50')).toBeInTheDocument();
    expect(screen.getByText('22.60')).toBeInTheDocument();
    expect(screen.getByText('22.40')).toBeInTheDocument();
    expect(screen.getByText('22.30')).toBeInTheDocument();

    // Vérifier les tailles
    expect(screen.getByText('100.0000')).toBeInTheDocument();
    expect(screen.getByText('200.0000')).toBeInTheDocument();
    expect(screen.getByText('150.0000')).toBeInTheDocument();
    expect(screen.getByText('250.0000')).toBeInTheDocument();
  });

  it('calculates and displays spread correctly', () => {
    renderOrderBook();

    store.dispatch(
      updateOrderBook({
        asks: [{ price: 22.5, size: 100 }],
        bids: [{ price: 22.4, size: 150 }],
        lastUpdateId: 1,
      })
    );

    // Spread = 22.5 - 22.4 = 0.1
    // Percentage = (0.1 / 22.5) * 100 ≈ 0.44%
    expect(screen.getByText('Spread: 0.10 (0.44%)')).toBeInTheDocument();
  });

  it('respects depth parameter', () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <OrderBook tokenPair="SOL/USDC" depth={2} />
        </ThemeProvider>
      </Provider>
    );

    store.dispatch(
      updateOrderBook({
        asks: [
          { price: 22.5, size: 100 },
          { price: 22.6, size: 200 },
          { price: 22.7, size: 300 }, // Ne devrait pas être affiché
        ],
        bids: [
          { price: 22.4, size: 150 },
          { price: 22.3, size: 250 },
          { price: 22.2, size: 350 }, // Ne devrait pas être affiché
        ],
        lastUpdateId: 1,
      })
    );

    // Vérifier que seuls les 2 premiers ordres sont affichés
    expect(screen.queryByText('22.70')).not.toBeInTheDocument();
    expect(screen.queryByText('22.20')).not.toBeInTheDocument();
  });

  it('updates when new data arrives', () => {
    renderOrderBook();

    // Premier état
    store.dispatch(
      updateOrderBook({
        asks: [{ price: 22.5, size: 100 }],
        bids: [{ price: 22.4, size: 150 }],
        lastUpdateId: 1,
      })
    );

    expect(screen.getByText('22.50')).toBeInTheDocument();

    // Mise à jour
    store.dispatch(
      updateOrderBook({
        asks: [{ price: 22.6, size: 200 }],
        bids: [{ price: 22.5, size: 250 }],
        lastUpdateId: 2,
      })
    );

    expect(screen.getByText('22.60')).toBeInTheDocument();
    expect(screen.queryByText('22.50')).not.toBeInTheDocument();
  });

  it('handles empty order book gracefully', () => {
    renderOrderBook();

    store.dispatch(
      updateOrderBook({
        asks: [],
        bids: [],
        lastUpdateId: 1,
      })
    );

    expect(screen.getByText('Spread: 0.00 (0.00%)')).toBeInTheDocument();
  });
});
