import { useCallback, useEffect, useState } from 'react';
import { CashbackEntry, CashbackPurchase } from '@/features/cashback-hero/types';
import {
  createCashbackEntry,
  createCashbackPurchase,
  loadCashbackPurchases,
  removeCashbackEntry,
  removeCashbackPurchase,
  syncCetelemCashback,
  syncUnibancoMonthlyCashback,
  UnibancoSyncResult,
  updateCashbackEntry,
  updateCashbackPurchase,
} from '@/features/cashback-hero/lib/cashback';
import type { CetelemCardRules, UnibancoCardRules } from '@/features/cashback-hero/lib/cardRulesSettings';

export function useCashbackStore() {
  const [purchases, setPurchases] = useState<CashbackPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadCashbackPurchases();
      setPurchases(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPurchases([]);
      setError(message);
      console.error('Reward Wallet load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addPurchase = useCallback(async (purchase: Omit<CashbackPurchase, 'id' | 'cashbackEntries'>) => {
    const saved = await createCashbackPurchase(purchase);
    setPurchases((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const addCashbackEntry = useCallback(async (purchaseId: string, entry: Omit<CashbackEntry, 'id'>) => {
    const saved = await createCashbackEntry(purchaseId, entry);
    setPurchases((prev) => prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: [saved, ...purchase.cashbackEntries],
      };
    }));
  }, []);

  const deletePurchase = useCallback(async (purchaseId: string) => {
    await removeCashbackPurchase(purchaseId);
    setPurchases((prev) => prev.filter((purchase) => purchase.id !== purchaseId));
  }, []);

  const deleteCashbackEntry = useCallback(async (purchaseId: string, entryId: string) => {
    await removeCashbackEntry(entryId);
    setPurchases((prev) => prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: purchase.cashbackEntries.filter((entry) => entry.id !== entryId),
      };
    }));
  }, []);

  const editCashbackEntry = useCallback(async (
    purchaseId: string,
    entryId: string,
    fields: Partial<Omit<CashbackEntry, 'id'>>,
  ) => {
    await updateCashbackEntry(entryId, fields);
    setPurchases((prev) => prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: purchase.cashbackEntries.map((entry) => (
          entry.id === entryId ? { ...entry, ...fields } : entry
        )),
      };
    }));
  }, []);

  const updatePurchase = useCallback(async (
    purchaseId: string,
    fields: Partial<Omit<CashbackPurchase, 'id' | 'cashbackEntries'>>,
  ) => {
    await updateCashbackPurchase(purchaseId, fields);
    setPurchases((prev) => prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return { ...purchase, ...fields };
    }));
  }, []);

  const syncUnibancoMonth = useCallback(async (
    monthKey: string,
    rules?: Partial<UnibancoCardRules>,
  ): Promise<UnibancoSyncResult> => {
    const result = await syncUnibancoMonthlyCashback(monthKey, rules);
    await reload();
    return result;
  }, [reload]);

  const syncCetelemPurchase = useCallback(async (
    purchaseId: string,
    purchase: CashbackPurchase,
    rules?: Partial<CetelemCardRules>,
  ) => {
    await syncCetelemCashback(purchaseId, purchase, rules);
    await reload();
  }, [reload]);

  return {
    purchases,
    loading,
    error,
    reload,
    addPurchase,
    addCashbackEntry,
    editCashbackEntry,
    syncUnibancoMonth,
    syncCetelemPurchase,
    deletePurchase,
    deleteCashbackEntry,
    updatePurchase,
  };
}