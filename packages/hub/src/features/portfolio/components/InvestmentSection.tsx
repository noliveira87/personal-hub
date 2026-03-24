import { Investment, calculateSummary, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";
import { InvestmentCard } from "./InvestmentCard";

interface InvestmentSectionProps {
  title: string;
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
}

export function InvestmentSection({ title, investments, onEdit, onDelete }: InvestmentSectionProps) {
  const summary = calculateSummary(investments);
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
            {formatCurrency(summary.totalCurrentValue)}
          </span>
          <span className={`rounded-full px-3 py-1.5 font-semibold ${isPositive ? "bg-profit\/10 text-profit" : "bg-loss\/10 text-loss"}`}>
            {formatPercentage(summary.percentageReturn)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {investments.map((inv, i) => (
          <InvestmentCard
            key={inv.id}
            investment={inv}
            onEdit={onEdit}
            onDelete={onDelete}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
