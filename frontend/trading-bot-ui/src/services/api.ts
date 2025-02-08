import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, API_CONFIG } from '../config';

// Types
export interface Token {
  address: string;
  symbol: string;
  name: string;
  price: number;
  liquidity_usd: number;
  volume_24h: number;
  price_change_1h: number;
  estimated_profit: number;
  risk_level: string;
  timestamp: string;
}

export interface Pool {
  id: string;
  token_address: string;
  liquidity_usd: number;
  volume_24h: number;
  price_usd: number;
  price_change_1h: number;
}

export interface Transaction {
  hash: string;
  timestamp: string;
  token_symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  estimated_profit: number;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
}

export interface JupiterStats {
  total_volume_24h_usd: number;
  average_slippage: number;
  total_pools: number;
  active_pools: number;
  total_tokens: number;
  new_tokens_24h: number;
}

export interface Strategy {
  name: string;
  description: string;
  min_profit: number;
  max_loss: number;
  position_size: number;
  max_slippage: number;
  enabled: boolean;
  rules: Array<{
    metric: string;
    operator: string;
    value: number;
    priority: number;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
}

class Api {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      ...API_CONFIG,
      baseURL: API_CONFIG.baseURL || API_BASE_URL,
    });

    // Intercepteur pour gérer les erreurs
    this.client.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response) {
          // Erreur avec réponse du serveur
          throw {
            message: error.response.data.message || 'Une erreur est survenue',
            code: error.response.status,
          };
        } else if (error.request) {
          // Erreur sans réponse du serveur
          throw {
            message: 'Impossible de contacter le serveur',
            code: 'NETWORK_ERROR',
          };
        } else {
          // Erreur lors de la configuration de la requête
          throw {
            message: error.message,
            code: 'REQUEST_ERROR',
          };
        }
      }
    );
  }

  // Tokens
  async getNewTokens(params: { min_profit?: number } = {}): Promise<Token[]> {
    return this.client.get(API_ENDPOINTS.NEW_TOKENS, { params });
  }

  async getTokenInfo(address: string): Promise<Token> {
    return this.client.get(`/api/v1/tokens/${address}`);
  }

  // Pools
  async getPoolInfo(poolId: string): Promise<Pool> {
    return this.client.get(`/api/v1/pools/${poolId}`);
  }

  // Transactions
  async getTransactionHistory(
    params: {
      limit?: number;
      status?: string;
    } = {}
  ): Promise<Transaction[]> {
    return this.client.get(API_ENDPOINTS.TRANSACTIONS_HISTORY, { params });
  }

  async getActiveOrders(): Promise<Transaction[]> {
    return this.client.get('/api/v1/transactions/active');
  }

  async executeTransaction(opportunity: Token): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    const { data } = await this.client.post(API_ENDPOINTS.EXECUTE_TRANSACTION, opportunity);
    return data;
  }

  // Statistiques
  async getJupiterStats(): Promise<JupiterStats> {
    return this.client.get(API_ENDPOINTS.JUPITER_STATS);
  }

  // Stratégies
  async getStrategies(): Promise<Strategy[]> {
    return this.client.get('/api/v1/strategies');
  }

  async updateStrategy(strategy: Strategy): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const { data } = await this.client.post('/api/v1/strategies', strategy);
    return data;
  }
}

// Export une instance unique
export const api = new Api();
