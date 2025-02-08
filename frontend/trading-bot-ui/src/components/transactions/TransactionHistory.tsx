import React, { useState, useEffect } from 'react';
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

interface Filters {
  startDate?: string;
  endDate?: string;
  type?: 'buy' | 'sell' | 'all';
  status?: 'completed' | 'pending' | 'failed' | 'all';
  token?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

interface TransactionHistoryProps {
  maxItems?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ maxItems = 50 }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<Filters>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const getExplorerUrl = (txId: string) => {
    return `https://solscan.io/tx/${txId}`;
  };

  const renderTradeSide = (trade: Transaction) => {
    const color = trade.type === 'buy' ? 'success' : 'error';
    const label = trade.type === 'buy' ? 'Achat' : 'Vente';
    return <Chip label={label} color={color} size="small" variant="outlined" />;
  };

  const renderStatus = (trade: Transaction) => {
    // Utilisation d'une assertion de type avec vérification de sécurité
    const defaultStatus: TransactionStatus = 'completed';
    const currentStatus =
      trade.status && trade.status in statusMap
        ? (trade.status as TransactionStatus)
        : defaultStatus;
    const status = statusMap[currentStatus];

    return (
      <Chip
        label={status.label}
        color={status.color as 'success' | 'warning' | 'error'}
        size="small"
        variant="outlined"
      />
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(rowsPerPage),
        ...(filters &&
          Object.fromEntries(
            Object.entries(filters)
              .filter(([_, value]) => value !== undefined && value !== 'all') // Remove undefined and 'all' values
              .map(([key, value]) => [key, String(value)]) // Convert values to strings
          )),
      });

      const response = await fetch(`/api/v1/transactions/history?${queryParams}`);
      const result: PaginatedTransactions = await response.json();

      setTransactions(result.items);
      setTotalTransactions(result.total);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, rowsPerPage, filters]);

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
          {transactions.slice(0, maxItems).map(tx => (
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
