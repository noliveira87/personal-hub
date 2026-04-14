import { useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckSquare, ClipboardList, Eye, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { Contract, getContractCategoryIcon } from '@/features/contracts/types/contract';
import { getMonthlyEquivalent } from '@/features/contracts/lib/contractUtils';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { usePaymentChecklist } from '@/features/home-expenses/hooks/use-payment-checklist';
import { useData } from '@/features/home-expenses/lib/DataContext';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import AppSectionHeader from '@/components/AppSectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import { toast } from '@/components/ui/sonner';

type ContractViewCategory = 'cafofo' | 'apartamento' | 'carro' | 'outros';

const CATEGORY_ORDER: ContractViewCategory[] = ['cafofo', 'apartamento', 'carro', 'outros'];

const CONTRACT_CATEGORY_SORT_ORDER: Record<string, number> = {
  'mortgage': 0,
  'home-insurance': 1,
  'apartment-insurance': 1,
  'electricity': 2,
  'gas': 3,
  'water': 4,
  'internet': 5,
  'mobile': 6,
  'tv-streaming': 7,
  'security-alarm': 8,
  'maintenance': 9,
  'car': 10,
  'gym': 11,
  'software': 12,
  'card-credit': 13,
  'card-debit': 14,
  'other': 99,
};

function getContractCategoryTranslationKey(category: Contract['category']): string {
  return `contracts.categoryNames.${category.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase())}`;
}

function sortContractItems(items: ContractItem[]): ContractItem[] {
  return [...items].sort((a, b) => {
    const orderA = CONTRACT_CATEGORY_SORT_ORDER[a.contract.category] ?? 50;
    const orderB = CONTRACT_CATEGORY_SORT_ORDER[b.contract.category] ?? 50;
    if (orderA !== orderB) return orderA - orderB;
    return a.contract.name.localeCompare(b.contract.name);
  });
}

function getContractViewCategory(contract: Pick<Contract, 'category' | 'housingUsage' | 'name' | 'provider' | 'notes'>): ContractViewCategory {
  const text = `${contract.name} ${contract.provider} ${contract.notes ?? ''}`.toLowerCase();
  if (contract.category === 'car') return 'carro';
  if (
    contract.category === 'apartment-insurance'
    || contract.housingUsage === 'secondary-home'
    || text.includes('apartamento')
    || text.includes('sta clara')
    || text.includes('st clara')
  ) return 'apartamento';
  if (
    contract.housingUsage === 'primary-residence'
    || ['mortgage', 'home-insurance', 'gas', 'electricity', 'internet', 'mobile', 'water', 'tv-streaming', 'maintenance', 'security-alarm'].includes(contract.category)
    || text.includes('cafofo')
  ) return 'cafofo';
  return 'outros';
}

const CATEGORY_LABEL: Record<ContractViewCategory, string> = {
  cafofo: 'Cafofo',
  apartamento: 'Apartamento',
  carro: 'Carro',
  outros: 'Outros',
};

const CATEGORY_ACCENT: Record<ContractViewCategory, string> = {
  cafofo: 'border-l-blue-500',
  apartamento: 'border-l-purple-500',
  carro: 'border-l-orange-500',
  outros: 'border-l-slate-400',
};

function monthKeyFromDate(d: Date) {
  return format(d, 'yyyy-MM');
}

interface ContractItem {
  contract: Contract;
  currency: string;
  monthly: number;
}

function ChecklistRow({
  id,
  icon,
  name,
  provider,
  paymentTypeLabel,
  paymentSourceLabel,
  monthly,
  currency,
  billingFrequency,
  paid,
  autoDetected,
  onToggle,
  onRemove,
  formatCurrency,
}: {
  id: string;
  icon?: string;
  name: string;
  provider?: string;
  paymentTypeLabel?: string;
  paymentSourceLabel?: string;
  monthly: number;
  currency: string;
  billingFrequency?: string;
  paid: boolean;
  autoDetected?: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  formatCurrency: (v: number, c?: string) => string;
}) {
  return (
    <div className={cn(
      'w-full max-w-full min-w-0 flex items-start gap-2 rounded-xl border-2 bg-card px-3 py-3 transition-all duration-200 sm:items-center sm:gap-3 sm:px-4 sm:py-3.5',
      paid ? 'border-green-500/40 bg-green-500/5' : 'border-border',
    )}>
      <button
        type="button"
        onClick={autoDetected ? undefined : onToggle}
        disabled={autoDetected}
        title={autoDetected ? 'Detetado automaticamente nos movimentos' : undefined}
        className={cn(
          'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:mt-0',
          paid && 'bg-green-500 border-green-500 text-white',
          !paid && 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300',
          autoDetected && 'cursor-default',
        )}
      >
        {paid ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {icon
                ? <span className="text-xl leading-none flex-shrink-0">{icon}</span>
                : <ClipboardList className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              <p className={cn('text-[15px] font-semibold leading-tight line-clamp-2 sm:text-sm sm:font-medium sm:line-clamp-1', paid && 'line-through text-muted-foreground')}>{name}</p>
            </div>
            {provider && <p className="mt-1 text-xs text-muted-foreground truncate">{provider}</p>}
          </div>

          <div className="hidden text-right flex-shrink-0 sm:block">
            <p className={cn('text-sm font-semibold tabular-nums leading-none whitespace-nowrap', paid && 'text-muted-foreground')}>
              {formatCurrency(monthly, currency)}
            </p>
            {billingFrequency && (
              <p className="mt-1 text-xs text-muted-foreground">/mês</p>
            )}
          </div>
        </div>

        {(paymentTypeLabel || paymentSourceLabel) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {paymentTypeLabel && (
              <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-100 px-2.5 py-1 text-[10px] font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-950/70 dark:text-violet-200">
                Tipo: {paymentTypeLabel}
              </span>
            )}
            {paymentSourceLabel && (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200">
                Origem: {paymentSourceLabel}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-end justify-end sm:hidden">
          <div className="text-right">
            <p className={cn('text-base font-semibold tabular-nums leading-none whitespace-nowrap', paid && 'text-muted-foreground')}>
              {formatCurrency(monthly, currency)}
            </p>
            {billingFrequency && (
              <p className="mt-1 text-xs text-muted-foreground">/mês</p>
            )}
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-0.5 flex-shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive sm:mt-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Checklist() {
  const { t, formatCurrency } = useI18n();
  const { contracts, updateContract } = useContracts();
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === 'active' && c.billingFrequency === 'monthly'),
    [contracts],
  );
  const contractIds = useMemo(() => activeContracts.map((c) => c.id), [activeContracts]);
  const { priceMap } = usePriceHistoryMap(contractIds);

  const { paidSet, customItems, togglePaid, addCustomItem, removeCustomItem } = usePaymentChecklist(monthKey);
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [draftExcludedContractIds, setDraftExcludedContractIds] = useState<string[]>([]);
  const [isSavingContractSelection, setIsSavingContractSelection] = useState(false);

  const excludedContractSet = useMemo(
    () => new Set(activeContracts.filter((c) => c.showInChecklist === false).map((c) => c.id)),
    [activeContracts],
  );

  const draftExcludedContractSet = useMemo(
    () => new Set(draftExcludedContractIds),
    [draftExcludedContractIds],
  );

  // Enrich contracts for checklist calculations and UI
  const contractItems = useMemo(
    (): ContractItem[] =>
      activeContracts.map((contract) => {
        const latestPrice = priceMap.get(contract.id);
        const price = latestPrice?.price ?? contract.price;
        const currency = latestPrice?.currency ?? contract.currency;
        return { contract, currency, monthly: getMonthlyEquivalent({ ...contract, price }) };
      }),
    [activeContracts, priceMap],
  );

  const hasPendingContractSelectionChanges = useMemo(() => {
    if (!showContractPicker) return false;
    if (draftExcludedContractSet.size !== excludedContractSet.size) return true;
    for (const id of draftExcludedContractSet) {
      if (!excludedContractSet.has(id)) return true;
    }
    return false;
  }, [showContractPicker, draftExcludedContractSet, excludedContractSet]);

  const pendingContractSelectionCount = useMemo(() => {
    if (!showContractPicker) return 0;
    return contractItems.filter(({ contract }) => {
      const currentlyVisible = !excludedContractSet.has(contract.id);
      const draftVisible = !draftExcludedContractSet.has(contract.id);
      return currentlyVisible !== draftVisible;
    }).length;
  }, [showContractPicker, contractItems, excludedContractSet, draftExcludedContractSet]);

  const toggleDraftContractVisibility = (contractId: string, visible: boolean) => {
    setDraftExcludedContractIds((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return [...next];
    });
  };

  const openContractPicker = () => {
    setDraftExcludedContractIds([...excludedContractSet]);
    setShowContractPicker(true);
  };

  const cancelContractPickerChanges = () => {
    setDraftExcludedContractIds([...excludedContractSet]);
    setShowContractPicker(false);
  };

  const saveContractPickerChanges = async () => {
    if (!hasPendingContractSelectionChanges) {
      setShowContractPicker(false);
      return;
    }

    const updates = contractItems
      .map(({ contract }) => {
        const currentlyVisible = !excludedContractSet.has(contract.id);
        const draftVisible = !draftExcludedContractSet.has(contract.id);
        if (currentlyVisible === draftVisible) return null;
        return {
          ...contract,
          showInChecklist: draftVisible,
        };
      })
      .filter((item): item is Contract => item !== null);

    if (updates.length === 0) {
      setShowContractPicker(false);
      return;
    }

    setIsSavingContractSelection(true);
    try {
      await Promise.all(updates.map((nextContract) => updateContract(nextContract)));
      toast.success(t('homeExpenses.checklist.contractSelectionSaved'));
      setShowContractPicker(false);
    } catch (error) {
      console.error('Failed to save checklist contract selection', error);
      toast.error(t('homeExpenses.checklist.contractSelectionSaveError'));
    } finally {
      setIsSavingContractSelection(false);
    }
  };

  // Auto-detect which contracts already have a transaction registered in this month
  const autoCheckedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of allTransactions) {
      if (tx.type === 'expense' && tx.contractId && tx.date.startsWith(monthKey)) {
        ids.add(tx.contractId);
      }
    }
    return ids;
  }, [allTransactions, monthKey]);

  const isPaid = (id: string) => autoCheckedIds.has(id) || paidSet.has(id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAddItem = () => {
    const trimmed = newName.trim();
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (!trimmed || isNaN(amount) || amount <= 0) return;
    addCustomItem(trimmed, amount);
    setNewName('');
    setNewAmount('');
    setShowAddForm(false);
  };

  const visibleContractItems = useMemo(
    () => contractItems.filter((item) => !excludedContractSet.has(item.contract.id)),
    [contractItems, excludedContractSet],
  );

  const groupedContractPickerItems = useMemo(() => {
    const sorted = sortContractItems(contractItems);
    const groups = new Map<Contract['category'], ContractItem[]>();

    for (const item of sorted) {
      const key = item.contract.category;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
  }, [contractItems]);

  const groupedContracts = useMemo(() => {
    const map = new Map<ContractViewCategory, ContractItem[]>(CATEGORY_ORDER.map((cat) => [cat, []]));
    for (const item of visibleContractItems) {
      const cat = getContractViewCategory(item.contract);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER.map((cat) => ({ cat, items: sortContractItems(map.get(cat)!) })).filter((g) => g.items.length > 0);
  }, [visibleContractItems]);

  // Totals
  const { totalBudget, totalPaid, totalRemaining } = useMemo(() => {
    let budget = 0;
    let paid = 0;
    for (const { contract, monthly } of visibleContractItems) {
      budget += monthly;
      if (isPaid(contract.id)) paid += monthly;
    }
    for (const item of customItems) {
      budget += item.amount;
      if (isPaid(item.id)) paid += item.amount;
    }
    return { totalBudget: budget, totalPaid: paid, totalRemaining: budget - paid };
  }, [visibleContractItems, customItems, paidSet, autoCheckedIds]);

  const allIds = [...visibleContractItems.map((c) => c.contract.id), ...customItems.map((c) => c.id)];
  const paidCount = allIds.filter((id) => isPaid(id)).length;
  const totalItems = allIds.length;
  const allPaid = totalItems > 0 && paidCount === totalItems;
  const progress = totalItems > 0 ? (paidCount / totalItems) * 100 : 0;

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <AppSectionHeader title={t('homeExpenses.appTitle')} icon={CheckSquare} backTo="/" />

      <MonthYearSelector />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border bg-card p-3.5 space-y-1 sm:p-4">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.totalBudget')}</p>
          <p className="text-[clamp(1.5rem,6vw,2rem)] font-bold tabular-nums leading-none whitespace-nowrap">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5 space-y-1 sm:p-4">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.paid')}</p>
          <p className="text-[clamp(1.5rem,6vw,2rem)] font-bold tabular-nums leading-none whitespace-nowrap text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="col-span-2 rounded-xl border bg-card p-3.5 space-y-1 sm:col-span-1 sm:p-4">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.remaining')}</p>
          <p className="text-[clamp(1.5rem,6vw,2rem)] font-bold tabular-nums leading-none whitespace-nowrap text-amber-600 dark:text-amber-400">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {allPaid
              ? t('homeExpenses.checklist.allPaid')
              : t('homeExpenses.checklist.progress', { paid: String(paidCount), total: String(totalItems) })}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', allPaid ? 'bg-green-500' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Grouped contract sections */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-1.5 sm:w-auto"
          onClick={() => {
            if (showContractPicker) {
              cancelContractPickerChanges();
              return;
            }
            openContractPicker();
          }}
        >
          <Eye className="w-3.5 h-3.5" />
          {t('homeExpenses.checklist.manageContracts')}
        </Button>
      </div>

      {showContractPicker && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('homeExpenses.checklist.contractSelectionTitle')}</h3>
            {hasPendingContractSelectionChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {t('homeExpenses.checklist.contractSelectionPending', { count: String(pendingContractSelectionCount) })}
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {groupedContractPickerItems.map(({ category, items }) => (
              <div key={`checklist-picker-group-${category}`} className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {getContractCategoryIcon(category)} {t(getContractCategoryTranslationKey(category))}
                </p>
                <div className="space-y-2">
                  {items.map(({ contract }) => {
                    const checked = !draftExcludedContractSet.has(contract.id);
                    return (
                      <label key={contract.id} className="flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/40 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isSavingContractSelection}
                          onChange={(e) => {
                            toggleDraftContractVisibility(contract.id, e.target.checked);
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-base leading-none">{getContractCategoryIcon(contract.category, contract.type)}</span>
                        <span className="text-sm flex-1 min-w-0 w-0 truncate">{contract.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[34%] text-right flex-shrink-0">{contract.provider}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              onClick={cancelContractPickerChanges}
              disabled={isSavingContractSelection}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => { void saveContractPickerChanges(); }}
              disabled={isSavingContractSelection || !hasPendingContractSelectionChanges}
            >
              {isSavingContractSelection ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </section>
      )}

      {groupedContracts.map(({ cat, items }) => (
        <section key={cat} className="space-y-2">
          <div className={cn('flex items-center gap-2 border-l-4 pl-3', CATEGORY_ACCENT[cat])}>
            <h2 className="text-sm font-semibold text-foreground">{CATEGORY_LABEL[cat]}</h2>
            <span className="text-xs text-muted-foreground">
              {items.filter((i) => isPaid(i.contract.id)).length}/{items.length}
            </span>
          </div>
          <div className="space-y-2">
            {items.map(({ contract, monthly, currency }) => (
              <ChecklistRow
                key={contract.id}
                id={contract.id}
                icon={getContractCategoryIcon(contract.category, contract.type)}
                name={contract.name}
                provider={contract.provider}
                paymentTypeLabel={contract.paymentType ? t(`contracts.paymentTypeLabels.${contract.paymentType}`) : undefined}
                paymentSourceLabel={contract.paymentSource ?? undefined}
                monthly={monthly}
                currency={currency}
                billingFrequency={contract.billingFrequency}
                paid={isPaid(contract.id)}
                autoDetected={autoCheckedIds.has(contract.id)}
                onToggle={() => togglePaid(contract.id)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Custom items section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 border-l-4 border-l-slate-300 dark:border-l-slate-600 pl-3">
            <h2 className="text-sm font-semibold text-foreground">{t('homeExpenses.checklist.custom')}</h2>
            {customItems.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {customItems.filter((i) => isPaid(i.id)).length}/{customItems.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('homeExpenses.checklist.addItem')}
          </button>
        </div>

        {showAddForm && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <Input
              placeholder={t('homeExpenses.checklist.itemName')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              autoFocus
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder={t('homeExpenses.checklist.itemAmount')}
                type="number"
                min="0"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-1"
              />
              <Button size="sm" className="w-full sm:w-auto" onClick={handleAddItem} disabled={!newName.trim() || !newAmount}>
                {t('homeExpenses.checklist.addItem')}
              </Button>
              <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => { setShowAddForm(false); setNewName(''); setNewAmount(''); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {customItems.length > 0 ? (
          <div className="space-y-2">
            {customItems.map((item) => (
              <ChecklistRow
                key={item.id}
                id={item.id}
                name={item.name}
                monthly={item.amount}
                currency={item.currency}
                paid={paidSet.has(item.id)}
                onToggle={() => togglePaid(item.id)}
                onRemove={() => removeCustomItem(item.id)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : !showAddForm && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('homeExpenses.checklist.emptyCustom')}</p>
        )}
      </section>
    </div>
  );
}
