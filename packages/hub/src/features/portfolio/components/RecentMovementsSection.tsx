import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Investment, formatCurrency } from "@/features/portfolio/types/investment";
import { parseInvestmentMovements } from "@/features/portfolio/lib/crypto";

interface RecentMovementsSectionProps {
  investments: Investment[];
}

export function RecentMovementsSection({ investments }: RecentMovementsSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<"long-term" | "short-term", boolean>>({
    "long-term": false,
    "short-term": false,
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Collect movements grouped by category
  const groupedMovements = investments.reduce<Record<string, Array<{ id: string; date: string; investmentName: string; amount: number; note?: string }>>>(
    (acc, inv) => {
      const movements = parseInvestmentMovements(inv.notes);
      const categoryMovements = movements
        .filter((m) =>
          m.note !== "Initial position" &&
          (m.kind === "adjustment" || m.kind === "cashback") &&
          m.date.startsWith(currentMonth)
        )
        .map((m) => ({ ...m, investmentName: inv.name }));

      if (categoryMovements.length > 0) {
        const category = inv.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(...categoryMovements);
      }
      return acc;
    },
    {}
  );

  // If no movements, don't render
  const hasMovements = Object.values(groupedMovements).some(arr => arr.length > 0);
  if (!hasMovements) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-border/70 pb-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">Profit / returns</h2>
          <p className="text-sm text-muted-foreground">Monthly movements by investment category</p>
        </div>
      </div>

      <div className="space-y-6">
        {(["long-term", "short-term"] as const).map((category) => {
          const categoryMovements = (groupedMovements[category] || []).sort((a, b) => b.date.localeCompare(a.date));
          if (categoryMovements.length === 0) return null;

          const isExpanded = expandedCategories[category];
          const visibleMovements = isExpanded ? categoryMovements : categoryMovements.slice(0, 5);
          const hasMoreThanFive = categoryMovements.length > 5;

          return (
            <div key={category}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                {category === "long-term" ? "Long-term investments" : "Short-term investments"}
              </p>
              <div className="space-y-2">
                {visibleMovements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground truncate">{m.investmentName}</span>
                        {m.note && m.note !== "Profit / Return" && (
                          <span className="ml-1 text-xs text-muted-foreground">· {m.note}</span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-sm ${m.amount < 0 ? "text-urgent" : "text-success"}`}>
                          {m.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(m.amount))}
                        </p>
                      </div>
                    </div>
                  ))}

                {hasMoreThanFive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
                    onClick={() =>
                      setExpandedCategories((prev) => ({
                        ...prev,
                        [category]: !prev[category],
                      }))
                    }
                  >
                    {isExpanded
                      ? "Show less"
                      : `Load ${Math.min(5, categoryMovements.length - 5)} more`}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
