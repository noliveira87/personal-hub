import { useState, useCallback, useEffect } from "react";
import { Investment, MonthlySnapshot, calculateSummary } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";
import {
  deleteInvestmentFromDb,
  loadInvestmentsFromDb,
  upsertInvestmentsInDb,
  upsertMonthlySnapshotsInDb,
} from "@/features/portfolio/lib/investments";
import { isSupabaseConfigured } from "@/lib/supabase";

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

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);

  const [remoteHydrated, setRemoteHydrated] = useState(false);

  const getMonthKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const getPreviousMonthKey = (monthKey: string) => {
    const [yearRaw, monthRaw] = monthKey.split("-").map(Number);
    const date = new Date((yearRaw || new Date().getFullYear()), (monthRaw || 1) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return getMonthKey(date);
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

    if (isSupabaseConfigured) {
      void deleteInvestmentFromDb(id);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem(INVESTMENTS_STORAGE_KEY);
      localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const hydrateFromSupabase = async () => {
      if (!isSupabaseConfigured) {
        setRemoteHydrated(true);
        return;
      }

      const [remoteInvestments] = await Promise.all([
        loadInvestmentsFromDb(),
      ]);

      if (isCancelled) return;

      setInvestments(remoteInvestments ?? []);
      // Snapshots are always derived live — never loaded from DB.
      // This avoids stale baselines for live-priced assets (crypto).
      setMonthlySnapshots([]);

      if (!isCancelled) {
        setRemoteHydrated(true);
      }
    };

    void hydrateFromSupabase();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured && remoteHydrated) {
      void upsertInvestmentsInDb(investments);
    }
  }, [investments, remoteHydrated]);

  useEffect(() => {
    const summary = calculateSummary(investments);
    const currentMonth = getMonthKey();
    const baselineMonth = getPreviousMonthKey(currentMonth);

    // Compute total contribution/withdrawal inflows for this month from movement history.
    // Used to reconstruct the baseline value (portfolio at start of month before any contributions).
    const thisMonthInflow = investments.reduce((total, inv) => {
      const movements = parseInvestmentMovements(inv.notes);
      return total + movements
        .filter(m => m.date.startsWith(currentMonth) && (m.kind === "contribution" || m.kind === "withdrawal"))
        .reduce((s, m) => s + (m.kind === "withdrawal" ? -m.amount : m.amount), 0);
    }, 0);

    setMonthlySnapshots(prev => {
      const sorted = [...prev].sort((a, b) => a.month.localeCompare(b.month));

      if (!sorted.length) {
        // Reconstruct baseline by subtracting this month's inflows so it represents
        // the portfolio state at the START of the month (before contributions).
        sorted.push({
          month: baselineMonth,
          totalInvested: summary.totalInvested - thisMonthInflow,
          totalCurrentValue: summary.totalCurrentValue - thisMonthInflow,
          totalProfitLoss: summary.totalProfitLoss,
          overallReturnPct: summary.percentageReturn,
          monthlyInflow: 0,
          monthlyPerformance: 0,
          monthlyReturnPct: 0,
          updatedAt: new Date().toISOString(),
        });
      }

      if (sorted.length === 1 && sorted[0].month === currentMonth) {
        sorted.unshift({
          ...sorted[0],
          month: baselineMonth,
          monthlyInflow: 0,
          monthlyPerformance: 0,
          monthlyReturnPct: 0,
        });
      }

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
    if (isSupabaseConfigured && remoteHydrated) {
      void upsertMonthlySnapshotsInDb(monthlySnapshots);
    }
  }, [monthlySnapshots, remoteHydrated]);

  const shortTerm = investments.filter(i => i.category === "short-term");
  const longTerm = investments.filter(i => i.category === "long-term");

  return { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment };
}
