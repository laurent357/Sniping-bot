import { useEffect, useCallback, useRef } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { PREFETCH_CONFIG } from '../config/performance';

interface PrefetchOptions {
  routes?: string[];
  data?: string[];
  delay?: number;
}

interface DataFetcher {
  [key: string]: () => Promise<any>;
}

export const usePrefetch = (
  dataFetchers: DataFetcher,
  options: PrefetchOptions = {}
) => {
  const location = useLocation();
  const prefetchedRef = useRef<Set<string>>(new Set());
  
  const {
    routes = PREFETCH_CONFIG.routes,
    data = PREFETCH_CONFIG.data,
    delay = PREFETCH_CONFIG.delay
  } = options;

  const shouldPrefetch = useCallback((path: string) => {
    // Vérifie si le chemin correspond à une des routes à précharger
    return routes.some(route => matchPath(route, path));
  }, [routes]);

  const prefetchData = useCallback(async (dataKey: string) => {
    // Si les données ont déjà été préchargées, on ignore
    if (prefetchedRef.current.has(dataKey)) {
      return;
    }

    try {
      const fetcher = dataFetchers[dataKey];
      if (!fetcher) {
        console.warn(`No fetcher found for data key: ${dataKey}`);
        return;
      }

      // Marquer comme préchargé avant de commencer
      prefetchedRef.current.add(dataKey);

      // Mesurer le temps de préchargement
      const startTime = performance.now();
      
      await fetcher();
      
      const endTime = performance.now();
      console.debug(`Prefetched ${dataKey} in ${endTime - startTime}ms`);
    } catch (error) {
      console.error(`Error prefetching ${dataKey}:`, error);
      // Retirer de la liste des préchargés en cas d'erreur
      prefetchedRef.current.delete(dataKey);
    }
  }, [dataFetchers]);

  const prefetchRoute = useCallback(async (path: string) => {
    if (!shouldPrefetch(path)) {
      return;
    }

    // Précharger les données associées à la route
    const relevantData = data.filter(dataKey => {
      const fetcher = dataFetchers[dataKey];
      return typeof fetcher === 'function' && !prefetchedRef.current.has(dataKey);
    });

    if (relevantData.length === 0) {
      return;
    }

    // Utiliser requestIdleCallback si disponible, sinon setTimeout
    const scheduleTask = (window as any).requestIdleCallback || 
      ((cb: Function) => setTimeout(cb, delay));

    scheduleTask(async () => {
      console.debug(`Starting prefetch for route: ${path}`);
      const startTime = performance.now();

      await Promise.all(
        relevantData.map(dataKey => prefetchData(dataKey))
      );

      const endTime = performance.now();
      console.debug(`Completed prefetch for route: ${path} in ${endTime - startTime}ms`);
    });
  }, [shouldPrefetch, data, dataFetchers, prefetchData, delay]);

  // Observer les changements de route pour le préchargement
  useEffect(() => {
    const { pathname } = location;
    prefetchRoute(pathname);
  }, [location, prefetchRoute]);

  // Précharger les données lors du survol des liens
  const handleLinkHover = useCallback((path: string) => {
    if (shouldPrefetch(path)) {
      prefetchRoute(path);
    }
  }, [shouldPrefetch, prefetchRoute]);

  // Nettoyer le cache de préchargement lors du démontage
  useEffect(() => {
    return () => {
      prefetchedRef.current.clear();
    };
  }, []);

  return {
    prefetchRoute,
    handleLinkHover,
    getPrefetchedData: () => Array.from(prefetchedRef.current)
  };
}; 