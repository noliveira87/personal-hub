import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Transaction } from './types';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getCarChargingTransactionName, mapContractCategoryToExpenseCategory, sanitizeCarContractName } from './contractMapping';
import {
  fetchTransactions,
  fetchLegacyCarChargingEntries,
  insertTransaction,
  updateTransactionInDb,
  deleteTransactionFromDb,
  updateLegacyCarChargingEntry,
  deleteLegacyCarChargingEntry,
  readLegacyTransactions,
  clearLegacyTransactions,
  parseLocalDate,
  type LegacyCarChargingRow,
} from './store';
import { encodeCarChargingNotes, parseCarChargingNotes } from './carCharging';

const LEGACY_CAR_CHARGING_ID_PREFIX = 'legacy-car-charging-';

function getLegacyCarChargingId(transactionId: string): string | null {
  return transactionId.startsWith(LEGACY_CAR_CHARGING_ID_PREFIX)
    ? transactionId.slice(LEGACY_CAR_CHARGING_ID_PREFIX.length)
    : null;
}

function isExplicitCarChargingTransaction(transaction: Transaction): boolean {
  if (transaction.source === 'legacy-car-charging') {
    return true;
  }

  const parsedChargingNotes = parseCarChargingNotes(transaction.notes);
  if (parsedChargingNotes.location) {
    return true;
  }

  const normalizedName = transaction.name.trim().toLowerCase();
  return normalizedName.includes('carregamento') || normalizedName.includes('charging');
}

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
  const { contracts } = useContracts();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [legacyCarChargingRows, setLegacyCarChargingRows] = useState<LegacyCarChargingRow[]>([]);
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

  useEffect(() => {
    const carContractIds = contracts
      .filter((contract) => contract.type === 'car')
      .map((contract) => contract.id);

    if (carContractIds.length === 0) {
      setLegacyCarChargingRows([]);
      return;
    }

    let cancelled = false;

    async function loadLegacyCarCharging() {
      try {
        const rows = await fetchLegacyCarChargingEntries(carContractIds);
        if (!cancelled) {
          setLegacyCarChargingRows(rows);
        }
      } catch (error) {
        console.error('Failed to load legacy car charging entries:', error);
        if (!cancelled) {
          setLegacyCarChargingRows([]);
        }
      }
    }

    void loadLegacyCarCharging();

    return () => {
      cancelled = true;
    };
  }, [contracts]);

  const refresh = useCallback(() => { load(); }, [load]);

  const addTx = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
    await insertTransaction(newTx);
    setTransactions((prev) => [...prev, newTx]);
  }, []);

  const updateTx = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const legacyId = getLegacyCarChargingId(id);
    if (legacyId) {
      const parsedDate = updates.date ? parseLocalDate(updates.date) : null;
      const parsedChargingNotes = 'notes' in updates
        ? parseCarChargingNotes(updates.notes)
        : null;
      const legacyUpdates: Partial<LegacyCarChargingRow> = {};

      if (updates.contractId !== undefined) legacyUpdates.contract_id = updates.contractId;
      if (parsedDate) {
        legacyUpdates.year = parsedDate.getFullYear();
        legacyUpdates.month = parsedDate.getMonth() + 1;
        legacyUpdates.day = parsedDate.getDate();
      }
      if (updates.amount !== undefined) legacyUpdates.value_eur = updates.amount;
      if (parsedChargingNotes) {
        legacyUpdates.charging_location = parsedChargingNotes.location ?? 'home';
        legacyUpdates.charging_note = parsedChargingNotes.location === 'outside'
          ? (parsedChargingNotes.description || null)
          : null;
      }

      await updateLegacyCarChargingEntry(legacyId, legacyUpdates);
      setLegacyCarChargingRows((prev) => prev.map((row) => (
        row.id === legacyId
          ? { ...row, ...legacyUpdates }
          : row
      )));
      return;
    }

    await updateTransactionInDb(id, updates);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTx = useCallback(async (id: string) => {
    const legacyId = getLegacyCarChargingId(id);
    if (legacyId) {
      await deleteLegacyCarChargingEntry(legacyId);
      setLegacyCarChargingRows((prev) => prev.filter((row) => row.id !== legacyId));
      return;
    }

    await deleteTransactionFromDb(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const allTransactions = useMemo(() => {
    const normalizedTransactions = transactions
      .map((transaction) => {
        if (!transaction.contractId) {
          return transaction;
        }

        const linkedContract = contracts.find((contract) => contract.id === transaction.contractId);
        if (!linkedContract) {
          return transaction;
        }

        if (linkedContract.category === 'car') {
          const sanitizedContractName = sanitizeCarContractName(linkedContract.name);
          const normalizedChargingName = getCarChargingTransactionName(linkedContract.name);
          const normalizedRentingName = transaction.name.replace(linkedContract.name, sanitizedContractName).trim();

          if (isExplicitCarChargingTransaction(transaction)) {
            return {
              ...transaction,
              name: normalizedChargingName,
              category: 'car',
            };
          }

          return {
            ...transaction,
            name: normalizedRentingName,
            category: 'carRenting',
          };
        }

        const mappedCategory = mapContractCategoryToExpenseCategory(linkedContract.category);
        if (!mappedCategory || transaction.category === mappedCategory) {
          return transaction;
        }

        return {
          ...transaction,
          category: mappedCategory,
        };
      })
      .filter((transaction) => {
        const d = parseLocalDate(transaction.date);
        return d.getFullYear() === selectedYear;
      });

    const existingCarChargeKeys = new Set(
      normalizedTransactions
        .filter((transaction) => transaction.contractId && transaction.category === 'car')
        .map((transaction) => `${transaction.contractId}::${transaction.date}::${transaction.amount.toFixed(2)}`),
    );

    const legacyCarChargingTransactions: Transaction[] = legacyCarChargingRows
      .map((row) => {
        const contract = contracts.find((item) => item.id === row.contract_id);
        const sanitizedContractName = contract ? sanitizeCarContractName(contract.name) : null;
        const day = row.day ?? 1;
        const date = `${row.year}-${String(row.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const amount = Number(row.value_eur);
        return {
          id: `${LEGACY_CAR_CHARGING_ID_PREFIX}${row.id}`,
          name: sanitizedContractName ? getCarChargingTransactionName(sanitizedContractName) : 'Carregamento carro',
          type: 'expense',
          category: 'car',
          notes: encodeCarChargingNotes(row.charging_location ?? 'home', row.charging_location === 'outside' ? (row.charging_note ?? undefined) : undefined),
          amount,
          date,
          recurring: false,
          contractId: row.contract_id,
          isContractExpense: true,
          source: 'legacy-car-charging',
        } satisfies Transaction;
      })
      .filter((transaction) => {
        const d = parseLocalDate(transaction.date);
        return d.getFullYear() === selectedYear;
      })
      .filter((transaction) => !existingCarChargeKeys.has(`${transaction.contractId}::${transaction.date}::${transaction.amount.toFixed(2)}`));

    return [...legacyCarChargingTransactions, ...normalizedTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, contracts, selectedYear, legacyCarChargingRows]);

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
