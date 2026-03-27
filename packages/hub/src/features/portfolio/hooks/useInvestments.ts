import { useState, useCallback, useEffect } from "react";
import { Investment, MonthlySnapshot, PortfolioEarning, calculateSummary } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";
import {
  deleteInvestmentFromDb,
  deletePortfolioEarningFromDb,
  loadPortfolioCardOrderFromDb,
  loadInvestmentsFromDb,
  loadMonthlySnapshotsFromDb,
  loadPortfolioEarningsFromDb,
  upsertPortfolioCardOrderInDb,
  upsertInvestmentsInDb,
  upsertPortfolioEarningsInDb,
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
const SHORT_TERM_ORDER_KEY = "portfolio.short-term-order.v1";
const LONG_TERM_ORDER_KEY = "portfolio.long-term-order.v1";

const readOrder = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const writeOrder = (key: string, value: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
};

const normalizeOrder = (order: string[], ids: string[]) => {
  const idSet = new Set(ids);
  const uniqueOrdered = order.filter((id, index) => idSet.has(id) && order.indexOf(id) === index);
  const missing = ids.filter((id) => !uniqueOrdered.includes(id));
  return [...uniqueOrdered, ...missing];
};

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);

const sortByOrder = (items: Investment[], order: string[]) => {
  const indexMap = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aIndex = indexMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = indexMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);
  const [earnings, setEarnings] = useState<PortfolioEarning[]>([]);
  const [shortTermOrder, setShortTermOrder] = useState<string[]>(() => readOrder(SHORT_TERM_ORDER_KEY));
  const [longTermOrder, setLongTermOrder] = useState<string[]>(() => readOrder(LONG_TERM_ORDER_KEY));

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

  const addEarning = useCallback((data: Omit<PortfolioEarning, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    setEarnings((prev) => [
      {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  }, []);

  const updateEarning = useCallback((id: string, data: Partial<Omit<PortfolioEarning, "id" | "createdAt" | "updatedAt">>) => {
    setEarnings((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, ...data, updatedAt: new Date().toISOString() }
        : item
    )));
  }, []);

  const deleteEarning = useCallback((id: string) => {
    setEarnings((prev) => prev.filter((item) => item.id !== id));

    if (isSupabaseConfigured) {
      void deletePortfolioEarningFromDb(id);
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

      const [remoteInvestments, remoteSnapshots, remoteEarnings, remoteCardOrder] = await Promise.all([
        loadInvestmentsFromDb(),
        loadMonthlySnapshotsFromDb(),
        loadPortfolioEarningsFromDb(),
        loadPortfolioCardOrderFromDb(),
      ]);

      if (isCancelled) return;

      const normalizedInvestments = (remoteInvestments ?? []).map((investment) => {
        const normalizedName = investment.name.trim().toLowerCase();
        if (normalizedName === "aforro" && investment.category !== "long-term") {
          return { ...investment, category: "long-term" as const };
        }
        return investment;
      });

      setInvestments(normalizedInvestments);
      // Keep historical monthly snapshots from DB so month records are preserved
      // across month transitions. Current month is recalculated live below.
      setMonthlySnapshots((remoteSnapshots ?? []).sort((a, b) => a.month.localeCompare(b.month)));
      setEarnings((remoteEarnings ?? []).sort((a, b) => b.date.localeCompare(a.date)));
      if (remoteCardOrder) {
        setShortTermOrder(remoteCardOrder.shortTermOrder);
        setLongTermOrder(remoteCardOrder.longTermOrder);
      }

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
    if (isSupabaseConfigured && remoteHydrated) {
      void upsertPortfolioEarningsInDb(earnings);
    }
  }, [earnings, remoteHydrated]);

  useEffect(() => {
    if (isSupabaseConfigured && remoteHydrated) {
      void upsertPortfolioCardOrderInDb(shortTermOrder, longTermOrder);
    }
  }, [shortTermOrder, longTermOrder, remoteHydrated]);

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

  useEffect(() => {
    const shortIds = investments.filter((investment) => investment.category === "short-term").map((investment) => investment.id);
    const longIds = investments.filter((investment) => investment.category === "long-term").map((investment) => investment.id);

    setShortTermOrder((prev) => {
      const next = normalizeOrder(prev, shortIds);
      return sameOrder(prev, next) ? prev : next;
    });

    setLongTermOrder((prev) => {
      const next = normalizeOrder(prev, longIds);
      return sameOrder(prev, next) ? prev : next;
    });
  }, [investments]);

  useEffect(() => {
    writeOrder(SHORT_TERM_ORDER_KEY, shortTermOrder);
  }, [shortTermOrder]);

  useEffect(() => {
    writeOrder(LONG_TERM_ORDER_KEY, longTermOrder);
  }, [longTermOrder]);

  const moveInvestment = useCallback(
    (category: "short-term" | "long-term", id: string, direction: "up" | "down") => {
      const categoryIds = investments
        .filter((investment) => investment.category === category)
        .map((investment) => investment.id);

      const setOrder = category === "short-term" ? setShortTermOrder : setLongTermOrder;

      setOrder((prev) => {
        const current = normalizeOrder(prev, categoryIds);
        const fromIndex = current.indexOf(id);
        if (fromIndex === -1) return current;

        const targetIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (targetIndex < 0 || targetIndex >= current.length) return current;

        const next = [...current];
        [next[fromIndex], next[targetIndex]] = [next[targetIndex], next[fromIndex]];
        return next;
      });
    },
    [investments],
  );

  const shortTerm = sortByOrder(investments.filter(i => i.category === "short-term"), shortTermOrder);
  const longTerm = sortByOrder(investments.filter(i => i.category === "long-term"), longTermOrder);

  return {
    investments,
    monthlySnapshots,
    earnings,
    shortTerm,
    longTerm,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addEarning,
    updateEarning,
    deleteEarning,
    moveInvestment,
  };
}
