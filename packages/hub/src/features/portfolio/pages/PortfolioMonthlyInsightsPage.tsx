import { useMemo } from "react";
import { ChartLine } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";

import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { useCryptoHistory, useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import { buildSyntheticCryptoCashbackEarnings, parseCryptoNotes, parseInvestmentMovements, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";
import { useI18n } from "@/i18n/I18nProvider";

export default function PortfolioInsightsPage() {
  const { t } = useI18n();
  const { investments, earnings } = useInvestments();
  const { pricesEur: cryptoSpotEur } = useCryptoQuotes();
  const { seriesEur: cryptoHistoryEur } = useCryptoHistory();

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

    resolvedEarnings.forEach((earning) => monthSet.add(earning.date.slice(0, 7)));
    movementRows.forEach((movement) => monthSet.add(movement.date.slice(0, 7)));

    const now = new Date();
    monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

    return Array.from(monthSet).sort();
  }, [resolvedEarnings, movementRows]);

  const effectiveMonth = months[months.length - 1] ?? null;

  const monthMovements = movementRows.filter((movement) => effectiveMonth && movement.date.startsWith(effectiveMonth));

  const contributionsTotal = monthMovements
    .filter((movement) => movement.kind === "contribution")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const withdrawalsTotal = monthMovements
    .filter((movement) => movement.kind === "withdrawal" && !isNonInvestmentWithdrawal(movement))
    .reduce((sum, movement) => sum + movement.amount, 0);

  const netInvestedFlow = contributionsTotal - withdrawalsTotal;

  const getPreviousMonthKey = (monthKey: string) => {
    const [yearRaw, monthRaw] = monthKey.split("-").map(Number);
    if (!Number.isFinite(yearRaw) || !Number.isFinite(monthRaw) || monthRaw < 1 || monthRaw > 12) {
      return null;
    }

    const dt = new Date(yearRaw, monthRaw - 1, 1);
    dt.setMonth(dt.getMonth() - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  // Month-to-date crypto market drift (crypto-only):
  // opening month units * (spot now - previous month close spot).
  // This avoids leaking non-crypto portfolio changes into crypto delta.
  const liveCryptoPerformance = useMemo(() => {
    if (!effectiveMonth) return 0;

    const previousMonthKey = getPreviousMonthKey(effectiveMonth);
    if (!previousMonthKey) return 0;

    const resolvePreviousClose = (asset: "BTC" | "ETH") => {
      const points = cryptoHistoryEur[asset] ?? [];
      const point = points.find((item) => item.month === previousMonthKey);
      return point?.priceEur ?? null;
    };

    const previousBtcClose = resolvePreviousClose("BTC");
    const previousEthClose = resolvePreviousClose("ETH");
    const currentBtcSpot = cryptoSpotEur.BTC ?? null;
    const currentEthSpot = cryptoSpotEur.ETH ?? null;

    const drift = resolvedInvestments
      .filter((investment) => investment.type === "crypto")
      .reduce((sum, investment) => {
        const { asset: mainAsset, units, cashbackAsset, cashbackUnits } = parseCryptoNotes(investment.notes);
        const isCashbackOnly = investment.investedAmount === 0 && !(units && units > 0) && !!cashbackUnits;

        let monthStartMainUnits = mainAsset === "BTC" || mainAsset === "ETH" ? (units ?? 0) : 0;
        let monthStartCashbackUnits = cashbackAsset === "BTC" || cashbackAsset === "ETH" ? (cashbackUnits ?? 0) : 0;

        const monthMovements = parseInvestmentMovements(investment.notes)
          .filter((movement) => movement.units != null && movement.units > 0 && movement.date.startsWith(effectiveMonth));

        for (const movement of monthMovements) {
          const rawUnits = movement.units ?? 0;
          const delta = movement.kind === "withdrawal" ? -rawUnits : rawUnits;
          const affectsCashbackUnits = isCashbackOnly || movement.kind === "cashback";

          if (affectsCashbackUnits) {
            monthStartCashbackUnits -= delta;
          } else {
            monthStartMainUnits -= delta;
          }
        }

        const safeMainUnits = Math.max(0, monthStartMainUnits);
        const safeCashbackUnits = Math.max(0, monthStartCashbackUnits);

        const resolvePrices = (asset: "BTC" | "ETH") => {
          if (asset === "BTC") return { prev: previousBtcClose, now: currentBtcSpot };
          return { prev: previousEthClose, now: currentEthSpot };
        };

        const mainPrices = resolvePrices(mainAsset);
        const cashbackPrices = resolvePrices(cashbackAsset);

        const mainDelta = mainPrices.prev != null && mainPrices.now != null
          ? safeMainUnits * (mainPrices.now - mainPrices.prev)
          : 0;
        const cashbackDelta = cashbackPrices.prev != null && cashbackPrices.now != null
          ? safeCashbackUnits * (cashbackPrices.now - cashbackPrices.prev)
          : 0;

        return sum + mainDelta + cashbackDelta;
      }, 0);

    return Number.isFinite(drift) ? drift : 0;
  }, [effectiveMonth, cryptoHistoryEur, cryptoSpotEur.BTC, cryptoSpotEur.ETH, resolvedInvestments]);

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title={t("layout.nav.insights")}
        icon={ChartLine}
        backTo="/portfolio"
        backLabel={t("portfolio.backToPortfolio")}
      />

      <main className="pt-16 min-h-screen">
        <div className="container py-6 lg:py-8 space-y-6 lg:space-y-8">
          <MonthlyInsights investments={resolvedInvestments} earnings={resolvedEarnings} netInvestedFlow={netInvestedFlow} liveCryptoPerformance={liveCryptoPerformance} />
        </div>
      </main>
    </div>
  );
}
