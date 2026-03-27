import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { Investment, PortfolioEarning, formatCurrency } from "@/features/portfolio/types/investment";

interface AllocationSectionProps {
  investments: Investment[];
  earnings: PortfolioEarning[];
}

const typeLabel: Record<string, string> = {
  cash: "Cash",
  aforro: "Aforro",
  etf: "ETFs",
  crypto: "Crypto",
  p2p: "P2P",
  ppr: "PPR",
};

export function AllocationSection({ investments, earnings }: AllocationSectionProps) {
  const currentYear = String(new Date().getFullYear());

  const { totalCurrentValue, byType, longTerm, shortTerm } = useMemo(() => {
    const total = investments.reduce((sum, item) => sum + item.currentValue, 0);
    const perType = investments.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + item.currentValue;
      return acc;
    }, {});

    const byTypeRows = Object.entries(perType)
      .map(([type, value]) => ({
        type,
        label: typeLabel[type] ?? type,
        value,
        ratio: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const long = investments
      .filter((item) => item.category === "long-term")
      .reduce((sum, item) => sum + item.currentValue, 0);

    const short = investments
      .filter((item) => item.category === "short-term")
      .reduce((sum, item) => sum + item.currentValue, 0);

    return {
      totalCurrentValue: total,
      byType: byTypeRows,
      longTerm: long,
      shortTerm: short,
    };
  }, [investments]);

  const earningsState = useMemo(() => {
    const yearly = earnings.filter((item) => item.date.startsWith(currentYear));
    const surveys = yearly.filter((item) => item.kind === "survey");
    const cashback = yearly.filter((item) => item.kind === "cashback");

    const surveysTotal = surveys.reduce((sum, item) => sum + item.amountEur, 0);
    const cashbackTotal = cashback.reduce((sum, item) => sum + item.amountEur, 0);
    const total = surveysTotal + cashbackTotal;

    return {
      surveysTotal,
      cashbackTotal,
      surveysRatio: total > 0 ? (surveysTotal / total) * 100 : 0,
      cashbackRatio: total > 0 ? (cashbackTotal / total) * 100 : 0,
    };
  }, [earnings, currentYear]);

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PieChart className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Current allocation</h2>
          </div>
          <p className="text-sm text-muted-foreground">How your portfolio is split right now.</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
          {formatCurrency(totalCurrentValue)} total current value
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Long-term</p>
              <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(longTerm)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Short-term</p>
              <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(shortTerm)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {byType.map((row) => (
              <div key={row.type} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{formatCurrency(row.value)} · {row.ratio.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, row.ratio)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:border-l lg:border-border/70 lg:pl-5">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Surveys · {currentYear}</p>
              <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(earningsState.surveysTotal)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cashback · {currentYear}</p>
              <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(earningsState.cashbackTotal)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">Surveys</span>
                <span className="text-muted-foreground">{formatCurrency(earningsState.surveysTotal)} · {earningsState.surveysRatio.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, earningsState.surveysRatio)}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">Cashback</span>
                <span className="text-muted-foreground">{formatCurrency(earningsState.cashbackTotal)} · {earningsState.cashbackRatio.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, earningsState.cashbackRatio)}%` }} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
