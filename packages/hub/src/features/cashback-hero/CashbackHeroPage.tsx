import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parse, addMonths, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  ArrowUpDown,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/I18nProvider';
import { useCashbackSources } from '@/features/cashback-hero/use-cashback-sources';
import { useCashbackCards } from '@/features/cashback-hero/use-cashback-cards';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  CASHBACK_CATEGORIES,
  CASHBACK_SOURCES,
  CashbackEntry,
  CashbackCategory,
  CashbackPurchase,
  getCategoryLabel,
} from '@/features/cashback-hero/types';
import { useCashbackStore } from '@/features/cashback-hero/use-cashback-store';
import {
  createCashbackHomeExpenseLink,
  getActiveTier,
  getNextTier,
  UNIBANCO_TIERS,
} from '@/features/cashback-hero/lib/cashback';
import { useOptionalContracts } from '@/features/contracts/context/ContractContext';
import { mapContractCategoryToExpenseCategory } from '@/features/home-expenses/lib/contractMapping';
import { insertTransaction } from '@/features/home-expenses/lib/store';
import { getContractCategoryIcon, type Contract } from '@/features/contracts/types/contract';
import type { ExpenseCategory } from '@/features/home-expenses/lib/types';

function formatDateLabel(raw: string): string {
  try {
    return format(parseISO(raw), 'd MMM yyyy');
  } catch {
    return raw;
  }
}

const CARD_NOTE_PREFIX_REGEX = /^(cart[aã]o|card):\s*/i;

function extractCardFromNotes(notes?: string | null): string {
  if (!notes) return '';
  const lines = notes.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (CARD_NOTE_PREFIX_REGEX.test(line)) {
      return line.replace(CARD_NOTE_PREFIX_REGEX, '').trim();
    }
  }
  return '';
}

function stripCardFromNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .split('\n')
    .filter((line) => !CARD_NOTE_PREFIX_REGEX.test(line.trim()))
    .join('\n')
    .trim();
}

function buildNotesWithCard(notes: string, cardUsed: string): string | undefined {
  const cleanNotes = notes.trim();
  const cleanCard = cardUsed.trim();
  const parts: string[] = [];
  if (cleanNotes) parts.push(cleanNotes);
  if (cleanCard) parts.push(`Cartão: ${cleanCard}`);
  const combined = parts.join('\n');
  return combined || undefined;
}

function isUnibancoCard(cardUsed: string): boolean {
  return /unibanco/i.test(cardUsed.trim());
}

const CONTRACT_CATEGORY_ORDER: Record<Contract['category'], number> = {
  'mortgage': 0,
  'home-insurance': 1,
  'apartment-insurance': 2,
  'electricity': 3,
  'gas': 4,
  'water': 5,
  'internet': 6,
  'mobile': 7,
  'tv-streaming': 8,
  'security-alarm': 9,
  'maintenance': 10,
  'car': 11,
  'gym': 12,
  'software': 13,
  'card-credit': 14,
  'card-debit': 15,
  'other': 99,
};

function getContractCategoryTranslationKey(category: Contract['category']): string {
  return `contracts.categoryNames.${category.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase())}`;
}

function getHomeExpenseCategoryFromContract(contract: Contract): ExpenseCategory {
  if (contract.category === 'car') {
    return 'carRenting';
  }

  return mapContractCategoryToExpenseCategory(contract.category) ?? 'other';
}

function monthKeyFromDate(value: Date): string {
  return format(value, 'yyyy-MM');
}

function getEntryAmountForDisplay(entry: CashbackEntry): number {
  const BYBIT_EUR_PER_POINT = 0.002455;
  if (/bybit/i.test(entry.source) && entry.points != null && Number.isFinite(entry.points) && entry.points > 0) {
    return Math.round(entry.points * BYBIT_EUR_PER_POINT * 100) / 100;
  }
  return entry.amount;
}

function getEffectiveEntryAmounts(purchase: CashbackPurchase): Array<{ id: string; amount: number }> {
  if (purchase.isReferral) {
    return purchase.cashbackEntries.map((entry) => ({ id: entry.id, amount: getEntryAmountForDisplay(entry) }));
  }

  let remaining = Math.max(0, purchase.amount);
  return purchase.cashbackEntries.map((entry) => {
    const amount = getEntryAmountForDisplay(entry);
    const effectiveAmount = Math.max(0, Math.min(amount, remaining));
    remaining -= effectiveAmount;
    return { id: entry.id, amount: effectiveAmount };
  });
}

function getEffectiveTotalCashback(purchase: CashbackPurchase): number {
  return getEffectiveEntryAmounts(purchase).reduce((sum, item) => sum + item.amount, 0);
}

function getDisplayPercentFromPurchase(purchase: CashbackPurchase): number {
  if (!Number.isFinite(purchase.amount) || purchase.amount <= 0) return 0;

  // For display, never show more than 100% cashback for a purchase.
  const effectiveCashback = getEffectiveTotalCashback(purchase);
  const rawPercent = (effectiveCashback / purchase.amount) * 100;
  const clampedPercent = Math.max(0, Math.min(100, rawPercent));

  // For Bybit-only purchases, snap display to official tier percentages for a uniform UI.
  const hasEntries = purchase.cashbackEntries.length > 0;
  const isBybitOnly = hasEntries && purchase.cashbackEntries.every((entry) => /bybit/i.test(entry.source));
  if (!isBybitOnly) return clampedPercent;

  // Snap to standard Bybit tiers for a uniform display across purchases.
  if (clampedPercent >= 1.5 && clampedPercent < 3.5) return 2.45;
  if (clampedPercent >= 3.5 && clampedPercent < 6) return 4.91;
  return clampedPercent;
}

function CashbackPercentBadge({ percent }: { percent: number }) {
  const displayPercent = Math.max(0, Math.min(100, percent));
  const formattedPercent = Number.isInteger(displayPercent)
    ? displayPercent.toFixed(0)
    : displayPercent.toFixed(2).replace(/\.?0+$/, '');
  const tone = percent >= 5
    ? 'border-emerald-600 bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200'
    : percent >= 2
      ? 'border-amber-600 bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200'
      : 'border-muted bg-muted/50 text-muted-foreground';

  return (
    <span className={cn('inline-flex rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums', tone)}>
      {formattedPercent}%
    </span>
  );
}

function CashbackBadge({ purchase }: { purchase: CashbackPurchase }) {
  if (purchase.isReferral) {
    return (
      <span className="inline-flex rounded-lg border border-blue-600 bg-blue-500/20 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-500/30 dark:text-blue-200">
        Referral
      </span>
    );
  }
  return <CashbackPercentBadge percent={getDisplayPercentFromPurchase(purchase)} />;
}

export default function CashbackHeroPage() {
  const { formatCurrency, t } = useI18n();
  const { purchases, loading, error, reload, addPurchase, addCashbackEntry, editCashbackEntry, syncUnibancoMonth, deletePurchase, deleteCashbackEntry, updatePurchase } = useCashbackStore();
  const contractsContext = useOptionalContracts();
  const contracts = contractsContext?.contracts ?? [];
  const { sources, addSource, removeSource, resetSources } = useCashbackSources();
  const { cards } = useCashbackCards();

  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<CashbackPurchase | null>(null);
  const [cashbackPurchaseId, setCashbackPurchaseId] = useState<string | null>(null);
  const [editingCashback, setEditingCashback] = useState<{ purchaseId: string; entry: CashbackEntry } | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortByPercent, setSortByPercent] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKeyFromDate(new Date()));
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(5);

  const activeContracts = useMemo(
    () => contracts
      .filter((contract) => contract.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name) || a.provider.localeCompare(b.provider)),
    [contracts],
  );

  const lastSyncSigRef = useRef<Map<string, string>>(new Map());

  const monthPurchases = useMemo(() => {
    if (selectedMonth === 'all') return purchases;
    return purchases.filter((purchase) => purchase.date.startsWith(selectedMonth));
  }, [purchases, selectedMonth]);

  const filteredPurchases = useMemo(() => {
    let result = [...monthPurchases];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((purchase) => {
        const categoryLabel = getCategoryLabel(purchase.category).toLowerCase();
        const sourceLabels = purchase.cashbackEntries.map((entry) => entry.source.toLowerCase());
        const stateLabels = [
          purchase.isReferral ? 'referral' : '',
          purchase.isUnibanco ? 'unibanco' : '',
        ].filter(Boolean);

        const searchable = [
          purchase.merchant,
          purchase.category,
          categoryLabel,
          purchase.notes ?? '',
          ...sourceLabels,
          ...stateLabels,
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(term);
      });
    }

    if (categoryFilter !== 'all') {
      result = result.filter((purchase) => purchase.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter((purchase) => purchase.cashbackEntries.some((entry) => entry.source === sourceFilter));
    }

    if (sortByPercent) {
      result.sort((a, b) => getDisplayPercentFromPurchase(b) - getDisplayPercentFromPurchase(a));
    } else {
      result.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    }

    return result;
  }, [monthPurchases, search, categoryFilter, sourceFilter, sortByPercent]);

  const stats = useMemo(() => {
    const monthSpent = monthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const monthCashback = monthPurchases.reduce((sum, purchase) => sum + getEffectiveTotalCashback(purchase), 0);
    const overallSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const overallCashback = purchases.reduce((sum, purchase) => sum + getEffectiveTotalCashback(purchase), 0);
    const eligibleAveragePurchases = monthPurchases.filter((purchase) => !purchase.isReferral);
    const avgPercent = eligibleAveragePurchases.length > 0
      ? eligibleAveragePurchases.reduce((sum, purchase) => sum + getDisplayPercentFromPurchase(purchase), 0) / eligibleAveragePurchases.length
      : 0;

    const bestPurchase = monthPurchases.reduce<CashbackPurchase | null>((currentBest, purchase) => {
      if (!currentBest) return purchase;
      return getDisplayPercentFromPurchase(purchase) > getDisplayPercentFromPurchase(currentBest) ? purchase : currentBest;
    }, null);

    return {
      monthSpent,
      monthCashback,
      overallSpent,
      overallCashback,
      avgPercent,
      eligibleAveragePurchasesCount: eligibleAveragePurchases.length,
      bestPurchase,
    };
  }, [monthPurchases, purchases]);

  const insights = useMemo(() => {
    if (monthPurchases.length === 0) return [] as string[];

    const noCashbackPurchases = monthPurchases.filter((purchase) => !purchase.isReferral && purchase.cashbackEntries.length === 0);
    const totalWithoutCashback = noCashbackPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    const list: string[] = [];

    // --- Unibanco tier insight ---
    if (selectedMonth !== 'all') {
      const unibancoEligible = monthPurchases.filter((p) => (p.isUnibanco ?? false) && !(p.isReferral ?? false));
      const unibancoSpent = unibancoEligible.reduce((sum, p) => sum + p.amount, 0);
      const activeTier = getActiveTier(unibancoSpent);
      const nextTier = getNextTier(unibancoSpent);
      const topTierThreshold = UNIBANCO_TIERS[0].minSpend; // 500

      if (unibancoEligible.length === 0) {
        list.push(t('cashbackHero.insights.unibancoNoSpend', { min: String(UNIBANCO_TIERS[UNIBANCO_TIERS.length - 1].minSpend) }));
      } else if (activeTier) {
        if (activeTier.minSpend === topTierThreshold) {
          list.push(t('cashbackHero.insights.unibancoTopTier', { cashback: String(activeTier.cashback) }));
          if (unibancoSpent > topTierThreshold) {
            list.push(t('cashbackHero.insights.unibancoOverCap', {
              over: (unibancoSpent - topTierThreshold).toFixed(2),
              cap: String(topTierThreshold),
            }));
          }
        } else {
          list.push(t('cashbackHero.insights.unibancoTierActive', {
            cashback: String(activeTier.cashback),
            spent: unibancoSpent.toFixed(2),
            minSpend: String(activeTier.minSpend),
          }));
          if (nextTier) {
            list.push(t('cashbackHero.insights.unibancoTierNext', {
              remaining: (nextTier.minSpend - unibancoSpent).toFixed(2),
              cashback: String(nextTier.cashback),
            }));
          }
        }
      } else if (nextTier) {
        list.push(t('cashbackHero.insights.unibancoTierNext', {
          remaining: (nextTier.minSpend - unibancoSpent).toFixed(2),
          cashback: String(nextTier.cashback),
        }));
      }

      const unibancoNoCashbackCount = unibancoEligible.filter((p) => getEffectiveTotalCashback(p) <= 0).length;
      if (unibancoNoCashbackCount > 0) {
        list.push(t('cashbackHero.insights.unibancoNoCashbackDueToCap', {
          count: String(unibancoNoCashbackCount),
        }));
      }
    }

    const eligibleForCoverage = monthPurchases.filter((p) => !(p.isReferral ?? false));
    if (eligibleForCoverage.length > 0) {
      const withCashbackCount = eligibleForCoverage.filter((p) => getEffectiveTotalCashback(p) > 0).length;
      const coverageRate = (withCashbackCount / eligibleForCoverage.length) * 100;
      list.push(t('cashbackHero.insights.coverage', {
        covered: String(withCashbackCount),
        total: String(eligibleForCoverage.length),
        rate: coverageRate.toFixed(0),
      }));
    }

    const sourceTotals = monthPurchases.reduce<Record<string, number>>((acc, purchase) => {
      for (const entry of purchase.cashbackEntries) {
        acc[entry.source] = (acc[entry.source] ?? 0) + entry.amount;
      }
      return acc;
    }, {});

    const topSource = Object.entries(sourceTotals)
      .sort((a, b) => b[1] - a[1])[0];

    if (topSource && topSource[1] > 0) {
      list.push(t('cashbackHero.insights.topSource', {
        source: topSource[0],
        amount: formatCurrency(topSource[1], 'EUR'),
      }));
    }

    // --- General insights ---
    if (stats.bestPurchase) {
      list.push(t('cashbackHero.insights.bestDeal', {
        merchant: stats.bestPurchase.merchant,
        percent: getDisplayPercentFromPurchase(stats.bestPurchase).toFixed(2).replace(/\.?0+$/, ''),
      }));
    }

    if (noCashbackPurchases.length > 0) {
      list.push(t('cashbackHero.insights.noCashback', {
        count: String(noCashbackPurchases.length),
        total: formatCurrency(totalWithoutCashback, 'EUR'),
      }));
    }

    if (stats.avgPercent < 2 && stats.eligibleAveragePurchasesCount >= 3) {
      list.push(t('cashbackHero.insights.lowAverage'));
    }

    return list;
  }, [monthPurchases, selectedMonth, stats, formatCurrency, t]);

  const monthLabel = selectedMonth === 'all'
    ? t('cashbackHero.months.all')
    : format(parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date()), 'MMMM yyyy', { locale: pt });

  const currentMonthKey = monthKeyFromDate(new Date());
  const canNavigateForward = selectedMonth !== 'all' && selectedMonth < currentMonthKey;

  const navigateMonth = (direction: -1 | 1) => {
    if (selectedMonth === 'all') {
      setSelectedMonth(monthKeyFromDate(new Date()));
      return;
    }

    const current = parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date());
    const next = direction < 0 ? subMonths(current, 1) : addMonths(current, 1);
    if (direction > 0 && monthKeyFromDate(next) > currentMonthKey) {
      return;
    }
    setSelectedMonth(monthKeyFromDate(next));
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const syncUnibancoForMonths = useCallback(async (monthKeys: string[]) => {
    const uniqueMonths = [...new Set(monthKeys.filter((value) => /^\d{4}-\d{2}$/.test(value)))];
    for (const month of uniqueMonths) {
      try {
        await syncUnibancoMonth(month);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      }
    }
  }, [syncUnibancoMonth]);

  useEffect(() => {
    if (loading) return;

    // Compute a signature per month: only sync when eligible purchases actually changed (add/delete/amount edit).
    const monthMap = new Map<string, CashbackPurchase[]>();
    purchases
      .filter((p) => (p.isUnibanco ?? false) && !(p.isReferral ?? false))
      .forEach((p) => {
        const month = p.date.slice(0, 7);
        if (!monthMap.has(month)) monthMap.set(month, []);
        monthMap.get(month)!.push(p);
      });

    const monthsToSync: string[] = [];
    for (const [month, ps] of monthMap) {
      const sig = ps.map((p) => `${p.id}:${p.amount}`).sort().join('|');
      if (lastSyncSigRef.current.get(month) !== sig) {
        lastSyncSigRef.current.set(month, sig);
        monthsToSync.push(month);
      }
    }

    if (monthsToSync.length === 0) return;
    void syncUnibancoForMonths(monthsToSync);
  }, [loading, purchases, syncUnibancoForMonths]);

  const requestDeletePurchase = async (id: string) => {
    if (!window.confirm(t('cashbackHero.confirmDelete'))) return;
    try {
      const purchase = purchases.find((item) => item.id === id);
      await deletePurchase(id);
      if (purchase?.isUnibanco) {
        await syncUnibancoForMonths([purchase.date.slice(0, 7)]);
      }
      toast.success(t('cashbackHero.deletePurchase'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const requestDeleteCashback = async (purchaseId: string, entryId: string) => {
    if (!window.confirm(t('cashbackHero.cashback.deleteCashback'))) return;
    try {
      await deleteCashbackEntry(purchaseId, entryId);
      toast.success(t('cashbackHero.cashback.deleteCashback'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title={t('cashbackHero.title')}
        icon={Coins}
        backTo="/"
        backLabel={t('common.back')}
        actions={(
          <Button size="sm" className="gap-1.5" onClick={() => setShowAddPurchase(true)}>
            <Plus className="h-4 w-4" />
            {t('cashbackHero.addPurchase')}
          </Button>
        )}
      />

      <div className="mx-auto max-w-6xl px-4 pb-8 pt-20 lg:px-6 lg:pt-24">
        {error ? (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p>{t('cashbackHero.form.savePurchase')}: {error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Se ainda não correste os SQLs, executa primeiro `cashback_hero.sql` e depois `cashback_hero_migrate_earnings.sql` no Supabase.
            </p>
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => { void reload(); }}>
                {t('common.back')}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between rounded-xl border bg-card px-2 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={() => setSelectedMonth((prev) => (prev === 'all' ? monthKeyFromDate(new Date()) : 'all'))}
            className="flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium capitalize text-foreground hover:bg-muted"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {monthLabel}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 disabled:opacity-40"
            onClick={() => navigateMonth(1)}
            disabled={!canNavigateForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="h-4 w-4" />
              {t('cashbackHero.stats.spentThisMonth')}
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatCurrency(stats.monthSpent, 'EUR')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('cashbackHero.stats.spentTotal')}: {formatCurrency(stats.overallSpent, 'EUR')}</p>
          </div>

          <div className="rounded-xl border border-primary/35 bg-primary/5 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-4 w-4" />
              {t('cashbackHero.stats.cashbackThisMonth')}
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary">{formatCurrency(stats.monthCashback, 'EUR')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('cashbackHero.stats.cashbackTotal')}: {formatCurrency(stats.overallCashback, 'EUR')}</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="h-4 w-4" />
              {t('cashbackHero.stats.averagePercent')}
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{stats.avgPercent.toFixed(1)}%</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tag className="h-4 w-4" />
              {t('cashbackHero.stats.bestPurchase')}
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{stats.bestPurchase?.merchant ?? t('cashbackHero.stats.noData')}</p>
            {stats.bestPurchase ? (
              <p className="mt-1 text-xs text-muted-foreground">{getDisplayPercentFromPurchase(stats.bestPurchase).toFixed(2).replace(/\.?0+$/, '')}%</p>
            ) : null}
          </div>
        </div>

        {insights.length > 0 ? (
          <div className="mt-4 flex justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-9 w-9 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  aria-label={t('cashbackHero.insights.title')}
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {insights.length}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-amber-500/10">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Lightbulb className="h-4 w-4" />
                    </span>
                    {t('cashbackHero.insights.title')}
                  </div>
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {insights.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {insights.slice(0, 5).map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className="group rounded-xl border border-border/70 bg-background/80 p-3 backdrop-blur-sm transition-colors hover:border-primary/35"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 text-[11px] font-bold text-primary">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-5 text-foreground/90">
                          {line.includes(':') ? (
                            <>
                              <span className="font-semibold">{line.slice(0, line.indexOf(':'))}:</span>
                              {line.slice(line.indexOf(':') + 1)}
                            </>
                          ) : line}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('cashbackHero.filters.searchPlaceholder')}
              className="h-9 pl-8"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder={t('cashbackHero.form.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cashbackHero.filters.allCategories')}</SelectItem>
              {CASHBACK_CATEGORIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder={t('cashbackHero.cashback.source')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('cashbackHero.filters.allSources')}</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={sortByPercent ? 'default' : 'outline'}
            className="h-9"
            onClick={() => setSortByPercent((prev) => !prev)}
          >
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            {t('cashbackHero.filters.bestPercent')}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : null}

          {!loading && filteredPurchases.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t('cashbackHero.noCompras')}
            </div>
          ) : !loading ? (
            filteredPurchases.slice(0, visibleCount).map((purchase) => {
              const isExpanded = Boolean(expandedIds[purchase.id]);
              const totalCashback = getEffectiveTotalCashback(purchase);
              const effectiveEntries = new Map(getEffectiveEntryAmounts(purchase).map((item) => [item.id, item.amount]));
              const purchaseNotes = stripCardFromNotes(purchase.notes);
              const purchaseCardUsed = extractCardFromNotes(purchase.notes);

              return (
                <div key={purchase.id} className="overflow-hidden rounded-xl border bg-card">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(purchase.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left side: Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{purchase.merchant}</p>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {getCategoryLabel(purchase.category)}
                          </span>
                          {purchase.isUnibanco ? (
                            <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {t('cashbackHero.badges.unibanco')}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDateLabel(purchase.date)}
                          </span>
                          {totalCashback > 0 ? (
                            <span className="text-primary">+{formatCurrency(totalCashback, 'EUR')}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Right side: Highlight (Badge + Amount) */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <CashbackBadge purchase={purchase} />
                          <p className="text-xs font-medium text-muted-foreground">{formatCurrency(purchase.amount, 'EUR')}</p>
                        </div>
                        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t bg-muted/20 p-4">
                      {purchaseNotes ? (
                        <p className="mb-2 text-xs italic text-muted-foreground">{purchaseNotes}</p>
                      ) : null}

                      {purchaseCardUsed ? (
                        <p className="mb-3 text-xs text-muted-foreground">
                          <span className="font-medium">{t('cashbackHero.form.cardUsed')}:</span> {purchaseCardUsed}
                        </p>
                      ) : null}

                      <div className="rounded-lg border bg-background/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('cashbackHero.cashback.purchaseActionsTitle')}</p>
                          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditingCashback(null);
                              setCashbackPurchaseId(purchase.id);
                            }} title={t('cashbackHero.cashback.addCashbackToPurchase')} aria-label={t('cashbackHero.cashback.addCashbackToPurchase')}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPurchase(purchase)} title={t('cashbackHero.editPurchase')} aria-label={t('cashbackHero.editPurchase')}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { void requestDeletePurchase(purchase.id); }} title={`Eliminar compra (${purchase.merchant})`} aria-label={`Eliminar compra (${purchase.merchant})`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {purchase.cashbackEntries.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('cashbackHero.cashback.purchaseCashbackTitle')}</p>
                          {purchase.cashbackEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{entry.source}</p>
                                <p className="text-xs text-muted-foreground">{formatDateLabel(entry.dateReceived)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-primary">+{formatCurrency(effectiveEntries.get(entry.id) ?? entry.amount, 'EUR')}</p>
                                <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingCashback({ purchaseId: purchase.id, entry });
                                      setCashbackPurchaseId(purchase.id);
                                    }}
                                    title={t('cashbackHero.cashback.editCashback')}
                                    aria-label={t('cashbackHero.cashback.editCashback')}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => { void requestDeleteCashback(purchase.id, entry.id); }}
                                    title={t('cashbackHero.cashback.deleteCashbackWithSource', { source: entry.source })}
                                    aria-label={t('cashbackHero.cashback.deleteCashbackWithSource', { source: entry.source })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">{t('cashbackHero.cashback.noCashback')}</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
            ) : null}
          {!loading && filteredPurchases.length > visibleCount ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 5)}
              >
                {t('cashbackHero.loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <AddPurchaseDialog
        open={showAddPurchase}
        cardOptions={cards}
        activeContracts={activeContracts}
        onOpenChange={setShowAddPurchase}
        onSubmit={async (payload) => {
          const {
            linkedHomeExpenseContractId,
            ...purchasePayload
          } = payload;

          const savedPurchase = await addPurchase(purchasePayload);

          if (linkedHomeExpenseContractId) {
            const selectedContract = activeContracts.find((contract) => contract.id === linkedHomeExpenseContractId);
            if (!selectedContract) {
              throw new Error(t('cashbackHero.form.linkedContractRequired'));
            }

            const homeExpenseTransactionId = crypto.randomUUID();
            await insertTransaction({
              id: homeExpenseTransactionId,
              name: `${selectedContract.name} (${selectedContract.provider})`,
              type: 'expense',
              category: getHomeExpenseCategoryFromContract(selectedContract),
              notes: purchasePayload.notes,
              amount: purchasePayload.amount,
              date: purchasePayload.date,
              recurring: false,
              contractId: selectedContract.id,
              isContractExpense: true,
            });

            await createCashbackHomeExpenseLink(
              savedPurchase.id,
              homeExpenseTransactionId,
              selectedContract.id,
            );
          }

          if (purchasePayload.isUnibanco) {
            await syncUnibancoForMonths([purchasePayload.date.slice(0, 7)]);
          }
          toast.success(t('cashbackHero.addPurchase'));
        }}
      />

      <EditPurchaseDialog
        purchase={editingPurchase}
        cardOptions={cards}
        onOpenChange={(open) => { if (!open) setEditingPurchase(null); }}
        onSubmit={async (payload) => {
          if (!editingPurchase) return;

          const monthsToSync: string[] = [];
          if (editingPurchase.isUnibanco) {
            monthsToSync.push(editingPurchase.date.slice(0, 7));
          }
          if (payload.isUnibanco) {
            monthsToSync.push(payload.date.slice(0, 7));
          }

          await updatePurchase(editingPurchase.id, payload);
          if (monthsToSync.length > 0) {
            await syncUnibancoForMonths(monthsToSync);
          }
          toast.success(t('cashbackHero.editPurchase'));
          setEditingPurchase(null);
        }}
      />

      <AddCashbackDialog
        open={cashbackPurchaseId !== null}
        sources={sources}
        targetPurchase={cashbackPurchaseId ? (purchases.find((p) => p.id === cashbackPurchaseId) ?? null) : null}
        editingEntry={editingCashback?.entry ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setCashbackPurchaseId(null);
            setEditingCashback(null);
          }
        }}
        onSubmit={async (payload) => {
          if (!cashbackPurchaseId) return;
          if (editingCashback && editingCashback.purchaseId === cashbackPurchaseId) {
            await editCashbackEntry(cashbackPurchaseId, editingCashback.entry.id, payload);
            toast.success(t('cashbackHero.cashback.editCashback'));
            setEditingCashback(null);
          } else {
            await addCashbackEntry(cashbackPurchaseId, payload);
            toast.success(t('cashbackHero.cashback.addCashback'));
          }
        }}
      />
    </div>
  );
}

function AddPurchaseDialog({
  open,
  cardOptions,
  activeContracts,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  cardOptions: string[];
  activeContracts: Contract[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    merchant: string;
    category: CashbackCategory;
    date: string;
    amount: number;
    notes?: string;
    isReferral?: boolean;
    isUnibanco?: boolean;
    linkedHomeExpenseContractId?: string;
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<CashbackCategory>('other');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cardUsed, setCardUsed] = useState('');
  const [isReferral, setIsReferral] = useState(false);
  const [linkToHomeExpense, setLinkToHomeExpense] = useState(false);
  const [linkedContractId, setLinkedContractId] = useState('');

  const groupedActiveContracts = useMemo(() => {
    const sorted = [...activeContracts].sort((a, b) => {
      const orderA = CONTRACT_CATEGORY_ORDER[a.category] ?? 50;
      const orderB = CONTRACT_CATEGORY_ORDER[b.category] ?? 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name) || a.provider.localeCompare(b.provider);
    });

    const grouped = new Map<Contract['category'], Contract[]>();
    for (const contract of sorted) {
      if (!grouped.has(contract.category)) {
        grouped.set(contract.category, []);
      }
      grouped.get(contract.category)!.push(contract);
    }

    return grouped;
  }, [activeContracts]);

  useEffect(() => {
    if (!open) return;
    if (cardOptions.length === 0) {
      setCardUsed('');
      return;
    }
    setCardUsed((prev) => (prev && cardOptions.includes(prev) ? prev : cardOptions[0]));
  }, [open, cardOptions]);

  useEffect(() => {
    if (!open) return;
    if (activeContracts.length === 0) {
      setLinkToHomeExpense(false);
      setLinkedContractId('');
      return;
    }
    setLinkedContractId((prev) => (prev && activeContracts.some((contract) => contract.id === prev)
      ? prev
      : activeContracts[0].id));
  }, [open, activeContracts]);

  useEffect(() => {
    if (isReferral && linkToHomeExpense) {
      setLinkToHomeExpense(false);
    }
  }, [isReferral, linkToHomeExpense]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!merchant.trim()) {
      toast.error(t('cashbackHero.form.merchant'));
      return;
    }

    if (!isReferral && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      toast.error(t('cashbackHero.form.amount'));
      return;
    }

    if (!isReferral && !cardUsed.trim()) {
      toast.error(t('cashbackHero.form.cardUsedRequired'));
      return;
    }

    if (linkToHomeExpense && !linkedContractId) {
      toast.error(t('cashbackHero.form.linkedContractRequired'));
      return;
    }

    if (linkToHomeExpense && isReferral) {
      toast.error(t('cashbackHero.form.referralCannotLinkHomeExpense'));
      return;
    }

    try {
      await onSubmit({
        merchant: merchant.trim(),
        category,
        date,
        amount: Math.max(parsedAmount, 0),
        notes: buildNotesWithCard(notes, cardUsed),
        isReferral: isReferral || undefined,
        isUnibanco: !isReferral && isUnibancoCard(cardUsed),
        linkedHomeExpenseContractId: linkToHomeExpense ? linkedContractId : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      return;
    }

    setMerchant('');
    setAmount('');
    setNotes('');
    setCardUsed('');
    setIsReferral(false);
    setLinkToHomeExpense(false);
    setLinkedContractId(activeContracts[0]?.id ?? '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cashbackHero.addPurchase')}</DialogTitle>
          <DialogDescription>{t('cashbackHero.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.merchant')}</label>
            <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder={t('cashbackHero.form.merchant')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.category')}</label>
              <Select value={category} onValueChange={(value) => setCategory(value as CashbackCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASHBACK_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.date')}</label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.amount')}</label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              disabled={isReferral}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.notes')}</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t('cashbackHero.form.notes')} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.cardUsed')}</label>
            <Select value={cardUsed} onValueChange={setCardUsed} disabled={isReferral || cardOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={t('cashbackHero.form.cardUsed')} />
              </SelectTrigger>
              <SelectContent>
                {cardOptions.map((card) => (
                  <SelectItem key={card} value={card}>{card}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-referral"
              checked={isReferral}
              onChange={(e) => setIsReferral(e.target.checked)}
              className="rounded border border-input"
            />
            <label htmlFor="is-referral" className="text-xs font-medium text-muted-foreground cursor-pointer">
              {t('cashbackHero.form.isReferral')}
            </label>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="link-home-expense"
                checked={linkToHomeExpense}
                onChange={(event) => setLinkToHomeExpense(event.target.checked)}
                className="rounded border border-input"
                disabled={isReferral || activeContracts.length === 0}
              />
              <label htmlFor="link-home-expense" className="text-xs font-medium text-muted-foreground cursor-pointer">
                {t('cashbackHero.form.linkToHomeExpense')}
              </label>
            </div>

            {linkToHomeExpense ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.linkedContract')}</label>
                <Select value={linkedContractId} onValueChange={setLinkedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cashbackHero.form.linkedContract')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[...groupedActiveContracts.entries()].map(([category, contractsInCategory]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="flex items-center gap-1.5">
                          <span>{getContractCategoryIcon(category)}</span>
                          <span>{t(getContractCategoryTranslationKey(category))}</span>
                        </SelectLabel>
                        {contractsInCategory.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id} className="pl-6">
                            {contract.name}
                            {contract.provider ? <span className="text-muted-foreground ml-1">· {contract.provider}</span> : null}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {activeContracts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">{t('cashbackHero.form.noActiveContractsToLink')}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full">{t('cashbackHero.addPurchase')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCashbackDialog({
  open,
  sources,
  targetPurchase,
  editingEntry,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  sources: string[];
  targetPurchase: CashbackPurchase | null;
  editingEntry: CashbackEntry | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { source: string; amount: number; points?: number; dateReceived: string }) => Promise<void>;
}) {
  const { t } = useI18n();
  const BYBIT_EUR_PER_POINT = 0.002455;
  const CURVE_CASH_DEFAULT_GBP_RATE = 1.17;
  const availableSources = useMemo(() => {
    const hasBybit = sources.some((value) => /bybit/i.test(value));
    return hasBybit ? sources : [...sources, 'Bybit'];
  }, [sources]);

  const [source, setSource] = useState(() => availableSources[0] ?? '');
  const [amount, setAmount] = useState('');
  const [points, setPoints] = useState('');
  const [gbpAmount, setGbpAmount] = useState('');
  const [gbpEurRate, setGbpEurRate] = useState(CURVE_CASH_DEFAULT_GBP_RATE);
  const [dateReceived, setDateReceived] = useState(format(new Date(), 'yyyy-MM-dd'));
  const isEditing = editingEntry !== null;
  const isBybitSource = /bybit/i.test(source);
  const isCurveCashSource = /curve/i.test(source);

  // Reset source when sources list changes and current is gone
  useEffect(() => {
    if (!availableSources.includes(source)) {
      setSource(availableSources[0] ?? '');
    }
  }, [availableSources, source]);

  useEffect(() => {
    if (!open) return;

    if (editingEntry) {
      setSource(editingEntry.source);
      setAmount(String(editingEntry.amount));
      if (/bybit/i.test(editingEntry.source)) {
        if (editingEntry.points != null) {
          setPoints(String(editingEntry.points));
        } else {
          const inferredPoints = Math.round((editingEntry.amount / BYBIT_EUR_PER_POINT) * 100) / 100;
          setPoints(String(inferredPoints));
        }
        setGbpAmount('');
      } else if (/curve/i.test(editingEntry.source)) {
        setPoints('');
        setGbpAmount(editingEntry.points != null ? String(editingEntry.points) : '');
      } else {
        setPoints('');
        setGbpAmount('');
      }
      setDateReceived(editingEntry.dateReceived);
      return;
    }

    setSource((prev) => (availableSources.includes(prev) ? prev : (availableSources[0] ?? '')));
    setAmount('');
    setPoints('');
    setGbpAmount('');
    setDateReceived(format(new Date(), 'yyyy-MM-dd'));
  }, [open, editingEntry, availableSources, BYBIT_EUR_PER_POINT]);

  useEffect(() => {
    if (!isBybitSource) return;

    const parsedPoints = Number(points.replace(',', '.'));
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      setAmount('');
      return;
    }

    const converted = Math.round(parsedPoints * BYBIT_EUR_PER_POINT * 100) / 100;
    const maxAmount = targetPurchase && !targetPurchase.isReferral ? targetPurchase.amount : Number.POSITIVE_INFINITY;
    setAmount(Math.min(converted, maxAmount).toFixed(2));
  }, [isBybitSource, points, targetPurchase]);

  // Fetch live GBP/EUR rate when Curve Cash is selected
  useEffect(() => {
    if (!isCurveCashSource || !open) return;
    let cancelled = false;
    fetch('https://api.frankfurter.app/latest?from=GBP&to=EUR')
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!cancelled && typeof data === 'object' && data !== null && 'rates' in data) {
          const rates = (data as { rates: Record<string, number> }).rates;
          if (typeof rates.EUR === 'number') setGbpEurRate(rates.EUR);
        }
      })
      .catch(() => { /* keep default */ });
    return () => { cancelled = true; };
  }, [isCurveCashSource, open]);

  // Convert GBP → EUR automatically for Curve Cash
  useEffect(() => {
    if (!isCurveCashSource) return;
    const parsed = Number(gbpAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      if (gbpAmount.trim() !== '') setAmount('');
      return;
    }
    const converted = Math.round(parsed * gbpEurRate * 100) / 100;
    const maxAmount = targetPurchase && !targetPurchase.isReferral ? targetPurchase.amount : Number.POSITIVE_INFINITY;
    setAmount(Math.min(converted, maxAmount).toFixed(2));
  }, [isCurveCashSource, gbpAmount, gbpEurRate, targetPurchase]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let parsedAmount = Number(amount.replace(',', '.'));
    let parsedPoints: number | undefined;

    if (isBybitSource) {
      const parsedBybitPoints = Number(points.replace(',', '.'));
      if (!Number.isFinite(parsedBybitPoints) || parsedBybitPoints <= 0) {
        toast.error(t('cashbackHero.cashback.bybitPointsLabel'));
        return;
      }
      parsedPoints = parsedBybitPoints;
      parsedAmount = Math.round(parsedBybitPoints * BYBIT_EUR_PER_POINT * 100) / 100;
    } else if (isCurveCashSource && gbpAmount.trim() !== '') {
      const parsedGbp = Number(gbpAmount.replace(',', '.'));
      if (!Number.isFinite(parsedGbp) || parsedGbp <= 0) {
        toast.error(t('cashbackHero.cashback.curveCashGbpLabel'));
        return;
      }
      parsedPoints = parsedGbp;
      parsedAmount = Math.round(parsedGbp * gbpEurRate * 100) / 100;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('cashbackHero.form.amount'));
      return;
    }

    if (targetPurchase && !targetPurchase.isReferral) {
      parsedAmount = Math.min(parsedAmount, targetPurchase.amount);
    }

    try {
      await onSubmit({ source, amount: parsedAmount, points: parsedPoints, dateReceived });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      return;
    }

    if (!isEditing) {
      setAmount('');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('cashbackHero.cashback.editCashback') : t('cashbackHero.cashback.addCashback')}</DialogTitle>
          <DialogDescription>{t('cashbackHero.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.source')}</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSources.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.amount')}</label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              readOnly={isBybitSource || isCurveCashSource}
            />
            {isBybitSource ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.bybitConvertedHint')}</p>
            ) : null}
            {isCurveCashSource ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.curveCashConvertedHint')} {gbpEurRate > 0 ? `• 1 £ ≈ €${gbpEurRate.toFixed(4)}` : null}</p>
            ) : null}
          </div>

          {isBybitSource ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.bybitPointsLabel')}</label>
              <Input
                type="text"
                inputMode="decimal"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                placeholder="10000"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.bybitPointsHint')}</p>
            </div>
          ) : null}

          {isCurveCashSource ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.curveCashGbpLabel')}</label>
              <Input
                type="text"
                inputMode="decimal"
                value={gbpAmount}
                onChange={(event) => setGbpAmount(event.target.value)}
                placeholder="0.00"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.curveCashGbpHint')}</p>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.dateReceived')}</label>
            <Input type="date" value={dateReceived} onChange={(event) => setDateReceived(event.target.value)} />
          </div>

          <Button type="submit" className="w-full">{isEditing ? t('cashbackHero.cashback.editCashback') : t('cashbackHero.cashback.saveCashback')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPurchaseDialog({
  purchase,
  cardOptions,
  onOpenChange,
  onSubmit,
}: {
  purchase: CashbackPurchase | null;
  cardOptions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { merchant: string; category: CashbackCategory; date: string; amount: number; notes?: string; isReferral?: boolean; isUnibanco?: boolean }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<CashbackCategory>('other');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cardUsed, setCardUsed] = useState('');
  const [isReferral, setIsReferral] = useState(false);
  const availableCardOptions = useMemo(() => {
    if (!cardUsed.trim()) return cardOptions;
    return cardOptions.includes(cardUsed) ? cardOptions : [...cardOptions, cardUsed];
  }, [cardOptions, cardUsed]);

  // Sync form when the purchase changes
  useEffect(() => {
    if (purchase) {
      setMerchant(purchase.merchant);
      setCategory(purchase.category);
      setDate(purchase.date);
      setAmount(String(purchase.amount));
      setNotes(stripCardFromNotes(purchase.notes));
      setCardUsed(extractCardFromNotes(purchase.notes));
      setIsReferral(purchase.isReferral ?? false);
    }
  }, [purchase]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!merchant.trim()) {
      toast.error(t('cashbackHero.form.merchant'));
      return;
    }

    if (!isReferral && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      toast.error(t('cashbackHero.form.amount'));
      return;
    }

    if (!isReferral && !cardUsed.trim()) {
      toast.error(t('cashbackHero.form.cardUsedRequired'));
      return;
    }

    try {
      await onSubmit({
        merchant: merchant.trim(),
        category,
        date,
        amount: Math.max(parsedAmount, 0),
        notes: buildNotesWithCard(notes, cardUsed),
        isReferral: isReferral || undefined,
        isUnibanco: !isReferral && isUnibancoCard(cardUsed),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  return (
    <Dialog open={purchase !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cashbackHero.editPurchase')}</DialogTitle>
          <DialogDescription>{t('cashbackHero.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.merchant')}</label>
            <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder={t('cashbackHero.form.merchant')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.category')}</label>
              <Select value={category} onValueChange={(value) => setCategory(value as CashbackCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASHBACK_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.date')}</label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.amount')}</label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              disabled={isReferral}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.notes')}</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t('cashbackHero.form.notes')} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.cardUsed')}</label>
            <Select value={cardUsed} onValueChange={setCardUsed} disabled={isReferral || availableCardOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={t('cashbackHero.form.cardUsed')} />
              </SelectTrigger>
              <SelectContent>
                {availableCardOptions.map((card) => (
                  <SelectItem key={card} value={card}>{card}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-referral-edit"
              checked={isReferral}
              onChange={(e) => setIsReferral(e.target.checked)}
              className="rounded border border-input"
            />
            <label htmlFor="is-referral-edit" className="text-xs font-medium text-muted-foreground cursor-pointer">
              {t('cashbackHero.form.isReferral')}
            </label>
          </div>

          <Button type="submit" className="w-full">{t('cashbackHero.editPurchase')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SourcesSettings({
  sources,
  onAdd,
  onRemove,
  onReset,
}: {
  sources: string[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const value = inputRef.current?.value.trim() ?? '';
    if (!value) return;
    void onAdd(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Nova fonte..."
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
            <span className="text-sm">{source}</span>
            <button
              type="button"
              onClick={() => { void onRemove(source); }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remover ${source}`}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
        {sources.length === 0 ? (
          <li className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Sem fontes. Adiciona acima.
          </li>
        ) : null}
      </ul>

      <button
        type="button"
        onClick={() => { void onReset(); }}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Repor predefinições
      </button>
    </div>
  );
}