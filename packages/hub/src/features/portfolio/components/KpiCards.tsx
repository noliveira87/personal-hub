import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { InvestmentSummary, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";
import { useI18n } from "@/i18n/I18nProvider";

interface KpiCardsProps {
  summary: InvestmentSummary;
}

export function KpiCards({ summary }: KpiCardsProps) {
  const { hideAmounts } = useI18n();
  
  const cards = useMemo(() => {
    const isPositive = summary.totalProfitLoss >= 0;

    return [
    {
      label: "Current Value",
      value: formatCurrency(summary.totalCurrentValue),
      icon: PiggyBank,
      accent: "current" as const,
    },
    {
      label: "Total Invested",
      value: formatCurrency(summary.totalInvested),
      icon: Wallet,
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
  }, [summary, hideAmounts]);

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
                card.accent === "current"
                  ? "bg-primary/10 text-primary"
                  :
                card.accent === "profit"
                  ? "bg-success/10 text-success"
                  : card.accent === "loss"
                  ? "bg-urgent/10 text-urgent"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight sm:text-[1.75rem] ${
              card.accent === "current"
                ? "text-primary"
                :
              card.accent === "profit"
                ? "text-success"
                : card.accent === "loss"
                ? "text-urgent"
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
