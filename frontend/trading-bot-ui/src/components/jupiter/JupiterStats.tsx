import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { JupiterStatistics, PoolMetrics, TokenPair } from '../../types/jupiter';
import { useWebSocket } from '../../hooks/useWebSocket';

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  suffix = '',
  color = 'primary.main',
}) => (
  <Card>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="div" sx={{ color }}>
        {value}
        {suffix && (
          <Typography component="span" variant="h6" sx={{ ml: 1 }}>
            {suffix}
          </Typography>
        )}
      </Typography>
    </CardContent>
  </Card>
);

const PoolsTable = ({ pools }: { pools: PoolMetrics[] }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(
      value / 100
    );

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Paire</TableCell>
            <TableCell align="right">Liquidité</TableCell>
            <TableCell align="right">Volume 24h</TableCell>
            <TableCell align="right">Frais 24h</TableCell>
            <TableCell align="right">APY</TableCell>
            <TableCell align="right">Variation Prix</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pools.map(pool => (
            <TableRow key={pool.poolAddress}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pool.symbolA}/{pool.symbolB}
                </Box>
              </TableCell>
              <TableCell align="right">{formatCurrency(pool.liquidity)}</TableCell>
              <TableCell align="right">{formatCurrency(pool.volume24h)}</TableCell>
              <TableCell align="right">{formatCurrency(pool.fees24h)}</TableCell>
              <TableCell align="right">{formatPercent(pool.apy)}</TableCell>
              <TableCell align="right">
                <Chip
                  label={formatPercent(pool.priceChange24h)}
                  color={pool.priceChange24h >= 0 ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PairsTable = ({ pairs }: { pairs: TokenPair[] }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(
      value / 100
    );

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Paire</TableCell>
            <TableCell align="right">Volume 24h</TableCell>
            <TableCell align="right">Trades 24h</TableCell>
            <TableCell align="right">Slippage Moyen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pairs.map(pair => (
            <TableRow key={`${pair.tokenA}-${pair.tokenB}`}>
              <TableCell>
                {pair.symbolA}/{pair.symbolB}
              </TableCell>
              <TableCell align="right">{formatCurrency(pair.volume24h)}</TableCell>
              <TableCell align="right">{pair.trades24h}</TableCell>
              <TableCell align="right">{formatPercent(pair.averageSlippage)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const VolumeChart = ({ data }: { data: { timestamp: string; volume: number }[] }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} width={80} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Volume']}
            labelFormatter={formatDate}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorVolume)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const JupiterStats = () => {
  const [stats, setStats] = useState<JupiterStatistics>({
    totalPools: 0,
    totalVolume24h: 0,
    totalTrades24h: 0,
    averageSlippage24h: 0,
    topPools: [],
    volumeHistory: [],
    topPairs: [],
  });
  const [showError, setShowError] = useState(false);

  const { isConnected } = useWebSocket<JupiterStatistics>({
    type: 'stats_update',
    onMessage: data => {
      setStats(data);
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(
      value / 100
    );

  useEffect(() => {
    const fetchInitialStats = async () => {
      try {
        const response = await fetch('/api/v1/stats/jupiter');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques Jupiter:', error);
        setShowError(true);
      }
    };

    fetchInitialStats();
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Statistiques Jupiter</Typography>
        <Chip
          label={isConnected ? 'Connecté' : 'Déconnecté'}
          color={isConnected ? 'success' : 'error'}
          size="small"
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pools Totaux" value={stats.totalPools.toString()} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Volume 24h" value={formatCurrency(stats.totalVolume24h)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Trades 24h" value={stats.totalTrades24h.toString()} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Slippage Moyen" value={formatPercent(stats.averageSlippage24h)} />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Volume de Trading
      </Typography>
      <Box sx={{ mb: 4 }}>
        <VolumeChart data={stats.volumeHistory} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Top Pools
      </Typography>
      <Box sx={{ mb: 4 }}>
        <PoolsTable pools={stats.topPools} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Paires les Plus Tradées
      </Typography>
      <Box>
        <PairsTable pairs={stats.topPairs} />
      </Box>

      <Snackbar open={showError} autoHideDuration={6000} onClose={() => setShowError(false)}>
        <Alert severity="error" onClose={() => setShowError(false)}>
          Erreur lors de la récupération des statistiques
        </Alert>
      </Snackbar>
    </Paper>
  );
};
