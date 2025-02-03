import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Collapse,
  Link,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import {
  DetailedTransaction,
  TransactionFilters,
  TransactionStats,
  PaginatedTransactions,
} from '../../types/transactions';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface TransactionRowProps {
  transaction: DetailedTransaction;
}

const TransactionRow = ({ transaction }: TransactionRowProps) => {
  const [open, setOpen] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{formatDate(transaction.timestamp)}</TableCell>
        <TableCell>
          <Chip
            label={transaction.type.toUpperCase()}
            color={transaction.type === 'buy' ? 'primary' : 'secondary'}
            size="small"
          />
        </TableCell>
        <TableCell>{transaction.tokenSymbol}</TableCell>
        <TableCell align="right">{transaction.amount}</TableCell>
        <TableCell align="right">{formatCurrency(transaction.price)}</TableCell>
        <TableCell align="right">{formatCurrency(transaction.totalValue)}</TableCell>
        <TableCell>
          <Chip
            label={transaction.status}
            color={getStatusColor(transaction.status) as any}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Détails de la Transaction
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Hash de Transaction
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                          href={`https://solscan.io/tx/${transaction.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {`${transaction.hash.substring(0, 8)}...${transaction.hash.substring(
                            transaction.hash.length - 8
                          )}`}
                        </Link>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(transaction.hash)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Informations Gas
                      </Typography>
                      <Typography variant="body2">
                        Gas Utilisé: {transaction.gasUsed || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        Prix Gas: {transaction.gasPrice ? `${transaction.gasPrice} Gwei` : 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {transaction.route && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Route de Trading
                        </Typography>
                        <Typography variant="body2">
                          {transaction.route.join(' → ')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

interface StatsCardProps {
  stats: TransactionStats;
}

const StatsCard = ({ stats }: StatsCardProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(
      value / 100
    );

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Typography color="text.secondary" gutterBottom>
              Total Transactions
            </Typography>
            <Typography variant="h6">{stats.totalTransactions}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Typography color="text.secondary" gutterBottom>
              Taux de Succès
            </Typography>
            <Typography variant="h6">{formatPercent(stats.successRate)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Typography color="text.secondary" gutterBottom>
              Slippage Moyen
            </Typography>
            <Typography variant="h6">{formatPercent(stats.averageSlippage)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Typography color="text.secondary" gutterBottom>
              Volume Total
            </Typography>
            <Typography variant="h6">{formatCurrency(stats.totalVolume)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Typography color="text.secondary" gutterBottom>
              Profit/Perte
            </Typography>
            <Typography
              variant="h6"
              color={stats.profitLoss >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(stats.profitLoss)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export const TransactionList = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    status: 'all',
  });
  const [data, setData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 0,
    pageSize: ROWS_PER_PAGE_OPTIONS[0],
    stats: {
      totalTransactions: 0,
      successRate: 0,
      averageSlippage: 0,
      totalVolume: 0,
      profitLoss: 0,
    },
  });

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(rowsPerPage),
        ...filters,
      });

      const response = await fetch(`/api/v1/transactions/history?${queryParams}`);
      const result: PaginatedTransactions = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, rowsPerPage, filters]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Historique des Transactions
      </Typography>

      <StatsCard stats={data.stats} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="Date Début"
            value={filters.startDate ? new Date(filters.startDate) : null}
            onChange={(date) =>
              setFilters((prev) => ({
                ...prev,
                startDate: date?.toISOString(),
              }))
            }
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DatePicker
            label="Date Fin"
            value={filters.endDate ? new Date(filters.endDate) : null}
            onChange={(date) =>
              setFilters((prev) => ({
                ...prev,
                endDate: date?.toISOString(),
              }))
            }
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="Type"
            value={filters.type || 'all'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: e.target.value as 'buy' | 'sell' | 'all',
              }))
            }
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="buy">Achat</MenuItem>
            <MenuItem value="sell">Vente</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="Statut"
            value={filters.status || 'all'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as 'completed' | 'pending' | 'failed' | 'all',
              }))
            }
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="completed">Complété</MenuItem>
            <MenuItem value="pending">En Cours</MenuItem>
            <MenuItem value="failed">Échoué</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Token</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell align="right">Prix</TableCell>
              <TableCell align="right">Valeur Totale</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        component="div"
        count={data.total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Lignes par page"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
        }
      />
    </Paper>
  );
}; 