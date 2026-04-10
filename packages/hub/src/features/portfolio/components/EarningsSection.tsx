import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioEarning, formatCurrency, formatMonthLabel } from "@/features/portfolio/types/investment";
import { CryptoQuoteMap } from "@/features/portfolio/lib/crypto";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_SIZE = 5;
const CASHBACK_HERO_CUTOFF_DATE = "2026-04-01";

const isOnOrAfterCashbackCutoff = (rawDate?: string) => {
  if (!rawDate) return false;
  const normalized = rawDate.length === 10 ? `${rawDate}T00:00:00Z` : rawDate;
  const parsedTs = Date.parse(normalized);
  const cutoffTs = Date.parse(`${CASHBACK_HERO_CUTOFF_DATE}T00:00:00Z`);
  return Number.isFinite(parsedTs) && parsedTs >= cutoffTs;
};

interface EarningsSectionProps {
  earnings: PortfolioEarning[];
  cryptoSpotEur?: CryptoQuoteMap | null;
  loading?: boolean;
  onAdd: () => void;
  onEdit: (earning: PortfolioEarning) => void;
  onDelete: (id: string) => void;
}

const kindLabel: Record<string, string> = {
  cashback: "Cashback",
  survey: "Survey",
  dividend: "Dividend",
  social_media: "Social media",
  crypto_cashback: "Crypto cashback",
};

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const offsetMonth = (monthKey: string, delta: number) => {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date((y || 2026), (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function EarningsSection({ earnings, cryptoSpotEur, loading = false, onAdd, onEdit, onDelete }: EarningsSectionProps) {
  const { t } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const sortedEarnings = useMemo(
    () => [...earnings].sort((a, b) => b.date.localeCompare(a.date)),
    [earnings],
  );

  const earningsData = useMemo(() => {
    const monthMap = new Map<string, PortfolioEarning[]>();
    const months = new Set<string>([currentMonthKey()]);
    const allTime = {
      survey: 0,
      social_media: 0,
      cashback: 0,
      dividend: 0,
    };

    for (const earning of sortedEarnings) {
      const monthKey = earning.date.slice(0, 7);
      months.add(monthKey);

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.push(earning);
      } else {
        monthMap.set(monthKey, [earning]);
      }

      if (earning.kind === "survey") allTime.survey += earning.amountEur;
      if (earning.kind === "social_media") allTime.social_media += earning.amountEur;
      if (earning.kind === "cashback" || earning.kind === "crypto_cashback") allTime.cashback += earning.amountEur;
      if (earning.kind === "dividend") allTime.dividend += earning.amountEur;
    }

    return {
      availableMonths: Array.from(months).sort(),
      monthMap,
      allTime,
    };
  }, [sortedEarnings]);

  const availableMonths = earningsData.availableMonths;

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
    () => earningsData.monthMap.get(selectedMonth) ?? [],
    [earningsData, selectedMonth],
  );

  const monthStats = useMemo(() => {
    const stats = {
      total: 0,
      surveyCount: 0,
      socialMediaCount: 0,
      cashbackCount: 0,
      dividendCount: 0,
      surveyTotal: 0,
      socialMediaTotal: 0,
      cashbackTotal: 0,
      dividendTotal: 0,
    };

    for (const earning of monthEarnings) {
      stats.total += earning.amountEur;

      if (earning.kind === "survey") {
        stats.surveyCount += 1;
        stats.surveyTotal += earning.amountEur;
      }

      if (earning.kind === "social_media") {
        stats.socialMediaCount += 1;
        stats.socialMediaTotal += earning.amountEur;
      }

      if (earning.kind === "cashback" || earning.kind === "crypto_cashback") {
        stats.cashbackCount += 1;
        stats.cashbackTotal += earning.amountEur;
      }

      if (earning.kind === "dividend") {
        stats.dividendCount += 1;
        stats.dividendTotal += earning.amountEur;
      }
    }

    return stats;
  }, [monthEarnings]);

  const searchableEarnings = useMemo(() => {
    const query = deferredSearchTerm.trim();

    if (!query) {
      return monthEarnings;
    }

    const normalizedQuery = query.toLowerCase();

    return sortedEarnings.filter((earning) => {
      const kind = kindLabel[earning.kind] ?? earning.kind;
      const haystack = [earning.title, earning.provider, earning.notes, earning.date, kind]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredSearchTerm, monthEarnings, sortedEarnings]);

  // Cashback entries are managed in Reward Wallet — exclude them from the list but keep sums.
  const filteredMonthEarnings = searchableEarnings.filter((earning) => {
    const isCashbackKind = earning.kind === "cashback" || earning.kind === "crypto_cashback";
    if (!isCashbackKind) return true;
    if (earning.externalSource === "cashback_hero") return false;
    if (isOnOrAfterCashbackCutoff(earning.date)) return false;
    return true;
  });

  const monthTotal = monthStats.total;
  const monthSurveyCount = monthStats.surveyCount;
  const monthSocialMediaCount = monthStats.socialMediaCount;
  const monthCashbackCount = monthStats.cashbackCount;
  const monthDividendCount = monthStats.dividendCount;
  const monthSurveyTotal = monthStats.surveyTotal;
  const monthSocialMediaTotal = monthStats.socialMediaTotal;
  const monthCashbackTotal = monthStats.cashbackTotal;
  const monthDividendTotal = monthStats.dividendTotal;

  const allTimeSurveyTotal = earningsData.allTime.survey;
  const allTimeSocialMediaTotal = earningsData.allTime.social_media;
  const allTimeDividendTotal = earningsData.allTime.dividend;
  const allTimeCashbackTotal = useMemo(() => {
    return sortedEarnings.reduce((sum, earning) => {
      if (earning.kind === "cashback") {
        return sum + earning.amountEur;
      }

      if (earning.kind === "crypto_cashback") {
        const liveSpot = earning.cryptoAsset ? cryptoSpotEur?.[earning.cryptoAsset] : null;
        if (earning.cryptoUnits && liveSpot && liveSpot > 0) {
          return sum + (earning.cryptoUnits * liveSpot);
        }
        return sum + earning.amountEur;
      }

      return sum;
    }, 0);
  }, [cryptoSpotEur, sortedEarnings]);

  const monthTrackedTotal = monthSurveyTotal + monthSocialMediaTotal + monthCashbackTotal + monthDividendTotal;
  const monthSurveyRatio = monthTrackedTotal > 0 ? (monthSurveyTotal / monthTrackedTotal) * 100 : 0;
  const monthSocialMediaRatio = monthTrackedTotal > 0 ? (monthSocialMediaTotal / monthTrackedTotal) * 100 : 0;
  const monthCashbackRatio = monthTrackedTotal > 0 ? (monthCashbackTotal / monthTrackedTotal) * 100 : 0;
  const monthDividendRatio = monthTrackedTotal > 0 ? (monthDividendTotal / monthTrackedTotal) * 100 : 0;
  const monthSplitRows = [
    {
      key: "surveys",
      label: "Surveys",
      value: monthSurveyTotal,
      ratio: monthSurveyRatio,
    },
    {
      key: "cashback",
      label: "Cashback",
      value: monthCashbackTotal,
      ratio: monthCashbackRatio,
    },
    ...(monthSocialMediaTotal > 0
      ? [{
        key: "social_media",
        label: "Social media",
        value: monthSocialMediaTotal,
        ratio: monthSocialMediaRatio,
      }]
      : []),
    ...(monthDividendTotal > 0
      ? [{
        key: "dividend",
        label: "Dividend",
        value: monthDividendTotal,
        ratio: monthDividendRatio,
      }]
      : []),
  ].sort((a, b) => b.value - a.value);

  const visible = filteredMonthEarnings.slice(0, visibleCount);
  const remaining = Math.max(0, filteredMonthEarnings.length - visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm]);

  const isCurrentMonth = selectedMonth === currentMonthKey();

  return (
    <section className="relative rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <Button
        type="button"
        size="icon"
        onClick={onAdd}
        aria-label="Add earning"
        className="absolute right-5 top-5 z-10 h-9 w-9 rounded-lg sm:hidden"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <div className="mb-5 space-y-3 border-b border-border/70 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-14 sm:pr-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gift className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Rewards & surveys</h2>
          </div>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-success/30 bg-success/15 px-4 py-2 text-sm text-success">
              <span className="font-bold">{formatCurrency(monthTotal)}</span>
              <span className="text-success/80">·</span>
              <span className="font-medium text-success/90">
                {isCurrentMonth ? "this month" : `in ${formatMonthLabel(selectedMonth)}`}
              </span>
            </span>
            <Button
              type="button"
              size="icon"
              onClick={onAdd}
              aria-label="Add earning"
              className="hidden h-9 w-9 rounded-lg sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:flex-nowrap sm:gap-2">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-500/25 bg-orange-500/8 px-3 py-1.5 text-xs font-medium text-orange-600/85">
            <span>Cashback</span>
            <span className="font-bold">{formatCurrency(allTimeCashbackTotal)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-purple-500/25 bg-purple-500/8 px-3 py-1.5 text-xs font-medium text-purple-600/85">
            <span>Surveys</span>
            <span className="font-bold">{formatCurrency(allTimeSurveyTotal)}</span>
            <span className="text-[11px] text-purple-600/70">· all-time</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-pink-500/25 bg-pink-500/8 px-3 py-1.5 text-xs font-medium text-pink-600/85">
            <span>Social media</span>
            <span className="font-bold">{formatCurrency(allTimeSocialMediaTotal)}</span>
            <span className="text-[11px] text-pink-600/70">· all-time</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-500/25 bg-sky-500/8 px-3 py-1.5 text-xs font-medium text-sky-600/85">
            <span>Dividends</span>
            <span className="font-bold">{formatCurrency(allTimeDividendTotal)}</span>
            <span className="text-[11px] text-sky-600/70">· all-time</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mb-5 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`earnings-loading-${index}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-5">
          <div className="space-y-3">
            {monthSplitRows.map((row) => (
              <div key={`bar-${row.key}`} className="space-y-1.5">
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
      )}

      {/* Month navigator */}
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" onClick={handlePrev} disabled={!hasPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary sm:px-4 sm:py-1.5">
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
          placeholder="Search earnings across all months..."
          aria-label="Search earnings"
          disabled={loading}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {loading
            ? "Loading earnings history..."
            : searchTerm.trim()
            ? `${filteredMonthEarnings.length} result${filteredMonthEarnings.length === 1 ? "" : "s"} across all months`
            : `${monthSurveyCount} surveys (${formatCurrency(monthSurveyTotal)}) · ${monthCashbackCount} cashback (${formatCurrency(monthCashbackTotal)})${monthSocialMediaTotal > 0 ? ` · ${monthSocialMediaCount} social media (${formatCurrency(monthSocialMediaTotal)})` : ""}${monthDividendTotal > 0 ? ` · ${monthDividendCount} dividends (${formatCurrency(monthDividendTotal)})` : ""} in ${formatMonthLabel(selectedMonth)}`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`earning-row-skeleton-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((earning) => (
            (() => {
              const isLinkedCashback = earning.externalSource === "cashback_hero"
                || ((earning.kind === "cashback" || earning.kind === "crypto_cashback") && isOnOrAfterCashbackCutoff(earning.date));

              return (
                <div key={earning.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{earning.title}</span>
                  {earning.provider ? <span className="text-sm text-muted-foreground">· {earning.provider}</span> : null}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {kindLabel[earning.kind] ?? earning.kind}
                  </span>
                  {isLinkedCashback ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      title={t("portfolio.syncedFromCashbackHeroHint")}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t("portfolio.syncedFromCashbackHero")}
                    </span>
                  ) : null}
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
                {isLinkedCashback ? null : (
                  <>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(earning)}><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(earning.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
                </div>
              );
            })()
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
            ? `No results for "${searchTerm.trim()}" across all months.`
            : isCurrentMonth
              ? "No rewards logged this month yet."
              : `No rewards recorded for ${formatMonthLabel(selectedMonth)}.`}
        </div>
      )}
    </section>
  );
}
