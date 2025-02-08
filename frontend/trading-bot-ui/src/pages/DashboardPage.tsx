import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { StatsOverview } from '../components/dashboard/StatsOverview';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { TokenOverview } from '../components/dashboard/TokenOverview';
import { api } from '../services/api';
import { Token, Transaction, JupiterStats } from '../services/api';

export const DashboardPage: React.FC = () => {
  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jupiterStats, setJupiterStats] = useState<JupiterStats | null>(null);
  const [newTokens, setNewTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeOrders, setActiveOrders] = useState<Transaction[]>([]);

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Charge toutes les données en parallèle
        const [statsResponse, tokensResponse, transactionsResponse, ordersResponse] =
          await Promise.all([
            api.getJupiterStats(),
            api.getNewTokens({ min_profit: 2 }), // 2% minimum de profit
            api.getTransactionHistory({ limit: 10 }),
            api.getActiveOrders(),
          ]);

        setJupiterStats(statsResponse);
        setNewTokens(tokensResponse);
        setTransactions(transactionsResponse);
        setActiveOrders(ordersResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Rafraîchit les données toutes les 30 secondes
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcule les statistiques pour StatsOverview
  const getStats = () => {
    if (!jupiterStats) return null;

    const successfulTxs = transactions.filter(tx => tx.status === 'completed');
    const successRate = (successfulTxs.length / (transactions.length || 1)) * 100;

    const totalProfit = successfulTxs.reduce((sum, tx) => sum + tx.estimated_profit, 0);

    return {
      totalVolume: jupiterStats.total_volume_24h_usd,
      dailyVolume: jupiterStats.total_volume_24h_usd,
      successRate: successRate,
      profitLoss: totalProfit,
      activePositions: activeOrders.length,
      avgSlippage: jupiterStats.average_slippage,
    };
  };

  // Calcule les données de performance pour le graphique
  const getPerformanceData = () => {
    // Trie les transactions par date
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calcule le profit cumulé
    let cumulativeProfit = 0;
    return sortedTxs.map(tx => {
      cumulativeProfit += tx.estimated_profit;
      return {
        timestamp: new Date(tx.timestamp).toLocaleTimeString(),
        profit: cumulativeProfit,
      };
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const stats = getStats();
  if (!stats) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Impossible de charger les statistiques</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Vue d'ensemble des statistiques */}
        <Grid item xs={12}>
          <StatsOverview stats={stats} />
        </Grid>

        {/* Nouveaux tokens détectés */}
        <Grid item xs={12}>
          <TokenOverview tokens={newTokens} />
        </Grid>

        {/* Graphique de performance */}
        <Grid item xs={12}>
          <PerformanceChart data={getPerformanceData()} title="Performance du Trading" />
        </Grid>

        {/* Transactions récentes */}
        <Grid item xs={12}>
          <RecentTransactions transactions={transactions} />
        </Grid>
      </Grid>
    </Container>
  );
};
