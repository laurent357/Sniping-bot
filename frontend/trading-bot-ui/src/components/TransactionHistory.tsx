import React from 'react';
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
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { useAppSelector } from '../hooks/redux';
import { formatNumber, formatDate, formatShortAddress } from '../utils/format';
import { Trade } from '../types/trading';

interface TransactionHistoryProps {
  maxItems?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ maxItems = 50 }) => {
  const theme = useTheme();
  const trades = useAppSelector(state => state.trading.trades);

  const getExplorerUrl = (txId: string) => {
    return `https://solscan.io/tx/${txId}`;
  };

  const renderTradeSide = (trade: Trade) => {
    const isBuy = trade.side === 'buy';
    const Icon = isBuy ? TrendingUpIcon : TrendingDownIcon;
    const color = isBuy ? theme.palette.success.main : theme.palette.error.main;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ color }} />
        <Typography sx={{ color }}>
          {isBuy ? 'BUY' : 'SELL'}
        </Typography>
      </Box>
    );
  };

  const renderStatus = (trade: Trade) => {
    const statusMap = {
      completed: {
        label: 'Completed',
        color: 'success'
      },
      pending: {
        label: 'Pending',
        color: 'warning'
      },
      failed: {
        label: 'Failed',
        color: 'error'
      }
    };

    const status = statusMap[trade.status || 'completed'];
    return (
      <Chip
        label={status.label}
        color={status.color as any}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          Transaction History
          <Chip
            label={`${trades.length} trades`}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Pair</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trades.slice(0, maxItems).map((trade) => (
                <TableRow
                  key={trade.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <TableCell>
                    <Tooltip title={formatDate(trade.timestamp)}>
                      <Typography variant="body2">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{renderTradeSide(trade)}</TableCell>
                  <TableCell>{trade.tokenPair}</TableCell>
                  <TableCell align="right">
                    {formatNumber(trade.price, 4)}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(trade.size, 4)}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(trade.price * trade.size, 2)}
                  </TableCell>
                  <TableCell>{renderStatus(trade)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View on Explorer">
                      <IconButton
                        size="small"
                        onClick={() => window.open(getExplorerUrl(trade.id), '_blank')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No transactions yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}; 