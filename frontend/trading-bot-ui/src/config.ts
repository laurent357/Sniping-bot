export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.20:5000';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://192.168.1.20:5000/ws';
export const REFRESH_INTERVAL = 30000; // 30 secondes

export const API_ENDPOINTS = {
  NEW_TOKENS: '/api/v1/tokens/new',
  FILTERS_CONFIG: '/api/v1/filters/config',
  TRANSACTIONS_HISTORY: '/api/v1/transactions/history',
  JUPITER_STATS: '/api/v1/stats/jupiter',
  EXECUTE_TRANSACTION: '/api/v1/transactions/execute',
  SECURITY_CHECK: '/api/v1/security/check',
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
    'X-Requested-With': 'XMLHttpRequest'
  },
  baseURL: process.env.REACT_APP_API_URL || 'http://192.168.1.20:5000'
};
