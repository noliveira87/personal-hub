import { useMemo, useState, Suspense, lazy } from "react";
import { ChartLine } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import { parseInvestmentMovements, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";
import { calculateSummary, formatCurrency, formatMonthLabel } from "@/features/portfolio/types/investment";

export default function PortfolioInsightsPage() {
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
        title="Insights"
        icon={ChartLine}
        backTo="/portfolio"
        backLabel="Back to portfolio"
      />

      <main className="pt-16 min-h-screen">
        <div className="container py-6 lg:py-8 space-y-6 lg:space-y-8">
          <div className="flex items-center justify-between gap-4 px-1">
            <h2 className="text-lg font-semibold text-foreground">Monthly insights</h2>
            <div className="max-w-[180px]">
              <Select value={effectiveMonth ?? undefined} onValueChange={setSelectedMonth}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month} value={month}>{formatMonthLabel(month)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <MonthlyInsights snapshots={monthlySnapshots} investments={resolvedInvestments} earnings={earnings} netInvestedFlow={netInvestedFlow} monthlyPerformanceTotal={performanceTotal} monthEarnings={monthEarnings} />
        </div>
      </main>
    </div>
  );
}
