import { useState, useCallback } from 'react';

export interface CustomChecklistItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
}

interface PersistedState {
  paid: string[];
  custom: CustomChecklistItem[];
}

const EXCLUDED_CONTRACTS_STORAGE_KEY = 'payment-checklist-excluded-contracts-v1';

function getStorageKey(monthKey: string) {
  return `payment-checklist-${monthKey}`;
}

function loadState(monthKey: string): PersistedState {
  try {
    const raw = localStorage.getItem(getStorageKey(monthKey));
    if (!raw) return { paid: [], custom: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      paid: Array.isArray(parsed.paid) ? parsed.paid : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return { paid: [], custom: [] };
  }
}

function saveState(monthKey: string, state: PersistedState) {
  try {
    localStorage.setItem(getStorageKey(monthKey), JSON.stringify(state));
  } catch {
    // silently ignore quota errors
  }
}

function loadExcludedContracts(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_CONTRACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveExcludedContracts(ids: string[]) {
  try {
    localStorage.setItem(EXCLUDED_CONTRACTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // silently ignore quota errors
  }
}

export function usePaymentChecklist(monthKey: string) {
  const [state, setStateRaw] = useState<PersistedState>(() => loadState(monthKey));
  const [excludedContractIds, setExcludedContractIds] = useState<string[]>(() => loadExcludedContracts());

  // When monthKey changes (navigation), reload from storage
  const [currentMonthKey, setCurrentMonthKey] = useState(monthKey);
  if (currentMonthKey !== monthKey) {
    setCurrentMonthKey(monthKey);
    setStateRaw(loadState(monthKey));
  }

  const setState = useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      setStateRaw((prev) => {
        const next = updater(prev);
        saveState(monthKey, next);
        return next;
      });
    },
    [monthKey],
  );

  const togglePaid = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        paid: prev.paid.includes(id)
          ? prev.paid.filter((x) => x !== id)
          : [...prev.paid, id],
      }));
    },
    [setState],
  );

  const addCustomItem = useCallback(
    (name: string, amount: number, currency = 'EUR') => {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setState((prev) => ({
        ...prev,
        custom: [...prev.custom, { id, name, amount, currency }],
      }));
    },
    [setState],
  );

  const removeCustomItem = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        custom: prev.custom.filter((item) => item.id !== id),
        paid: prev.paid.filter((x) => x !== id),
      }));
    },
    [setState],
  );

  const excludeContract = useCallback(
    (id: string) => {
      setExcludedContractIds((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        saveExcludedContracts(next);
        return next;
      });
    },
    [],
  );

  const includeContract = useCallback(
    (id: string) => {
      setExcludedContractIds((prev) => {
        const next = prev.filter((x) => x !== id);
        saveExcludedContracts(next);
        return next;
      });
    },
    [],
  );

  const paidSet = new Set(state.paid);
  const excludedContractSet = new Set(excludedContractIds);

  return {
    paidSet,
    excludedContractSet,
    customItems: state.custom,
    togglePaid,
    addCustomItem,
    removeCustomItem,
    excludeContract,
    includeContract,
  };
}
