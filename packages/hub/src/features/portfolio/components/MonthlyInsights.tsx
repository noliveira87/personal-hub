import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlySnapshot, formatCurrency, formatMonthLabel, formatPercentage } from "@/features/portfolio/types/investment";

interface MonthlyInsightsProps {
  snapshots: MonthlySnapshot[];
}

export function MonthlyInsights({ snapshots }: MonthlyInsightsProps) {
  if (!snapshots.length) {
    return null;
  }

  const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
  const recent = sorted.slice(-6);
  const latest = sorted[sorted.length - 1];

  const bestMonth = sorted.reduce((best, current) =>
    current.monthlyPerformance > best.monthlyPerformance ? current : best,
  sorted[0]);

  const worstMonth = sorted.reduce((worst, current) =>
    current.monthlyPerformance < worst.monthlyPerformance ? current : worst,
  sorted[0]);

  const maxAbsPerformance = Math.max(...recent.map(m => Math.abs(m.monthlyPerformance)), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly insights</CardTitle>
        <CardDescription>Track monthly inflows vs market performance and evolution trends.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month return</p>
            <p className={`mt-2 text-xl font-semibold ${latest.monthlyReturnPct >= 0 ? "text-profit" : "text-loss"}`}>
              {formatPercentage(latest.monthlyReturnPct)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month inflow</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(latest.monthlyInflow)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">This month performance</p>
            <p className={`mt-2 text-xl font-semibold ${latest.monthlyPerformance >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(latest.monthlyPerformance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Best month</p>
            <div className="mt-2 flex items-center gap-2 text-profit">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">{formatMonthLabel(bestMonth.month)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(bestMonth.monthlyPerformance)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Worst month</p>
            <div className="mt-2 flex items-center gap-2 text-loss">
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">{formatMonthLabel(worstMonth.month)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(worstMonth.monthlyPerformance)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Monthly evolution (last 6 months)</p>
          {recent.map((snapshot) => {
            const ratio = Math.max(3, (Math.abs(snapshot.monthlyPerformance) / maxAbsPerformance) * 100);
            const isPositive = snapshot.monthlyPerformance >= 0;

            return (
              <div key={snapshot.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatMonthLabel(snapshot.month)}</span>
                  <span className={isPositive ? "text-profit" : "text-loss"}>
                    {formatCurrency(snapshot.monthlyPerformance)} ({formatPercentage(snapshot.monthlyReturnPct)})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${isPositive ? "bg-profit" : "bg-loss"}`}
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
