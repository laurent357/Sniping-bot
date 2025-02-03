import { useState, useEffect } from 'react';
import { Grid, Container } from '@mui/material';
import { StatsOverview } from '../components/dashboard/StatsOverview';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { TradingStats, PerformanceData, Transaction } from '../types/dashboard';

// Données de test (à remplacer par des données réelles de l'API)
const mockStats: TradingStats = {
  totalVolume: 1250000,
  dailyVolume: 75000,
  successRate: 85.5,
  profitLoss: 12500,
  activePositions: 3,
  avgSlippage: 0.15,
};

const mockPerformanceData: PerformanceData[] = Array.from({ length: 30 }, (_, i) => ({
  timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  value: 100000 + Math.random() * 50000,
  type: 'profit',
}));

const mockTransactions: Transaction[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    type: 'buy',
    tokenSymbol: 'ETH',
    amount: 1.5,
    price: 2500,
    status: 'completed',
    hash: '0x1234567890abcdef1234567890abcdef12345678',
  },
  // Ajoutez plus de transactions de test ici
];

export const DashboardPage = () => {
  const [stats, setStats] = useState<TradingStats>(mockStats);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>(mockPerformanceData);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);

  useEffect(() => {
    // TODO: Remplacer par des appels API réels
    // fetchStats().then(setStats);
    // fetchPerformanceData().then(setPerformanceData);
    // fetchTransactions().then(setTransactions);
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <StatsOverview stats={stats} />
        </Grid>
        <Grid item xs={12}>
          <PerformanceChart
            data={performanceData}
            title="Performance du Trading"
          />
        </Grid>
        <Grid item xs={12}>
          <RecentTransactions transactions={transactions} />
        </Grid>
      </Grid>
    </Container>
  );
}; 