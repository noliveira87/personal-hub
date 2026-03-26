import { Investment, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";
import { InvestmentCard } from "./InvestmentCard";
import { CryptoQuoteMap, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";

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

  if (investments.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {investments.length} {investments.length === 1 ? "position" : "positions"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
            <span className="mr-1 text-xs uppercase tracking-wide opacity-60">Current</span>
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
    </section>
  );
}
