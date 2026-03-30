import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Transaction } from './types';
import {
  fetchTransactions,
  insertTransaction,
  updateTransactionInDb,
  deleteTransactionFromDb,
  readLegacyTransactions,
  clearLegacyTransactions,
  parseLocalDate,
} from './store';

interface DataContextType {
  transactions: Transaction[];       // manual transactions only (from Supabase)
  loading: boolean;
  addTx: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTx: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTx: (id: string) => Promise<void>;
  refresh: () => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  allTransactions: Transaction[]; // Combined manual + contract transactions
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data = await fetchTransactions();

      // One-time migration: if Supabase is empty but localStorage has data, migrate it
      if (data.length === 0) {
        const legacy = readLegacyTransactions();
        if (legacy.length > 0) {
          await Promise.all(legacy.map((t) => insertTransaction(t)));
          clearLegacyTransactions();
          data = legacy;
        }
      }

      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => { load(); }, [load]);

  const addTx = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
    await insertTransaction(newTx);
    setTransactions((prev) => [...prev, newTx]);
  }, []);

  const updateTx = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    await updateTransactionInDb(id, updates);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTx = useCallback(async (id: string) => {
    await deleteTransactionFromDb(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // All transactions are now persisted in home-expenses, including contract-linked expenses.
  const allTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedYear]);

  return (
    <DataContext.Provider value={{ transactions, loading, addTx, updateTx, deleteTx, refresh, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, allTransactions }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
