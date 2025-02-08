import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PercentIcon from '@mui/icons-material/Percent';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SpeedIcon from '@mui/icons-material/Speed';

interface StatsOverviewProps {
  stats: {
    totalVolume: number;
    dailyVolume: number;
    successRate: number;
    profitLoss: number;
    activePositions: number;
    avgSlippage: number;
  };
}

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, icon, color = 'primary.main' }) => (
  <Paper sx={{ p: 2 }}>
    <Box display="flex" alignItems="center">
      <Box
        sx={{
          backgroundColor: `${color}15`,
          borderRadius: '50%',
          p: 1,
          mr: 2,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          sx: { color },
        })}
      </Box>
      <Box flexGrow={1}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h6" component="div">
          {value}
        </Typography>
      </Box>
    </Box>
  </Paper>
);

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Volume Total (24h)"
          value={formatCurrency(stats.totalVolume)}
          icon={<TrendingUpIcon />}
          color="#2196f3"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Volume Quotidien"
          value={formatCurrency(stats.dailyVolume)}
          icon={<AccountBalanceWalletIcon />}
          color="#4caf50"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Taux de Réussite"
          value={formatPercent(stats.successRate)}
          icon={<ShowChartIcon />}
          color="#ff9800"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Profit/Perte"
          value={formatCurrency(stats.profitLoss)}
          icon={<PercentIcon />}
          color={stats.profitLoss >= 0 ? '#4caf50' : '#f44336'}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Positions Actives"
          value={stats.activePositions.toString()}
          icon={<SwapHorizIcon />}
          color="#9c27b0"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Slippage Moyen"
          value={formatPercent(stats.avgSlippage)}
          icon={<SpeedIcon />}
          color="#795548"
        />
      </Grid>
    </Grid>
  );
};
