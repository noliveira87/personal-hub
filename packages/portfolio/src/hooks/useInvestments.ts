import { useState, useCallback, useEffect } from "react";
import { Investment, MonthlySnapshot, calculateSummary } from "@/types/investment";

const generateId = () => {
  const webCrypto = globalThis.crypto;

  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `id-${Date.now()}-${random}`;
};
const INVESTMENTS_STORAGE_KEY = "portfolio.investments.v1";
const SNAPSHOTS_STORAGE_KEY = "portfolio.monthly-snapshots.v1";

const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: generateId(),
    name: "Trading 212",
    category: "short-term",
    type: "cash",
    investedAmount: 0,
    currentValue: 379.26,
    notes: "Interest earnings only",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: "Revolut",
    category: "short-term",
    type: "cash",
    investedAmount: 112777.40,
    currentValue: 112781.80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: "ETFs",
    category: "long-term",
    type: "etf",
    investedAmount: 33621.01,
    currentValue: 42021.85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: "PPR",
    category: "long-term",
    type: "ppr",
    investedAmount: 3850.00,
    currentValue: 3974.00,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: "Crypto",
    category: "long-term",
    type: "crypto",
    investedAmount: 1774.00,
    currentValue: 1599.50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: "P2P",
    category: "long-term",
    type: "p2p",
    investedAmount: 505.00,
    currentValue: 543.12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>(() => {
    try {
      const raw = localStorage.getItem(INVESTMENTS_STORAGE_KEY);
      if (!raw) return INITIAL_INVESTMENTS;
      const parsed = JSON.parse(raw) as Investment[];
      return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_INVESTMENTS;
    } catch {
      return INITIAL_INVESTMENTS;
    }
  });

  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MonthlySnapshot[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const getMonthKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const addInvestment = useCallback((data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    setInvestments(prev => [...prev, { ...data, id: generateId(), createdAt: now, updatedAt: now }]);
  }, []);

  const updateInvestment = useCallback((id: string, data: Partial<Omit<Investment, "id" | "createdAt" | "updatedAt">>) => {
    setInvestments(prev =>
      prev.map(inv =>
        inv.id === id ? { ...inv, ...data, updatedAt: new Date().toISOString() } : inv
      )
    );
  }, []);

  const deleteInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id));
  }, []);

  useEffect(() => {
    localStorage.setItem(INVESTMENTS_STORAGE_KEY, JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    const summary = calculateSummary(investments);
    const currentMonth = getMonthKey();

    setMonthlySnapshots(prev => {
      const sorted = [...prev].sort((a, b) => a.month.localeCompare(b.month));
      const existingIndex = sorted.findIndex(s => s.month === currentMonth);
      const previousSnapshot = existingIndex > 0 ? sorted[existingIndex - 1] : sorted[sorted.length - 1];

      const monthlyInflow = previousSnapshot ? summary.totalInvested - previousSnapshot.totalInvested : summary.totalInvested;
      const monthlyPerformance = previousSnapshot
        ? summary.totalCurrentValue - previousSnapshot.totalCurrentValue - monthlyInflow
        : summary.totalProfitLoss;
      const monthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + monthlyInflow : summary.totalInvested;
      const monthlyReturnPct = monthlyBase > 0 ? (monthlyPerformance / monthlyBase) * 100 : 0;

      const nextSnapshot: MonthlySnapshot = {
        month: currentMonth,
        totalInvested: summary.totalInvested,
        totalCurrentValue: summary.totalCurrentValue,
        totalProfitLoss: summary.totalProfitLoss,
        overallReturnPct: summary.percentageReturn,
        monthlyInflow,
        monthlyPerformance,
        monthlyReturnPct,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        sorted[existingIndex] = nextSnapshot;
      } else {
        sorted.push(nextSnapshot);
      }

      return sorted;
    });
  }, [investments]);

  useEffect(() => {
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(monthlySnapshots));
  }, [monthlySnapshots]);

  const shortTerm = investments.filter(i => i.category === "short-term");
  const longTerm = investments.filter(i => i.category === "long-term");

  return { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment };
}
