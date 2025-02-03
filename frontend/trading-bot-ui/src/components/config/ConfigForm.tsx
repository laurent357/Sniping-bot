import React from 'react';
import { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { BotConfig, ConfigSection } from '../../types/config';

const defaultConfig: BotConfig = {
  filters: {
    minLiquidity: 10000,
    maxSlippage: 2,
    minVolume24h: 50000,
    maxPriceImpact: 3,
    blacklistedTokens: [],
  },
  tradingLimits: {
    maxTransactionAmount: 1000,
    dailyTradingLimit: 5000,
    stopLoss: 10,
    takeProfit: 20,
    maxActivePositions: 3,
  },
  security: {
    honeypotCheck: true,
    simulateBeforeExecution: true,
    maxGasPrice: 100,
    minConfirmations: 2,
  },
  enabled: false,
};

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
    {value === index && children}
  </Box>
);

export const ConfigForm = () => {
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState(0);
  const [newToken, setNewToken] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange =
    (section: ConfigSection, field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
      setConfig(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    };

  const handleAddToken = () => {
    if (newToken && !config.filters.blacklistedTokens.includes(newToken)) {
      setConfig(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
          blacklistedTokens: [...prev.filters.blacklistedTokens, newToken],
        },
      }));
      setNewToken('');
    }
  };

  const handleRemoveToken = (token: string) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        blacklistedTokens: prev.filters.blacklistedTokens.filter(t => t !== token),
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: Envoyer la configuration au backend
      await fetch('/api/v1/filters/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setShowSuccess(true);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Filtres" />
          <Tab label="Limites Trading" />
          <Tab label="Sécurité" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Liquidité Minimale (USD)"
              type="number"
              value={config.filters.minLiquidity}
              onChange={handleChange('filters', 'minLiquidity')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Slippage Maximum (%)"
              type="number"
              value={config.filters.maxSlippage}
              onChange={handleChange('filters', 'maxSlippage')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Volume 24h Minimum (USD)"
              type="number"
              value={config.filters.minVolume24h}
              onChange={handleChange('filters', 'minVolume24h')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Impact Prix Maximum (%)"
              type="number"
              value={config.filters.maxPriceImpact}
              onChange={handleChange('filters', 'maxPriceImpact')}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tokens Blacklistés
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  value={newToken}
                  onChange={e => setNewToken(e.target.value)}
                  placeholder="Adresse du token"
                  sx={{ flexGrow: 1 }}
                />
                <Button variant="contained" onClick={handleAddToken} startIcon={<AddIcon />}>
                  Ajouter
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {config.filters.blacklistedTokens.map(token => (
                  <Chip
                    key={token}
                    label={token}
                    onDelete={() => handleRemoveToken(token)}
                    deleteIcon={<CloseIcon />}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Montant Maximum par Transaction (USD)"
              type="number"
              value={config.tradingLimits.maxTransactionAmount}
              onChange={handleChange('tradingLimits', 'maxTransactionAmount')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Limite Trading Journalière (USD)"
              type="number"
              value={config.tradingLimits.dailyTradingLimit}
              onChange={handleChange('tradingLimits', 'dailyTradingLimit')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stop Loss (%)"
              type="number"
              value={config.tradingLimits.stopLoss}
              onChange={handleChange('tradingLimits', 'stopLoss')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Take Profit (%)"
              type="number"
              value={config.tradingLimits.takeProfit}
              onChange={handleChange('tradingLimits', 'takeProfit')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Positions Actives Maximum"
              type="number"
              value={config.tradingLimits.maxActivePositions}
              onChange={handleChange('tradingLimits', 'maxActivePositions')}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.security.honeypotCheck}
                  onChange={handleChange('security', 'honeypotCheck')}
                />
              }
              label="Vérification Honeypot"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.security.simulateBeforeExecution}
                  onChange={handleChange('security', 'simulateBeforeExecution')}
                />
              }
              label="Simuler avant exécution"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Prix Gas Maximum (Gwei)"
              type="number"
              value={config.security.maxGasPrice}
              onChange={handleChange('security', 'maxGasPrice')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Confirmations Minimum"
              type="number"
              value={config.security.minConfirmations}
              onChange={handleChange('security', 'minConfirmations')}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.enabled}
              onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
          }
          label="Activer le Bot"
        />
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Sauvegarder la Configuration
        </Button>
      </Box>

      <Snackbar open={showSuccess} autoHideDuration={6000} onClose={() => setShowSuccess(false)}>
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          Configuration sauvegardée avec succès !
        </Alert>
      </Snackbar>
    </Paper>
  );
};
