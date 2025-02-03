import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { Layout } from './components/layout/Layout';

// Pages temporaires pour la navigation
const DashboardPage = () => <div>Dashboard</div>;
const TradingPage = () => <div>Trading</div>;
const HistoryPage = () => <div>Historique</div>;
const AnalyticsPage = () => <div>Analyse</div>;
const SecurityPage = () => <div>Sécurité</div>;
const SettingsPage = () => <div>Paramètres</div>;

function App() {
  return (
    <Router>
      <ThemeProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </Router>
  );
}

export default App; 