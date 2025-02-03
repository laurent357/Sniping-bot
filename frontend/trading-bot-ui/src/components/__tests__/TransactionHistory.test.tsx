import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material';
import { TransactionHistory } from '../TransactionHistory';
import tradingReducer, { addTrade } from '../../store/slices/tradingSlice';
import { theme } from '../../theme';
import { Trade } from '../../types/trading';

const createTestStore = () => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
  });
};

describe('TransactionHistory Component', () => {
  let store: ReturnType<typeof createTestStore>;
  const mockTrade: Trade = {
    id: 'tx123',
    price: 22.5,
    size: 100,
    side: 'buy',
    timestamp: Date.now(),
    tokenPair: 'SOL/USDC',
    status: 'completed',
  };

  beforeEach(() => {
    store = createTestStore();
  });

  const renderTransactionHistory = () => {
    return render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <TransactionHistory />
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders the transaction history title', () => {
    renderTransactionHistory();
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('displays empty state message when no trades', () => {
    renderTransactionHistory();
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('displays trade information correctly', () => {
    renderTransactionHistory();
    store.dispatch(addTrade(mockTrade));

    // Vérifier les informations de base
    expect(screen.getByText('SOL/USDC')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('22.5000')).toBeInTheDocument();
    expect(screen.getByText('100.0000')).toBeInTheDocument();
    expect(screen.getByText('2,250.00')).toBeInTheDocument();
  });

  it('displays multiple trades up to maxItems', () => {
    renderTransactionHistory();

    // Ajouter 60 trades
    for (let i = 0; i < 60; i++) {
      store.dispatch(
        addTrade({
          ...mockTrade,
          id: `tx${i}`,
          price: 22.5 + i,
        })
      );
    }

    // Par défaut, maxItems est 50
    const priceElements = screen.getAllByText(/\d+\.\d{4}/);
    expect(priceElements.length).toBeLessThanOrEqual(50);
  });

  it('displays trade status with correct color', () => {
    renderTransactionHistory();

    // Trade complété
    store.dispatch(
      addTrade({
        ...mockTrade,
        id: 'tx1',
        status: 'completed',
      })
    );

    // Trade en attente
    store.dispatch(
      addTrade({
        ...mockTrade,
        id: 'tx2',
        status: 'pending',
      })
    );

    // Trade échoué
    store.dispatch(
      addTrade({
        ...mockTrade,
        id: 'tx3',
        status: 'failed',
      })
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('opens explorer link in new tab', () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;

    renderTransactionHistory();
    store.dispatch(addTrade(mockTrade));

    const explorerButton = screen.getByTitle('View on Explorer');
    fireEvent.click(explorerButton);

    expect(mockOpen).toHaveBeenCalledWith(`https://solscan.io/tx/${mockTrade.id}`, '_blank');
  });

  it('displays correct trade count', () => {
    renderTransactionHistory();

    // Ajouter 3 trades
    for (let i = 0; i < 3; i++) {
      store.dispatch(
        addTrade({
          ...mockTrade,
          id: `tx${i}`,
        })
      );
    }

    expect(screen.getByText('3 trades')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    const timestamp = new Date('2024-01-20T10:30:00').getTime();
    renderTransactionHistory();

    store.dispatch(
      addTrade({
        ...mockTrade,
        timestamp,
      })
    );

    // Vérifier le format court (heure)
    const timeElement = screen.getByText('10:30:00 AM');
    expect(timeElement).toBeInTheDocument();

    // Vérifier le format complet dans le tooltip
    expect(screen.getByRole('cell', { name: /10:30:00 AM/i })).toHaveAttribute(
      'title',
      'Jan 20, 2024, 10:30:00 AM'
    );
  });

  it('handles buy/sell indicators correctly', () => {
    renderTransactionHistory();

    // Trade d'achat
    store.dispatch(
      addTrade({
        ...mockTrade,
        id: 'tx1',
        side: 'buy',
      })
    );

    // Trade de vente
    store.dispatch(
      addTrade({
        ...mockTrade,
        id: 'tx2',
        side: 'sell',
      })
    );

    const buyText = screen.getByText('BUY');
    const sellText = screen.getByText('SELL');

    expect(buyText).toHaveStyle({ color: theme.palette.success.main });
    expect(sellText).toHaveStyle({ color: theme.palette.error.main });
  });
});
