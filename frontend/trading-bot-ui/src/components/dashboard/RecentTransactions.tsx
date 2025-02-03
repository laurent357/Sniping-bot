import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Transaction } from '../../types/dashboard';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'primary' : 'secondary';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Transactions Récentes
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Token</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell align="right">Prix</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Hash</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map(transaction => (
              <TableRow key={transaction.id}>
                <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                <TableCell>
                  <Chip
                    label={transaction.type.toUpperCase()}
                    color={getTypeColor(transaction.type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{transaction.tokenSymbol}</TableCell>
                <TableCell align="right">{transaction.amount}</TableCell>
                <TableCell align="right">{formatCurrency(transaction.price)}</TableCell>
                <TableCell>
                  <Chip
                    label={transaction.status}
                    color={getStatusColor(transaction.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {`${transaction.hash.substring(0, 6)}...${transaction.hash.substring(
                      transaction.hash.length - 4
                    )}`}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
