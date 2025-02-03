import { Grid, Paper, Typography, Box } from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  ShowChart,
  Speed,
  AccountBalance,
  Timeline,
} from '@mui/icons-material';
import { TradingStats } from '../../types/dashboard';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Paper
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      bgcolor: 'background.paper',
      borderRadius: 2,
    }}
  >
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: `${color}22`,
        color: color,
        display: 'flex',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Box>
  </Paper>
);

interface StatsOverviewProps {
  stats: TradingStats;
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(
      value / 100
    );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Volume Total"
          value={formatCurrency(stats.totalVolume)}
          icon={<AttachMoney />}
          color="#2196f3"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Volume Journalier"
          value={formatCurrency(stats.dailyVolume)}
          icon={<TrendingUp />}
          color="#00e676"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Taux de Succès"
          value={formatPercent(stats.successRate)}
          icon={<ShowChart />}
          color="#ff9100"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Profit/Perte"
          value={formatCurrency(stats.profitLoss)}
          icon={<Timeline />}
          color={stats.profitLoss >= 0 ? '#00e676' : '#ff1744'}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Positions Actives"
          value={stats.activePositions.toString()}
          icon={<AccountBalance />}
          color="#ba68c8"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Slippage Moyen"
          value={formatPercent(stats.avgSlippage)}
          icon={<Speed />}
          color="#f50057"
        />
      </Grid>
    </Grid>
  );
};
