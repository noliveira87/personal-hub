import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortfolioEarning, formatCurrency, formatMonthLabel } from "@/features/portfolio/types/investment";

const PAGE_SIZE = 5;

interface EarningsSectionProps {
  earnings: PortfolioEarning[];
  onAdd: () => void;
  onEdit: (earning: PortfolioEarning) => void;
  onDelete: (id: string) => void;
}

const kindLabel: Record<string, string> = {
  cashback: "Cashback",
  survey: "Survey",
  social_media: "Social media",
  crypto_cashback: "Crypto cashback",
};

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const offsetMonth = (monthKey: string, delta: number) => {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date((y || 2026), (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function EarningsSection({ earnings, onAdd, onEdit, onDelete }: EarningsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");

  const availableMonths = useMemo(() => {
    const months = new Set(earnings.map((e) => e.date.slice(0, 7)));
    months.add(currentMonthKey());
    return Array.from(months).sort();
  }, [earnings]);

  const prevMonth = offsetMonth(selectedMonth, -1);
  const nextMonth = offsetMonth(selectedMonth, 1);
  const hasPrev = availableMonths.includes(prevMonth) || availableMonths.some((m) => m < selectedMonth);
  const hasNext = selectedMonth < currentMonthKey();

  const handlePrev = () => {
    // jump to the closest available month before the current one
    const before = availableMonths.filter((m) => m < selectedMonth);
    if (before.length) setSelectedMonth(before[before.length - 1]);
    setVisibleCount(PAGE_SIZE);
  };

  const handleNext = () => {
    const after = availableMonths.filter((m) => m > selectedMonth);
    if (after.length) setSelectedMonth(after[0]);
    setVisibleCount(PAGE_SIZE);
  };

  const monthEarnings = useMemo(
    () => [...earnings]
      .filter((e) => e.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [earnings, selectedMonth],
  );

  const filteredMonthEarnings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return monthEarnings;

    return monthEarnings.filter((earning) => {
      const kind = kindLabel[earning.kind] ?? earning.kind;
      const haystack = [earning.title, earning.provider, earning.notes, earning.date, kind]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [monthEarnings, searchTerm]);

  const monthTotal = monthEarnings.reduce((sum, e) => sum + e.amountEur, 0);
  const monthSurveyCount = monthEarnings.filter((earning) => earning.kind === "survey").length;
  const monthCashbackCount = monthEarnings.filter((earning) => earning.kind === "cashback").length;
  const monthSurveyTotal = monthEarnings
    .filter((earning) => earning.kind === "survey")
    .reduce((sum, earning) => sum + earning.amountEur, 0);
  const monthCashbackTotal = monthEarnings
    .filter((earning) => earning.kind === "cashback")
    .reduce((sum, earning) => sum + earning.amountEur, 0);

  const currentYear = String(new Date().getFullYear());
  const yearEarnings = earnings.filter((earning) => earning.date.startsWith(currentYear));
  const yearSurveyTotal = yearEarnings
    .filter((earning) => earning.kind === "survey")
    .reduce((sum, earning) => sum + earning.amountEur, 0);
  const yearCashbackTotal = yearEarnings
    .filter((earning) => earning.kind === "cashback")
    .reduce((sum, earning) => sum + earning.amountEur, 0);
  const yearTotal = yearSurveyTotal + yearCashbackTotal;
  const yearSurveyRatio = yearTotal > 0 ? (yearSurveyTotal / yearTotal) * 100 : 0;
  const yearCashbackRatio = yearTotal > 0 ? (yearCashbackTotal / yearTotal) * 100 : 0;
  const visible = filteredMonthEarnings.slice(0, visibleCount);
  const remaining = Math.max(0, filteredMonthEarnings.length - visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm]);

  const isCurrentMonth = selectedMonth === currentMonthKey();

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gift className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Rewards & surveys</h2>
          </div>
          <p className="text-sm text-muted-foreground">Monthly ledger for cashback, surveys and crypto cashback.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/15 px-4 py-2 text-sm text-success">
            <span className="font-bold">{formatCurrency(monthTotal)}</span>
            <span className="text-success/80">·</span>
            <span className="font-medium text-success/90">
              {isCurrentMonth ? "this month" : `in ${formatMonthLabel(selectedMonth)}`}
            </span>
          </span>
          <Button onClick={onAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Add earning</span>
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Surveys · {currentYear}</p>
            <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(yearSurveyTotal)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cashback · {currentYear}</p>
            <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(yearCashbackTotal)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">Surveys</span>
              <span className="text-muted-foreground">{formatCurrency(yearSurveyTotal)} · {yearSurveyRatio.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, yearSurveyRatio)}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">Cashback</span>
              <span className="text-muted-foreground">{formatCurrency(yearCashbackTotal)} · {yearCashbackRatio.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, yearCashbackRatio)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" onClick={handlePrev} disabled={!hasPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {isCurrentMonth ? `This month · ${formatMonthLabel(selectedMonth)}` : formatMonthLabel(selectedMonth)}
          </span>
          {!isCurrentMonth ? (
            <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedMonth(currentMonthKey()); setVisibleCount(PAGE_SIZE); }}>
              Current month
            </Button>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={handleNext} disabled={!hasNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search earnings..."
          aria-label="Search earnings"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {monthSurveyCount} surveys ({formatCurrency(monthSurveyTotal)}) · {monthCashbackCount} cashback ({formatCurrency(monthCashbackTotal)}) in {formatMonthLabel(selectedMonth)}
        </p>
      </div>

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((earning) => (
            <div key={earning.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{earning.title}</span>
                  {earning.provider ? <span className="text-sm text-muted-foreground">· {earning.provider}</span> : null}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {kindLabel[earning.kind] ?? earning.kind}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {earning.date}
                  {earning.cryptoUnits && earning.cryptoAsset
                    ? ` · ${earning.cryptoUnits.toFixed(8)} ${earning.cryptoAsset}`
                    : ""}
                  {earning.notes ? ` · ${earning.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-[84px] text-right font-semibold text-success">{formatCurrency(earning.amountEur)}</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(earning)}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(earning.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {`Load ${Math.min(PAGE_SIZE, remaining)} more`}
              </button>
            </div>
          )}
          {visibleCount > PAGE_SIZE && remaining === 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount(PAGE_SIZE)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Show less
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          {searchTerm.trim()
            ? `No results for "${searchTerm.trim()}" in ${formatMonthLabel(selectedMonth)}.`
            : isCurrentMonth
              ? "No rewards logged this month yet."
              : `No rewards recorded for ${formatMonthLabel(selectedMonth)}.`}
        </div>
      )}
    </section>
  );
}
