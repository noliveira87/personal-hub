import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Transaction } from './types';
import { loadTransactions, saveTransactions, parseLocalDate } from './store';
import { getMonthlyContractTransactions } from './contractMapping';
import { useContracts } from '@/features/contracts/context/ContractContext';

interface DataContextType {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
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
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const { contracts, allPriceHistory } = useContracts();

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  const refresh = useCallback(() => {
    setTransactions(loadTransactions());
  }, []);

  // All transactions for the selected year: manual entries + one auto-generated entry
  // per active monthly contract per month. Components filter by month themselves.
  const allTransactions = useMemo(() => {
    const yearManual = transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === selectedYear;
    });

    const yearContractTxs: Transaction[] = [];
    for (let m = 0; m < 12; m++) {
      for (const ct of getMonthlyContractTransactions(contracts, allPriceHistory, selectedYear, m)) {
        yearContractTxs.push(ct);
      }
    }

    // Dedup by id only (contract ids are deterministic: contract-{id}-{year}-{month})
    const seen = new Set<string>();
    return [...yearManual, ...yearContractTxs].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [transactions, contracts, allPriceHistory, selectedYear]);

  return (
    <DataContext.Provider value={{ transactions, setTransactions, refresh, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, allTransactions }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
