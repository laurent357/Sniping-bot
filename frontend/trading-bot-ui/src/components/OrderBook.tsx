import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { updateOrderBook } from '../store/slices/tradingSlice';
import { formatNumber } from '../utils/format';
import { OrderBookEntry } from '../types/trading';
import { ORDERBOOK_UPDATE_THROTTLE, VIRTUAL_SCROLL_CONFIG } from '../config/performance';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import { throttle } from 'lodash';

interface OrderBookProps {
  tokenPair: string;
  depth?: number;
}

export const OrderBook: React.FC<OrderBookProps> = React.memo(({ tokenPair, depth = 25 }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const orderBook = useAppSelector(state => state.trading.orderBook);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Memoize des données de l'orderbook
  const { bids, asks } = useMemo(() => {
    return {
      bids: orderBook.bids.slice(0, depth),
      asks: orderBook.asks.slice(0, depth).reverse(),
    };
  }, [orderBook.bids, orderBook.asks, depth]);

  // Configuration du virtual scrolling pour les ordres
  const rowVirtualizer = useVirtualizer({
    count: bids.length + asks.length,
    getScrollElement: () => containerRef,
    estimateSize: () => VIRTUAL_SCROLL_CONFIG.itemHeight,
    overscan: VIRTUAL_SCROLL_CONFIG.overscan,
  });

  // Optimisation de la mise à jour de l'orderbook avec throttling
  const handleOrderBookUpdate = useCallback(
    throttle((data: any) => {
      dispatch(updateOrderBook(data));
    }, ORDERBOOK_UPDATE_THROTTLE),
    [dispatch]
  );

  useEffect(() => {
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/orderbook/${tokenPair}`);

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      handleOrderBookUpdate(data);
    };

    return () => {
      ws.close();
      handleOrderBookUpdate.cancel();
    };
  }, [tokenPair, handleOrderBookUpdate]);

  // Memoize des styles pour éviter les recalculs
  const styles = useMemo(
    () => ({
      askColor: alpha(theme.palette.error.main, 0.1),
      bidColor: alpha(theme.palette.success.main, 0.1),
      tableCell: {
        padding: '4px 8px',
        borderBottom: `1px solid ${theme.palette.divider}`,
        fontSize: '0.875rem',
      },
    }),
    [theme]
  );

  // Rendu optimisé d'une ligne de l'orderbook
  const renderOrderRow = useCallback(
    (entry: OrderBookEntry, type: 'ask' | 'bid') => {
      const backgroundColor = type === 'ask' ? styles.askColor : styles.bidColor;
      const textColor = type === 'ask' ? theme.palette.error.main : theme.palette.success.main;

      return (
        <TableRow
          key={`${type}-${entry.price}`}
          sx={{ backgroundColor }}
          data-testid={`${type}-row`}
        >
          <TableCell sx={styles.tableCell}>
            <Typography variant="body2" sx={{ color: textColor }}>
              {formatNumber(entry.price, 6)}
            </Typography>
          </TableCell>
          <TableCell sx={styles.tableCell} align="right">
            {formatNumber(entry.size, 4)}
          </TableCell>
          <TableCell sx={styles.tableCell} align="right">
            {formatNumber(entry.price * entry.size, 2)}
          </TableCell>
        </TableRow>
      );
    },
    [styles, theme]
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Carnet d'ordres - {tokenPair}
        </Typography>
        <Box ref={setContainerRef} sx={{ height: '500px', overflow: 'auto' }}>
          <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={styles.tableCell}>Prix</TableCell>
                  <TableCell sx={styles.tableCell} align="right">
                    Quantité
                  </TableCell>
                  <TableCell sx={styles.tableCell} align="right">
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                  const isAsk = virtualRow.index < asks.length;
                  const entry = isAsk
                    ? asks[virtualRow.index]
                    : bids[virtualRow.index - asks.length];

                  return (
                    <React.Fragment key={virtualRow.key}>
                      {renderOrderRow(entry, isAsk ? 'ask' : 'bid')}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
});

OrderBook.displayName = 'OrderBook';
