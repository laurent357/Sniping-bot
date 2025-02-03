// Configuration des optimisations de performance

// Configuration du throttling pour les mises à jour de l'orderbook
export const ORDERBOOK_UPDATE_THROTTLE = 100; // ms

// Configuration du debouncing pour les recherches
export const SEARCH_DEBOUNCE_DELAY = 300; // ms

// Configuration de la pagination
export const PAGINATION_CONFIG = {
  defaultPageSize: 50,
  maxPageSize: 100,
  preloadPages: 1,
};

// Configuration du cache
export const CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxItems: 1000,
  staleWhileRevalidate: true,
};

// Configuration du lazy loading
export const LAZY_LOADING_CONFIG = {
  threshold: 0.5, // 50% de visibilité pour déclencher le chargement
  rootMargin: '50px',
};

// Configuration de la compression des données
export const COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 1024, // Compression si > 1KB
};

// Configuration du pooling des WebSocket
export const WS_POOLING_CONFIG = {
  maxConnections: 3,
  reconnectInterval: 1000,
  maxRetries: 5,
};

// Configuration de la mise en cache des images
export const IMAGE_CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 heures
  maxItems: 100,
};

// Configuration du virtual scrolling
export const VIRTUAL_SCROLL_CONFIG = {
  itemHeight: 50, // hauteur en pixels de chaque élément
  overscan: 5, // nombre d'éléments à précharger avant/après la zone visible
  threshold: 250, // pixels avant la fin pour déclencher le chargement
};

// Configuration des métriques de performance
export const PERFORMANCE_METRICS = {
  // Seuils de performance acceptables
  thresholds: {
    fcp: 1000, // First Contentful Paint (ms)
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100, // First Input Delay (ms)
    cls: 0.1, // Cumulative Layout Shift
    ttfb: 600, // Time to First Byte (ms)
    wsMessageDelay: 50, // Délai maximum entre les messages WebSocket (ms)
  },
  // Métriques personnalisées
  custom: {
    orderBookUpdateTime: 16.67, // temps max pour mise à jour (60 FPS)
    tradeExecutionTime: 1000, // temps max pour exécution d'un trade
    chartRenderTime: 50, // temps max pour rendu d'un graphique
  },
};

// Configuration du prefetching
export const PREFETCH_CONFIG = {
  // Routes à précharger
  routes: ['/trading', '/dashboard', '/history'],
  // Données à précharger
  data: ['tokenList', 'userBalance', 'recentTrades'],
  // Délai avant préchargement
  delay: 100,
};

// Configuration de la gestion de la mémoire
export const MEMORY_CONFIG = {
  // Seuils de nettoyage du cache
  cleanupThresholds: {
    memory: 50 * 1024 * 1024, // 50MB
    items: 1000,
  },
  // Intervalle de vérification
  checkInterval: 60 * 1000, // 1 minute
};

// Configuration des timeouts
export const TIMEOUT_CONFIG = {
  api: 5000, // ms
  websocket: 10000, // ms
  animation: 300, // ms
  transition: 200, // ms
};
