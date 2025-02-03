import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

interface Token {
  address: string;
  symbol: string;
  balance?: number;
}

interface TradingFormProps {
  availableTokens: Token[];
  onSubmit: (values: TradingFormValues) => Promise<void>;
  isLoading?: boolean;
}

export interface TradingFormValues {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippage: number;
}

export const TradingForm: React.FC<TradingFormProps> = ({
  availableTokens,
  onSubmit,
  isLoading = false,
}) => {
  const [values, setValues] = useState<TradingFormValues>({
    inputToken: '',
    outputToken: '',
    amount: 0,
    slippage: 1.0,
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof TradingFormValues) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    if (!values.inputToken || !values.outputToken) {
      setError('Veuillez sélectionner les tokens');
      return;
    }
    
    if (values.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }
    
    if (values.slippage <= 0 || values.slippage > 100) {
      setError('Le slippage doit être entre 0 et 100%');
      return;
    }
    
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Nouvelle Transaction
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Token d'entrée</InputLabel>
                <Select
                  value={values.inputToken}
                  onChange={handleChange('inputToken')}
                  label="Token d'entrée"
                >
                  {availableTokens.map((token) => (
                    <MenuItem key={token.address} value={token.address}>
                      {token.symbol}
                      {token.balance !== undefined && ` (${token.balance})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Token de sortie</InputLabel>
                <Select
                  value={values.outputToken}
                  onChange={handleChange('outputToken')}
                  label="Token de sortie"
                >
                  {availableTokens
                    .filter((token) => token.address !== values.inputToken)
                    .map((token) => (
                      <MenuItem key={token.address} value={token.address}>
                        {token.symbol}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Montant"
                type="number"
                value={values.amount}
                onChange={handleChange('amount')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Slippage maximum"
                type="number"
                value={values.slippage}
                onChange={handleChange('slippage')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <LoadingButton
                type="submit"
                variant="contained"
                fullWidth
                loading={isLoading}
                size="large"
              >
                Exécuter la transaction
              </LoadingButton>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
}; 