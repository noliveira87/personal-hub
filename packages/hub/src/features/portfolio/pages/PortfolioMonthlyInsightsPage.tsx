import { useMemo, useState } from "react";
import { ChartLine } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import { parseInvestmentMovements, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";
import { calculateSummary, formatCurrency, formatMonthLabel } from "@/features/portfolio/types/investment";

export default function PortfolioMonthlyInsightsPage() {
  const { investments, monthlySnapshots, earnings } = useInvestments();
  const { pricesEur: cryptoSpotEur } = useCryptoQuotes();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const resolvedInvestments = investments.map((investment) => ({
    ...investment,
    currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
  }));

  const isNonInvestmentWithdrawal = (movement: { id?: string; kind: string; note?: string }) => {
    if (movement.kind !== "withdrawal") return false;
    if (movement.id === "goparity-2026-01-03-ajuste-amortizacao-capital") return true;

    const normalizedNote = movement.note?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
    return normalizedNote.includes("amortizacao de capital");
  };

  const movementRows = useMemo(() => (
    resolvedInvestments.flatMap((investment) =>
      parseInvestmentMovements(investment.notes).map((movement) => ({
        ...movement,
        investmentName: investment.name,
        investmentCategory: investment.category,
        investmentType: investment.type,
      })),
    )
  ), [resolvedInvestments]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();

    monthlySnapshots.forEach((snapshot) => months.add(snapshot.month));
    earnings.forEach((earning) => months.add(earning.date.slice(0, 7)));
    movementRows.forEach((movement) => months.add(movement.date.slice(0, 7)));

    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

    return Array.from(months).sort();
  }, [monthlySnapshots, earnings, movementRows]);

  const effectiveMonth = selectedMonth && monthOptions.includes(selectedMonth)
    ? selectedMonth
    : (monthOptions[monthOptions.length - 1] ?? null);

  const monthMovements = movementRows.filter((movement) => effectiveMonth && movement.date.startsWith(effectiveMonth));
  const monthEarnings = earnings
    .filter((earning) => effectiveMonth && earning.date.startsWith(effectiveMonth))
    .reduce((sum, earning) => sum + earning.amountEur, 0);

  const contributionsTotal = monthMovements
    .filter((movement) => movement.kind === "contribution")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const withdrawalsTotal = monthMovements
    .filter((movement) => movement.kind === "withdrawal" && !isNonInvestmentWithdrawal(movement))
    .reduce((sum, movement) => sum + movement.amount, 0);

  const performanceTotal = monthMovements
    .filter((movement) => movement.kind === "adjustment" || movement.kind === "cashback")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const netInvestedFlow = contributionsTotal - withdrawalsTotal;

  const contributionByInvestment = Array.from(
    monthMovements
      .filter((movement) => movement.kind === "adjustment" || movement.kind === "cashback")
      .reduce((acc, movement) => {
        const key = movement.investmentName;
        acc.set(key, {
          investmentName: movement.investmentName,
          category: movement.investmentCategory,
          amount: (acc.get(key)?.amount ?? 0) + movement.amount,
          movementsCount: (acc.get(key)?.movementsCount ?? 0) + 1,
        });
        return acc;
      }, new Map<string, { investmentName: string; category: string; amount: number; movementsCount: number }>()),
  ).map(([, value]) => value);

  const topContributors = [...contributionByInvestment]
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topDrags = [...contributionByInvestment]
    .filter((row) => row.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  const categoryBreakdown = Array.from(
    resolvedInvestments.reduce((acc, investment) => {
      const key = investment.category;
      const current = acc.get(key) ?? { category: key, invested: 0, currentValue: 0 };
      current.invested += investment.investedAmount;
      current.currentValue += investment.currentValue;
      acc.set(key, current);
      return acc;
    }, new Map<string, { category: string; invested: number; currentValue: number }>()),
  )
    .map(([, row]) => {
      const profitLoss = row.currentValue - row.invested;
      return { ...row, profitLoss };
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  const summary = calculateSummary(resolvedInvestments);

  const monthlyCategoryFlows = Array.from(
    monthMovements.reduce((acc, movement) => {
      const key = movement.investmentCategory;
      const current = acc.get(key) ?? { category: key, inflow: 0, performance: 0 };

      if (movement.kind === "contribution") {
        current.inflow += movement.amount;
      } else if (movement.kind === "withdrawal" && !isNonInvestmentWithdrawal(movement)) {
        current.inflow -= movement.amount;
      } else if (movement.kind === "adjustment" || movement.kind === "cashback") {
        current.performance += movement.amount;
      }

      acc.set(key, current);
      return acc;
    }, new Map<string, { category: string; inflow: number; performance: number }>()),
  ).map(([, value]) => value);

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title="Monthly Insights"
        icon={ChartLine}
        backTo="/portfolio"
        backLabel="Back to portfolio"
      />

      <main className="pt-16 min-h-screen">
        <div className="container py-6 lg:py-8 space-y-8 lg:space-y-10">
          <Card className="overflow-hidden rounded-3xl border-border/80 shadow-sm">
            <CardHeader className="space-y-3 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
              <CardTitle>Monthly analytics</CardTitle>
              <CardDescription>Insights not shown on the main portfolio page.</CardDescription>
              <div className="max-w-[220px]">
                <Select value={effectiveMonth ?? undefined} onValueChange={setSelectedMonth}>
                  <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>{formatMonthLabel(month)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Net invested flow</p>
                  <p className={`mt-2 text-xl font-semibold ${netInvestedFlow >= 0 ? "text-success" : "text-urgent"}`}>{formatCurrency(netInvestedFlow)}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly performance</p>
                  <p className={`mt-2 text-xl font-semibold ${performanceTotal >= 0 ? "text-success" : "text-urgent"}`}>{formatCurrency(performanceTotal)}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rewards earned</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(monthEarnings)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 text-sm">
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-muted-foreground">Contributions</p>
                  <p className="mt-1 font-semibold text-foreground">{formatCurrency(contributionsTotal)}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-muted-foreground">Withdrawals (investment)</p>
                  <p className="mt-1 font-semibold text-foreground">{formatCurrency(withdrawalsTotal)}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-muted-foreground">Selected month</p>
                  <p className="mt-1 font-semibold text-foreground">{effectiveMonth ? formatMonthLabel(effectiveMonth) : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/80 shadow-sm">
              <CardHeader className="space-y-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                <CardTitle>Top contributors (month)</CardTitle>
                <CardDescription>Biggest positive contributors from adjustments/cashback.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-5 py-5 sm:px-6 sm:py-6">
                {topContributors.length ? topContributors.map((item) => (
                  <div key={item.investmentName} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.investmentName}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <p className="font-semibold text-success">+{formatCurrency(item.amount)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No positive contributors in this month.</p>}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/80 shadow-sm">
              <CardHeader className="space-y-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                <CardTitle>Top drags (month)</CardTitle>
                <CardDescription>Biggest negative contributors from adjustments/cashback.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-5 py-5 sm:px-6 sm:py-6">
                {topDrags.length ? topDrags.map((item) => (
                  <div key={item.investmentName} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.investmentName}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <p className="font-semibold text-urgent">{formatCurrency(item.amount)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No negative contributors in this month.</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardHeader className="space-y-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
              <CardTitle>Portfolio by category</CardTitle>
              <CardDescription>Current value, invested capital and P/L split by category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 py-5 sm:px-6 sm:py-6">
              {categoryBreakdown.map((row) => {
                const share = summary.totalCurrentValue > 0 ? (row.currentValue / summary.totalCurrentValue) * 100 : 0;
                return (
                  <div key={row.category} className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium capitalize text-foreground">{row.category}</p>
                      <p className="text-xs text-muted-foreground">{share.toFixed(2)}% of total</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <p><span className="text-muted-foreground">Invested:</span> <span className="font-medium text-foreground">{formatCurrency(row.invested)}</span></p>
                      <p><span className="text-muted-foreground">Current:</span> <span className="font-medium text-foreground">{formatCurrency(row.currentValue)}</span></p>
                      <p>
                        <span className="text-muted-foreground">P/L:</span>{" "}
                        <span className={`font-medium ${row.profitLoss >= 0 ? "text-success" : "text-urgent"}`}>{formatCurrency(row.profitLoss)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/80 shadow-sm">
            <CardHeader className="space-y-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
              <CardTitle>Monthly contribution by category</CardTitle>
              <CardDescription>How each category contributed in selected month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 py-5 sm:px-6 sm:py-6">
              {monthlyCategoryFlows.length ? monthlyCategoryFlows.map((row) => (
                <div key={row.category} className="flex flex-col gap-1 rounded-xl border border-border/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium capitalize text-foreground">{row.category}</p>
                  <div className="flex items-center gap-4">
                    <p className="text-muted-foreground">Inflow: <span className={row.inflow >= 0 ? "text-success" : "text-urgent"}>{formatCurrency(row.inflow)}</span></p>
                    <p className="text-muted-foreground">Performance: <span className={row.performance >= 0 ? "text-success" : "text-urgent"}>{formatCurrency(row.performance)}</span></p>
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No category movements in this month.</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
