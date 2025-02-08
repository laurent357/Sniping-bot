import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Token } from '../../services/api';

interface TokenOverviewProps {
  tokens: Token[];
}

const RiskLevelChip: React.FC<{ risk: string }> = ({ risk }) => {
  let color: 'success' | 'warning' | 'error' = 'success';
  let label = 'Faible';

  switch (risk.toUpperCase()) {
    case 'HIGH':
      color = 'error';
      label = 'Élevé';
      break;
    case 'MEDIUM':
      color = 'warning';
      label = 'Moyen';
      break;
    default:
      color = 'success';
      label = 'Faible';
  }

  return <Chip label={label} color={color} size="small" />;
};

export const TokenOverview: React.FC<TokenOverviewProps> = ({ tokens }) => {
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
    <Paper sx={{ p: 2 }}>
      <Box mb={2}>
        <Typography variant="h6" component="div">
          Nouveaux Tokens Détectés
        </Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Token</TableCell>
              <TableCell align="right">Prix</TableCell>
              <TableCell align="right">Liquidité</TableCell>
              <TableCell align="right">Volume (24h)</TableCell>
              <TableCell align="right">Variation Prix</TableCell>
              <TableCell align="right">Profit Estimé</TableCell>
              <TableCell align="center">Niveau de Risque</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map(token => (
              <TableRow key={token.address}>
                <TableCell>
                  <Typography variant="body2">{token.symbol}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {token.address.slice(0, 8)}...
                    {token.address.slice(-6)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatCurrency(token.price)}</TableCell>
                <TableCell align="right">{formatCurrency(token.liquidity_usd)}</TableCell>
                <TableCell align="right">{formatCurrency(token.volume_24h)}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: token.price_change_1h >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatPercent(token.price_change_1h)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: token.estimated_profit >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatPercent(token.estimated_profit)}
                </TableCell>
                <TableCell align="center">
                  <RiskLevelChip risk={token.risk_level} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
