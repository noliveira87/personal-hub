import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Home, Pencil, Trash2, TrendingUp, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
      className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-xs font-medium tabular-nums text-foreground disabled:cursor-not-allowed disabled:opacity-70"
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
      className="h-8 w-[132px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
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

export default function PropertyDealManager({ createRequestTick = 0 }: { createRequestTick?: number }) {
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
          setCurrentDeal(buildNewDeal());
          setSelectedDealId(null);
          setShowSaleBoard(false);
        } else {
          setDeals(rows);
          setCurrentDeal(rows[0]);
          setSelectedDealId(null);
          setShowSaleBoard(true);
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
  }, []);

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

  const effectiveSalePrice = useMemo(
    () => getEffectiveSalePrice(currentDeal.payload),
    [currentDeal.payload],
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
      setIsEditing(false);
      setShowSaleBoard(true);
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
      setSelectedDealId(null);
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
    <section className="rounded-3xl border border-border/70 bg-[linear-gradient(160deg,hsl(var(--card)),hsl(var(--background)))] p-5 shadow-sm sm:p-6">
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

      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!currentDealExistsInList ? (
            <button
              type="button"
              onClick={() => {
                setSelectedDealId(currentDeal.id);
                setIsEditing(true);
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
                  setCurrentDeal(deal);
                  setSelectedDealId(deal.id);
                  setIsEditing(false);
                  setShowSaleBoard(true);
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

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDealId(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogTitle className="sr-only">Detalhes do imóvel</DialogTitle>
          <DialogDescription className="sr-only">Editar informações do imóvel incluindo endereço, custos de compra e venda, e cálculos de lucro.</DialogDescription>
          <div className="mb-6 flex items-start justify-between gap-6 pr-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">{currentDeal.title || t('propertyDeals.new')}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{formatDealAddress(currentDeal.payload.address)}</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {isEditing ? (
                <>
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
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => void save()}
                    disabled={saving || loading}
                    title={t('common.save')}
                    aria-label={t('common.save')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </>
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

          {isEditing ? (
            <div className="mb-4 rounded-2xl border border-border/70 bg-background/55 p-3 sm:p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.editAddress')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="h-9 min-w-[220px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.title}
                  onChange={(event) => setCurrentDeal((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={t('propertyDeals.propertyName')}
                  disabled={!isEditing}
                />
                <input
                  className="h-9 min-w-[280px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.street ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, street: event.target.value } })}
                  placeholder={t('propertyDeals.street')}
                  disabled={!isEditing}
                />
                <input
                  className="h-9 w-36 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.postalCode ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, postalCode: event.target.value } })}
                  placeholder={t('propertyDeals.postalCode')}
                  disabled={!isEditing}
                />
                <input
                  className="h-9 min-w-[160px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.city ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, city: event.target.value } })}
                  placeholder={t('propertyDeals.city')}
                  disabled={!isEditing}
                />
              </div>
            </div>
          ) : null}

          <div className={cn('grid grid-cols-1 gap-4', showSaleBoard ? 'xl:grid-cols-2' : 'xl:grid-cols-1')}>
            <div className="rounded-2xl border border-sky-300/50 bg-gradient-to-br from-sky-500/5 via-background/70 to-background p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/50 bg-sky-500/10 px-3 py-1">
                  <Home className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">{t('propertyDeals.purchaseBoard')}</span>
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{t('propertyDeals.totalAcquisition')}</span>
                  {isEditing ? (
                    <CurrencyInput value={currentDeal.payload.purchasePrice} onChange={(next) => updatePayload({ purchasePrice: next })} min={0} disabled={!isEditing} />
                  ) : (
                    renderReadOnlyMoney(currentDeal.payload.purchasePrice)
                  )}
                </div>

                <div className="rounded-xl border border-sky-200/60 bg-sky-500/5 px-3 py-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-800/80 dark:text-sky-200/80">{t('propertyDeals.phaseReserve')}</p>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{t('propertyDeals.reserveAmount')}</p>
                      <p className="text-[11px] text-muted-foreground">{t('propertyDeals.reserveRefundHint')}</p>
                    </div>
                    {isEditing ? (
                      <div className="flex min-w-[320px] items-center justify-end gap-2">
                        <CurrencyInput value={currentDeal.payload.costs.reserveEra} onChange={(next) => updateCosts({ reserveEra: next })} min={0} disabled={!isEditing} />
                        <DateInput value={currentDeal.payload.purchaseDates.reserveEra} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, reserveEra: next } })} disabled={!isEditing} />
                      </div>
                    ) : (
                      <div className="text-right">
                        {renderReadOnlyMoney(currentDeal.payload.costs.reserveEra)}
                        <div className="mt-1">{renderReadOnlyDate(currentDeal.payload.purchaseDates.reserveEra)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200/60 bg-sky-500/5 px-3 py-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-800/80 dark:text-sky-200/80">{t('propertyDeals.phaseProposal')}</p>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.proposalApproval')}</span>
                    {isEditing ? (
                      <DateInput value={currentDeal.payload.purchaseDates.proposalApproval} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, proposalApproval: next } })} disabled={!isEditing} />
                    ) : (
                      renderReadOnlyDate(currentDeal.payload.purchaseDates.proposalApproval)
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200/60 bg-sky-500/5 px-3 py-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-800/80 dark:text-sky-200/80">{t('propertyDeals.phaseCpcv')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">{t('propertyDeals.signalCpcvAmount')}</span>
                      {isEditing ? (
                        <CurrencyInput value={currentDeal.payload.costs.signalCpcv} onChange={(next) => updateCosts({ signalCpcv: next })} min={0} disabled={!isEditing} />
                      ) : (
                        renderReadOnlyMoney(currentDeal.payload.costs.signalCpcv)
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.signalCpcvDate')}</span>
                      {isEditing ? (
                        <DateInput value={currentDeal.payload.purchaseDates.cpcvSignature} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, cpcvSignature: next } })} disabled={!isEditing} />
                      ) : (
                        renderReadOnlyDate(currentDeal.payload.purchaseDates.cpcvSignature)
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200/60 bg-sky-500/5 px-3 py-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-800/80 dark:text-sky-200/80">{t('propertyDeals.phaseDeed')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">{t('propertyDeals.purchaseDeedAmount')}</span>
                      {isEditing ? (
                        <CurrencyInput value={currentDeal.payload.costs.escrituraAmount} onChange={(next) => updateCosts({ escrituraAmount: next })} min={0} disabled={!isEditing} />
                      ) : (
                        renderReadOnlyMoney(currentDeal.payload.costs.escrituraAmount)
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.purchaseDeedDate')}</span>
                      {isEditing ? (
                        <DateInput value={currentDeal.payload.purchaseDates.escritura} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, escritura: next } })} disabled={!isEditing} />
                      ) : (
                        renderReadOnlyDate(currentDeal.payload.purchaseDates.escritura)
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-border/70 px-3 py-2">
                  {isEditing ? (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.extraValuesSection')}</p>
                  ) : null}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t('propertyDeals.otherPurchaseValues')}</span>
                    {isEditing ? (
                      <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addPurchaseExtraEntry}>
                        {t('propertyDeals.addValue')}
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {(currentDeal.payload.purchaseExtraEntries ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('propertyDeals.noAdditionalValues')}</p>
                    ) : (
                      (currentDeal.payload.purchaseExtraEntries ?? []).map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2 py-2">
                          {isEditing ? (
                            <>
                              <input
                                className="h-8 min-w-[180px] flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                                value={entry.label}
                                onChange={(event) => updatePurchaseExtraEntry(entry.id, { label: event.target.value })}
                                placeholder={t('propertyDeals.description')}
                                disabled={!isEditing}
                              />
                              <CurrencyInput
                                value={entry.amount}
                                onChange={(next) => updatePurchaseExtraEntry(entry.id, { amount: next })}
                                min={0}
                                disabled={!isEditing}
                              />
                              <DateInput
                                value={entry.date}
                                onChange={(next) => updatePurchaseExtraEntry(entry.id, { date: next })}
                                disabled={!isEditing}
                              />
                              <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removePurchaseExtraEntry(entry.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="min-w-[180px] flex-1 text-xs font-medium text-foreground">{entry.label || '—'}</p>
                              <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(entry.amount || 0)}</p>
                              {renderReadOnlyDate(entry.date)}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {[
                  [t('propertyDeals.bankCheque'), 'bankCheque', currentDeal.payload.costs.bankCheque],
                  [t('propertyDeals.taxesAndStamp'), 'taxesAndStamp', currentDeal.payload.costs.taxesAndStamp],
                  [t('propertyDeals.houseReady'), 'houseReady', currentDeal.payload.costs.houseReady],
                  [t('propertyDeals.leroyMerlin'), 'leroyMerlin', currentDeal.payload.costs.leroyMerlin],
                  [t('propertyDeals.ikea'), 'ikea', currentDeal.payload.costs.ikea],
                ].filter(([, , value]) => Number(value) > 0).map(([label, key, value]) => (
                  <div key={String(key)} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    {isEditing ? (
                      <CurrencyInput value={Number(value)} onChange={(next) => updateCosts({ [String(key)]: next } as Partial<PurchaseCosts>)} min={0} disabled={!isEditing} />
                    ) : (
                      renderReadOnlyMoney(Number(value))
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('propertyDeals.ownInvestment')}</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(ownInvestment)}</p>
              </div>
            </div>

            {showSaleBoard ? (
            <div className="rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-emerald-500/5 via-background/70 to-background p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-500/10 px-3 py-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">{t('propertyDeals.saleBoard')}</span>
                </span>
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.valuesSection')}</p>
                ) : null}
                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="mb-2 text-xs font-medium text-foreground">{t('propertyDeals.saleStatus')}</div>
                  {isEditing ? (
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
                  ) : (
                    <span className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                      currentDeal.payload.saleStatus === 'sold'
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                    )}>
                      {currentDeal.payload.saleStatus === 'sold' ? t('propertyDeals.saleStatusSold') : t('propertyDeals.saleStatusNotSold')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentDeal.payload.saleStatus === 'sold' ? t('propertyDeals.totalSaleValue') : t('propertyDeals.offerPurchaseValue')}
                  </span>
                  {isEditing ? (
                    currentDeal.payload.saleStatus === 'sold' ? (
                      <CurrencyInput value={currentDeal.payload.salePrice} onChange={(next) => updatePayload({ salePrice: next })} min={0} disabled={!isEditing} />
                    ) : (
                      <CurrencyInput value={currentDeal.payload.simulatedOfferPrice} onChange={(next) => updatePayload({ simulatedOfferPrice: next })} min={0} disabled={!isEditing} />
                    )
                  ) : (
                    renderReadOnlyMoney(effectiveSalePrice)
                  )}
                </div>

                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">{t('propertyDeals.realEstateCommission')}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t('propertyDeals.baseFee')}</span>
                        <NumberInput value={currentDeal.payload.commissionRate} onChange={(next) => updatePayload({ commissionRate: next })} min={0} step="0.1" disabled={!isEditing} />
                        <span>{t('propertyDeals.vatPercentage')}</span>
                        <NumberInput value={currentDeal.payload.commissionVatRate} onChange={(next) => updatePayload({ commissionVatRate: next })} min={0} step="0.1" disabled={!isEditing} />
                      </div>
                    ) : (
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{t('propertyDeals.baseFee')}: {currentDeal.payload.commissionRate}%</p>
                        <p>{t('propertyDeals.vatPercentage')}: {currentDeal.payload.commissionVatRate}%</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrency(commissionTotal)}</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{t('propertyDeals.ownInvestment')}</span>
                  {renderReadOnlyMoney(ownInvestment)}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{t('propertyDeals.condoExpenses')}</span>
                  {isEditing ? (
                    <CurrencyInput value={currentDeal.payload.condoExpenses} onChange={(next) => updatePayload({ condoExpenses: next })} min={0} disabled={!isEditing} />
                  ) : (
                    renderReadOnlyMoney(currentDeal.payload.condoExpenses)
                  )}
                </div>

                {currentDeal.payload.saleStatus === 'sold' ? (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">{t('propertyDeals.saleSignal')}</span>
                      {isEditing ? (
                        <div className="flex min-w-[320px] items-center justify-end gap-2">
                          <CurrencyInput value={currentDeal.payload.saleSignalAmount} onChange={(next) => updatePayload({ saleSignalAmount: next })} min={0} disabled={!isEditing} />
                          <DateInput value={currentDeal.payload.saleDates.signalDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, signalDate: next } })} disabled={!isEditing} />
                        </div>
                      ) : (
                        <div className="text-right">
                          {renderReadOnlyMoney(currentDeal.payload.saleSignalAmount)}
                          <div className="mt-1">{renderReadOnlyDate(currentDeal.payload.saleDates.signalDate)}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">{t('propertyDeals.valueOnDeeds')}</span>
                      {isEditing ? (
                        <div className="flex min-w-[320px] items-center justify-end gap-2">
                          <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(saleDeedAmount)}</span>
                          <DateInput value={currentDeal.payload.saleDates.escrituraDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, escrituraDate: next } })} disabled={!isEditing} />
                        </div>
                      ) : (
                        <div className="text-right">
                          {renderReadOnlyMoney(saleDeedAmount)}
                          <div className="mt-1">{renderReadOnlyDate(currentDeal.payload.saleDates.escrituraDate)}</div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    {t('propertyDeals.simulationHint')}
                  </p>
                )}

                <div className="rounded-lg border border-dashed border-border/70 px-3 py-2">
                  {isEditing ? (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('propertyDeals.extraValuesSection')}</p>
                  ) : null}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t('propertyDeals.otherSaleValues')}</span>
                    {isEditing ? (
                      <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addSaleExtraEntry}>
                        {t('propertyDeals.addValue')}
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {(currentDeal.payload.saleExtraEntries ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('propertyDeals.noAdditionalValues')}</p>
                    ) : (
                      (currentDeal.payload.saleExtraEntries ?? []).map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2 py-2">
                          {isEditing ? (
                            <>
                              <input
                                className="h-8 min-w-[180px] flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                                value={entry.label}
                                onChange={(event) => updateSaleExtraEntry(entry.id, { label: event.target.value })}
                                placeholder={t('propertyDeals.description')}
                                disabled={!isEditing}
                              />
                              <CurrencyInput
                                value={entry.amount}
                                onChange={(next) => updateSaleExtraEntry(entry.id, { amount: next })}
                                min={0}
                                disabled={!isEditing}
                              />
                              <DateInput
                                value={entry.date}
                                onChange={(next) => updateSaleExtraEntry(entry.id, { date: next })}
                                disabled={!isEditing}
                              />
                              <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removeSaleExtraEntry(entry.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="min-w-[180px] flex-1 text-xs font-medium text-foreground">{entry.label || '—'}</p>
                              <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(entry.amount || 0)}</p>
                              {renderReadOnlyDate(entry.date)}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('propertyDeals.profit')}</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(profit)}</p>
              </div>
            </div>
            ) : isEditing ? (
              <div className="rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-foreground">{t('propertyDeals.saleBoardHiddenTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('propertyDeals.saleBoardHiddenHint')}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-8 px-3 text-xs"
                  onClick={() => setShowSaleBoard(true)}
                >
                  {t('propertyDeals.showSaleBoard')}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </section>
  );
}
