import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Home, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

function DateInput({ value, onChange, disabled = false }: { value: string; onChange: (next: string) => void; disabled?: boolean }) {
  return (
    <input
      type="date"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
    />
  );
}

function buildNewDeal(): PropertyDeal {
  return {
    id: crypto.randomUUID(),
    title: 'Novo imovel',
    payload: { ...DEFAULT_PROPERTY_DEAL_PAYLOAD },
  };
}

function getDealMetrics(deal: PropertyDeal) {
  const costs = deal.payload.costs;
  const purchaseExtras = (deal.payload.purchaseExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const saleExtras = (deal.payload.saleExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const ownInvestmentBase =
    costs.signalCpcv +
    costs.escrituraAmount +
    costs.bankCheque +
    costs.taxesAndStamp +
    costs.houseReady +
    costs.leroyMerlin +
    costs.ikea +
    purchaseExtras;
  const ownInvestment = ownInvestmentBase + (deal.payload.includeReserveInOwnInvestment ? costs.reserveEra : 0);
  const grossCommission = deal.payload.salePrice * (deal.payload.commissionRate / 100);
  const commissionTotal = grossCommission * (1 + deal.payload.commissionVatRate / 100);
  const profit = deal.payload.salePrice - commissionTotal - ownInvestment - deal.payload.condoExpenses - saleExtras;

  return { ownInvestment, commissionTotal, profit };
}

function formatDealAddress(address: PropertyAddress) {
  const postalCity = [address.postalCode, address.city].filter(Boolean).join(' ');
  return [address.street, postalCity].filter(Boolean).join(' · ');
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
        } else {
          setDeals(rows);
          setCurrentDeal(rows[0]);
          setSelectedDealId(null);
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

    return base + (currentDeal.payload.includeReserveInOwnInvestment ? costs.reserveEra : 0);
  }, [currentDeal.payload]);

  const saleExtraTotal = useMemo(
    () => (currentDeal.payload.saleExtraEntries ?? []).reduce((sum, entry) => sum + (entry.amount || 0), 0),
    [currentDeal.payload.saleExtraEntries],
  );

  const commissionTotal = useMemo(() => {
    const grossCommission = currentDeal.payload.salePrice * (currentDeal.payload.commissionRate / 100);
    return grossCommission * (1 + currentDeal.payload.commissionVatRate / 100);
  }, [currentDeal.payload]);

  const profit = useMemo(() => {
    return currentDeal.payload.salePrice - commissionTotal - ownInvestment - currentDeal.payload.condoExpenses - saleExtraTotal;
  }, [currentDeal.payload, commissionTotal, ownInvestment, saleExtraTotal]);

  const saleDeedAmount = Math.max(0, currentDeal.payload.salePrice - currentDeal.payload.saleSignalAmount);
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
      toast.success('Imovel guardado na Supabase.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha a guardar imovel.');
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
      toast.success('Imovel removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover imovel.');
    }
  };

  const cancelEdit = () => {
    const persisted = deals.find((item) => item.id === currentDeal.id);
    if (persisted) {
      setCurrentDeal(persisted);
      setIsEditing(false);
      return;
    }

    setCurrentDeal(buildNewDeal());
    setSelectedDealId(null);
    setIsEditing(false);
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
              {selectedDeal ? 'Comparacao do selecionado' : 'Carteira de imoveis'}
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
                {selectedDeltaVsAverage >= 0 ? '+' : ''}{formatCurrency(selectedDeltaVsAverage)} vs media
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Imoveis</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{totalDeals}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lucrativos</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{profitableDeals}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/65 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lucro medio</p>
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
              <p className="text-sm font-semibold text-foreground">{currentDeal.title || 'Novo imovel'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Draft por guardar</p>
              <p className="mt-3 text-xs font-medium text-primary">Abrir detalhe</p>
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
                      {addressLabel || 'Morada por preencher'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Compra {formatCurrency(deal.payload.purchasePrice)}</p>
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
                    <p className="text-muted-foreground">Venda</p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">{formatCurrency(deal.payload.salePrice)}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">Investimento</p>
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
          <div className="mb-6 flex items-start justify-between gap-6 pr-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">{currentDeal.title || 'Novo imovel'}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{formatDealAddress(currentDeal.payload.address)}</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={cancelEdit} disabled={saving} title="Cancelar">
                    <Pencil className="h-4 w-4 opacity-50" />
                  </Button>
                  <Button type="button" size="icon" className="h-9 w-9" onClick={() => void save()} disabled={saving || loading} title="Guardar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsEditing(true)} title="Editar">
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
                      title="Remover"
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editar Endereco</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="h-9 min-w-[220px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.title}
                  onChange={(event) => setCurrentDeal((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Nome do imovel"
                  disabled={!isEditing}
                />
                <input
                  className="h-9 min-w-[280px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.street ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, street: event.target.value } })}
                  placeholder="Rua / Endereco"
                  disabled={!isEditing}
                />
                <input
                  className="h-9 w-36 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.postalCode ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, postalCode: event.target.value } })}
                  placeholder="Codigo postal"
                  disabled={!isEditing}
                />
                <input
                  className="h-9 min-w-[160px] rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                  value={currentDeal.payload.address?.city ?? ''}
                  onChange={(event) => updatePayload({ address: { ...currentDeal.payload.address, city: event.target.value } })}
                  placeholder="Localidade"
                  disabled={!isEditing}
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Compra</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Total aquisicao</span>
                  <NumberInput value={currentDeal.payload.purchasePrice} onChange={(next) => updatePayload({ purchasePrice: next })} min={0} disabled={!isEditing} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Reserva ERA</span>
                  <div className="flex items-center gap-2">
                    <NumberInput value={currentDeal.payload.costs.reserveEra} onChange={(next) => updateCosts({ reserveEra: next })} min={0} disabled={!isEditing} />
                    <DateInput value={currentDeal.payload.purchaseDates.reserveEra} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, reserveEra: next } })} disabled={!isEditing} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Aprovacao proposta</span>
                  <DateInput value={currentDeal.payload.purchaseDates.proposalApproval} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, proposalApproval: next } })} disabled={!isEditing} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Sinal CPCV</span>
                  <div className="flex items-center gap-2">
                    <NumberInput value={currentDeal.payload.costs.signalCpcv} onChange={(next) => updateCosts({ signalCpcv: next })} min={0} disabled={!isEditing} />
                    <DateInput value={currentDeal.payload.purchaseDates.cpcvSignature} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, cpcvSignature: next } })} disabled={!isEditing} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Valor na escritura</span>
                  <div className="flex items-center gap-2">
                    <NumberInput value={currentDeal.payload.costs.escrituraAmount} onChange={(next) => updateCosts({ escrituraAmount: next })} min={0} disabled={!isEditing} />
                    <DateInput value={currentDeal.payload.purchaseDates.escritura} onChange={(next) => updatePayload({ purchaseDates: { ...currentDeal.payload.purchaseDates, escritura: next } })} disabled={!isEditing} />
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-border/70 px-3 py-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Outros valores da compra</span>
                    {isEditing ? (
                      <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addPurchaseExtraEntry}>
                        Adicionar valor
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {(currentDeal.payload.purchaseExtraEntries ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem valores adicionais.</p>
                    ) : (
                      (currentDeal.payload.purchaseExtraEntries ?? []).map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2 py-2">
                          <input
                            className="h-8 min-w-[180px] flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                            value={entry.label}
                            onChange={(event) => updatePurchaseExtraEntry(entry.id, { label: event.target.value })}
                            placeholder="Descricao"
                            disabled={!isEditing}
                          />
                          <NumberInput
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
                          {isEditing ? (
                            <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removePurchaseExtraEntry(entry.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {[
                  ['Cheque bancario', 'bankCheque', currentDeal.payload.costs.bankCheque],
                  ['IMT + imposto selo', 'taxesAndStamp', currentDeal.payload.costs.taxesAndStamp],
                  ['Casa pronta', 'houseReady', currentDeal.payload.costs.houseReady],
                  ['Leroy Merlin', 'leroyMerlin', currentDeal.payload.costs.leroyMerlin],
                  ['IKEA', 'ikea', currentDeal.payload.costs.ikea],
                ].filter(([, , value]) => Number(value) > 0).map(([label, key, value]) => (
                  <div key={String(key)} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <NumberInput value={Number(value)} onChange={(next) => updateCosts({ [String(key)]: next } as Partial<PurchaseCosts>)} min={0} disabled={!isEditing} />
                  </div>
                ))}
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={currentDeal.payload.includeReserveInOwnInvestment}
                  onChange={(event) => updatePayload({ includeReserveInOwnInvestment: event.target.checked })}
                  className="h-4 w-4 rounded border-border"
                  disabled={!isEditing}
                />
                Incluir reserva no investimento proprio
              </label>

              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Investimento proprio</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(ownInvestment)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Venda</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Valor total venda</span>
                  <NumberInput value={currentDeal.payload.salePrice} onChange={(next) => updatePayload({ salePrice: next })} min={0} disabled={!isEditing} />
                </div>

                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">Comissao imobiliaria</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>% base</span>
                      <NumberInput value={currentDeal.payload.commissionRate} onChange={(next) => updatePayload({ commissionRate: next })} min={0} step="0.1" disabled={!isEditing} />
                      <span>IVA %</span>
                      <NumberInput value={currentDeal.payload.commissionVatRate} onChange={(next) => updatePayload({ commissionVatRate: next })} min={0} step="0.1" disabled={!isEditing} />
                    </div>
                  </div>
                  <p className="mt-2 text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrency(commissionTotal)}</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Investimento proprio</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(ownInvestment)}</span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Despesas condominio</span>
                  <NumberInput value={currentDeal.payload.condoExpenses} onChange={(next) => updatePayload({ condoExpenses: next })} min={0} disabled={!isEditing} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Sinal venda</span>
                  <div className="flex items-center gap-2">
                    <NumberInput value={currentDeal.payload.saleSignalAmount} onChange={(next) => updatePayload({ saleSignalAmount: next })} min={0} disabled={!isEditing} />
                    <DateInput value={currentDeal.payload.saleDates.signalDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, signalDate: next } })} disabled={!isEditing} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">Valor na escritura</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(saleDeedAmount)}</span>
                    <DateInput value={currentDeal.payload.saleDates.escrituraDate} onChange={(next) => updatePayload({ saleDates: { ...currentDeal.payload.saleDates, escrituraDate: next } })} disabled={!isEditing} />
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-border/70 px-3 py-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Outros valores da venda</span>
                    {isEditing ? (
                      <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={addSaleExtraEntry}>
                        Adicionar valor
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {(currentDeal.payload.saleExtraEntries ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem valores adicionais.</p>
                    ) : (
                      (currentDeal.payload.saleExtraEntries ?? []).map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2 py-2">
                          <input
                            className="h-8 min-w-[180px] flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                            value={entry.label}
                            onChange={(event) => updateSaleExtraEntry(entry.id, { label: event.target.value })}
                            placeholder="Descricao"
                            disabled={!isEditing}
                          />
                          <NumberInput
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
                          {isEditing ? (
                            <Button type="button" variant="outline" className="h-8 px-2" onClick={() => removeSaleExtraEntry(entry.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lucro</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(profit)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </section>
  );
}
