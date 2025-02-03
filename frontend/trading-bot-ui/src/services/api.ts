import axios, { AxiosInstance } from 'axios';

interface ApiConfig {
  baseURL: string;
  timeout?: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  liquidity_usd: number;
  created_at: string;
  risk_score: number;
}

export interface Pool {
  id: string;
  dex: string;
  token_a: string;
  token_b: string;
  liquidity_usd: number;
  volume_24h: number;
}

export interface Trade {
  id: string;
  input_token: string;
  output_token: string;
  amount: number;
  execution_price: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface TokenAnalysis {
  token_info: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  risk_analysis: {
    score: number;
    factors: string[];
    warnings: string[];
  };
  market_data: {
    price_usd: number;
    volume_24h: number;
    liquidity_usd: number;
    holders: number;
  };
}

class Api {
  private client: AxiosInstance;

  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token JWT
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Tokens
  async getNewTokens(params?: {
    min_liquidity?: number;
    time_range?: '1h' | '24h' | '7d';
  }): Promise<Token[]> {
    const { data } = await this.client.get('/tokens/new', { params });
    return data.tokens;
  }

  // Pools
  async getActivePools(params?: {
    dex?: string;
    min_volume?: number;
  }): Promise<Pool[]> {
    const { data } = await this.client.get('/pools/active', { params });
    return data.pools;
  }

  // Trading
  async executeTrade(params: {
    input_token: string;
    output_token: string;
    amount: number;
    slippage: number;
  }): Promise<{ transaction_id: string }> {
    const { data } = await this.client.post('/trades/execute', params);
    return data;
  }

  async getTradeHistory(params?: {
    start_date?: string;
    end_date?: string;
    status?: 'completed' | 'pending' | 'failed';
  }): Promise<Trade[]> {
    const { data } = await this.client.get('/trades/history', { params });
    return data.trades;
  }

  // Analysis
  async getTokenAnalysis(tokenAddress: string): Promise<TokenAnalysis> {
    const { data } = await this.client.get(`/analysis/token/${tokenAddress}`);
    return data;
  }

  // Authentication
  async login(username: string, password: string): Promise<string> {
    const { data } = await this.client.post('/auth/login', {
      username,
      password,
    });
    localStorage.setItem('jwt_token', data.token);
    return data.token;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('jwt_token');
  }

  // Gestion des erreurs
  private handleError(error: any): never {
    if (error.response) {
      // Erreur serveur avec réponse
      throw new Error(
        error.response.data.message || 'Une erreur est survenue'
      );
    } else if (error.request) {
      // Pas de réponse du serveur
      throw new Error('Impossible de contacter le serveur');
    } else {
      // Erreur de configuration de la requête
      throw new Error('Erreur de configuration de la requête');
    }
  }
}

// Export une instance unique
export const api = new Api({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
}); 