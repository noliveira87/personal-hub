import { Investment, calculateSummary, formatCurrency, formatPercentage } from "@/types/investment";
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
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(summary.totalCurrentValue)}
          </span>
          <span className={`font-semibold ${isPositive ? "text-profit" : "text-loss"}`}>
            {formatPercentage(summary.percentageReturn)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
