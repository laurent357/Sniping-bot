import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Link,
} from '@mui/material';
import { Transaction } from '../../services/api';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  let color: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info' =
    'default';
  let label = status;

  switch (status.toLowerCase()) {
    case 'completed':
      color = 'success';
      label = 'Complété';
      break;
    case 'pending':
      color = 'warning';
      label = 'En cours';
      break;
    case 'failed':
      color = 'error';
      label = 'Échoué';
      break;
    case 'cancelled':
      color = 'default';
      label = 'Annulé';
      break;
  }

  return <Chip label={label} color={color} size="small" />;
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  const getExplorerUrl = (hash: string) => {
    return `https://solscan.io/tx/${hash}`;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box mb={2}>
        <Typography variant="h6" component="div">
          Transactions Récentes
        </Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Token</TableCell>
              <TableCell align="right">Prix</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Type</TableCell>
              <TableCell align="center">Statut</TableCell>
              <TableCell align="right">Hash</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map(tx => (
              <TableRow key={tx.hash}>
                <TableCell>{formatDate(tx.timestamp)}</TableCell>
                <TableCell>{tx.token_symbol}</TableCell>
                <TableCell align="right">{formatCurrency(tx.price)}</TableCell>
                <TableCell align="right">{tx.amount.toFixed(6)}</TableCell>
                <TableCell align="right">{formatCurrency(tx.total)}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={tx.type === 'buy' ? 'Achat' : 'Vente'}
                    color={tx.type === 'buy' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <StatusChip status={tx.status} />
                </TableCell>
                <TableCell align="right">
                  <Link
                    href={getExplorerUrl(tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                    }}
                  >
                    {tx.hash.slice(0, 8)}...
                    {tx.hash.slice(-6)}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
