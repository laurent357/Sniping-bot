import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Link,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';

type TransactionStatus = 'completed' | 'pending' | 'failed';

interface Transaction {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  tokenSymbol: string;
  amount: number;
  price: number;
  status: TransactionStatus;
  txHash: string;
}

const statusMap: Record<TransactionStatus, { label: string; color: string }> = {
  completed: { label: 'Complété', color: 'success' },
  pending: { label: 'En cours', color: 'warning' },
  failed: { label: 'Échoué', color: 'error' },
};

interface TransactionHistoryProps {
  maxItems?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ maxItems = 50 }) => {
  const getExplorerUrl = (txId: string) => {
    return `https://solscan.io/tx/${txId}`;
  };

  const renderTradeSide = (trade: Transaction) => {
    const color = trade.type === 'buy' ? 'success' : 'error';
    const label = trade.type === 'buy' ? 'Achat' : 'Vente';
    return <Chip label={label} color={color} size="small" variant="outlined" />;
  };

  const renderStatus = (trade: Transaction) => {
    const status = statusMap[trade.status];
    return (
      <Chip label={status.label} color={status.color as 'success' | 'warning' | 'error'} size="small" variant="outlined" />
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Exemple de données (à remplacer par les vraies données)
  const transactions: Transaction[] = [
    {
      id: '1',
      timestamp: '2024-01-20T12:00:00',
      type: 'buy',
      tokenSymbol: 'SOL',
      amount: 100,
      price: 103.45,
      status: 'completed',
      txHash: '0x123...abc',
    },
    // ... autres transactions
  ];

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Token</TableCell>
            <TableCell align="right">Montant</TableCell>
            <TableCell align="right">Prix</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Transaction</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.slice(0, maxItems).map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
              <TableCell>{renderTradeSide(tx)}</TableCell>
              <TableCell>{tx.tokenSymbol}</TableCell>
              <TableCell align="right">{tx.amount.toFixed(6)}</TableCell>
              <TableCell align="right">${tx.price.toFixed(2)}</TableCell>
              <TableCell>{renderStatus(tx)}</TableCell>
              <TableCell>
                <Link href={getExplorerUrl(tx.txHash)} target="_blank" rel="noopener noreferrer">
                  {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                </Link>
                <Tooltip title="Copier">
                  <IconButton size="small" onClick={() => copyToClipboard(tx.txHash)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 