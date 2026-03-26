import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Investment, MonthlySnapshot, PortfolioEarning, calculateSummary, formatCurrency, formatMonthLabel, formatPercentage } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";

interface MonthlyInsightsProps {
  snapshots: MonthlySnapshot[];
  investments: Investment[];
  earnings: PortfolioEarning[];
  netInvestedFlow?: number;
  monthlyPerformanceTotal?: number;
  monthEarnings?: number;
}

export function MonthlyInsights({ snapshots, investments, earnings, netInvestedFlow = 0, monthlyPerformanceTotal = 0, monthEarnings = 0 }: MonthlyInsightsProps) {
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(3);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

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
    acc[month] = (acc[month] ?? 0) + earning.amountEur;
    return acc;
  }, {});

  const movementStatsByMonth = investments.reduce<Record<string, { inflow: number; performance: number }>>((acc, investment) => {
    const movements = parseInvestmentMovements(investment.notes);
    movements.forEach((movement) => {
      if (movement.note === "Initial position") return;
      if (isNonInvestmentWithdrawal(movement)) return;

      const month = movement.date.slice(0, 7);
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
  ]);

  const sorted = [...snapshots]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((snapshot, index, arr) => {
      const previousSnapshot = index > 0 ? arr[index - 1] : null;
      const isCurrentMonth = snapshot.month === currentMonth;

      const monthlyInflow = Number.isFinite(snapshot.monthlyInflow)
        ? snapshot.monthlyInflow
        : previousSnapshot
          ? snapshot.totalInvested - previousSnapshot.totalInvested
          : snapshot.totalInvested;
      const monthlyPerformance = Number.isFinite(snapshot.monthlyPerformance)
        ? snapshot.monthlyPerformance
        : previousSnapshot
          ? snapshot.totalCurrentValue - previousSnapshot.totalCurrentValue - monthlyInflow
          : snapshot.totalProfitLoss;
      const monthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + monthlyInflow : monthlyInflow;
      const monthlyReturnPct = Number.isFinite(snapshot.monthlyReturnPct)
        ? snapshot.monthlyReturnPct
        : monthlyBase > 0
          ? (monthlyPerformance / monthlyBase) * 100
          : 0;

      const liveMonthlyInflow = previousSnapshot ? currentMonthInflow : liveSummary.totalInvested;
      const liveMonthlyPerformance = previousSnapshot
        ? liveSummary.totalCurrentValue - previousSnapshot.totalCurrentValue - liveMonthlyInflow
        : liveSummary.totalProfitLoss;
      const liveMonthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + liveMonthlyInflow : liveSummary.totalInvested;
      const earningsAmount = earningsByMonth[snapshot.month] ?? 0;
      const adjustedMonthlyPerformance = monthlyPerformance;
      const adjustedLiveMonthlyPerformance = liveMonthlyPerformance;
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
      currentMonth,
    ]),
  ).sort();

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
      const monthlyInflow = existing?.monthlyInflow ?? movementStatsByMonth[month]?.inflow ?? 0;
      const monthlyPerformance = existing?.monthlyPerformance ?? (movementStatsByMonth[month]?.performance ?? 0);
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
        earningsAmount: earningsByMonth[month] ?? 0,
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

  const selectedMonth = selected.month;
  const isCurrentMonthSelected = selectedMonth === currentMonth;
  const latestMonthEarnings = earningsByMonth[selectedMonth] ?? 0;

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

  // Collect profit/return movements for the selected month
  const recentMovements = investments
    .flatMap((inv) =>
      parseInvestmentMovements(inv.notes).map((m) => ({ ...m, investmentName: inv.name }))
    )
    .filter((m) =>
      m.note !== "Initial position" &&
      (m.kind === "adjustment" || m.kind === "cashback") &&
      m.date.startsWith(selectedMonth)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const movementKindLabel: Record<string, string> = {
    contribution: "Contribution",
    withdrawal: "Withdrawal",
    adjustment: "Profit / Return",
    cashback: "Cashback",
  };
  const movementKindColor: Record<string, string> = {
    contribution: "text-primary",
    withdrawal: "text-urgent",
    adjustment: "text-success",
    cashback: "text-success",
  };

  // Calculate performance by category for selected month
  type CategoryPerformance = {
    category: string;
    profit: number;
    loss: number;
    netPerformance: number;
  };

  const categoryPerformanceMap = new Map<string, CategoryPerformance>();

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
        const existing = categoryPerformanceMap.get(inv.category) || {
          category: inv.category,
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
        categoryPerformanceMap.set(inv.category, existing);
      });
  });

  const categoryPerformanceList = Array.from(categoryPerformanceMap.values())
    .sort((a, b) => b.netPerformance - a.netPerformance);

  const topGainers = categoryPerformanceList
    .filter((c) => c.netPerformance > 0)
    .slice(0, 5);

  const topLosers = categoryPerformanceList
    .filter((c) => c.netPerformance < 0)
    .sort((a, b) => a.netPerformance - b.netPerformance)
    .slice(0, 5);

  return (
    <>
      {/* ── Annual insights card ── */}
      <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <CardTitle>Annual insights</CardTitle>
          <CardDescription>Year-to-date performance overview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {/* Current year KPIs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{latestYear.year} return</p>
              <p className={`mt-2 text-xl font-semibold ${latestYear.annualReturnPct >= 0 ? "text-success" : "text-urgent"}`}>
                {formatPercentage(latestYear.annualReturnPct)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{latestYear.year} invested</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(latestYear.annualInflow)}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{latestYear.year} performance</p>
              <p className={`mt-2 text-xl font-semibold ${latestYear.annualPerformance >= 0 ? "text-success" : "text-urgent"}`}>
                {formatCurrency(latestYear.annualPerformance)}
              </p>
            </div>
          </div>

          {/* Best / worst year */}
          {annualInsights.length > 1 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best year</p>
                <div className="mt-2 flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{bestYear.year}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(bestYear.annualPerformance)} ({formatPercentage(bestYear.annualReturnPct)})
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Worst year</p>
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

          {/* Yearly evolution */}
          {annualInsights.length > 1 && (
            <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">Yearly evolution</p>
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
        </CardContent>
      </Card>

      {/* ── Monthly insights card ── */}
      <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <CardTitle>Monthly insights</CardTitle>
          <CardDescription>Month-by-month performance tracking.</CardDescription>
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
                  ? `This month · ${formatMonthLabel(selectedMonth)}`
                  : formatMonthLabel(selectedMonth)}
              </span>
              {!isCurrentMonthSelected ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMonthKey(currentMonth)}>
                  Current month
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
                {isCurrentMonthSelected ? "This month return" : `${formatMonthLabel(selectedMonth)} return`}
              </p>
              <p className={`mt-2 text-xl font-semibold ${selected.monthlyReturnPct >= 0 ? "text-success" : "text-urgent"}`}>
                {formatPercentage(selected.monthlyReturnPct)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isCurrentMonthSelected ? "This month invested" : `${formatMonthLabel(selectedMonth)} invested`}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(selected.monthlyInflow)}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isCurrentMonthSelected ? "This month performance" : `${formatMonthLabel(selectedMonth)} performance`}
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best month</p>
                <div className="mt-2 flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{formatMonthLabel(bestMonth.month)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(bestMonth.monthlyPerformance)}</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Worst month</p>
                <div className="mt-2 flex items-center gap-2 text-urgent">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{formatMonthLabel(worstMonth.month)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(worstMonth.monthlyPerformance)}</p>
              </div>
            </div>
          )}

          {/* Recent movements for this month */}
          {recentMovements.length > 0 && (
            <div className="rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground mb-3">
                {isCurrentMonthSelected ? "Profit / returns" : `Profit / returns · ${formatMonthLabel(selectedMonth)}`}
              </p>
              <div className="space-y-2">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground truncate">{m.investmentName}</span>
                      {m.note && m.note !== "Profit / Return" && (
                        <span className="ml-1 text-xs text-muted-foreground">· {m.note}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold text-sm ${m.amount < 0 ? "text-urgent" : "text-success"}`}>
                        {m.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(m.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly evolution */}
          {reconstructedActiveSorted.length > 1 && (
            <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">Monthly evolution</p>
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
              {remainingMonthlyRows > 0 && (
                <button type="button" onClick={() => setVisibleMonthsCount((c) => c + 9)} className="text-xs font-medium text-primary hover:underline">
                  {`Load ${Math.min(9, remainingMonthlyRows)} more month${Math.min(9, remainingMonthlyRows) === 1 ? "" : "s"}`}
                </button>
              )}
              {visibleMonthsCount > 3 && (
                <button type="button" onClick={() => setVisibleMonthsCount(3)} className="text-xs font-medium text-primary hover:underline">
                  Show only last 3 months
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Performance by category ── */}
      {(topGainers.length > 0 || topLosers.length > 0) && (
        <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
          <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
            <CardTitle>Performance by category</CardTitle>
            <CardDescription>
              {isCurrentMonthSelected ? "This month's" : `${formatMonthLabel(selectedMonth)}`} category performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top gainers */}
              {topGainers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Top gainers</h4>
                  <div className="space-y-2">
                    {topGainers.map((cat) => (
                      <div key={cat.category} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground capitalize">{cat.category}</span>
                          <span className="text-sm font-semibold text-success">+{formatCurrency(cat.netPerformance)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-success" style={{ width: `${Math.min(100, (cat.netPerformance / Math.max(...topGainers.map(g => g.netPerformance))) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top losers */}
              {topLosers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Top losers</h4>
                  <div className="space-y-2">
                    {topLosers.map((cat) => (
                      <div key={cat.category} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground capitalize">{cat.category}</span>
                          <span className="text-sm font-semibold text-urgent">{formatCurrency(cat.netPerformance)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-urgent" style={{ width: `${Math.min(100, (Math.abs(cat.netPerformance) / Math.max(...topLosers.map(l => Math.abs(l.netPerformance)))) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
