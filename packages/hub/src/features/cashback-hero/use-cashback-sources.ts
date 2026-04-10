import { useCallback, useEffect, useState } from 'react';
import { CASHBACK_SOURCES } from '@/features/cashback-hero/types';
import {
  addCashbackSource,
  loadCashbackSources,
  removeCashbackSource,
  replaceAllCashbackSources,
} from '@/features/cashback-hero/lib/cashback';

export function useCashbackSources() {
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCashbackSources();
      if (data.length > 0) {
        setSources(data);
      } else {
        // First run: seed defaults into the DB
        await replaceAllCashbackSources(CASHBACK_SOURCES);
        setSources([...CASHBACK_SOURCES]);
      }
    } catch (err) {
      console.warn('Failed to load cashback sources, falling back to defaults:', err);
      setSources([...CASHBACK_SOURCES]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addSource = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (sources.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    await addCashbackSource(trimmed, sources.length);
    setSources((prev) => [...prev, trimmed]);
  }, [sources]);

  const removeSource = useCallback(async (name: string) => {
    await removeCashbackSource(name);
    setSources((prev) => prev.filter((s) => s !== name));
  }, []);

  const resetSources = useCallback(async () => {
    await replaceAllCashbackSources(CASHBACK_SOURCES);
    setSources([...CASHBACK_SOURCES]);
  }, []);

  return { sources, loading, addSource, removeSource, resetSources };
}
