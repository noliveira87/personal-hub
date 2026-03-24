import { Pencil, Trash2 } from "lucide-react";
import { Investment, calculateProfitLoss, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  index: number;
}

const TYPE_EMOJI: Record<string, string> = {
  cash: "💰",
  etf: "📈",
  crypto: "₿",
  p2p: "🤝",
  ppr: "🏦",
};

export function InvestmentCard({ investment, onEdit, onDelete, index }: InvestmentCardProps) {
  const { profitLoss, percentage } = calculateProfitLoss(investment);
  const isPositive = profitLoss >= 0;

  return (
    <div
      className="group animate-fade-in rounded-2xl border border-border/80 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{TYPE_EMOJI[investment.type] || "💰"}</span>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-semibold text-foreground">{investment.name}</h3>
            <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">{investment.type}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={() => onEdit(investment)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(investment.id)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 sm:p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Invested</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(investment.investedAmount)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(investment.currentValue)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">P&amp;L</p>
          <p className={`text-sm font-bold ${isPositive ? "text-profit" : "text-loss"}`}>
            {formatCurrency(profitLoss)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            isPositive ? "bg-profit\/10 text-profit" : "bg-loss\/10 text-loss"
          }`}
        >
          {formatPercentage(percentage)}
        </span>
      </div>

      {investment.notes && (
        <p className="mt-4 rounded-2xl bg-muted/40 px-3 py-2 text-xs italic leading-5 text-muted-foreground">{investment.notes}</p>
      )}
    </div>
  );
}
