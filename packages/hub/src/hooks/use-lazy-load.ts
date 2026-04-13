import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Hook que executa uma função apenas quando o elemento fica visível na viewport
 * Útil para lazy-load de dados pesados
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  options?: {
    threshold?: number;
    rootMargin?: string;
  }
): {
  ref: RefObject<HTMLDivElement>;
  isVisible: boolean;
  isLoading: boolean;
  data: T | null;
  error: Error | null;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoadedRef.current) {
          setIsVisible(true);
          hasLoadedRef.current = true;
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '50px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await loadFn();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [isVisible, loadFn]);

  return { ref, isVisible, isLoading, data, error };
}
