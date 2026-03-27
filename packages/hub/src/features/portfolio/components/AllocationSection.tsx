import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { Investment, formatCurrency } from "@/features/portfolio/types/investment";

interface AllocationSectionProps {
  investments: Investment[];
}

const typeLabel: Record<string, string> = {
  cash: "Cash",
  aforro: "Aforro",
  etf: "ETFs",
  crypto: "Crypto",
  p2p: "P2P",
  ppr: "PPR",
};

export function AllocationSection({ investments }: AllocationSectionProps) {
  const { longTerm, shortTerm, longTermByType, shortTermByType } = useMemo(() => {
    const longTermInvestments = investments.filter((item) => item.category === "long-term");
    const shortTermInvestments = investments.filter((item) => item.category === "short-term");

    const long = longTermInvestments.reduce((sum, item) => sum + item.currentValue, 0);
    const short = shortTermInvestments.reduce((sum, item) => sum + item.currentValue, 0);

    const buildRows = (list: Investment[], total: number) => {
      const perType = list.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + item.currentValue;
        return acc;
      }, {});

      return Object.entries(perType)
        .map(([type, value]) => ({
          type,
          label: typeLabel[type] ?? type,
          value,
          ratio: total > 0 ? (value / total) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    };

    return {
      longTerm: long,
      shortTerm: short,
      longTermByType: buildRows(longTermInvestments, long),
      shortTermByType: buildRows(shortTermInvestments, short),
    };
  }, [investments]);

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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">Long-term</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(longTerm)}</p>
          </div>

          <div className="space-y-3">
            {longTermByType.map((row) => (
              <div key={`long-${row.type}`} className="space-y-1.5">
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

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">Short-term</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(shortTerm)}</p>
          </div>

          <div className="space-y-3">
            {shortTermByType.map((row) => (
              <div key={`short-${row.type}`} className="space-y-1.5">
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
      </div>
    </section>
  );
}
