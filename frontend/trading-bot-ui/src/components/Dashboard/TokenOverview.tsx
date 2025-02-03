import React from 'react';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface TokenStats {
  address: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
}

interface TokenOverviewProps {
  tokens: TokenStats[];
  isLoading?: boolean;
}

export const TokenOverview: React.FC<TokenOverviewProps> = ({ tokens, isLoading = false }) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Chargement des tokens...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Aperçu des Tokens
        </Typography>
        <Grid container spacing={2}>
          {tokens.map(token => (
            <Grid item xs={12} sm={6} md={4} key={token.address}>
              <Box
                sx={{
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {token.symbol}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Prix
                    </Typography>
                    <Typography variant="body1">${token.price.toFixed(6)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      24h
                    </Typography>
                    <Typography
                      variant="body1"
                      color={token.change24h >= 0 ? 'success.main' : 'error.main'}
                    >
                      {token.change24h >= 0 ? '+' : ''}
                      {token.change24h.toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Volume 24h
                    </Typography>
                    <Typography variant="body1">${(token.volume24h / 1000).toFixed(1)}k</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Liquidité
                    </Typography>
                    <Typography variant="body1">${(token.liquidity / 1000).toFixed(1)}k</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
