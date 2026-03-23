import { useState, useCallback, useEffect } from 'react';
import { PriceHistory } from '@/types/contract';
import * as contractsDB from '@/lib/contracts';

export function usePriceHistory(contractId: string) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contractsDB.loadPriceHistoryForContract(contractId);
      setHistory(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load price history';
      setError(message);
      console.error('Error loading price history:', err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addEntry = useCallback(async (
    price: number,
    currency: string,
    date: string,
    notes?: string
  ) => {
    try {
      const entry = await contractsDB.addPriceHistoryEntry(contractId, price, currency, date, notes);
      setHistory(prev => [entry, ...prev]);
      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add price history entry';
      setError(message);
      throw err;
    }
  }, [contractId]);

  const deleteEntry = useCallback(async (entryId: string) => {
    try {
      await contractsDB.deletePriceHistoryEntry(entryId);
      setHistory(prev => prev.filter(h => h.id !== entryId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete price history entry';
      setError(message);
      throw err;
    }
  }, []);

  const updateEntry = useCallback(async (
    entryId: string,
    price: number,
    currency: string,
    date: string,
    notes?: string
  ) => {
    try {
      const updated = await contractsDB.updatePriceHistoryEntry(entryId, price, currency, date, notes);
      setHistory(prev => prev.map(h => h.id === entryId ? updated : h));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update price history entry';
      setError(message);
      throw err;
    }
  }, []);

  return { history, loading, error, addEntry, deleteEntry, updateEntry, refresh: loadHistory };
}
