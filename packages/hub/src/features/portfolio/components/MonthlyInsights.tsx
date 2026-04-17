import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Investment, MonthlySnapshot, PortfolioEarning, calculateSummary, formatCurrency, formatMonthLabel, formatPercentage } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES_BY_LANGUAGE } from "@/i18n/translations";
import { chartAxisTickStyle, chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle, renderChartLegendLabel } from "@/lib/chartTheme";

interface MonthlyInsightsProps {
  snapshots: MonthlySnapshot[];
  investments: Investment[];
  earnings: PortfolioEarning[];
  netInvestedFlow?: number;
  monthlyPerformanceTotal?: number;
  monthEarnings?: number;
  liveCryptoPerformance?: number;
}

export function MonthlyInsights({ snapshots, investments, earnings, netInvestedFlow = 0, monthlyPerformanceTotal = 0, monthEarnings = 0, liveCryptoPerformance = 0 }: MonthlyInsightsProps) {
  const { t, language } = useI18n();
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(3);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedAnnualYear, setSelectedAnnualYear] = useState<string | null>(null);

  const formatChartCurrency = (value: number) => formatCurrency(Number(value));

  const isValidMonthKey = (monthKey: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
  const formatShortMonthLabel = (monthKey: string) => {
    if (!isValidMonthKey(monthKey)) return monthKey;
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(LOCALES_BY_LANGUAGE[language], { month: "short" });
  };

  const isNonInvestmentWithdrawal = (movement: { id?: string; kind: string; note?: string }) => {
    if (movement.kind !== "withdrawal") return false;
    if (movement.id === "goparity-2026-01-03-ajuste-amortizacao-capital") return true;

    const normalizedNote = movement.note?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
    return normalizedNote.includes("amortizacao de capital");
  };

  if (!snapshots.length) {
    return null;
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthInflow = investments.reduce((total, inv) => {
    const movements = parseInvestmentMovements(inv.notes);
    const inflow = movements
      .filter((m) => m.date.startsWith(currentMonth) && (m.kind === "contribution" || m.kind === "withdrawal") && !isNonInvestmentWithdrawal(m))
      .reduce((sum, m) => sum + (m.kind === "withdrawal" ? -m.amount : m.amount), 0);
    return total + inflow;
  }, 0);

  const liveSummary = calculateSummary(investments);
  const earningsByMonth = earnings.reduce<Record<string, number>>((acc, earning) => {
    const month = earning.date.slice(0, 7);
    if (!isValidMonthKey(month)) return acc;
    acc[month] = (acc[month] ?? 0) + earning.amountEur;
    return acc;
  }, {});

  const earningsByKindMonth = earnings.reduce<Record<string, { surveys: number; cashback: number; social_media: number; dividend: number; crypto_cashback: number }>>((acc, earning) => {
    const month = earning.date.slice(0, 7);
    if (!isValidMonthKey(month)) return acc;

    acc[month] ??= { surveys: 0, cashback: 0, social_media: 0, dividend: 0, crypto_cashback: 0 };
    if (earning.kind === "survey") acc[month].surveys += earning.amountEur;
    if (earning.kind === "cashback") acc[month].cashback += earning.amountEur;
    if (earning.kind === "social_media") acc[month].social_media += earning.amountEur;
    if (earning.kind === "dividend") acc[month].dividend += earning.amountEur;
    if (earning.kind === "crypto_cashback") acc[month].crypto_cashback += earning.amountEur;
    return acc;
  }, {});

  const movementStatsByMonth = investments.reduce<Record<string, { inflow: number; performance: number }>>((acc, investment) => {
    const movements = parseInvestmentMovements(investment.notes);
    movements.forEach((movement) => {
      if (movement.note === "Initial position") return;
      if (isNonInvestmentWithdrawal(movement)) return;

      const month = movement.date.slice(0, 7);
      if (!isValidMonthKey(month)) return;
      acc[month] ??= { inflow: 0, performance: 0 };

      if (movement.kind === "contribution") {
        acc[month].inflow += movement.amount;
        return;
      }

      if (movement.kind === "withdrawal") {
        acc[month].inflow -= movement.amount;
        return;
      }

      if (movement.kind === "adjustment" || movement.kind === "cashback") {
        acc[month].performance += movement.amount;
      }
    });

    return acc;
  }, {});

  const dataMonths = new Set<string>([
    currentMonth,
    ...Object.keys(movementStatsByMonth),
    ...Object.keys(earningsByMonth),
  ]);

  const sorted = snapshots
    .filter((snapshot) => isValidMonthKey(snapshot.month))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((snapshot, index, arr) => {
      const previousSnapshot = index > 0 ? arr[index - 1] : null;
      const isCurrentMonth = snapshot.month === currentMonth;

      const monthMovementStats = movementStatsByMonth[snapshot.month];
      // Use movement-derived inflow when available; when movements exist for
      // this month but net is 0, honour that 0 instead of falling back to
      // a stale snapshot value from a previous month.
      const movementInflow = monthMovementStats !== undefined
        ? (monthMovementStats.inflow ?? 0)
        : undefined;
      const snapshotInflow = Number.isFinite(snapshot.monthlyInflow)
        ? snapshot.monthlyInflow
        : previousSnapshot
          ? snapshot.totalInvested - previousSnapshot.totalInvested
          : snapshot.totalInvested;
      // If there are movements for this month, always use that value (even 0).
      // Only fall back to snapshot if there are genuinely no movement records.
      const monthlyInflow = movementInflow !== undefined ? movementInflow : snapshotInflow;
      const movementPerformance = monthMovementStats?.performance ?? 0;
      const monthlyPerformance = movementPerformance;
      const monthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + monthlyInflow : monthlyInflow;
      const monthlyReturnPct = Number.isFinite(snapshot.monthlyReturnPct)
        ? snapshot.monthlyReturnPct
        : monthlyBase > 0
          ? (monthlyPerformance / monthlyBase) * 100
          : 0;

      const liveMonthlyInflow = monthMovementStats?.inflow ?? (snapshot.month === currentMonth ? netInvestedFlow : monthlyInflow);

      // `monthlyPerformanceTotal` can already include earnings for current month.
      // Remove the explicit `monthEarnings` prop here and add earnings once below.
      const currentMonthPerformanceExEarnings = monthlyPerformanceTotal - monthEarnings;
      const liveMonthlyPerformance = monthMovementStats?.performance
        ?? (snapshot.month === currentMonth ? currentMonthPerformanceExEarnings : monthlyPerformance);
      const liveCryptoDelta = snapshot.month === currentMonth ? liveCryptoPerformance : 0;
      const liveMonthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + liveMonthlyInflow : liveSummary.totalInvested;
      const earningsAmount = snapshot.month === currentMonth
        ? (earningsByMonth[snapshot.month] ?? monthEarnings)
        : (earningsByMonth[snapshot.month] ?? 0);
      const adjustedMonthlyPerformance = monthlyPerformance + earningsAmount + liveCryptoDelta;
      const adjustedLiveMonthlyPerformance = liveMonthlyPerformance + earningsAmount + liveCryptoDelta;
      const adjustedMonthlyReturnPct = monthlyBase > 0 ? (adjustedMonthlyPerformance / monthlyBase) * 100 : 0;
      const adjustedLiveMonthlyReturnPct = liveMonthlyBase > 0 ? (adjustedLiveMonthlyPerformance / liveMonthlyBase) * 100 : 0;

      return {
        ...snapshot,
        monthlyInflow: isCurrentMonth ? liveMonthlyInflow : monthlyInflow,
        monthlyPerformance: isCurrentMonth ? adjustedLiveMonthlyPerformance : adjustedMonthlyPerformance,
        monthlyReturnPct: isCurrentMonth ? adjustedLiveMonthlyReturnPct : adjustedMonthlyReturnPct,
        earningsAmount,
      };
    });

  const baselineCandidate = sorted.length > 1
    && !dataMonths.has(sorted[0].month)
    && Math.abs(sorted[0].monthlyInflow) < 0.000001
    && Math.abs(sorted[0].monthlyPerformance) < 0.000001
      ? sorted[0].month
      : null;

  const activeSorted = baselineCandidate
    ? sorted.filter((snapshot) => snapshot.month !== baselineCandidate)
    : sorted;

  if (!activeSorted.length) return null;

  const snapshotByMonth = new Map(activeSorted.map((snapshot) => [snapshot.month, snapshot]));
  const reconstructedMonths = Array.from(
    new Set<string>([
      ...activeSorted.map((snapshot) => snapshot.month),
      ...Object.keys(movementStatsByMonth),
      ...Object.keys(earningsByMonth),
      currentMonth,
    ]),
  ).filter(isValidMonthKey).sort();

  if (!reconstructedMonths.length) return null;

  const latestKnownMonth = reconstructedMonths[reconstructedMonths.length - 1];
  let endInvested = latestKnownMonth === currentMonth
    ? liveSummary.totalInvested
    : (snapshotByMonth.get(latestKnownMonth)?.totalInvested ?? liveSummary.totalInvested);
  let endCurrentValue = latestKnownMonth === currentMonth
    ? liveSummary.totalCurrentValue
    : (snapshotByMonth.get(latestKnownMonth)?.totalCurrentValue ?? liveSummary.totalCurrentValue);

  const reconstructedActiveSorted = [...reconstructedMonths]
    .reverse()
    .map((month) => {
      const existing = snapshotByMonth.get(month);
      const isCurrentReconstructedMonth = month === currentMonth;
      const monthlyInflow = existing?.monthlyInflow ?? movementStatsByMonth[month]?.inflow ?? 0;
      const movementPerformance = movementStatsByMonth[month]?.performance ?? 0;
      const monthlyEarnings = earningsByMonth[month] ?? 0;
      const monthlyLiveCryptoDelta = isCurrentReconstructedMonth ? liveCryptoPerformance : 0;
      const monthlyPerformance = isCurrentReconstructedMonth
        ? movementPerformance + monthlyEarnings + monthlyLiveCryptoDelta
        : (existing?.monthlyPerformance ?? movementPerformance + monthlyEarnings);
      const totalInvested = existing?.totalInvested ?? endInvested;
      const totalCurrent = month === currentMonth
        ? liveSummary.totalCurrentValue
        : (existing?.totalCurrentValue ?? endCurrentValue);
      const monthlyBase = totalCurrent - monthlyPerformance;
      const monthlyReturnPct = monthlyBase > 0 ? (monthlyPerformance / monthlyBase) * 100 : 0;

      const row = {
        month,
        totalInvested,
        totalCurrentValue: totalCurrent,
        totalProfitLoss: totalCurrent - totalInvested,
        overallReturnPct: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
        monthlyInflow,
        monthlyPerformance,
        monthlyReturnPct,
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
        earningsAmount: monthlyEarnings,
      };

      endInvested = totalInvested - monthlyInflow;
      endCurrentValue = totalCurrent - monthlyInflow - monthlyPerformance;

      return row;
    })
    .reverse();

  const activeMonths = reconstructedActiveSorted.map((s) => s.month);
  const effectiveMonth =
    selectedMonthKey && activeMonths.includes(selectedMonthKey)
      ? selectedMonthKey
      : activeMonths[activeMonths.length - 1];
  const selectedIdx = activeMonths.indexOf(effectiveMonth);
  const selected = reconstructedActiveSorted[selectedIdx];
  if (!selected) return null;

  const selectedMonth = selected.month;
  const isCurrentMonthSelected = selectedMonth === currentMonth;
  const nonCryptoMonthlyPerformance = investments
    .filter((investment) => investment.type !== "crypto")
    .reduce((total, investment) => {
      const movements = parseInvestmentMovements(investment.notes);
      const monthPerformance = movements
        .filter(
          (movement) =>
            movement.date.startsWith(selectedMonth) &&
            movement.note !== "Initial position" &&
            (movement.kind === "adjustment" || movement.kind === "cashback"),
        )
        .reduce((sum, movement) => sum + movement.amount, 0);
      return total + monthPerformance;
    }, 0);

  const nonInvestmentMonthlyPerformance = nonCryptoMonthlyPerformance;

  const cryptoMonthlyPerformance = selected.monthlyPerformance - nonInvestmentMonthlyPerformance;
  const cryptoManualMonthlyPerformance = investments
    .filter((investment) => investment.type === "crypto")
    .reduce((total, investment) => {
      const movements = parseInvestmentMovements(investment.notes);
      const monthPerformance = movements
        .filter(
          (movement) =>
            movement.date.startsWith(selectedMonth) &&
            movement.note !== "Initial position" &&
            (movement.kind === "adjustment" || movement.kind === "cashback"),
        )
        .reduce((sum, movement) => sum + movement.amount, 0);
      return total + monthPerformance;
    }, 0);
  const cryptoMarketMonthlyPerformance = cryptoMonthlyPerformance - cryptoManualMonthlyPerformance;

  type AnnualInsight = {
    year: string;
    annualInflow: number;
    annualPerformance: number;
    openingCurrentValue: number;
    closingCurrentValue: number;
    annualReturnPct: number;
  };

  const annualMap = new Map<string, Omit<AnnualInsight, "annualReturnPct">>();

  reconstructedActiveSorted.forEach((snapshot) => {
    const year = snapshot.month.slice(0, 4);
    const fullIndex = reconstructedActiveSorted.findIndex(s => s.month === snapshot.month);
    const previousSnapshot = fullIndex > 0 ? reconstructedActiveSorted[fullIndex - 1] : null;

    const existing = annualMap.get(year);

    if (!existing) {
      annualMap.set(year, {
        year,
        annualInflow: snapshot.monthlyInflow,
        annualPerformance: snapshot.monthlyPerformance,
        openingCurrentValue: previousSnapshot?.totalCurrentValue ?? 0,
        closingCurrentValue: snapshot.totalCurrentValue,
      });
      return;
    }

    annualMap.set(year, {
      ...existing,
      annualInflow: existing.annualInflow + snapshot.monthlyInflow,
      annualPerformance: existing.annualPerformance + snapshot.monthlyPerformance,
      closingCurrentValue: snapshot.totalCurrentValue,
    });
  });

  const annualInsights: AnnualInsight[] = Array.from(annualMap.values())
    .map((yearData) => {
      const annualBase = yearData.openingCurrentValue + yearData.annualInflow;
      const annualReturnPct = annualBase > 0 ? (yearData.annualPerformance / annualBase) * 100 : 0;

      return {
        ...yearData,
        annualReturnPct,
      };
    })
    .sort((a, b) => a.year.localeCompare(b.year));

  const latestYear = annualInsights[annualInsights.length - 1];

  const bestMonth = reconstructedActiveSorted.reduce((best, current) =>
    current.monthlyPerformance > best.monthlyPerformance ? current : best,
  reconstructedActiveSorted[0]);

  const worstMonth = reconstructedActiveSorted.reduce((worst, current) =>
    current.monthlyPerformance < worst.monthlyPerformance ? current : worst,
  reconstructedActiveSorted[0]);

  const bestYear = annualInsights.reduce((best, current) =>
    current.annualPerformance > best.annualPerformance ? current : best,
  annualInsights[0]);

  const worstYear = annualInsights.reduce((worst, current) =>
    current.annualPerformance < worst.annualPerformance ? current : worst,
  annualInsights[0]);

  const maxAbsAnnualPerformance = Math.max(...annualInsights.map(y => Math.abs(y.annualPerformance)), 1);

  const monthlyEvolutionRows = [...reconstructedActiveSorted].reverse();
  const maxAbsPerformance = Math.max(...monthlyEvolutionRows.map(m => Math.abs(m.monthlyPerformance)), 1);
  const visibleMonthlyRows = monthlyEvolutionRows.slice(0, visibleMonthsCount);
  const remainingMonthlyRows = Math.max(0, monthlyEvolutionRows.length - visibleMonthlyRows.length);

  // Calculate performance by type for selected month (investments + earnings)
  type TypePerformance = {
    type: string;
    profit: number;
    loss: number;
    netPerformance: number;
  };

  const typePerformanceMap = new Map<string, TypePerformance>();

  // Add investment movements by type
  investments.forEach((inv) => {
    const movements = parseInvestmentMovements(inv.notes);
    movements
      .filter(
        (m) =>
          m.date.startsWith(selectedMonth) &&
          m.note !== "Initial position" &&
          (m.kind === "adjustment" || m.kind === "cashback")
      )
      .forEach((m) => {
        const existing = typePerformanceMap.get(inv.type) || {
          type: inv.type,
          profit: 0,
          loss: 0,
          netPerformance: 0,
        };

        if (m.amount > 0) {
          existing.profit += m.amount;
        } else {
          existing.loss += Math.abs(m.amount);
        }
        existing.netPerformance += m.amount;
        typePerformanceMap.set(inv.type, existing);
      });
  });

  // Add earnings by type mapping
  earnings
    .filter((earning) => earning.date.startsWith(selectedMonth))
    .forEach((earning) => {
      const earningType = earning.kind === "survey"
        ? "surveys"
        : earning.kind === "cashback"
          ? "cashback"
          : earning.kind === "dividend"
            ? "dividend"
          : earning.kind === "crypto_cashback"
            ? "crypto_cashback"
            : earning.kind === "social_media"
              ? "social_media"
              : "other";
      const existing = typePerformanceMap.get(earningType) || {
        type: earningType,
        profit: 0,
        loss: 0,
        netPerformance: 0,
      };

      existing.profit += earning.amountEur;
      existing.netPerformance += earning.amountEur;
      typePerformanceMap.set(earningType, existing);
    });

  const typePerformanceList = Array.from(typePerformanceMap.values())
    .sort((a, b) => b.netPerformance - a.netPerformance);

  const topGainers = typePerformanceList
    .filter((c) => c.netPerformance > 0)
    .slice(0, 5);

  const topLosers = typePerformanceList
    .filter((c) => c.netPerformance < 0)
    .sort((a, b) => a.netPerformance - b.netPerformance)
    .slice(0, 5);

  const selectedMonthMovementBreakdown = investments
    .map((investment) => {
      const monthAmount = parseInvestmentMovements(investment.notes)
        .filter(
          (movement) =>
            movement.date.startsWith(selectedMonth) &&
            movement.note !== "Initial position" &&
            (movement.kind === "adjustment" || movement.kind === "cashback"),
        )
        .reduce((sum, movement) => sum + movement.amount, 0);

      return {
        label: investment.name,
        amount: monthAmount,
      };
    })
    .filter((item) => Math.abs(item.amount) > 0.000001)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const selectedMonthEarningsBreakdownRaw = earningsByKindMonth[selectedMonth] ?? {
    surveys: 0,
    cashback: 0,
    social_media: 0,
    dividend: 0,
    crypto_cashback: 0,
  };

  const selectedMonthEarningsBreakdown = [
    { label: t("portfolioInsights.labels.surveys"), amount: selectedMonthEarningsBreakdownRaw.surveys },
    { label: t("portfolioInsights.labels.cashback"), amount: selectedMonthEarningsBreakdownRaw.cashback },
    { label: t("portfolioInsights.labels.cryptoCashback"), amount: selectedMonthEarningsBreakdownRaw.crypto_cashback },
    { label: t("portfolioInsights.labels.socialMedia"), amount: selectedMonthEarningsBreakdownRaw.social_media },
    { label: t("portfolioInsights.labels.dividends"), amount: selectedMonthEarningsBreakdownRaw.dividend },
  ]
    .filter((item) => Math.abs(item.amount) > 0.000001)
    .sort((a, b) => b.amount - a.amount);

  const selectedMonthMovementSubtotal = selectedMonthMovementBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const selectedMonthLiveCryptoContribution = isCurrentMonthSelected ? liveCryptoPerformance : 0;
  const selectedMonthEarningsSubtotal = selectedMonthEarningsBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const selectedMonthEarningsAndMarketBreakdown = [
    ...selectedMonthEarningsBreakdown,
    ...(Math.abs(selectedMonthLiveCryptoContribution) > 0.000001
      ? [{ label: t("portfolioInsights.monthly.liveCryptoDelta"), amount: selectedMonthLiveCryptoContribution }]
      : []),
  ].sort((a, b) => b.amount - a.amount);
  const selectedMonthExplainedTotal = selectedMonthMovementSubtotal + selectedMonthEarningsSubtotal + selectedMonthLiveCryptoContribution;
  const selectedMonthUnexplainedDelta = selected.monthlyPerformance - selectedMonthExplainedTotal;

  const selectedMonthInvestedBreakdown = investments
    .map((investment) => {
      const movements = parseInvestmentMovements(investment.notes).filter(
        (movement) =>
          movement.date.startsWith(selectedMonth) &&
          movement.note !== "Initial position" &&
          (movement.kind === "contribution" || movement.kind === "withdrawal") &&
          !isNonInvestmentWithdrawal(movement),
      );

      const contributions = movements
        .filter((movement) => movement.kind === "contribution")
        .reduce((sum, movement) => sum + movement.amount, 0);

      const withdrawals = movements
        .filter((movement) => movement.kind === "withdrawal")
        .reduce((sum, movement) => sum + movement.amount, 0);

      const net = contributions - withdrawals;

      return {
        label: investment.name,
        contributions,
        withdrawals,
        net,
      };
    })
    .filter((item) => Math.abs(item.contributions) > 0.000001 || Math.abs(item.withdrawals) > 0.000001)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const selectedMonthInvestedExplainedTotal = selectedMonthInvestedBreakdown.reduce((sum, item) => sum + item.net, 0);
  const selectedMonthInvestedUnexplainedDelta = selected.monthlyInflow - selectedMonthInvestedExplainedTotal;
  const selectedMonthMovementInflow = movementStatsByMonth[selectedMonth]?.inflow;
  const selectedMonthSnapshotInflow = snapshotByMonth.get(selectedMonth)?.monthlyInflow;
  const selectedMonthInvestedSource = selectedMonthMovementInflow != null ? "movements" : "snapshot";

  const annualYears = annualInsights.map((item) => item.year);
  const annualFocusYear = selectedAnnualYear && annualYears.includes(selectedAnnualYear)
    ? selectedAnnualYear
    : latestYear.year;
  const annualFocusYearIdx = annualYears.indexOf(annualFocusYear);
  const focusedAnnualInsight = annualInsights[annualFocusYearIdx] ?? latestYear;
  const annualTypePerformanceMap = new Map<string, TypePerformance>();

  investments.forEach((inv) => {
    const movements = parseInvestmentMovements(inv.notes);
    movements
      .filter(
        (m) =>
          m.date.startsWith(annualFocusYear) &&
          m.note !== "Initial position" &&
          (m.kind === "adjustment" || m.kind === "cashback"),
      )
      .forEach((m) => {
        const existing = annualTypePerformanceMap.get(inv.type) || {
          type: inv.type,
          profit: 0,
          loss: 0,
          netPerformance: 0,
        };

        if (m.amount > 0) {
          existing.profit += m.amount;
        } else {
          existing.loss += Math.abs(m.amount);
        }

        existing.netPerformance += m.amount;
        annualTypePerformanceMap.set(inv.type, existing);
      });
  });

  earnings
    .filter((earning) => earning.date.startsWith(annualFocusYear))
    .forEach((earning) => {
      const earningType = earning.kind === "survey"
        ? "surveys"
        : earning.kind === "cashback"
          ? "cashback"
          : earning.kind === "dividend"
            ? "dividend"
          : earning.kind === "crypto_cashback"
            ? "crypto_cashback"
            : earning.kind === "social_media"
              ? "social_media"
              : "other";

      const existing = annualTypePerformanceMap.get(earningType) || {
        type: earningType,
        profit: 0,
        loss: 0,
        netPerformance: 0,
      };

      existing.profit += earning.amountEur;
      existing.netPerformance += earning.amountEur;
      annualTypePerformanceMap.set(earningType, existing);
    });

  const annualTypePerformanceList = Array.from(annualTypePerformanceMap.values()).sort((a, b) => b.netPerformance - a.netPerformance);
  const annualTopGainers = annualTypePerformanceList.filter((item) => item.netPerformance > 0).slice(0, 3);
  const annualTopLosers = annualTypePerformanceList
    .filter((item) => item.netPerformance < 0)
    .sort((a, b) => a.netPerformance - b.netPerformance)
    .slice(0, 3);

  const monthlyChartData = [...reconstructedActiveSorted]
    .slice(-12)
    .map((snapshot) => ({
      month: snapshot.month,
      monthLabel: formatShortMonthLabel(snapshot.month),
      performance: snapshot.monthlyPerformance,
      inflow: snapshot.monthlyInflow,
      returnPct: snapshot.monthlyReturnPct,
    }));

  const annualChartData = annualInsights.map((yearData) => ({
    year: yearData.year,
    performance: yearData.annualPerformance,
    returnPct: yearData.annualReturnPct,
  }));

  const categoryGrowthChartData = [...reconstructedActiveSorted]
    .slice(-12)
    .map((snapshot) => {
      let longPerformance = 0;
      let shortPerformance = 0;

      investments.forEach((investment) => {
        const monthPerformance = parseInvestmentMovements(investment.notes)
          .filter(
            (movement) =>
              movement.date.startsWith(snapshot.month) &&
              movement.note !== "Initial position" &&
              (movement.kind === "adjustment" || movement.kind === "cashback"),
          )
          .reduce((sum, movement) => sum + movement.amount, 0);

        if (investment.category === "long-term") {
          longPerformance += monthPerformance;
        } else {
          shortPerformance += monthPerformance;
        }
      });

      return {
        month: snapshot.month,
        monthLabel: formatShortMonthLabel(snapshot.month),
        longPerformance,
        shortPerformance,
      };
    });

  const earningsEvolutionChartData = [...reconstructedActiveSorted]
    .slice(-12)
    .map((snapshot) => ({
      month: snapshot.month,
      monthLabel: formatShortMonthLabel(snapshot.month),
      surveys: earningsByKindMonth[snapshot.month]?.surveys ?? 0,
      cashback: earningsByKindMonth[snapshot.month]?.cashback ?? 0,
      crypto_cashback: earningsByKindMonth[snapshot.month]?.crypto_cashback ?? 0,
      social_media: earningsByKindMonth[snapshot.month]?.social_media ?? 0,
      dividend: earningsByKindMonth[snapshot.month]?.dividend ?? 0,
    }));

  const longTermSummary = investments
    .filter((investment) => investment.category === "long-term")
    .reduce(
      (acc, investment) => ({
        invested: acc.invested + investment.investedAmount,
        current: acc.current + investment.currentValue,
      }),
      { invested: 0, current: 0 },
    );
  const shortTermSummary = investments
    .filter((investment) => investment.category === "short-term")
    .reduce(
      (acc, investment) => ({
        invested: acc.invested + investment.investedAmount,
        current: acc.current + investment.currentValue,
      }),
      { invested: 0, current: 0 },
    );

  const longTermProfit = longTermSummary.current - longTermSummary.invested;
  const shortTermProfit = shortTermSummary.current - shortTermSummary.invested;
  const longTermReturn = longTermSummary.invested > 0 ? (longTermProfit / longTermSummary.invested) * 100 : 0;
  const shortTermReturn = shortTermSummary.invested > 0 ? (shortTermProfit / shortTermSummary.invested) * 100 : 0;

  const formatTypeName = (type: string): string => {
    const names: Record<string, string> = {
      cash: t("portfolioInsights.typeNames.cash"),
      aforro: t("portfolioInsights.typeNames.aforro"),
      etf: "ETFs",
      crypto: t("portfolioInsights.typeNames.crypto"),
      p2p: "P2P",
      ppr: "PPR",
      surveys: t("portfolioInsights.typeNames.surveys"),
      social_media: t("portfolioInsights.typeNames.socialMedia"),
      cashback: t("portfolioInsights.typeNames.cashback"),
      dividend: t("portfolioInsights.typeNames.dividend"),
      crypto_cashback: t("portfolioInsights.typeNames.cryptoCashback"),
      other: t("portfolioInsights.typeNames.other"),
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <>
      {/* ── Monthly insights card ── */}
      <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <CardTitle>{t("portfolioInsights.monthly.title")}</CardTitle>
          <CardDescription>{t("portfolioInsights.monthly.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {/* Month navigator */}
          <div className="flex items-center justify-between">
            <Button
              type="button" variant="ghost" size="icon"
              disabled={selectedIdx <= 0}
              onClick={() => setSelectedMonthKey(activeMonths[selectedIdx - 1])}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.thisMonthWithLabel", { month: formatMonthLabel(selectedMonth) })
                  : formatMonthLabel(selectedMonth)}
              </span>
              {!isCurrentMonthSelected ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMonthKey(currentMonth)}>
                  {t("portfolioInsights.monthly.currentMonth")}
                </Button>
              ) : null}
            </div>
            <Button
              type="button" variant="ghost" size="icon"
              disabled={selectedIdx >= activeMonths.length - 1}
              onClick={() => setSelectedMonthKey(activeMonths[selectedIdx + 1])}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.thisMonthReturn")
                  : t("portfolioInsights.monthly.monthReturn", { month: formatMonthLabel(selectedMonth) })}
              </p>
              <p className={`mt-2 text-xl font-semibold ${selected.monthlyReturnPct >= 0 ? "text-success" : "text-urgent"}`}>
                {formatPercentage(selected.monthlyReturnPct)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.thisMonthInvested")
                  : t("portfolioInsights.monthly.monthInvested", { month: formatMonthLabel(selectedMonth) })}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(selected.monthlyInflow)}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.thisMonthPerformance")
                  : t("portfolioInsights.monthly.monthPerformance", { month: formatMonthLabel(selectedMonth) })}
              </p>
              <p className={`mt-2 text-xl font-semibold ${selected.monthlyPerformance >= 0 ? "text-success" : "text-urgent"}`}>
                {formatCurrency(selected.monthlyPerformance)}
              </p>
            </div>
          </div>

          {/* Best / worst month */}
          {reconstructedActiveSorted.length > 1 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.monthly.bestMonth")}</p>
                <div className="mt-2 flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{formatMonthLabel(bestMonth.month)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(bestMonth.monthlyPerformance)}</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.monthly.worstMonth")}</p>
                <div className="mt-2 flex items-center gap-2 text-urgent">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{formatMonthLabel(worstMonth.month)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(worstMonth.monthlyPerformance)}</p>
              </div>
            </div>
          )}

          {/* Performance by type */}
          {(topGainers.length > 0 || topLosers.length > 0) && (
            <div className="space-y-5 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
              <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{t("portfolioInsights.monthly.performanceByType")}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.performanceByTypeDescThis")
                  : t("portfolioInsights.monthly.performanceByTypeDescMonth", { month: formatMonthLabel(selectedMonth) })}
              </p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Top gainers */}
                {topGainers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-bold text-success">{t("portfolioInsights.monthly.topGainers")}</h4>
                    <div className="space-y-2">
                      {topGainers.map((item) => (
                        <div key={item.type} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{formatTypeName(item.type)}</span>
                            <span className="text-sm font-semibold text-success">+{formatCurrency(item.netPerformance)}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-success" style={{ width: `${Math.min(100, (item.netPerformance / Math.max(...topGainers.map(g => g.netPerformance))) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top losers */}
                {topLosers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-bold text-urgent">{t("portfolioInsights.monthly.topLosers")}</h4>
                    <div className="space-y-2">
                      {topLosers.map((item) => (
                        <div key={item.type} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{formatTypeName(item.type)}</span>
                            <span className="text-sm font-semibold text-urgent">{formatCurrency(item.netPerformance)}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-urgent" style={{ width: `${Math.min(100, (Math.abs(item.netPerformance) / Math.max(...topLosers.map(l => Math.abs(l.netPerformance)))) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance breakdown */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {isCurrentMonthSelected
                  ? t("portfolioInsights.monthly.driversTitleThis")
                  : t("portfolioInsights.monthly.driversTitleMonth", { month: formatMonthLabel(selectedMonth) })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("portfolioInsights.monthly.driversSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.monthly.investmentMovements")}</p>
                {selectedMonthMovementBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("portfolioInsights.monthly.noProfitMovements")}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMonthMovementBreakdown.map((item) => (
                      <div key={`movement-${item.label}`} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
                        <span className="text-foreground">{item.label}</span>
                        <span className={item.amount >= 0 ? "font-medium text-success" : "font-medium text-urgent"}>
                          {item.amount >= 0 ? "+" : ""}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
                  <span className="font-medium text-foreground">{t("portfolioInsights.monthly.movementsSubtotal")}</span>
                  <span className={selectedMonthMovementSubtotal >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                    {selectedMonthMovementSubtotal >= 0 ? "+" : ""}{formatCurrency(selectedMonthMovementSubtotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.monthly.earningsAndMarket")}</p>
                {selectedMonthEarningsAndMarketBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("portfolioInsights.monthly.noEarningsAndMarket")}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMonthEarningsAndMarketBreakdown.map((item) => (
                      <div key={`earning-${item.label}`} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
                        <span className="text-foreground">{item.label}</span>
                        <span className={item.amount >= 0 ? "font-medium text-success" : "font-medium text-urgent"}>
                          {item.amount >= 0 ? "+" : ""}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
                  <span className="font-medium text-foreground">{t("portfolioInsights.monthly.earningsCryptoSubtotal")}</span>
                  <span className={(selectedMonthEarningsSubtotal + selectedMonthLiveCryptoContribution) >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                    {(selectedMonthEarningsSubtotal + selectedMonthLiveCryptoContribution) >= 0 ? "+" : ""}
                    {formatCurrency(selectedMonthEarningsSubtotal + selectedMonthLiveCryptoContribution)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("portfolioInsights.monthly.explainedTotal")}</span>
                <span className={selectedMonthExplainedTotal >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                  {selectedMonthExplainedTotal >= 0 ? "+" : ""}{formatCurrency(selectedMonthExplainedTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("portfolioInsights.monthly.cardPerformance")}</span>
                <span className={selected.monthlyPerformance >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                  {selected.monthlyPerformance >= 0 ? "+" : ""}{formatCurrency(selected.monthlyPerformance)}
                </span>
              </div>
              {Math.abs(selectedMonthUnexplainedDelta) > 0.01 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("portfolioInsights.monthly.deltaNotExplained")}</span>
                  <span className={selectedMonthUnexplainedDelta >= 0 ? "font-semibold text-warning" : "font-semibold text-urgent"}>
                    {selectedMonthUnexplainedDelta >= 0 ? "+" : ""}{formatCurrency(selectedMonthUnexplainedDelta)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-muted/10 p-4 sm:p-5">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {t("portfolioInsights.monthly.investedBreakdownTitle", { month: formatMonthLabel(selectedMonth) })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("portfolioInsights.monthly.investedBreakdownSubtitle")}
                </p>
              </div>

              {selectedMonthInvestedBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("portfolioInsights.monthly.noInvestedMovements")}</p>
              ) : (
                <div className="space-y-2">
                  {selectedMonthInvestedBreakdown.map((item) => (
                    <div key={`invested-${item.label}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className={item.net >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                          {item.net >= 0 ? "+" : ""}{formatCurrency(item.net)}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>{t("portfolioInsights.monthly.contributions")}: {formatCurrency(item.contributions)}</span>
                        <span>{t("portfolioInsights.monthly.withdrawals")}: {formatCurrency(item.withdrawals)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("portfolioInsights.monthly.cardInvestedSource")}</span>
                  <span className="font-medium text-foreground">
                    {selectedMonthInvestedSource === "movements"
                      ? t("portfolioInsights.monthly.movementsSource")
                      : t("portfolioInsights.monthly.snapshotFallback")}
                  </span>
                </div>
                {selectedMonthInvestedSource === "snapshot" && selectedMonthSnapshotInflow != null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("portfolioInsights.monthly.snapshotMonthlyInflow")}</span>
                    <span className={selectedMonthSnapshotInflow >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                      {selectedMonthSnapshotInflow >= 0 ? "+" : ""}{formatCurrency(selectedMonthSnapshotInflow)}
                    </span>
                  </div>
                ) : null}
                {selectedMonthInvestedSource === "movements" && selectedMonthMovementInflow != null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("portfolioInsights.monthly.movementDerivedInflow")}</span>
                    <span className={selectedMonthMovementInflow >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                      {selectedMonthMovementInflow >= 0 ? "+" : ""}{formatCurrency(selectedMonthMovementInflow)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("portfolioInsights.monthly.explainedInvested")}</span>
                  <span className={selectedMonthInvestedExplainedTotal >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                    {selectedMonthInvestedExplainedTotal >= 0 ? "+" : ""}{formatCurrency(selectedMonthInvestedExplainedTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("portfolioInsights.monthly.cardInvested")}</span>
                  <span className={selected.monthlyInflow >= 0 ? "font-semibold text-success" : "font-semibold text-urgent"}>
                    {selected.monthlyInflow >= 0 ? "+" : ""}{formatCurrency(selected.monthlyInflow)}
                  </span>
                </div>
                {Math.abs(selectedMonthInvestedUnexplainedDelta) > 0.01 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("portfolioInsights.monthly.deltaNotYetExplained")}</span>
                    <span className={selectedMonthInvestedUnexplainedDelta >= 0 ? "font-semibold text-warning" : "font-semibold text-urgent"}>
                      {selectedMonthInvestedUnexplainedDelta >= 0 ? "+" : ""}{formatCurrency(selectedMonthInvestedUnexplainedDelta)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

        </CardContent>
      </Card>

      {/* ── Annual insights card ── */}
      <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>{t("portfolioInsights.annual.title")}</CardTitle>
              <CardDescription>{t("portfolioInsights.annual.description")}</CardDescription>
            </div>
            {annualYears.length > 1 ? (
              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/20 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={annualFocusYearIdx <= 0}
                  onClick={() => setSelectedAnnualYear(annualYears[annualFocusYearIdx - 1])}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-14 text-center text-sm font-medium text-foreground">{annualFocusYear}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={annualFocusYearIdx >= annualYears.length - 1}
                  onClick={() => setSelectedAnnualYear(annualYears[annualFocusYearIdx + 1])}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {/* Current year KPIs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{focusedAnnualInsight.year} return</p>
              <p className={`mt-2 text-xl font-semibold ${focusedAnnualInsight.annualReturnPct >= 0 ? "text-success" : "text-urgent"}`}>
                {formatPercentage(focusedAnnualInsight.annualReturnPct)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{focusedAnnualInsight.year} invested</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(focusedAnnualInsight.annualInflow)}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{focusedAnnualInsight.year} performance</p>
              <p className={`mt-2 text-xl font-semibold ${focusedAnnualInsight.annualPerformance >= 0 ? "text-success" : "text-urgent"}`}>
                {formatCurrency(focusedAnnualInsight.annualPerformance)}
              </p>
            </div>
          </div>

          {/* Best / worst year */}
          {annualInsights.length > 1 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.annual.bestYear")}</p>
                <div className="mt-2 flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{bestYear.year}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(bestYear.annualPerformance)} ({formatPercentage(bestYear.annualReturnPct)})
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.annual.worstYear")}</p>
                <div className="mt-2 flex items-center gap-2 text-urgent">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{worstYear.year}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(worstYear.annualPerformance)} ({formatPercentage(worstYear.annualReturnPct)})
                </p>
              </div>
            </div>
          )}

          {(annualTopGainers.length > 0 || annualTopLosers.length > 0) && (() => {
            const maxGain = Math.max(...annualTopGainers.map((g) => g.netPerformance), 1);
            const maxLoss = Math.max(...annualTopLosers.map((l) => Math.abs(l.netPerformance)), 1);
            return (
              <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("portfolioInsights.annual.growthDrivers", { year: annualFocusYear })}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("portfolioInsights.annual.growthDriversDesc", { year: annualFocusYear })}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {annualTopGainers.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.annual.topGrowth")}</p>
                      {annualTopGainers.map((item) => {
                        const barPct = Math.max(4, (item.netPerformance / maxGain) * 100);
                        return (
                          <div key={`annual-gain-${item.type}`} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{formatTypeName(item.type)}</span>
                              <span className="font-semibold tabular-nums text-success">+{formatCurrency(item.netPerformance)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-1.5 rounded-full bg-success transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {annualTopLosers.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolioInsights.annual.largestDrags")}</p>
                      {annualTopLosers.map((item) => {
                        const barPct = Math.max(4, (Math.abs(item.netPerformance) / maxLoss) * 100);
                        return (
                          <div key={`annual-loss-${item.type}`} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{formatTypeName(item.type)}</span>
                              <span className="font-semibold tabular-nums text-urgent">{formatCurrency(item.netPerformance)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-1.5 rounded-full bg-urgent transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}

          {/* Yearly evolution */}
          {annualInsights.length > 1 && (
            <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">{t("portfolioInsights.annual.yearlyEvolution")}</p>
              {annualInsights.map((yearData) => {
                const ratio = Math.max(3, (Math.abs(yearData.annualPerformance) / maxAbsAnnualPerformance) * 100);
                const isPositive = yearData.annualPerformance >= 0;
                return (
                  <div key={yearData.year} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{yearData.year}</span>
                      <span className={isPositive ? "text-success" : "text-urgent"}>
                        {formatCurrency(yearData.annualPerformance)} ({formatPercentage(yearData.annualReturnPct)})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className={`h-2 rounded-full ${isPositive ? "bg-success" : "bg-urgent"}`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Monthly evolution */}
          {reconstructedActiveSorted.length > 1 && (
            <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">{t("portfolioInsights.annual.monthlyEvolution")}</p>
              {visibleMonthlyRows.map((snapshot) => {
                const ratio = Math.max(3, (Math.abs(snapshot.monthlyPerformance) / maxAbsPerformance) * 100);
                const isPositive = snapshot.monthlyPerformance >= 0;
                return (
                  <div key={snapshot.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{formatMonthLabel(snapshot.month)}</span>
                      <span className={isPositive ? "text-success" : "text-urgent"}>
                        {formatCurrency(snapshot.monthlyPerformance)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className={`h-2 rounded-full ${isPositive ? "bg-success" : "bg-urgent"}`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
              {(remainingMonthlyRows > 0 || visibleMonthsCount > 3) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {remainingMonthlyRows > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleMonthsCount((c) => c + 9)}
                      className="h-8 rounded-full border-primary/35 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      {t("portfolioInsights.annual.loadMoreMonths", { count: Math.min(9, remainingMonthlyRows) })}
                    </Button>
                  )}
                  {visibleMonthsCount > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleMonthsCount(3)}
                      className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      {t("portfolioInsights.annual.showLast3Months")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Performance charts ── */}
      {(monthlyChartData.length > 1 || annualChartData.length > 0 || earningsEvolutionChartData.length > 1) && (
        <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
          <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
            <CardTitle>{t("portfolioInsights.charts.title")}</CardTitle>
            <CardDescription>{t("portfolioInsights.charts.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {monthlyChartData.length > 1 && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t("portfolioInsights.charts.monthlyTrendTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("portfolioInsights.charts.monthlyTrendDesc")}</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyChartData} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis dataKey="monthLabel" tick={chartAxisTickStyle} />
                        <YAxis tickFormatter={(value: number) => formatChartCurrency(value)} width={84} tick={chartAxisTickStyle} />
                        <Tooltip
                          contentStyle={chartTooltipContentStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          formatter={(value: number, name: string, item) => {
                            const dataKey = String(item?.dataKey ?? "");

                            if (dataKey === "performance") return [formatCurrency(value), t("portfolioInsights.labels.performance")];
                            if (dataKey === "inflow") return [formatCurrency(value), t("portfolioInsights.labels.invested")];
                            return [formatCurrency(value), name];
                          }}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? formatMonthLabel(payload[0].payload.month) : ""}
                        />
                        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "12px" }} formatter={renderChartLegendLabel} />
                        <Line
                          type="monotone"
                          dataKey="performance"
                          name={t("portfolioInsights.labels.performance")}
                          stroke="hsl(var(--success))"
                          strokeWidth={2.5}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="inflow"
                          name={t("portfolioInsights.labels.invested")}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {annualChartData.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t("portfolioInsights.charts.annualComparisonTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("portfolioInsights.charts.annualComparisonDesc")}</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={annualChartData} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis dataKey="year" tick={chartAxisTickStyle} />
                        <YAxis tickFormatter={(value: number) => formatChartCurrency(value)} width={84} tick={chartAxisTickStyle} />
                        <Tooltip
                          contentStyle={chartTooltipContentStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          formatter={(value: number, name: string, item) => {
                            const dataKey = String(item?.dataKey ?? "");

                            if (dataKey === "performance") {
                              const returnPct = item.payload.returnPct;
                              return [`${formatCurrency(value)} (${formatPercentage(returnPct)})`, t("portfolioInsights.labels.performance")];
                            }
                            return [formatCurrency(value), name];
                          }}
                        />
                        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "12px" }} formatter={renderChartLegendLabel} />
                        <Bar dataKey="performance" name={t("portfolioInsights.labels.performance")} radius={[6, 6, 0, 0]}>
                          {annualChartData.map((entry) => (
                            <Cell key={entry.year} fill={entry.performance >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {earningsEvolutionChartData.length > 1 && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t("portfolioInsights.charts.earningsEvolutionTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("portfolioInsights.charts.earningsEvolutionDesc")}</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={earningsEvolutionChartData} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis dataKey="monthLabel" tick={chartAxisTickStyle} />
                        <YAxis tickFormatter={(value: number) => formatChartCurrency(value)} width={84} tick={chartAxisTickStyle} />
                        <Tooltip
                          contentStyle={chartTooltipContentStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          formatter={(value: number, name: string, item) => {
                            const dataKey = String(item?.dataKey ?? "");
                            const formattedValue = Number(value).toLocaleString("pt-PT", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });

                            if (dataKey === "surveys") return [formattedValue, t("portfolioInsights.labels.surveys")];
                            if (dataKey === "cashback") return [formattedValue, t("portfolioInsights.labels.cashback")];
                            if (dataKey === "social_media") return [formattedValue, t("portfolioInsights.labels.socialMedia")];
                            if (dataKey === "dividend") return [formattedValue, t("portfolioInsights.labels.dividends")];
                            return [formattedValue, name];
                          }}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? formatMonthLabel(payload[0].payload.month) : ""}
                        />
                        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "12px" }} formatter={renderChartLegendLabel} />
                        <Line type="monotone" dataKey="surveys" name={t("portfolioInsights.labels.surveys")} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="cashback" name={t("portfolioInsights.labels.cashback")} stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="social_media" name={t("portfolioInsights.labels.socialMedia")} stroke="hsl(var(--warning))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="dividend" name={t("portfolioInsights.labels.dividends")} stroke="hsl(var(--accent-foreground))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {categoryGrowthChartData.length > 1 && (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{t("portfolioInsights.charts.longVsShortTitle")}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">{t("portfolioInsights.labels.long")} {formatCurrency(longTermProfit)} ({formatPercentage(longTermReturn)})</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">{t("portfolioInsights.labels.short")} {formatCurrency(shortTermProfit)} ({formatPercentage(shortTermReturn)})</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={categoryGrowthChartData} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="monthLabel" tick={chartAxisTickStyle} />
                        <YAxis tickFormatter={(value: number) => formatChartCurrency(value)} width={84} tick={chartAxisTickStyle} />
                      <Tooltip
                        contentStyle={chartTooltipContentStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                        formatter={(value: number, name: string, item) => {
                          const dataKey = String(item?.dataKey ?? "");

                          if (dataKey === "longPerformance") return [formatCurrency(value), t("portfolioInsights.labels.longTerm")];
                          if (dataKey === "shortPerformance") return [formatCurrency(value), t("portfolioInsights.labels.shortTerm")];
                          return [formatCurrency(value), name];
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? formatMonthLabel(payload[0].payload.month) : ""}
                      />
                      <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "12px" }} formatter={renderChartLegendLabel} />
                      <Line type="monotone" dataKey="longPerformance" name={t("portfolioInsights.labels.longTerm")} stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="shortPerformance" name={t("portfolioInsights.labels.shortTerm")} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
