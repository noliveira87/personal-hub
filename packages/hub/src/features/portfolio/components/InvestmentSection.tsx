import { useState } from "react";
import { Clock3, Landmark } from "lucide-react";
import { Investment, formatCurrency, formatMonthLabel, formatPercentage } from "@/features/portfolio/types/investment";
import { InvestmentCard } from "./InvestmentCard";
import { CryptoQuoteMap, parseInvestmentMovements, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

interface InvestmentSectionProps {
  title: string;
  category: "short-term" | "long-term";
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onQuickContribution: (investment: Investment, payload: { amount: number; date: string; mode: "contribution" | "value_update"; unitsBought?: number | null }) => void;
  onMoveInvestment: (category: "short-term" | "long-term", id: string, direction: "up" | "down") => void;
  cryptoSpotEur?: CryptoQuoteMap | null;
  cryptoQuoteLoading?: boolean;
}

export function InvestmentSection({ title, category, investments, onEdit, onDelete, onQuickContribution, onMoveInvestment, cryptoSpotEur, cryptoQuoteLoading }: InvestmentSectionProps) {
  const { t } = useI18n();
  const [showAllMovements, setShowAllMovements] = useState(false);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const SectionIcon = category === "long-term" ? Landmark : Clock3;

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + resolveInvestmentCurrentValue(inv, cryptoSpotEur),
    0,
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const percentageReturn = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const summary = {
    totalCurrentValue,
    totalProfitLoss,
    percentageReturn,
  };
  const isPositive = summary.totalProfitLoss >= 0;

  const recentMovements = investments
    .flatMap((inv) =>
      parseInvestmentMovements(inv.notes)
        .filter((m) => m.date.startsWith(currentMonth) && m.note !== "Initial position" && (m.kind === "contribution" || m.kind === "adjustment" || m.kind === "cashback"))
        .map((m) => ({ ...m, investmentName: inv.name })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);

  const visibleMovements = showAllMovements ? recentMovements : recentMovements.slice(0, 5);
  const hasMoreMovements = recentMovements.length > 5;

  const movementLabel: Record<string, string> = {
    contribution: t("portfolio.movementLabels.contribution"),
    adjustment: t("portfolio.movementLabels.profitLoss"),
    cashback: t("portfolio.movementLabels.profitLoss"),
  };

  const formatMovementDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (investments.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SectionIcon className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-primary sm:text-xl">{title}</h2>
          </div>
          <p className="pl-[3.25rem] text-sm text-muted-foreground">
            {investments.length} {investments.length === 1 ? t("portfolio.positionsOne") : t("portfolio.positionsMany")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
            <span className="mr-1 text-xs uppercase tracking-wide opacity-60">{t("portfolio.current")}</span>
            {formatCurrency(summary.totalCurrentValue)}
          </span>
          <span className={`rounded-full px-3 py-1.5 font-semibold ${isPositive ? "bg-success/10 text-success" : "bg-urgent/10 text-urgent"}`}>
            {formatPercentage(summary.percentageReturn)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {investments.map((inv, i) => (
          <InvestmentCard
            key={inv.id}
            investment={inv}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickContribution={onQuickContribution}
            onMove={(id, direction) => onMoveInvestment(category, id, direction)}
            canMoveUp={i > 0}
            canMoveDown={i < investments.length - 1}
            index={i}
            cryptoSpotEur={cryptoSpotEur}
            cryptoQuoteLoading={cryptoQuoteLoading}
          />
        ))}
      </div>

      {recentMovements.length > 0 ? (
        <div className="mt-6 border-t border-border/70 pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-primary sm:text-lg">{t("portfolio.profitReturns")}</h3>
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {t("portfolio.currentMonthLabel")}: {formatMonthLabel(currentMonth)}
            </span>
          </div>
          <div className="space-y-2">
            {visibleMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0 flex items-center gap-2 overflow-hidden">
                  <span className="font-medium text-foreground shrink-0">{movement.investmentName}</span>
                  <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                    <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${movement.kind === "contribution" ? "bg-primary/10 text-primary" : movement.amount < 0 ? "bg-urgent/10 text-urgent" : "bg-success/10 text-success"}`}>
                      {movementLabel[movement.kind] ?? movement.kind}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {formatMovementDate(movement.date)}
                    </span>
                  </div>
                  {movement.note && movement.note !== t("portfolio.profitReturnDefaultNote") ? (
                    <span className="text-xs text-muted-foreground truncate">{movement.note}</span>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm ${movement.kind === "contribution" ? "text-primary" : movement.amount < 0 ? "text-urgent" : "text-success"}`}>
                    {movement.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(movement.amount))}
                  </p>
                </div>
              </div>
            ))}

            {hasMoreMovements ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
                onClick={() => setShowAllMovements((prev) => !prev)}
              >
                {showAllMovements ? t("portfolio.showLess") : t("portfolio.showMore")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
