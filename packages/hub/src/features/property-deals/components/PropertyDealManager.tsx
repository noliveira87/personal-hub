import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Home, Loader, Pencil, Trash2, TrendingUp, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PROPERTY_DEAL_PAYLOAD,
  PropertyAddress,
  PropertyDeal,
  PropertyDealPayload,
  PurchaseCosts,
} from '@/features/property-deals/lib/types';
import {
  deletePropertyDeal,
  fetchPropertyDeals,
  upsertPropertyDeal,
} from '@/features/property-deals/lib/store';
import { cn } from '@/lib/utils';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

type PropertyDealManagerProps = {
  createRequestTick?: number;
  showCatalog?: boolean;
  selectedDealIdFromRoute?: string | null;
  onSavedDeal?: (dealId: string) => void;
  onOpenDeal?: (dealId: string) => void;
};

function NumberInput({
  value,
  onChange,
  min,
  step = '0.01',
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground disabled:cursor-not-allowed disabled:opacity-70 sm:w-28"
    />
  );
}

function CurrencyInput({
  value,
  onChange,
  min,
  step = '0.01',
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs font-semibold text-muted-foreground">EUR</span>
      <NumberInput value={value} onChange={onChange} min={min} step={step} disabled={disabled} />
    </div>
  );
}

function DateInput({ value, onChange, disabled = false }: { value: string; onChange: (next: string) => void; disabled?: boolean }) {
  return (
    <input
      type="date"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70 sm:w-[132px]"
    />
  );
}

function buildNewDeal(): PropertyDeal {
  return {
    id: crypto.randomUUID(),
    title: '',
    payload: { ...DEFAULT_PROPERTY_DEAL_PAYLOAD },
  };
}

function getDealMetrics(deal: PropertyDeal) {
  const costs = deal.payload.costs;
  const purchaseExtras = (deal.payload.purchaseExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const saleExtras = (deal.payload.saleExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const effectiveSalePrice = getEffectiveSalePrice(deal.payload);
  const ownInvestmentBase =
    costs.signalCpcv +
    costs.escrituraAmount +
    costs.bankCheque +
    costs.taxesAndStamp +
    costs.houseReady +
    costs.leroyMerlin +
    costs.ikea +
    purchaseExtras;
  const ownInvestment = ownInvestmentBase;
  const grossCommission = effectiveSalePrice * (deal.payload.commissionRate / 100);
  const commissionTotal = grossCommission * (1 + deal.payload.commissionVatRate / 100);
  const profit = effectiveSalePrice - commissionTotal - ownInvestment - deal.payload.condoExpenses - saleExtras;

  return { ownInvestment, commissionTotal, profit };
}

function formatDealAddress(address: PropertyAddress) {
  const postalCity = [address.postalCode, address.city].filter(Boolean).join(' ');
  return [address.street, postalCity].filter(Boolean).join(' · ');
}

function getEffectiveSalePrice(payload: PropertyDealPayload) {
  return payload.saleStatus === 'sold' ? payload.salePrice : payload.simulatedOfferPrice;
}

export default function PropertyDealManager({
  createRequestTick = 0,
  showCatalog = true,
  selectedDealIdFromRoute = null,
  onSavedDeal,
  onOpenDeal,
}: PropertyDealManagerProps) {
  const { formatCurrency, t } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const lastCreateRequestTickRef = useRef(createRequestTick);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deals, setDeals] = useState<PropertyDeal[]>([]);
  const [currentDeal, setCurrentDeal] = useState<PropertyDeal>(buildNewDeal());
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaleBoard, setShowSaleBoard] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchPropertyDeals();
        if (!mounted) return;

        if (rows.length === 0) {
          setDeals([]);
          const next = buildNewDeal();
          setCurrentDeal(next);
          setSelectedDealId(showCatalog ? null : next.id);
          setIsEditing(!showCatalog);
          setShowSaleBoard(false);
        } else {
          setDeals(rows);
          if (!showCatalog && selectedDealIdFromRoute && selectedDealIdFromRoute !== 'new') {
            const selected = rows.find((item) => item.id === selectedDealIdFromRoute) ?? rows[0];
            setCurrentDeal(selected);
            setSelectedDealId(selected.id);
            setIsEditing(false);
            setShowSaleBoard(true);
          } else {
            setCurrentDeal(rows[0]);
            setSelectedDealId(showCatalog ? null : rows[0].id);
            setIsEditing(false);
            setShowSaleBoard(true);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha a carregar imoveis.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedDealIdFromRoute, showCatalog]);

  useEffect(() => {
    if (showCatalog) return;

    if (selectedDealIdFromRoute === 'new') {
      const next = buildNewDeal();
      setCurrentDeal(next);
      setSelectedDealId(next.id);
      setIsEditing(true);
      setShowSaleBoard(false);
      return;
    }

    if (!selectedDealIdFromRoute) return;
    const selected = deals.find((item) => item.id === selectedDealIdFromRoute);
    if (!selected) return;

    setCurrentDeal(selected);
    setSelectedDealId(selected.id);
    setIsEditing(false);
    setShowSaleBoard(true);
  }, [deals, selectedDealIdFromRoute, showCatalog]);

  useEffect(() => {
    if (createRequestTick === lastCreateRequestTickRef.current) return;
    lastCreateRequestTickRef.current = createRequestTick;

    const next = buildNewDeal();
    setCurrentDeal(next);
    setSelectedDealId(next.id);
    setIsEditing(true);
    setShowSaleBoard(false);
  }, [createRequestTick]);

  const ownInvestment = useMemo(() => {
    const costs = currentDeal.payload.costs;
    const purchaseExtras = (currentDeal.payload.purchaseExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const base =
      costs.signalCpcv +
      costs.escrituraAmount +
      costs.bankCheque +
      costs.taxesAndStamp +
      costs.houseReady +
      costs.leroyMerlin +
      costs.ikea +
      purchaseExtras;

    return base;
  }, [currentDeal.payload]);

  const saleExtraTotal = useMemo(
    () => (currentDeal.payload.saleExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0),
    [currentDeal.payload.saleExtraEntries],
  );

  const purchaseExtraTotal = useMemo(
    () => (currentDeal.payload.purchaseExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0),
    [currentDeal.payload.purchaseExtraEntries],
  );

  const effectiveSalePrice = useMemo(
    () => getEffectiveSalePrice(currentDeal.payload),
    [currentDeal.payload],
  );

  const purchaseOtherCostsTotal = useMemo(() => {
    const costs = currentDeal.payload.costs;
    return costs.bankCheque + costs.taxesAndStamp + costs.houseReady + costs.leroyMerlin + costs.ikea;
  }, [currentDeal.payload.costs]);

  const purchaseTotalIncluded = useMemo(
    () => currentDeal.payload.purchasePrice + purchaseExtraTotal + purchaseOtherCostsTotal,
    [currentDeal.payload.purchasePrice, purchaseExtraTotal, purchaseOtherCostsTotal],
  );

  const saleTotalIncluded = useMemo(
    () => effectiveSalePrice + saleExtraTotal,
    [effectiveSalePrice, saleExtraTotal],
  );

  const commissionTotal = useMemo(() => {
    const grossCommission = effectiveSalePrice * (currentDeal.payload.commissionRate / 100);
    return grossCommission * (1 + currentDeal.payload.commissionVatRate / 100);
  }, [currentDeal.payload, effectiveSalePrice]);

  const profit = useMemo(() => {
    return effectiveSalePrice - commissionTotal - ownInvestment - currentDeal.payload.condoExpenses - saleExtraTotal;
  }, [currentDeal.payload, commissionTotal, ownInvestment, saleExtraTotal]);

  const saleDeedAmount = Math.max(0, effectiveSalePrice - currentDeal.payload.saleSignalAmount);
  const currentDealExistsInList = deals.some((item) => item.id === currentDeal.id);
  const isDetailOpen = selectedDealId != null && selectedDealId === currentDeal.id;
  const shouldShowDetail = !showCatalog || (!onOpenDeal && isDetailOpen);
  const totalDeals = deals.length;
  const profitableDeals = deals.filter((deal) => getDealMetrics(deal).profit > 0).length;
  const avgProfit = deals.length > 0
    ? deals.reduce((sum, deal) => sum + getDealMetrics(deal).profit, 0) / deals.length
    : 0;
  const portfolioTotalProfit = deals.reduce((sum, deal) => sum + getDealMetrics(deal).profit, 0);
  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? null;
  const selectedDealProfit = selectedDeal ? getDealMetrics(selectedDeal).profit : null;
  const selectedDeltaVsAverage = selectedDealProfit == null ? null : selectedDealProfit - avgProfit;

  const formatDateValue = (value: string) => {
    if (!value) return '—';
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  const renderReadOnlyMoney = (value: number) => (
    <span className="text-base font-bold tabular-nums text-foreground sm:text-lg">{formatCurrency(value)}</span>
  );

  const renderReadOnlyDate = (value: string) => (
    <span className="inline-flex min-w-[108px] justify-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
      {formatDateValue(value)}
    </span>
  );

  const updatePayload = (next: Partial<PropertyDealPayload>) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        ...next,
      },
    }));
  };

  const updateCosts = (next: Partial<PurchaseCosts>) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        costs: {
          ...prev.payload.costs,
          ...next,
        },
      },
    }));
  };

  const addPurchaseExtraEntry = () => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        purchaseExtraEntries: [
          ...(prev.payload.purchaseExtraEntries ?? []),
          { id: crypto.randomUUID(), label: '', amount: 0, date: '' },
        ],
      },
    }));
  };

  const updatePurchaseExtraEntry = (entryId: string, patch: Partial<{ label: string; amount: number; date: string }>) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        purchaseExtraEntries: (prev.payload.purchaseExtraEntries ?? []).map((entry) => (
          entry.id === entryId ? { ...entry, ...patch } : entry
        )),
      },
    }));
  };

  const removePurchaseExtraEntry = (entryId: string) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        purchaseExtraEntries: (prev.payload.purchaseExtraEntries ?? []).filter((entry) => entry.id !== entryId),
      },
    }));
  };

  const addSaleExtraEntry = () => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        saleExtraEntries: [
          ...(prev.payload.saleExtraEntries ?? []),
          { id: crypto.randomUUID(), label: '', amount: 0, date: '' },
        ],
      },
    }));
  };

  const updateSaleExtraEntry = (entryId: string, patch: Partial<{ label: string; amount: number; date: string }>) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        saleExtraEntries: (prev.payload.saleExtraEntries ?? []).map((entry) => (
          entry.id === entryId ? { ...entry, ...patch } : entry
        )),
      },
    }));
  };

  const removeSaleExtraEntry = (entryId: string) => {
    setCurrentDeal((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        saleExtraEntries: (prev.payload.saleExtraEntries ?? []).filter((entry) => entry.id !== entryId),
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await upsertPropertyDeal(currentDeal);
      const refreshed = await fetchPropertyDeals();
      setDeals(refreshed);
      const selected = refreshed.find((item) => item.id === currentDeal.id);
      if (selected) setCurrentDeal(selected);
      const savedId = selected?.id ?? currentDeal.id;
      setSelectedDealId(savedId);
      setIsEditing(false);
      setShowSaleBoard(true);
      onSavedDeal?.(savedId);
      toast.success(t('propertyDeals.toasts.saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('propertyDeals.toasts.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      if (!deals.some((item) => item.id === currentDeal.id)) {
        setCurrentDeal(buildNewDeal());
        setSelectedDealId(null);
        setIsEditing(false);
        setShowSaleBoard(false);
        return;
      }

      const accepted = await confirm({
        title: t('propertyDeals.confirmDelete', { name: currentDeal.title || t('propertyDeals.dialogTitle') }),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
      });
      if (!accepted) return;

      await deletePropertyDeal(currentDeal.id);
      const refreshed = await fetchPropertyDeals();
      setDeals(refreshed);
      setCurrentDeal(refreshed[0] ?? buildNewDeal());
      setSelectedDealId(showCatalog ? null : (refreshed[0]?.id ?? null));
      setIsEditing(false);
      setShowSaleBoard(refreshed.length > 0);
      toast.success(t('propertyDeals.toasts.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('propertyDeals.toasts.deleteFailed'));
    }
  };

  const cancelEdit = () => {
    const persisted = deals.find((item) => item.id === currentDeal.id);
    if (persisted) {
      setCurrentDeal(persisted);
      setIsEditing(false);
      setShowSaleBoard(true);
      return;
    }

    setCurrentDeal(buildNewDeal());
    setSelectedDealId(null);
    setIsEditing(false);
    setShowSaleBoard(false);
  };

  return (
    <section className={cn(
      showCatalog
        ? 'rounded-3xl border border-border/70 bg-[linear-gradient(160deg,hsl(var(--card)),hsl(var(--background)))] p-5 shadow-sm sm:p-6'
        : 'bg-transparent px-2 py-0 sm:px-0',
    )}>
      {showCatalog ? (
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{t('propertyDeals.managerTitle')}</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">{t('propertyDeals.managerSubtitle')}</p>
        </div>
        {deals.length > 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {selectedDeal ? t('propertyDeals.comparison') : t('propertyDeals.portfolio')}
            </div>
            <p className={cn(
              'mt-1 text-sm font-semibold tabular-nums',
              (selectedDealProfit ?? portfolioTotalProfit) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
            )}>
              {selectedDeal ? formatCurrency(selectedDealProfit ?? 0) : formatCurrency(portfolioTotalProfit)}
            </p>
            {selectedDeal && selectedDeltaVsAverage != null ? (
              <p className={cn(
                'text-xs',
                selectedDeltaVsAverage >= 0 ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-red-700/80 dark:text-red-300/80',
              )}>
                {selectedDeltaVsAverage >= 0 ? '+' : ''}{formatCurrency(selectedDeltaVsAverage)} {t('propertyDeals.vsMean')}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}

      {showCatalog ? (
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('propertyDeals.properties')}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{totalDeals}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('propertyDeals.profitable')}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{profitableDeals}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('propertyDeals.avgProfit')}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatCurrency(avgProfit)}</p>
        </div>
      </div>
      ) : null}

      {showCatalog ? (
      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!currentDealExistsInList ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenDeal) {
                  onOpenDeal('new');
                } else {
                  setSelectedDealId(currentDeal.id);
                  setIsEditing(true);
                }
              }}
              className="rounded-2xl border border-dashed border-primary/60 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
            >
              <p className="text-sm font-semibold text-foreground">{currentDeal.title || t('propertyDeals.new')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('propertyDeals.draft')}</p>
              <p className="mt-3 text-xs font-medium text-primary">{t('propertyDeals.openDetail')}</p>
            </button>
          ) : null}

          {deals.map((deal) => {
            const metrics = getDealMetrics(deal);
            const isSelected = deal.id === currentDeal.id;
            const addressLabel = formatDealAddress(deal.payload.address);

            return (
              <button
                key={deal.id}
                type="button"
                onClick={() => {
                  if (onOpenDeal) {
                    onOpenDeal(deal.id);
                  } else {
                    setCurrentDeal(deal);
                    setSelectedDealId(deal.id);
                    setIsEditing(false);
                    setShowSaleBoard(true);
                  }
                }}
                className={cn(
                  'rounded-2xl p-4 text-left shadow-sm transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-md',
                  isSelected
                    ? 'border border-primary/50 bg-[linear-gradient(150deg,hsl(var(--primary)/0.1),hsl(var(--card)))]'
                    : 'border border-border bg-background/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold leading-tight text-foreground">{deal.title}</p>
                    <p className={cn('mt-1 text-xs', addressLabel ? 'text-muted-foreground' : 'italic text-muted-foreground/70')}>
                      {addressLabel || t('propertyDeals.noAddress')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('propertyDeals.purchase')} {formatCurrency(deal.payload.purchasePrice)}</p>
                  </div>
                  <span className={metrics.profit >= 0
                    ? 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300'
                    : 'rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300'}
                  >
                    {formatCurrency(metrics.profit)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">{t('propertyDeals.sale')}</p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">{formatCurrency(getEffectiveSalePrice(deal.payload))}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">{t('propertyDeals.investment')}</p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">{formatCurrency(metrics.ownInvestment)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      ) : null}

      {shouldShowDetail ? (
        <div className={cn(
          showCatalog
            ? 'rounded-xl border border-border/60 bg-card p-3 sm:p-4'
            : 'mx-auto w-full max-w-5xl rounded-xl border border-border/60 bg-card p-3 sm:border-0 sm:bg-transparent sm:p-0',
        )}>
          <div className="mb-6 rounded-2xl border border-border/70 bg-[linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.property')}</p>
                <p className="mt-1 truncate text-base font-semibold text-foreground">{currentDeal.title || t('propertyDeals.new')}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{formatDealAddress(currentDeal.payload.address) || t('propertyDeals.noAddress')}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {currentDeal.payload.saleStatus === 'sold' ? t('propertyDeals.saleStatusSold') : t('propertyDeals.saleStatusNotSold')}
                </div>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={cancelEdit}
                    disabled={saving}
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsEditing(true)}
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {currentDealExistsInList ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => void remove()}
                        disabled={loading}
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* COMPRA */}
              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.totalAcquisition')}</p>
                <p className="mt-2 text-sm font-bold tabular-nums text-foreground">{formatCurrency(purchaseTotalIncluded)}</p>
                <div className="mt-1.5 space-y-0.5 border-t border-border/40 pt-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t('propertyDeals.purchasePrice')}:</span>
                    <span>{formatCurrency(currentDeal.payload.purchasePrice)}</span>
                  </div>
                  {purchaseExtraTotal > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('propertyDeals.extraValuesSection')}:</span>
                      <span>{formatCurrency(purchaseExtraTotal)}</span>
                    </div>
                  )}
                  {purchaseOtherCostsTotal > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('propertyDeals.otherPurchaseCosts')}:</span>
                      <span>{formatCurrency(purchaseOtherCostsTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* VENDA */}
              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.totalSaleValue')}</p>
                <p className="mt-2 text-sm font-bold tabular-nums text-foreground">{formatCurrency(saleTotalIncluded)}</p>
                <div className="mt-1.5 space-y-0.5 border-t border-border/40 pt-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t('propertyDeals.saleValue')}:</span>
                    <span>{formatCurrency(effectiveSalePrice)}</span>
                  </div>
                  {saleExtraTotal > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('propertyDeals.extraValuesSection')}:</span>
                      <span>{formatCurrency(saleExtraTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.ownInvestment')}</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-foreground">{formatCurrency(ownInvestment)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.profit')}</p>
                <p className={cn(
                  'mt-1 text-sm font-bold tabular-nums',
                  profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
                )}>{formatCurrency(profit)}</p>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-5">
              {/* EDITAR ENDEREÇO */}
              <div className="rounded-2xl border border-border/70 bg-[linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))] p-4 shadow-sm sm:p-5">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/90">{t('propertyDeals.editAddress')}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.propertyName')} *</label>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      value={currentDeal.title}
                      onChange={(event) => setCurrentDeal((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Ex: Apartamento São Martinho"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.street')}</label>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      value={currentDeal.payload.address?.street ?? ''}
                      onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, street: event.target.value } })}
                      placeholder="Rua dos Corvões"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.postalCode')}</label>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      value={currentDeal.payload.address?.postalCode ?? ''}
                      onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, postalCode: event.target.value } })}
                      placeholder="3045-049"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.city')}</label>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      value={currentDeal.payload.address?.city ?? ''}
                      onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, city: event.target.value } })}
                      placeholder="São Martinho do Bispo"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-4">

              {/* QUADRO COMPRA */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{t('propertyDeals.purchaseBoard')}</h3>
                </div>

                <div className="space-y-4">
                  {/* Total aquisição */}
                  <div className="rounded-lg border border-border/60 px-3 py-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.totalAcquisition')}</label>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={Number.isFinite(currentDeal.payload.purchasePrice) ? currentDeal.payload.purchasePrice : 0}
                        onChange={(event) => updatePayload({ purchasePrice: Number(event.target.value) || 0 })}
                        className="h-8 w-32 rounded-md border border-border bg-background px-2 text-right text-sm font-semibold tabular-nums text-foreground"
                      />
                    </div>
                  </div>

                  {/* Reserva */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.phaseReserve')}</label>
                      <span className="text-[11px] font-medium text-muted-foreground">{t('propertyDeals.reserveRefundHint')}</span>
                    </div>
                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('propertyDeals.reserveAmount')}</label>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={Number.isFinite(currentDeal.payload.costs.reserveEra) ? currentDeal.payload.costs.reserveEra : 0}
                              onChange={(next) => updateCosts({ reserveEra: Number(next.target.value) || 0 })}
                              className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                            />
                          </div>
                          <input
                            type="date"
                            value={currentDeal.payload.purchaseDates.reserveEra}
                            onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, reserveEra: next.target.value } })}
                            className="h-8 w-[132px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Proposta */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.phaseProposal')}</label>
                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('propertyDeals.proposalApproval')}</label>
                        <input
                          type="date"
                          value={currentDeal.payload.purchaseDates.proposalApproval}
                          onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, proposalApproval: next.target.value } })}
                          className="h-8 w-[132px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CPCV */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.phaseCpcv')}</label>
                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('propertyDeals.signalCpcvAmount')}</label>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={Number.isFinite(currentDeal.payload.costs.signalCpcv) ? currentDeal.payload.costs.signalCpcv : 0}
                              onChange={(next) => updateCosts({ signalCpcv: Number(next.target.value) || 0 })}
                              className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                            />
                          </div>
                          <input
                            type="date"
                            value={currentDeal.payload.purchaseDates.cpcvSignature}
                            onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, cpcvSignature: next.target.value } })}
                            className="h-8 w-[132px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Escritura */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.phaseDeed')}</label>
                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('propertyDeals.purchaseDeedAmount')}</label>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={Number.isFinite(currentDeal.payload.costs.escrituraAmount) ? currentDeal.payload.costs.escrituraAmount : 0}
                              onChange={(next) => updateCosts({ escrituraAmount: Number(next.target.value) || 0 })}
                              className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                            />
                          </div>
                          <input
                            type="date"
                            value={currentDeal.payload.purchaseDates.escritura}
                            onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, escritura: next.target.value } })}
                            className="h-8 w-[132px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outros custos + Valores Extra */}
                  <div className="space-y-3 rounded-lg border border-border/60 px-3 py-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.otherPurchaseCosts')}</label>
                      <div className="space-y-2">
                        {[
                          [t('propertyDeals.bankCheque'), 'bankCheque', currentDeal.payload.costs.bankCheque],
                          [t('propertyDeals.taxesAndStamp'), 'taxesAndStamp', currentDeal.payload.costs.taxesAndStamp],
                          [t('propertyDeals.houseReady'), 'houseReady', currentDeal.payload.costs.houseReady],
                          [t('propertyDeals.leroyMerlin'), 'leroyMerlin', currentDeal.payload.costs.leroyMerlin],
                          [t('propertyDeals.ikea'), 'ikea', currentDeal.payload.costs.ikea],
                        ].map(([label, key, value]) => (
                          <div key={String(key)} className="flex items-center justify-between">
                            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={Number(value)}
                                onChange={(next) => updateCosts({ [String(key)]: Number(next.target.value) || 0 } as Partial<PurchaseCosts>)}
                                className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.extraValuesSection')}</label>
                      {(currentDeal.payload.purchaseExtraEntries ?? []).length === 0 ? (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground">{t('propertyDeals.noAdditionalValues')}</p>
                          <Button type="button" variant="outline" className="h-7 w-fit px-2 text-xs" onClick={addPurchaseExtraEntry}>
                            {t('propertyDeals.addValue')}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 space-y-2">
                            {(currentDeal.payload.purchaseExtraEntries ?? []).map((entry) => (
                              <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-md border border-border/60 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <input
                                  className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                                  value={entry.label}
                                  onChange={(event) => updatePurchaseExtraEntry(entry.id, { label: event.target.value })}
                                  placeholder={t('propertyDeals.description')}
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={entry.amount || 0}
                                    onChange={(next) => updatePurchaseExtraEntry(entry.id, { amount: Number(next.target.value) || 0 })}
                                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                                  />
                                </div>
                                <DateInput value={entry.date} onChange={(next) => updatePurchaseExtraEntry(entry.id, { date: next.target.value })} />
                                <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removePurchaseExtraEntry(entry.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 text-right">
                            <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addPurchaseExtraEntry}>
                              {t('propertyDeals.addValue')}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* INVESTIMENTO PRÓPRIO */}
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.ownInvestment')}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{formatCurrency(ownInvestment)}</p>
              </div>

                </div>

                <div className="space-y-4">

              {showSaleBoard ? (
                <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{t('propertyDeals.saleBoard')}</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.saleStatus')}</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={currentDeal.payload.saleStatus === 'not-sold' ? 'default' : 'outline'}
                          className="h-8 px-3 text-xs"
                          onClick={() => updatePayload({ saleStatus: 'not-sold' })}
                        >
                          {t('propertyDeals.saleStatusNotSold')}
                        </Button>
                        <Button
                          type="button"
                          variant={currentDeal.payload.saleStatus === 'sold' ? 'default' : 'outline'}
                          className="h-8 px-3 text-xs"
                          onClick={() => updatePayload({ saleStatus: 'sold' })}
                        >
                          {t('propertyDeals.saleStatusSold')}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {currentDeal.payload.saleStatus === 'sold' ? t('propertyDeals.totalSaleValue') : t('propertyDeals.offerPurchaseValue')}
                      </span>
                      {currentDeal.payload.saleStatus === 'sold' ? (
                        <CurrencyInput value={currentDeal.payload.salePrice} onChange={(next) => updatePayload({ salePrice: next })} min={0} />
                      ) : (
                        <CurrencyInput value={currentDeal.payload.simulatedOfferPrice} onChange={(next) => updatePayload({ simulatedOfferPrice: next })} min={0} />
                      )}
                    </div>

                    <div className="rounded-lg border border-border/60 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.realEstateCommission')}</span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                          <span>{t('propertyDeals.baseFee')}</span>
                          <NumberInput value={currentDeal.payload.commissionRate} onChange={(next) => updatePayload({ commissionRate: next })} min={0} step="0.1" />
                          <span>{t('propertyDeals.vatPercentage')}</span>
                          <NumberInput value={currentDeal.payload.commissionVatRate} onChange={(next) => updatePayload({ commissionVatRate: next })} min={0} step="0.1" />
                        </div>
                      </div>
                      <p className="mt-2 text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrency(commissionTotal)}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.condoExpenses')}</span>
                      <CurrencyInput value={currentDeal.payload.condoExpenses} onChange={(next) => updatePayload({ condoExpenses: next })} min={0} />
                    </div>

                    {currentDeal.payload.saleStatus === 'sold' ? (
                      <>
                        <div className="flex flex-col gap-2 rounded-lg border border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.saleSignal')}</span>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <CurrencyInput value={currentDeal.payload.saleSignalAmount} onChange={(next) => updatePayload({ saleSignalAmount: next })} min={0} />
                            <DateInput value={currentDeal.payload.saleDates.signalDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, signalDate: next } })} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 rounded-lg border border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.valueOnDeeds')}</span>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(saleDeedAmount)}</span>
                            <DateInput value={currentDeal.payload.saleDates.escrituraDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, escrituraDate: next } })} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        {t('propertyDeals.simulationHint')}
                      </p>
                    )}

                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.profit')}</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCurrency(profit)}</p>
                    </div>

                    <div className="space-y-2 rounded-lg border border-dashed border-border/60 px-3 py-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.extraValuesSection')}</label>

                      {(currentDeal.payload.saleExtraEntries ?? []).length === 0 ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground">{t('propertyDeals.noAdditionalValues')}</p>
                          <Button type="button" variant="outline" className="h-7 w-fit px-2 text-xs" onClick={addSaleExtraEntry}>
                            {t('propertyDeals.addValue')}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {(currentDeal.payload.saleExtraEntries ?? []).map((entry) => (
                              <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-md border border-border/60 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <input
                                  className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                                  value={entry.label}
                                  onChange={(event) => updateSaleExtraEntry(entry.id, { label: event.target.value })}
                                  placeholder={t('propertyDeals.description')}
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-muted-foreground">EUR</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={entry.amount || 0}
                                    onChange={(next) => updateSaleExtraEntry(entry.id, { amount: Number(next.target.value) || 0 })}
                                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground"
                                  />
                                </div>
                                <DateInput value={entry.date} onChange={(next) => updateSaleExtraEntry(entry.id, { date: next.target.value })} />
                                <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removeSaleExtraEntry(entry.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="pt-1 text-right">
                            <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addSaleExtraEntry}>
                              {t('propertyDeals.addValue')}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.saleBoard')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('propertyDeals.saleBoardAddHint')}</p>
                  <Button type="button" variant="outline" className="mt-3 h-8 px-3 text-xs" onClick={() => setShowSaleBoard(true)}>
                    {t('propertyDeals.addSaleBoard')}
                  </Button>
                </div>
              )}

                </div>
              </div>

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || loading}
                className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : null}
                  {saving ? `${t('common.save')}...` : t('common.save')}
                </span>
              </button>
            </div>
          ) : null}

          {!isEditing && (
            <>
              {/* PREVIEW MODE - Purchase Board */}
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">{t('propertyDeals.purchaseBoard')}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t('propertyDeals.totalAcquisition')}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(currentDeal.payload.purchasePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t('propertyDeals.signalCpcvAmount')}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(currentDeal.payload.costs.signalCpcv)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t('propertyDeals.purchaseDeedAmount')}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(currentDeal.payload.costs.escrituraAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t('propertyDeals.otherPurchaseValues')}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(purchaseExtraTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t('propertyDeals.purchaseDeedDate')}</span>
                      <span className="text-sm font-medium text-foreground">{formatDateValue(currentDeal.payload.purchaseDates.escritura)}</span>
                    </div>
                  </div>
                </div>

                {/* PREVIEW MODE - Sale Board */}
                {showSaleBoard && (
                  <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">{t('propertyDeals.saleBoard')}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{t('propertyDeals.saleStatus')}</span>
                        <span className="text-sm font-medium text-foreground">{currentDeal.payload.saleStatus === 'sold' ? t('propertyDeals.saleStatusSold') : t('propertyDeals.saleStatusNotSold')}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{t('propertyDeals.totalSaleValue')}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(effectiveSalePrice)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{t('propertyDeals.saleSignal')}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(currentDeal.payload.saleSignalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{t('propertyDeals.valueOnDeeds')}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(saleDeedAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{t('propertyDeals.otherSaleValues')}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(saleExtraTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
      {confirmDialog}
    </section>
  );
}
