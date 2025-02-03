import { useEffect, useRef, useState, useCallback } from 'react';
import { LAZY_LOADING_CONFIG } from '../config/performance';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useLazyLoad = ({
  threshold = LAZY_LOADING_CONFIG.threshold,
  rootMargin = LAZY_LOADING_CONFIG.rootMargin,
  enabled = true,
}: UseLazyLoadOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          setIsLoaded(true);
          cleanup();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return cleanup;
  }, [threshold, rootMargin, enabled, cleanup]);

  const measurePerformance = useCallback(() => {
    if (typeof window !== 'undefined' && window.performance) {
      const navigationStart = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const now = performance.now();

      return {
        timeToLoad: now - navigationStart.startTime,
        timeToFirstByte: navigationStart.responseStart - navigationStart.requestStart,
        domContentLoaded: navigationStart.domContentLoadedEventEnd - navigationStart.startTime,
      };
    }
    return null;
  }, []);

  return {
    elementRef,
    isVisible,
    isLoaded,
    measurePerformance,
  };
};
