import { useMemo } from "react";
import { ChartLine } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";

import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import { buildSyntheticCryptoCashbackEarnings, parseInvestmentMovements, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";

export default function PortfolioInsightsPage() {
  const { investments, monthlySnapshots, earnings } = useInvestments();
  const { pricesEur: cryptoSpotEur } = useCryptoQuotes();

  const resolvedInvestments = investments.map((investment) => ({
    ...investment,
    currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
  }));

  const resolvedEarnings = useMemo(() => {
    const syntheticCryptoCashback = buildSyntheticCryptoCashbackEarnings(resolvedInvestments, cryptoSpotEur);
    const existingKeys = new Set(
      earnings.map((earning) => `${earning.kind}:${earning.title}:${earning.date}:${earning.cryptoAsset ?? ""}:${earning.cryptoUnits ?? ""}`),
    );

    return [
      ...earnings,
      ...syntheticCryptoCashback.filter((earning) => {
        const key = `${earning.kind}:${earning.title}:${earning.date}:${earning.cryptoAsset ?? ""}:${earning.cryptoUnits ?? ""}`;
        return !existingKeys.has(key);
      }),
    ];
  }, [earnings, resolvedInvestments, cryptoSpotEur]);

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

  const months = useMemo(() => {
    const monthSet = new Set<string>();

    monthlySnapshots.forEach((snapshot) => monthSet.add(snapshot.month));
    resolvedEarnings.forEach((earning) => monthSet.add(earning.date.slice(0, 7)));
    movementRows.forEach((movement) => monthSet.add(movement.date.slice(0, 7)));

    const now = new Date();
    monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

    return Array.from(monthSet).sort();
  }, [monthlySnapshots, resolvedEarnings, movementRows]);

  const effectiveMonth = months[months.length - 1] ?? null;

  const monthMovements = movementRows.filter((movement) => effectiveMonth && movement.date.startsWith(effectiveMonth));
  const monthEarnings = resolvedEarnings
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

  // Live crypto market move: only crypto should fluctuate "by itself" between manual updates.
  // We compare resolved (spot-based) value with stored value for crypto rows.
  const liveCryptoPerformance = resolvedInvestments
    .filter((investment) => investment.type === "crypto")
    .reduce((sum, investment) => {
      const original = investments.find((item) => item.id === investment.id);
      if (!original) return sum;
      return sum + (investment.currentValue - original.currentValue);
    }, 0);

  const netInvestedFlow = contributionsTotal - withdrawalsTotal;

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
          <MonthlyInsights snapshots={monthlySnapshots} investments={resolvedInvestments} earnings={resolvedEarnings} netInvestedFlow={netInvestedFlow} monthlyPerformanceTotal={performanceTotal} monthEarnings={monthEarnings} liveCryptoPerformance={liveCryptoPerformance} />
        </div>
      </main>
    </div>
  );
}
