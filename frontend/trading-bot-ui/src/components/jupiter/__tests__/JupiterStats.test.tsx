import { render, screen, waitFor } from '@testing-library/react';
import { JupiterStats } from '../JupiterStats';
import { webSocketService } from '../../../services/websocket';

// Mock du service WebSocket
jest.mock('../../../services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    subscribe: jest.fn(() => () => {}),
    onConnectionChange: jest.fn(() => () => {}),
  },
}));

describe('JupiterStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche le titre et l\'indicateur de connexion', () => {
    render(<JupiterStats />);
    
    expect(screen.getByText('Statistiques Jupiter')).toBeInTheDocument();
    expect(screen.getByText('Déconnecté')).toBeInTheDocument();
  });

  it('charge et affiche les statistiques initiales', async () => {
    render(<JupiterStats />);

    // Attendre que les données soient chargées
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // totalPools
      expect(screen.getByText('5 000')).toBeInTheDocument(); // totalTrades24h
    });

    // Vérifier les sections principales
    expect(screen.getByText('Volume de Trading')).toBeInTheDocument();
    expect(screen.getByText('Top Pools')).toBeInTheDocument();
    expect(screen.getByText('Paires les Plus Tradées')).toBeInTheDocument();
  });

  it('se connecte au WebSocket et gère les mises à jour', () => {
    render(<JupiterStats />);

    expect(webSocketService.connect).toHaveBeenCalled();
    expect(webSocketService.subscribe).toHaveBeenCalledWith(
      'stats_update',
      expect.any(Function)
    );
    expect(webSocketService.onConnectionChange).toHaveBeenCalled();
  });

  it('affiche une erreur en cas d\'échec du chargement', async () => {
    // Mock d'une erreur de fetch
    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Erreur API'));
    
    render(<JupiterStats />);

    await waitFor(() => {
      expect(screen.getByText('Erreur lors de la récupération des statistiques')).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  it('formate correctement les valeurs numériques', async () => {
    render(<JupiterStats />);

    await waitFor(() => {
      // Vérifier le formatage des devises
      expect(screen.getByText('1 500 000,00 $')).toBeInTheDocument(); // totalVolume24h
      
      // Vérifier le formatage des pourcentages
      expect(screen.getByText('0,15 %')).toBeInTheDocument(); // averageSlippage24h
    });
  });

  it('affiche correctement les données des pools', async () => {
    render(<JupiterStats />);

    await waitFor(() => {
      // Vérifier les données du premier pool
      expect(screen.getByText('SOL/USDC')).toBeInTheDocument();
      expect(screen.getByText('1 000 000,00 $')).toBeInTheDocument(); // liquidity
      expect(screen.getByText('25,50 %')).toBeInTheDocument(); // apy
    });
  });
}); 