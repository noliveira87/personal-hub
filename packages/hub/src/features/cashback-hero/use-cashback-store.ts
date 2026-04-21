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

const CASHBACK_PURCHASES_CACHE_KEY = 'cashback_hero_purchases_cache_v1';

function readCachedPurchases(): CashbackPurchase[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(CASHBACK_PURCHASES_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as CashbackPurchase[] : [];
  } catch {
    return [];
  }
}

function writeCachedPurchases(purchases: CashbackPurchase[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CASHBACK_PURCHASES_CACHE_KEY, JSON.stringify(purchases));
  } catch {
    // Ignore cache write failures and keep the live state authoritative.
  }
}

export function useCashbackStore() {
  const [purchases, setPurchases] = useState<CashbackPurchase[]>(() => readCachedPurchases());
  const [loading, setLoading] = useState(() => readCachedPurchases().length === 0);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading((prev) => prev || purchases.length === 0);
    setError(null);
    try {
      const data = await loadCashbackPurchases();
      setPurchases(data);
      writeCachedPurchases(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (purchases.length === 0) {
        setPurchases([]);
      }
      setError(message);
      console.error('Reward Wallet load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [purchases.length]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addPurchase = useCallback(async (purchase: Omit<CashbackPurchase, 'id' | 'cashbackEntries'>) => {
    const saved = await createCashbackPurchase(purchase);
    setPurchases((prev) => {
      const next = [saved, ...prev];
      writeCachedPurchases(next);
      return next;
    });
    return saved;
  }, []);

  const addCashbackEntry = useCallback(async (purchaseId: string, entry: Omit<CashbackEntry, 'id'>) => {
    const saved = await createCashbackEntry(purchaseId, entry);
    setPurchases((prev) => {
      const next = prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: [saved, ...purchase.cashbackEntries],
      };
      });
      writeCachedPurchases(next);
      return next;
    });
  }, []);

  const deletePurchase = useCallback(async (purchaseId: string) => {
    await removeCashbackPurchase(purchaseId);
    setPurchases((prev) => {
      const next = prev.filter((purchase) => purchase.id !== purchaseId);
      writeCachedPurchases(next);
      return next;
    });
  }, []);

  const deleteCashbackEntry = useCallback(async (purchaseId: string, entryId: string) => {
    await removeCashbackEntry(entryId);
    setPurchases((prev) => {
      const next = prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: purchase.cashbackEntries.filter((entry) => entry.id !== entryId),
      };
      });
      writeCachedPurchases(next);
      return next;
    });
  }, []);

  const editCashbackEntry = useCallback(async (
    purchaseId: string,
    entryId: string,
    fields: Partial<Omit<CashbackEntry, 'id'>>,
  ) => {
    await updateCashbackEntry(entryId, fields);
    setPurchases((prev) => {
      const next = prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return {
        ...purchase,
        cashbackEntries: purchase.cashbackEntries.map((entry) => (
          entry.id === entryId ? { ...entry, ...fields } : entry
        )),
      };
      });
      writeCachedPurchases(next);
      return next;
    });
  }, []);

  const updatePurchase = useCallback(async (
    purchaseId: string,
    fields: Partial<Omit<CashbackPurchase, 'id' | 'cashbackEntries'>>,
  ) => {
    await updateCashbackPurchase(purchaseId, fields);
    setPurchases((prev) => {
      const next = prev.map((purchase) => {
      if (purchase.id !== purchaseId) return purchase;
      return { ...purchase, ...fields };
      });
      writeCachedPurchases(next);
      return next;
    });
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