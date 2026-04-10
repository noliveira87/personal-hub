import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/I18nProvider';
import { useCashbackSources } from '@/features/cashback-hero/use-cashback-sources';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  CASHBACK_CATEGORIES,
  CASHBACK_SOURCES,
  CashbackEntry,
  CashbackCategory,
  CashbackPurchase,
  getCashbackPercent,
  getCategoryLabel,
  getTotalCashback,
} from '@/features/cashback-hero/types';
import { useCashbackStore } from '@/features/cashback-hero/use-cashback-store';

function formatDateLabel(raw: string): string {
  try {
    return format(parseISO(raw), 'd MMM yyyy');
  } catch {
    return raw;
  }
}

function monthKeyFromDate(value: Date): string {
  return format(value, 'yyyy-MM');
}

function CashbackPercentBadge({ percent }: { percent: number }) {
  const tone = percent >= 5
    ? 'border-emerald-600 bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200'
    : percent >= 2
      ? 'border-amber-600 bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200'
      : 'border-muted bg-muted/50 text-muted-foreground';

  return (
    <span className={cn('inline-flex rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums', tone)}>
      {percent.toFixed(1)}%
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
  return <CashbackPercentBadge percent={getCashbackPercent(purchase)} />;
}

export default function CashbackHeroPage() {
  const { formatCurrency, t } = useI18n();
  const { purchases, loading, error, reload, addPurchase, addCashbackEntry, editCashbackEntry, deletePurchase, deleteCashbackEntry, updatePurchase } = useCashbackStore();
  const { sources, addSource, removeSource, resetSources } = useCashbackSources();

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

  const monthPurchases = useMemo(() => {
    if (selectedMonth === 'all') return purchases;
    return purchases.filter((purchase) => purchase.date.startsWith(selectedMonth));
  }, [purchases, selectedMonth]);

  const filteredPurchases = useMemo(() => {
    let result = [...monthPurchases];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((purchase) => purchase.merchant.toLowerCase().includes(term));
    }

    if (categoryFilter !== 'all') {
      result = result.filter((purchase) => purchase.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter((purchase) => purchase.cashbackEntries.some((entry) => entry.source === sourceFilter));
    }

    if (sortByPercent) {
      result.sort((a, b) => getCashbackPercent(b) - getCashbackPercent(a));
    } else {
      result.sort((a, b) => b.date.localeCompare(a.date));
    }

    return result;
  }, [monthPurchases, search, categoryFilter, sourceFilter, sortByPercent]);

  const stats = useMemo(() => {
    const monthSpent = monthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const monthCashback = monthPurchases.reduce((sum, purchase) => sum + getTotalCashback(purchase), 0);
    const overallSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const overallCashback = purchases.reduce((sum, purchase) => sum + getTotalCashback(purchase), 0);
    const avgPercent = monthSpent > 0 ? (monthCashback / monthSpent) * 100 : 0;

    const bestPurchase = monthPurchases.reduce<CashbackPurchase | null>((currentBest, purchase) => {
      if (!currentBest) return purchase;
      return getCashbackPercent(purchase) > getCashbackPercent(currentBest) ? purchase : currentBest;
    }, null);

    return {
      monthSpent,
      monthCashback,
      overallSpent,
      overallCashback,
      avgPercent,
      bestPurchase,
    };
  }, [monthPurchases, purchases]);

  const insights = useMemo(() => {
    if (monthPurchases.length === 0) return [] as string[];

    const noCashbackPurchases = monthPurchases.filter((purchase) => !purchase.isReferral && purchase.cashbackEntries.length === 0);
    const totalWithoutCashback = noCashbackPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    const list: string[] = [];

    if (stats.bestPurchase) {
      list.push(t('cashbackHero.insights.bestDeal', {
        merchant: stats.bestPurchase.merchant,
        percent: getCashbackPercent(stats.bestPurchase).toFixed(1),
      }));
    }

    if (noCashbackPurchases.length > 0) {
      list.push(t('cashbackHero.insights.noCashback', {
        count: String(noCashbackPurchases.length),
        total: formatCurrency(totalWithoutCashback, 'EUR'),
      }));
    }

    if (stats.avgPercent < 2 && monthPurchases.length >= 3) {
      list.push(t('cashbackHero.insights.lowAverage'));
    }

    return list;
  }, [monthPurchases, stats, formatCurrency, t]);

  const monthLabel = selectedMonth === 'all'
    ? t('cashbackHero.months.all')
    : format(parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date()), 'MMMM yyyy', { locale: pt });

  const navigateMonth = (direction: -1 | 1) => {
    if (selectedMonth === 'all') {
      setSelectedMonth(monthKeyFromDate(new Date()));
      return;
    }

    const current = parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date());
    const next = direction < 0 ? subMonths(current, 1) : addMonths(current, 1);
    setSelectedMonth(monthKeyFromDate(next));
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const requestDeletePurchase = async (id: string) => {
    if (!window.confirm(t('cashbackHero.confirmDelete'))) return;
    try {
      await deletePurchase(id);
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

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
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
              <p className="mt-1 text-xs text-muted-foreground">{getCashbackPercent(stats.bestPurchase).toFixed(1)}%</p>
            ) : null}
          </div>
        </div>

        {insights.length > 0 ? (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" />
              {t('cashbackHero.insights.title')}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {insights.map((line) => (
                <li key={line}>- {line}</li>
              ))}
            </ul>
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
            filteredPurchases.map((purchase) => {
              const isExpanded = Boolean(expandedIds[purchase.id]);
              const totalCashback = getTotalCashback(purchase);
              const percent = getCashbackPercent(purchase);

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
                      {purchase.notes ? (
                        <p className="mb-3 text-xs italic text-muted-foreground">{purchase.notes}</p>
                      ) : null}

                      {purchase.cashbackEntries.length > 0 ? (
                        <div className="space-y-2">
                          {purchase.cashbackEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{entry.source}</p>
                                <p className="text-xs text-muted-foreground">{formatDateLabel(entry.dateReceived)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-primary">+{formatCurrency(entry.amount, 'EUR')}</p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
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
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => { void requestDeleteCashback(purchase.id, entry.id); }}
                                  title="Eliminar cashback"
                                  aria-label="Eliminar cashback"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('cashbackHero.cashback.noCashback')}</p>
                      )}

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingCashback(null);
                          setCashbackPurchaseId(purchase.id);
                        }} title="Adicionar cashback" aria-label="Adicionar cashback">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPurchase(purchase)} title="Editar" aria-label="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { void requestDeletePurchase(purchase.id); }} title="Eliminar" aria-label="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
            ) : null}
        </div>
      </div>

      <AddPurchaseDialog
        open={showAddPurchase}
        onOpenChange={setShowAddPurchase}
        onSubmit={async (payload) => {
          await addPurchase(payload);
          toast.success(t('cashbackHero.addPurchase'));
        }}
      />

      <EditPurchaseDialog
        purchase={editingPurchase}
        onOpenChange={(open) => { if (!open) setEditingPurchase(null); }}
        onSubmit={async (payload) => {
          if (!editingPurchase) return;
          await updatePurchase(editingPurchase.id, payload);
          toast.success(t('cashbackHero.editPurchase'));
          setEditingPurchase(null);
        }}
      />

      <AddCashbackDialog
        open={cashbackPurchaseId !== null}
        sources={sources}
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
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { merchant: string; category: CashbackCategory; date: string; amount: number; notes?: string; isReferral?: boolean }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<CashbackCategory>('other');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isReferral, setIsReferral] = useState(false);

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

    try {
      await onSubmit({
        merchant: merchant.trim(),
        category,
        date,
        amount: Math.max(parsedAmount, 0),
        notes: notes.trim() || undefined,
        isReferral: isReferral || undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      return;
    }

    setMerchant('');
    setAmount('');
    setNotes('');
    setIsReferral(false);
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

          <Button type="submit" className="w-full">{t('cashbackHero.addPurchase')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCashbackDialog({
  open,
  sources,
  editingEntry,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  sources: string[];
  editingEntry: CashbackEntry | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { source: string; amount: number; dateReceived: string }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [source, setSource] = useState(() => sources[0] ?? '');
  const [amount, setAmount] = useState('');
  const [dateReceived, setDateReceived] = useState(format(new Date(), 'yyyy-MM-dd'));
  const isEditing = editingEntry !== null;

  // Reset source when sources list changes and current is gone
  useEffect(() => {
    if (!sources.includes(source)) {
      setSource(sources[0] ?? '');
    }
  }, [sources, source]);

  useEffect(() => {
    if (!open) return;

    if (editingEntry) {
      setSource(editingEntry.source);
      setAmount(String(editingEntry.amount));
      setDateReceived(editingEntry.dateReceived);
      return;
    }

    setSource((prev) => (sources.includes(prev) ? prev : (sources[0] ?? '')));
    setAmount('');
    setDateReceived(format(new Date(), 'yyyy-MM-dd'));
  }, [open, editingEntry, sources]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('cashbackHero.form.amount'));
      return;
    }

    try {
      await onSubmit({ source, amount: parsedAmount, dateReceived });
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
                {sources.map((value) => (
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
            />
          </div>

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
  onOpenChange,
  onSubmit,
}: {
  purchase: CashbackPurchase | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { merchant: string; category: CashbackCategory; date: string; amount: number; notes?: string; isReferral?: boolean }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<CashbackCategory>('other');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isReferral, setIsReferral] = useState(false);

  // Sync form when the purchase changes
  useEffect(() => {
    if (purchase) {
      setMerchant(purchase.merchant);
      setCategory(purchase.category);
      setDate(purchase.date);
      setAmount(String(purchase.amount));
      setNotes(purchase.notes ?? '');
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

    try {
      await onSubmit({
        merchant: merchant.trim(),
        category,
        date,
        amount: Math.max(parsedAmount, 0),
        notes: notes.trim() || undefined,
        isReferral: isReferral || undefined,
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