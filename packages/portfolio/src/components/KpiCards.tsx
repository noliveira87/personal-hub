import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { InvestmentSummary, formatCurrency, formatPercentage } from "@/types/investment";

interface KpiCardsProps {
  summary: InvestmentSummary;
}

export function KpiCards({ summary }: KpiCardsProps) {
  const isPositive = summary.totalProfitLoss >= 0;

  const cards = [
    {
      label: "Total Invested",
      value: formatCurrency(summary.totalInvested),
      icon: Wallet,
      accent: "primary" as const,
    },
    {
      label: "Current Value",
      value: formatCurrency(summary.totalCurrentValue),
      icon: PiggyBank,
      accent: "primary" as const,
    },
    {
      label: "Profit / Loss",
      value: formatCurrency(summary.totalProfitLoss),
      icon: isPositive ? TrendingUp : TrendingDown,
      accent: isPositive ? "profit" as const : "loss" as const,
    },
    {
      label: "Return",
      value: formatPercentage(summary.percentageReturn),
      icon: isPositive ? TrendingUp : TrendingDown,
      accent: isPositive ? "profit" as const : "loss" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="animate-fade-in rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {card.label}
            </span>
            <div
              className={`rounded-xl p-2.5 ${
                card.accent === "profit"
                  ? "bg-profit\/10 text-profit"
                  : card.accent === "loss"
                  ? "bg-loss\/10 text-loss"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight sm:text-[1.75rem] ${
              card.accent === "profit"
                ? "text-profit"
                : card.accent === "loss"
                ? "text-loss"
                : "text-foreground"
            }`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
