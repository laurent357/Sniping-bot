export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

export const API_ENDPOINTS = {
  NEW_TOKENS: '/tokens/new',
  FILTERS_CONFIG: '/filters/config',
  TRANSACTIONS_HISTORY: '/transactions/history',
  JUPITER_STATS: '/stats/jupiter',
  EXECUTE_TRANSACTION: '/transactions/execute',
  SECURITY_CHECK: '/security/check',
};

export const WS_EVENTS = {
  PRICE_UPDATE: 'PRICE_UPDATE',
  TRANSACTION_UPDATE: 'TRANSACTION_UPDATE',
  ERROR: 'ERROR',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
};

export const API_CONFIG = {
  timeout: 5000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
  },
}; 