import { useMemo, useState } from 'react';
import { CheckSquare, ClipboardList, Eye, Plus, Trash2, Zap } from 'lucide-react';
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
      'flex items-center gap-3 rounded-xl border-2 bg-card px-4 py-3.5 transition-all duration-200',
      paid ? 'border-green-500/40 bg-green-500/5' : 'border-border',
    )}>
      <button
        type="button"
        onClick={autoDetected ? undefined : onToggle}
        disabled={autoDetected}
        title={autoDetected ? 'Detetado automaticamente nos movimentos' : undefined}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
          paid && !autoDetected && 'bg-green-500 border-green-500 text-white',
          autoDetected && 'bg-primary/10 border-primary text-primary cursor-default',
          !paid && 'border-border bg-background',
        )}
      >
        {paid && !autoDetected && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {autoDetected && <Zap className="w-3 h-3" />}
      </button>

      {icon
        ? <span className="text-xl flex-shrink-0">{icon}</span>
        : <ClipboardList className="w-5 h-5 text-muted-foreground flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', paid && 'line-through text-muted-foreground')}>{name}</p>
        {provider && <p className="text-xs text-muted-foreground truncate mt-0.5">{provider}</p>}
        {(paymentTypeLabel || paymentSourceLabel) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {paymentTypeLabel && (
              <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-950/70 dark:text-violet-200">
                Tipo: {paymentTypeLabel}
              </span>
            )}
            {paymentSourceLabel && (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200">
                Origem: {paymentSourceLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-semibold tabular-nums', paid && 'text-muted-foreground')}>
          {formatCurrency(monthly, currency)}
        </p>
        {billingFrequency && (
          <p className="text-xs text-muted-foreground">/mês</p>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Checklist() {
  const { t, formatCurrency } = useI18n();
  const { contracts } = useContracts();
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === 'active' && c.billingFrequency === 'monthly'),
    [contracts],
  );
  const contractIds = useMemo(() => activeContracts.map((c) => c.id), [activeContracts]);
  const { priceMap } = usePriceHistoryMap(contractIds);

  const { paidSet, excludedContractSet, customItems, togglePaid, addCustomItem, removeCustomItem, excludeContract, includeContract } = usePaymentChecklist(monthKey);
  const [showContractPicker, setShowContractPicker] = useState(false);

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

  // Enrich contracts and group by view category
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

  const visibleContractItems = useMemo(
    () => contractItems.filter((item) => !excludedContractSet.has(item.contract.id)),
    [contractItems, excludedContractSet],
  );

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
    <div className="space-y-6">
      <AppSectionHeader title={t('homeExpenses.appTitle')} icon={CheckSquare} backTo="/" />

      <MonthYearSelector />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.totalBudget')}</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.paid')}</p>
          <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">{t('homeExpenses.checklist.remaining')}</p>
          <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(totalRemaining)}</p>
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
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowContractPicker((v) => !v)}>
          <Eye className="w-3.5 h-3.5" />
          {t('homeExpenses.checklist.chooseContracts')}
        </Button>
      </div>

      {showContractPicker && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">{t('homeExpenses.checklist.chooseContracts')}</h3>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {sortContractItems(contractItems).map(({ contract }) => {
              const checked = !excludedContractSet.has(contract.id);
              return (
                <label key={contract.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        includeContract(contract.id);
                      } else {
                        excludeContract(contract.id);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm flex-1 min-w-0 truncate">{contract.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{contract.provider}</span>
                </label>
              );
            })}
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
            <div className="flex gap-2">
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
              <Button size="sm" onClick={handleAddItem} disabled={!newName.trim() || !newAmount}>
                {t('homeExpenses.checklist.addItem')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewName(''); setNewAmount(''); }}>
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
