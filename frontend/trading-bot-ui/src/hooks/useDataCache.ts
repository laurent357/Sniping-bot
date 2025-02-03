import { useState, useEffect, useCallback, useRef } from 'react';
import { CACHE_CONFIG, MEMORY_CONFIG } from '../config/performance';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
}

interface CacheOptions {
  maxAge?: number;
  staleWhileRevalidate?: boolean;
}

export const useDataCache = <T>(
  key: string,
  fetchData: () => Promise<T>,
  options: CacheOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const memoryUsageRef = useRef(0);

  const calculateSize = (data: any): number => {
    try {
      const str = JSON.stringify(data);
      return str.length * 2; // Approximation de la taille en bytes
    } catch {
      return 0;
    }
  };

  const cleanupCache = useCallback(() => {
    const now = Date.now();
    let totalSize = 0;

    // Supprime les entrées expirées et calcule la taille totale
    for (const [cacheKey, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > CACHE_CONFIG.maxAge) {
        cacheRef.current.delete(cacheKey);
      } else {
        totalSize += entry.size;
      }
    }

    // Si la taille totale dépasse le seuil, supprime les entrées les plus anciennes
    if (totalSize > MEMORY_CONFIG.cleanupThresholds.memory) {
      const entries = Array.from(cacheRef.current.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      while (totalSize > MEMORY_CONFIG.cleanupThresholds.memory && entries.length > 0) {
        const [oldestKey, oldestEntry] = entries.shift()!;
        totalSize -= oldestEntry.size;
        cacheRef.current.delete(oldestKey);
      }
    }

    memoryUsageRef.current = totalSize;
  }, []);

  const getCachedData = useCallback(async () => {
    const cachedEntry = cacheRef.current.get(key);
    const now = Date.now();

    // Si les données sont en cache et pas expirées
    if (cachedEntry && now - cachedEntry.timestamp < (options.maxAge || CACHE_CONFIG.maxAge)) {
      return cachedEntry.data;
    }

    // Si les données sont périmées mais qu'on autorise staleWhileRevalidate
    if (cachedEntry && options.staleWhileRevalidate) {
      // Revalider en arrière-plan
      fetchData().then(newData => {
        const size = calculateSize(newData);
        cacheRef.current.set(key, {
          data: newData,
          timestamp: Date.now(),
          size,
        });
        setData(newData);
      });

      // Retourner les données périmées
      return cachedEntry.data;
    }

    // Sinon, charger les nouvelles données
    return null;
  }, [key, options.maxAge, options.staleWhileRevalidate, fetchData]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Vérifier le cache
      const cachedData = await getCachedData();
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        return;
      }

      // Charger les nouvelles données
      const newData = await fetchData();

      // Mettre en cache
      const size = calculateSize(newData);
      cacheRef.current.set(key, {
        data: newData,
        timestamp: Date.now(),
        size,
      });

      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetchData, getCachedData]);

  // Nettoyage périodique du cache
  useEffect(() => {
    const cleanup = setInterval(cleanupCache, MEMORY_CONFIG.checkInterval);
    return () => clearInterval(cleanup);
  }, [cleanupCache]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
    clearCache: useCallback(() => {
      cacheRef.current.delete(key);
      loadData();
    }, [key, loadData]),
    getCacheInfo: useCallback(
      () => ({
        size: cacheRef.current.get(key)?.size || 0,
        timestamp: cacheRef.current.get(key)?.timestamp || 0,
        totalMemoryUsage: memoryUsageRef.current,
      }),
      [key]
    ),
  };
};
