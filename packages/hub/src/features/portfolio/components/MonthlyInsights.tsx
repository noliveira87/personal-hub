import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Investment, MonthlySnapshot, formatCurrency, formatMonthLabel, formatPercentage } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";

interface MonthlyInsightsProps {
  snapshots: MonthlySnapshot[];
  investments: Investment[];
}

export function MonthlyInsights({ snapshots, investments }: MonthlyInsightsProps) {
  if (!snapshots.length) {
    return null;
  }


  const movementInflowByMonth = investments.reduce((acc, investment) => {
    const movements = parseInvestmentMovements(investment.notes);

    movements.forEach((movement) => {
      if (movement.note === "Initial position") {
        return;
      }

      if (movement.kind !== "contribution" && movement.kind !== "withdrawal") {
        return;
      }

      const month = movement.date.slice(0, 7);
      const signedAmount = movement.kind === "withdrawal" ? -movement.amount : movement.amount;
      acc.set(month, (acc.get(month) ?? 0) + signedAmount);
    });

    return acc;
  }, new Map<string, number>());

  // Performance by month = sum of adjustment + cashback movements only
  const movementPerformanceByMonth = investments.reduce((acc, investment) => {
    const movements = parseInvestmentMovements(investment.notes);

    movements.forEach((movement) => {
      if (movement.kind !== "adjustment" && movement.kind !== "cashback") {
        return;
      }

      const month = movement.date.slice(0, 7);
      acc.set(month, (acc.get(month) ?? 0) + movement.amount);
    });

    return acc;
  }, new Map<string, number>());

  const sorted = [...snapshots]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((snapshot, index, arr) => {
      const previousSnapshot = index > 0 ? arr[index - 1] : null;
      const monthlyInflow = movementInflowByMonth.get(snapshot.month) ?? 0;
      // Performance is based on adjustment + cashback movements added this month
      // not the change in portfolio value (which includes pre-existing gains)
      const monthlyPerformance = movementPerformanceByMonth.get(snapshot.month) ?? 0;
      const monthlyBase = previousSnapshot ? previousSnapshot.totalCurrentValue + monthlyInflow : monthlyInflow;
      const monthlyReturnPct = monthlyBase > 0 ? (monthlyPerformance / monthlyBase) * 100 : 0;

      return {
        ...snapshot,
        monthlyInflow,
        monthlyPerformance,
        monthlyReturnPct,
      };
    });

  // The first snapshot is the baseline anchor (previous month seed). Exclude it from
  // display and accumulations — use it only as a reference value for the month after it.
  const activeSorted = sorted.length > 1 ? sorted.slice(1) : sorted;

  if (!activeSorted.length) return null;

  const recent = activeSorted.slice(-6);
  const latest = activeSorted[activeSorted.length - 1];

  type AnnualInsight = {
    year: string;
    annualInflow: number;
    annualPerformance: number;
    openingCurrentValue: number;
    closingCurrentValue: number;
    annualReturnPct: number;
  };

  const annualMap = new Map<string, Omit<AnnualInsight, "annualReturnPct">>();

  activeSorted.forEach((snapshot) => {
    const year = snapshot.month.slice(0, 4);
    // Look up the actual previous snapshot in the full sorted array (may be the baseline)
    const fullIndex = sorted.findIndex(s => s.month === snapshot.month);
    const previousSnapshot = fullIndex > 0 ? sorted[fullIndex - 1] : null;

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

  const bestMonth = activeSorted.reduce((best, current) =>
    current.monthlyPerformance > best.monthlyPerformance ? current : best,
  activeSorted[0]);

  const worstMonth = activeSorted.reduce((worst, current) =>
    current.monthlyPerformance < worst.monthlyPerformance ? current : worst,
  activeSorted[0]);

  const bestYear = annualInsights.reduce((best, current) =>
    current.annualPerformance > best.annualPerformance ? current : best,
  annualInsights[0]);

  const worstYear = annualInsights.reduce((worst, current) =>
    current.annualPerformance < worst.annualPerformance ? current : worst,
  annualInsights[0]);

  const maxAbsPerformance = Math.max(...recent.map(m => Math.abs(m.monthlyPerformance)), 1);
  const maxAbsAnnualPerformance = Math.max(...annualInsights.map(y => Math.abs(y.annualPerformance)), 1);

  // Collect only profit/return movements (adjustments & cashback) — these drive performance.
  // Contributions and withdrawals affect inflow, not performance.
  const recentMovements = investments
    .flatMap((inv) =>
      parseInvestmentMovements(inv.notes).map((m) => ({ ...m, investmentName: inv.name }))
    )
    .filter((m) => m.note !== "Initial position" && (m.kind === "adjustment" || m.kind === "cashback"))
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

  return (
    <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
      <CardHeader className="space-y-2 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
        <CardTitle>Monthly insights</CardTitle>
        <CardDescription>Track monthly and yearly invested capital, performance and return trends over time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month return</p>
            <p className={`mt-2 text-xl font-semibold ${latest.monthlyReturnPct >= 0 ? "text-success" : "text-urgent"}`}>
              {formatPercentage(latest.monthlyReturnPct)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month invested</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(latest.monthlyInflow)}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month performance</p>
            <p className={`mt-2 text-xl font-semibold ${latest.monthlyPerformance >= 0 ? "text-success" : "text-urgent"}`}>
              {formatCurrency(latest.monthlyPerformance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">Annual insights</p>
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
                    <div
                      className={`h-2 rounded-full ${isPositive ? "bg-success" : "bg-urgent"}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
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

          {recentMovements.length > 0 && (
            <div className="flex-1 rounded-2xl border border-border/80 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground mb-3">Recent profit / returns</p>
              <div className="space-y-2">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground truncate">{m.investmentName}</span>
                      <span className={`ml-2 text-xs font-semibold ${m.amount < 0 ? "text-urgent" : movementKindColor[m.kind] ?? "text-muted-foreground"}`}>
                        {movementKindLabel[m.kind] ?? m.kind}
                      </span>
                      {m.note && m.note !== "Profit / Return" && (
                        <span className="ml-1 text-xs text-muted-foreground">· {m.note}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${m.amount < 0 ? "text-urgent" : movementKindColor[m.kind] ?? "text-foreground"}`}>
                        {m.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(m.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/80 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">Monthly evolution (last 6 months)</p>
          {recent.map((snapshot) => {
            const ratio = Math.max(3, (Math.abs(snapshot.monthlyPerformance) / maxAbsPerformance) * 100);
            const isPositive = snapshot.monthlyPerformance >= 0;

            return (
              <div key={snapshot.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatMonthLabel(snapshot.month)}</span>
                  <span className={isPositive ? "text-success" : "text-urgent"}>
                    {formatCurrency(snapshot.monthlyPerformance)} ({formatPercentage(snapshot.monthlyReturnPct)})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${isPositive ? "bg-success" : "bg-urgent"}`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
