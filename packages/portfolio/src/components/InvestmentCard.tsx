import { Pencil, Trash2 } from "lucide-react";
import { Investment, calculateProfitLoss, formatCurrency, formatPercentage } from "@/types/investment";

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
      className="rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_EMOJI[investment.type] || "💰"}</span>
          <div>
            <h3 className="font-semibold text-foreground">{investment.name}</h3>
            <span className="text-xs text-muted-foreground capitalize">{investment.type}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Invested</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(investment.investedAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(investment.currentValue)}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">P&L</p>
          <p className={`text-sm font-bold ${isPositive ? "text-profit" : "text-loss"}`}>
            {formatCurrency(profitLoss)}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isPositive ? "bg-profit\/10 text-profit" : "bg-loss\/10 text-loss"
          }`}
        >
          {formatPercentage(percentage)}
        </span>
      </div>

      {investment.notes && (
        <p className="mt-2 text-xs text-muted-foreground italic">{investment.notes}</p>
      )}
    </div>
  );
}
