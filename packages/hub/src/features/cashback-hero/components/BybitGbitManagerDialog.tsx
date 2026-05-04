import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarDays, format, parse, isValid } from 'date-fns';
import { CalendarDays, Check, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/i18n/I18nProvider';
import { DEFAULT_CASHBACK_CARD_RULES, loadCashbackCardRulesSettings, type CashbackCardRulesSettings, BYBIT_PURCHASE_TYPE_OPTIONS } from '@/features/cashback-hero/lib/cardRulesSettings';
import { useCashbackStore } from '@/features/cashback-hero/use-cashback-store';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import {
  createBybitGbitTransaction,
  deleteBybitGbitTransaction,
  loadBybitGbitTransactions,
  type BybitGbitTransaction,
  updateBybitGbitTransaction,
  updateBybitGbitTransactionGbit,
} from '@/features/cashback-hero/lib/bybitGbit';
import { toast } from '@/components/ui/sonner';

const CURVE_GBIT_WINDOW_DAYS = 90;

const PURCHASE_TYPE_OPTIONS = BYBIT_PURCHASE_TYPE_OPTIONS;
type PurchaseTypeFilter = 'all' | (typeof PURCHASE_TYPE_OPTIONS)[number];

const BANK_OPTIONS = ['ABanca', 'Santander'] as const;
const CURVE_CARD_OPTIONS = ['Nuno', 'Minina'] as const;

function normalizeOption(value: string, options: readonly string[]): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  const match = options.find((option) => option.toLowerCase() === normalized);
  return match ?? '';
}

function isCetelemEligiblePurchaseType(purchaseType: string, eligibleTypes: string[]): boolean {
  return eligibleTypes.includes(purchaseType);
}

function parseCurrencyLoose(raw: string): number {
  const value = raw.trim().replace(/\s/g, '');
  if (!value) return Number.NaN;

  if (value.includes(',') && value.includes('.')) {
    const normalized = value.replace(/,/g, '');
    return Number(normalized);
  }

  if (value.includes(',') && !value.includes('.')) {
    return Number(value.replace(',', '.'));
  }

  return Number(value);
}

function toIsoDate(raw: string): string {
  const value = raw.trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = parse(value, 'dd/MM/yyyy', new Date());
  if (!isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

function getEffectiveMonth(item: BybitGbitTransaction): string {
  const effectiveDate = item.gbit ? (item.gbitAppliedAt ?? item.date) : item.date;
  return effectiveDate.slice(0, 7);
}

function getDaysLeftForGbit(item: BybitGbitTransaction): number {
  const purchaseDate = parse(item.date, 'yyyy-MM-dd', new Date());
  if (!isValid(purchaseDate)) return 0;

  const ageInDays = differenceInCalendarDays(new Date(), purchaseDate);
  return CURVE_GBIT_WINDOW_DAYS - ageInDays;
}

function getAgeDays(item: BybitGbitTransaction): number {
  const purchaseDate = parse(item.date, 'yyyy-MM-dd', new Date());
  if (!isValid(purchaseDate)) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), purchaseDate));
}

function getGbitDeadline(item: BybitGbitTransaction): string {
  const purchaseDate = parse(item.date, 'yyyy-MM-dd', new Date());
  if (!isValid(purchaseDate)) return '-';
  return format(addDays(purchaseDate, CURVE_GBIT_WINDOW_DAYS), 'yyyy-MM-dd');
}

export default function BybitGbitManagerDialog({
  open = false,
  onOpenChange = () => {},
  selectedMonth,
  mode = 'dialog',
  openManualAddSignal = 0,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedMonth: string;
  mode?: 'dialog' | 'page';
  openManualAddSignal?: number;
}) {
  const { t, formatCurrency, locale } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const { purchases } = useCashbackStore();
  const isActive = mode === 'page' ? true : open;

  const [items, setItems] = useState<BybitGbitTransaction[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'pending' | 'over60' | 'over80'>('all');
  const [loading, setLoading] = useState(false);

  const [movement, setMovement] = useState('');
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [curveCard, setCurveCard] = useState('');
  const [cashbackRules, setCashbackRules] = useState<CashbackCardRulesSettings>(DEFAULT_CASHBACK_CARD_RULES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkPurchaseType, setBulkPurchaseType] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModeActive, setIsBulkModeActive] = useState(false);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    movement: '',
    amount: '',
    bank: '',
    purchaseType: '',
    date: '',
    curveCard: '',
  });

  const resetManualForm = () => {
    setMovement('');
    setAmount('');
    setBank('');
    setPurchaseType('');
    setCurveCard('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const reloadItems = async () => {
    setLoading(true);

    try {
      const data = await loadBybitGbitTransactions();
      setItems(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void loadCashbackCardRulesSettings().then((loaded) => {
      if (!cancelled) {
        setCashbackRules(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    setLoading(true);
    void loadBybitGbitTransactions()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    if (/^\d{4}-\d{2}$/.test(selectedMonth)) {
      setFilterMonth(selectedMonth);
      return;
    }

    setFilterMonth(format(new Date(), 'yyyy-MM'));
  }, [isActive, selectedMonth]);

  useEffect(() => {
    if (!isActive) return;
    if (openManualAddSignal <= 0) return;
    resetManualForm();
    setManualFormOpen(true);
  }, [openManualAddSignal, isActive]);

  const visibleItems = useMemo(() => {
    const monthScopedItems = /^\d{4}-\d{2}$/.test(filterMonth)
      ? items.filter((item) => getEffectiveMonth(item) === filterMonth)
      : items;

    const riskScopedItems = riskFilter === 'all'
      ? monthScopedItems
      : monthScopedItems.filter((item) => {
        if (item.gbit) return false;
        const daysLeft = getDaysLeftForGbit(item);
        if (daysLeft <= 0) return false;

        if (riskFilter === 'pending') return true;

        const age = getAgeDays(item);
        if (riskFilter === 'over80') return age > 80;
        return age > 60;
      });

    const purchaseTypeScopedItems = purchaseTypeFilter === 'all'
      ? riskScopedItems
      : riskScopedItems.filter((item) => item.purchaseType === purchaseTypeFilter);

    return purchaseTypeScopedItems
      .sort((a, b) => {
        if (a.gbit !== b.gbit) return Number(a.gbit) - Number(b.gbit);
        const aUnclassified = !a.purchaseType;
        const bUnclassified = !b.purchaseType;
        if (aUnclassified !== bUnclassified) return Number(bUnclassified) - Number(aUnclassified);
        if (!a.gbit && !b.gbit) {
          const daysLeftA = getDaysLeftForGbit(a);
          const daysLeftB = getDaysLeftForGbit(b);
          if (daysLeftA !== daysLeftB) return daysLeftA - daysLeftB;
        }
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      });
  }, [items, filterMonth, riskFilter, purchaseTypeFilter]);

  const bybitNunoTierTarget = cashbackRules.bybit.nunoTierTarget;
  const bybitMininaTierTarget = cashbackRules.bybit.mininaTierTarget;
  const cetelemEligibleTypes = cashbackRules.bybit.cetelemEligibleTypes;
  const cardPriority = cashbackRules.bybit.cardPriority;

  const planningMonth = useMemo(() => {
    if (/^\d{4}-\d{2}$/.test(filterMonth)) return filterMonth;
    return format(new Date(), 'yyyy-MM');
  }, [filterMonth]);

  const pendingPool = useMemo(() => {
    const pending = items.filter((item) => !item.gbit && getDaysLeftForGbit(item) > 0);
    const total = pending.reduce((sum, item) => sum + item.amount, 0);
    const over60 = pending.filter((item) => getAgeDays(item) > 60).reduce((sum, item) => sum + item.amount, 0);
    const over80 = pending.filter((item) => getAgeDays(item) > 80).reduce((sum, item) => sum + item.amount, 0);

    return {
      total,
      over60,
      over80,
    };
  }, [items]);

  const currentMonthSummary = useMemo(() => {
    const done = items
      .filter((item) => item.gbit && getEffectiveMonth(item) === planningMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      monthKey: planningMonth,
      done,
      missing: Math.max(0, bybitNunoTierTarget - done),
    };
  }, [items, planningMonth, bybitNunoTierTarget]);

  const upcomingMonths = useMemo(() => {
    const base = parse(`${planningMonth}-01`, 'yyyy-MM-dd', new Date());

    const target = Math.max(0, bybitNunoTierTarget);
    const pendingForecastSpend = pendingPool.total;
    const monthsCount = target > 0 && pendingForecastSpend > target
      ? Math.min(3, Math.ceil(pendingForecastSpend / target))
      : 1;
    const keys = Array.from({ length: monthsCount }, (_, index) => format(addMonths(base, index + 1), 'yyyy-MM'));

    let remainingPendingToAllocate = pendingForecastSpend;

    return keys.map((monthKey) => {
      const done = items
        .filter((item) => item.gbit && getEffectiveMonth(item) === monthKey)
        .reduce((sum, item) => sum + item.amount, 0);

      const monthGapToTarget = Math.max(0, target - done);
      const projectedFromPending = Math.min(monthGapToTarget, remainingPendingToAllocate);
      remainingPendingToAllocate = Math.max(0, remainingPendingToAllocate - projectedFromPending);

      const projectedSpend = done + projectedFromPending;

      return {
        monthKey,
        done,
        projectedSpend,
        missing: Math.max(0, target - projectedSpend),
      };
    });
  }, [items, planningMonth, bybitNunoTierTarget, pendingPool.total]);

  const bulkEditableItems = useMemo(() => {
    return visibleItems.filter((item) => selectedIds.includes(item.id) && item.purchaseType !== bulkPurchaseType);
  }, [bulkPurchaseType, selectedIds, visibleItems]);

  const visibleSelectedCount = useMemo(() => {
    return visibleItems.filter((item) => selectedIds.includes(item.id)).length;
  }, [selectedIds, visibleItems]);

  const allVisibleSelected = visibleItems.length > 0 && visibleSelectedCount === visibleItems.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  useEffect(() => {
    const itemIds = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => itemIds.has(id)));
  }, [items]);

  const bybitOwnDoneInPlanningMonth = useMemo(() => {
    return items
      .filter((item) => item.gbit && getEffectiveMonth(item) === planningMonth)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [items, planningMonth]);

  const cetelemSpendCapacityLeft = useMemo(() => {
    const rate = Math.max(0, cashbackRules.cetelem.cashbackRate);
    if (rate <= 0) return 0;

    const monthlySpendCap = cashbackRules.cetelem.monthlyCashbackCap / rate;
    const annualSpendCap = cashbackRules.cetelem.annualCashbackCap / rate;

    const monthSpent = purchases
      .filter((purchase) => purchase.isCetelem)
      .filter((purchase) => purchase.date.slice(0, 7) === planningMonth)
      .reduce((sum, purchase) => sum + purchase.amount, 0);

    const planningYear = planningMonth.slice(0, 4);
    const annualSpent = purchases
      .filter((purchase) => purchase.isCetelem)
      .filter((purchase) => purchase.date.slice(0, 4) === planningYear)
      .reduce((sum, purchase) => sum + purchase.amount, 0);

    const monthlyRemaining = Math.max(0, monthlySpendCap - monthSpent);
    const annualRemaining = Math.max(0, annualSpendCap - annualSpent);
    return Math.max(0, Math.min(monthlyRemaining, annualRemaining));
  }, [cashbackRules.cetelem.annualCashbackCap, cashbackRules.cetelem.cashbackRate, cashbackRules.cetelem.monthlyCashbackCap, planningMonth, purchases]);

  const mininaCapacityLeft = useMemo(() => {
    if (bybitOwnDoneInPlanningMonth < bybitNunoTierTarget) return 0;

    const pendingEligibleNonCetelem = items
      .filter((item) => !item.gbit && getDaysLeftForGbit(item) > 0)
      .filter((item) => !isCetelemEligiblePurchaseType(item.purchaseType, cetelemEligibleTypes))
      .sort((a, b) => {
        const daysLeftA = getDaysLeftForGbit(a);
        const daysLeftB = getDaysLeftForGbit(b);
        if (daysLeftA !== daysLeftB) return daysLeftA - daysLeftB;
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      });

    let used = 0;
    pendingEligibleNonCetelem.forEach((item) => {
      if (used >= bybitMininaTierTarget) return;
      if (item.amount <= bybitMininaTierTarget - used) {
        used += item.amount;
      }
    });

    return Math.max(0, bybitMininaTierTarget - used);
  }, [items, bybitOwnDoneInPlanningMonth, bybitMininaTierTarget, cetelemEligibleTypes]);

  const suggestedTargetById = useMemo(() => {
    const map = new Map<string, 'Cetelem' | 'Bybit Minina' | 'Unibanco' | ''>();

    const candidateItems = items
      .filter((item) => !item.gbit && getDaysLeftForGbit(item) > 0)
      .sort((a, b) => {
        const daysLeftA = getDaysLeftForGbit(a);
        const daysLeftB = getDaysLeftForGbit(b);
        if (daysLeftA !== daysLeftB) return daysLeftA - daysLeftB;
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      });

    let mininaRemaining = bybitOwnDoneInPlanningMonth >= bybitNunoTierTarget ? bybitMininaTierTarget : 0;
    let cetelemRemaining = cetelemSpendCapacityLeft;

    const fallbackCard = (hasType: boolean): 'Unibanco' | '' => {
      const fallback = cardPriority.findLast((c) => c !== 'Cetelem' && c !== 'Bybit Minina');
      return hasType ? ((fallback ?? 'Unibanco') as 'Unibanco') : '';
    };

    candidateItems.forEach((item) => {
      const isCetelem = isCetelemEligiblePurchaseType(item.purchaseType, cetelemEligibleTypes);

      for (const card of cardPriority) {
        if (card === 'Cetelem' && isCetelem) {
          if (item.amount <= cetelemRemaining) {
            map.set(item.id, 'Cetelem');
            cetelemRemaining -= item.amount;
            return;
          }
          continue;
        }
        if (card === 'Bybit Minina' && !isCetelem) {
          if (mininaRemaining > 0 && item.amount <= mininaRemaining) {
            map.set(item.id, 'Bybit Minina');
            mininaRemaining -= item.amount;
            return;
          }
          continue;
        }
      }

      map.set(item.id, fallbackCard(!!item.purchaseType));
    });

    return map;
  }, [items, bybitOwnDoneInPlanningMonth, bybitNunoTierTarget, bybitMininaTierTarget, cetelemSpendCapacityLeft, cetelemEligibleTypes, cardPriority]);

  const suggestedTargetCard = useMemo(() => {
    if (!purchaseType) return '';

    const parsedAmount = parseCurrencyLoose(amount);
    const isCetelem = isCetelemEligiblePurchaseType(purchaseType, cetelemEligibleTypes);

    for (const card of cardPriority) {
      if (card === 'Cetelem' && isCetelem) {
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          return cetelemSpendCapacityLeft > 0 ? 'Cetelem' : 'Unibanco';
        }
        return parsedAmount <= cetelemSpendCapacityLeft ? 'Cetelem' : 'Unibanco';
      }
      if (card === 'Bybit Minina' && !isCetelem && bybitOwnDoneInPlanningMonth >= bybitNunoTierTarget) {
        if (!Number.isFinite(parsedAmount) || parsedAmount <= mininaCapacityLeft) {
          return mininaCapacityLeft > 0 ? 'Bybit Minina' : 'Unibanco';
        }
        return parsedAmount <= bybitMininaTierTarget ? 'Bybit Minina' : 'Unibanco';
      }
    }

    return 'Unibanco';
  }, [purchaseType, amount, bybitOwnDoneInPlanningMonth, bybitNunoTierTarget, bybitMininaTierTarget, mininaCapacityLeft, cetelemSpendCapacityLeft, cetelemEligibleTypes, cardPriority]);

  const addManual = async (event: FormEvent) => {
    event.preventDefault();

    const parsedAmount = parseCurrencyLoose(amount);
    const parsedDate = toIsoDate(date);
    const normalizedBank = normalizeOption(bank, BANK_OPTIONS);
    const normalizedCurveCard = normalizeOption(curveCard, CURVE_CARD_OPTIONS);

    if (!movement.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !parsedDate || !normalizedBank || !normalizedCurveCard) {
      toast.error(t('cashbackHero.bybitFuture.invalidEdit'));
      return;
    }

    const computedDays = Math.max(0, getAgeDays({
      id: 'new',
      movement: movement.trim(),
      amount: parsedAmount,
      bank: normalizedBank,
      purchaseType,
      date: parsedDate,
      curveCard: normalizedCurveCard,
      days: 0,
      gbit: false,
      createdAt: new Date().toISOString(),
    }));

    try {
      const created = await createBybitGbitTransaction({
        movement: movement.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        bank: normalizedBank,
        purchaseType,
        date: parsedDate,
        curveCard: normalizedCurveCard,
        days: computedDays,
        gbit: false,
        gbitAppliedAt: undefined,
      });

      setItems((prev) => [created, ...prev]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      return;
    }

    setMovement('');
    setAmount('');
    setBank('');
    setPurchaseType('');
    setCurveCard('');
    setManualFormOpen(false);
  };

  const toggleGbit = async (id: string) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    const nextValue = !current.gbit;
    const action = nextValue ? 'ativar' : 'desativar';
    const actionEnglish = nextValue ? 'enable' : 'disable';
    
    const approved = await confirm({
      title: t('cashbackHero.bybitFuture.confirmGbitTitle'),
      description: t('cashbackHero.bybitFuture.confirmGbitDescription', {
        action: locale === 'pt' ? action : actionEnglish,
        movement: current.movement || '-',
        amount: formatCurrency(current.amount, 'EUR'),
      }),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
      destructive: nextValue,
    });
    if (!approved) return;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, gbit: nextValue } : item)));

    try {
      await updateBybitGbitTransactionGbit(id, nextValue);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, gbitAppliedAt: nextValue ? new Date().toISOString().slice(0, 10) : undefined } : item)));
    } catch (error) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, gbit: current.gbit } : item)));
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const removeItem = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    const approved = await confirm({
      title: t('cashbackHero.bybitFuture.confirmDeleteTitle'),
      description: t('cashbackHero.bybitFuture.confirmDeleteDescription', {
        movement: item?.movement || '-',
        amount: item ? formatCurrency(item.amount, 'EUR') : '-',
      }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!approved) return;

    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteBybitGbitTransaction(id);
    } catch (error) {
      setItems(snapshot);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const applyRiskFilter = (next: 'pending' | 'over60' | 'over80') => {
    setRiskFilter((prev) => {
      const target = prev === next ? 'all' : next;
      if (target !== 'all') {
        setFilterMonth('');
      }
      return target;
    });
  };

  const startEdit = (item: BybitGbitTransaction) => {
    setEditingId(item.id);
    setEditDraft({
      movement: item.movement,
      amount: String(item.amount),
      bank: normalizeOption(item.bank, BANK_OPTIONS),
      purchaseType: item.purchaseType,
      date: item.date,
      curveCard: normalizeOption(item.curveCard, CURVE_CARD_OPTIONS),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({
      movement: '',
      amount: '',
      bank: '',
      purchaseType: '',
      date: '',
      curveCard: '',
    });
  };

  const saveEdit = async (id: string) => {
    const parsedAmount = parseCurrencyLoose(editDraft.amount);
    const isoDate = toIsoDate(editDraft.date);
    const normalizedBank = normalizeOption(editDraft.bank, BANK_OPTIONS);
    const normalizedCurveCard = normalizeOption(editDraft.curveCard, CURVE_CARD_OPTIONS);

    if (!editDraft.movement.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !isoDate || !normalizedBank || !normalizedCurveCard) {
      toast.error(t('cashbackHero.bybitFuture.invalidEdit'));
      return;
    }

    try {
      const computedDays = Math.max(0, getAgeDays({
        id,
        movement: editDraft.movement.trim(),
        amount: parsedAmount,
        bank: normalizedBank,
        purchaseType: editDraft.purchaseType,
        date: isoDate,
        curveCard: normalizedCurveCard,
        days: 0,
        gbit: false,
        createdAt: new Date().toISOString(),
      }));

      const updated = await updateBybitGbitTransaction(id, {
        movement: editDraft.movement.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        bank: normalizedBank,
        purchaseType: editDraft.purchaseType,
        date: isoDate,
        curveCard: normalizedCurveCard,
        days: computedDays,
      });

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const applyBulkPurchaseType = async () => {
    if (!bulkPurchaseType) return;
    if (bulkEditableItems.length === 0) return;

    const approved = await confirm({
      title: t('cashbackHero.bybitFuture.bulkPurchaseTypeConfirmTitle'),
      description: t('cashbackHero.bybitFuture.bulkPurchaseTypeConfirmDescription', {
        count: bulkEditableItems.length,
        purchaseType: t(`cashbackHero.bybitFuture.purchaseTypeOptions.${bulkPurchaseType}`),
      }),
      confirmLabel: t('cashbackHero.bybitFuture.applyBulkPurchaseType'),
      cancelLabel: t('common.cancel'),
    });

    if (!approved) return;

    setBulkSaving(true);

    const results = await Promise.allSettled(
      bulkEditableItems.map((item) => updateBybitGbitTransaction(item.id, {
        movement: item.movement,
        amount: item.amount,
        bank: item.bank,
        purchaseType: bulkPurchaseType,
        date: item.date,
        curveCard: item.curveCard,
        days: Math.max(0, getAgeDays(item)),
      })),
    );

    const failed = results.find((result) => result.status === 'rejected');

    if (failed) {
      await reloadItems();
      const reason = failed.reason instanceof Error ? failed.reason.message : String(failed.reason);
      toast.error(reason);
      setBulkSaving(false);
      return;
    }

    const updatedItems = results
      .filter((result): result is PromiseFulfilledResult<BybitGbitTransaction> => result.status === 'fulfilled')
      .map((result) => result.value);
    const updatedById = new Map(updatedItems.map((item) => [item.id, item]));

    setItems((prev) => prev.map((item) => updatedById.get(item.id) ?? item));
    setSelectedIds([]);
    toast.success(t('cashbackHero.bybitFuture.bulkPurchaseTypeSuccess', { count: updatedItems.length }));
    setBulkSaving(false);
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }

      return prev.filter((entryId) => entryId !== id);
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = visibleItems.map((item) => item.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }

    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const content = (
    <>
      {mode === 'dialog' ? (
        <DialogHeader className="mb-2 pr-8 text-left">
          <DialogTitle className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">{t('cashbackHero.bybitFuture.title')}</DialogTitle>
        </DialogHeader>
      ) : (
        <div className="mb-2 text-left">
          <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">{t('cashbackHero.bybitFuture.title')}</h1>
        </div>
      )}

      <div className="min-w-0 space-y-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => applyRiskFilter('pending')}
              className={riskFilter === 'pending'
                ? 'rounded-xl border border-primary/70 bg-primary/15 px-4 py-3 text-left shadow-sm ring-1 ring-primary/40'
                : 'rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3 text-left shadow-sm transition-colors hover:bg-primary/[0.08]'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.pendingPool')}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tabular-nums text-foreground">{formatCurrency(pendingPool.total, 'EUR')}</p>
                </div>
                {riskFilter === 'pending' && (
                  <button
                    type="button"
                    className="mt-1 flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRiskFilter('all');
                    }}
                    aria-label={t('cashbackHero.bybitFuture.clearRiskFilter')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => applyRiskFilter('over60')}
              className={riskFilter === 'over60'
                ? 'rounded-xl border border-amber-500/80 bg-amber-500/20 px-4 py-3 text-left shadow-sm ring-1 ring-amber-500/40'
                : 'rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left shadow-sm transition-colors hover:bg-amber-500/15'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.over60')}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tabular-nums text-foreground">{formatCurrency(pendingPool.over60, 'EUR')}</p>
                </div>
                {riskFilter === 'over60' && (
                  <button
                    type="button"
                    className="mt-1 flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRiskFilter('all');
                    }}
                    aria-label={t('cashbackHero.bybitFuture.clearRiskFilter')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => applyRiskFilter('over80')}
              className={riskFilter === 'over80'
                ? 'rounded-xl border border-red-500/80 bg-red-500/20 px-4 py-3 text-left shadow-sm ring-1 ring-red-500/40'
                : 'rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left shadow-sm transition-colors hover:bg-red-500/15'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.over80')}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tabular-nums text-foreground">{formatCurrency(pendingPool.over80, 'EUR')}</p>
                </div>
                {riskFilter === 'over80' && (
                  <button
                    type="button"
                    className="mt-1 flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRiskFilter('all');
                    }}
                    aria-label={t('cashbackHero.bybitFuture.clearRiskFilter')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </button>
          </div>

          <div className={currentMonthSummary.missing === 0 ? 'rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] p-3 shadow-sm sm:p-4' : 'rounded-xl border border-primary/30 bg-primary/[0.05] p-3 shadow-sm sm:p-4'}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">{t('cashbackHero.bybitFuture.currentMonth')}</p>
            <div className="rounded-xl border border-border/70 bg-background/80 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={currentMonthSummary.missing === 0 ? 'font-mono text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-300' : 'font-mono text-sm font-semibold tracking-wide text-foreground/95'}>{currentMonthSummary.monthKey}</p>
                  <p className={currentMonthSummary.missing === 0 ? 'mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80' : 'mt-1 text-xs text-muted-foreground'}>
                    {t('cashbackHero.bybitFuture.target')}: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(bybitNunoTierTarget, 'EUR')}</span>
                  </p>
                </div>
                <p className={currentMonthSummary.missing === 0
                  ? 'rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300'
                  : 'rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300'}
                >
                  {currentMonthSummary.missing === 0 ? t('cashbackHero.bybitFuture.gbitComplete') : `${t('cashbackHero.bybitFuture.remaining')}: ${formatCurrency(currentMonthSummary.missing, 'EUR')}`}
                </p>
              </div>

              <div className={currentMonthSummary.missing === 0 ? 'mt-2.5 h-1.5 overflow-hidden rounded-full bg-emerald-500/20' : 'mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted'}>
                <div
                  className={currentMonthSummary.missing === 0 ? 'h-full bg-emerald-500 transition-all' : 'h-full bg-primary transition-all'}
                  style={{ width: `${Math.min(100, bybitNunoTierTarget > 0 ? (currentMonthSummary.done / bybitNunoTierTarget) * 100 : 100)}%` }}
                />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className={currentMonthSummary.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2'}>
                  <p className={currentMonthSummary.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.gbitDone')}</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(currentMonthSummary.done, 'EUR')}</p>
                </div>
                <div className={currentMonthSummary.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2'}>
                  <p className={currentMonthSummary.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.remaining')}</p>
                  <p className={currentMonthSummary.missing === 0 ? 'text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300' : 'text-sm font-semibold tabular-nums text-foreground'}>{formatCurrency(currentMonthSummary.missing, 'EUR')}</p>
                </div>
                <div className={currentMonthSummary.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 col-span-2 sm:col-span-1' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2 col-span-2 sm:col-span-1'}>
                  <p className={currentMonthSummary.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.target')}</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(bybitNunoTierTarget, 'EUR')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">{t('cashbackHero.bybitFuture.upcomingMonths')}</p>
            <div className="space-y-2">
              {upcomingMonths.map((month) => (
                <div
                  key={month.monthKey}
                  className={month.missing === 0
                    ? 'rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] p-3 shadow-[inset_0_1px_0_rgba(16,185,129,0.12)]'
                    : 'rounded-xl border border-border/70 bg-background/80 p-3'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={month.missing === 0 ? 'font-mono text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-300' : 'font-mono text-sm font-semibold tracking-wide text-foreground/95'}>{month.monthKey}</p>
                      <p className={month.missing === 0 ? 'mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80' : 'mt-1 text-xs text-muted-foreground'}>
                        {t('cashbackHero.bybitFuture.target')}: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(bybitNunoTierTarget, 'EUR')}</span>
                      </p>
                    </div>
                    <p className={month.missing === 0
                      ? 'rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300'
                      : 'rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300'}
                    >
                      {month.missing === 0 ? t('cashbackHero.bybitFuture.gbitComplete') : `${t('cashbackHero.bybitFuture.remaining')}: ${formatCurrency(month.missing, 'EUR')}`}
                    </p>
                  </div>

                  <div className={month.missing === 0 ? 'mt-2.5 h-1.5 overflow-hidden rounded-full bg-emerald-500/20' : 'mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted'}>
                    <div
                      className={month.missing === 0 ? 'h-full bg-emerald-500 transition-all' : 'h-full bg-primary transition-all'}
                      style={{ width: `${Math.min(100, bybitNunoTierTarget > 0 ? (month.projectedSpend / bybitNunoTierTarget) * 100 : 100)}%` }}
                    />
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className={month.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2'}>
                      <p className={month.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.gbitDone')}</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(month.done, 'EUR')}</p>
                    </div>
                    <div className={month.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2'}>
                      <p className={month.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.remaining')}</p>
                      <p className={month.missing === 0 ? 'text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300' : 'text-sm font-semibold tabular-nums text-foreground'}>{formatCurrency(month.missing, 'EUR')}</p>
                    </div>
                    <div className={month.missing === 0 ? 'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 col-span-2 sm:col-span-1' : 'rounded-md border border-border/70 bg-card/60 px-2.5 py-2 col-span-2 sm:col-span-1'}>
                      <p className={month.missing === 0 ? 'text-[10px] uppercase tracking-[0.08em] text-emerald-700/80 dark:text-emerald-300/80' : 'text-[10px] uppercase tracking-[0.08em] text-muted-foreground'}>{t('cashbackHero.bybitFuture.projected')}</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(month.projectedSpend, 'EUR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t('cashbackHero.bybitFuture.agingHint')}</p>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input type="month" value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} className="w-full sm:w-[180px]" />
            <Select value={purchaseTypeFilter} onValueChange={(value) => setPurchaseTypeFilter(value as PurchaseTypeFilter)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder={t('cashbackHero.bybitFuture.purchaseTypeFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('cashbackHero.bybitFuture.allPurchaseTypes')}</SelectItem>
                {PURCHASE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{t(`cashbackHero.bybitFuture.purchaseTypeOptions.${option}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {purchaseTypeFilter !== 'all' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setPurchaseTypeFilter('all')}>
                {t('cashbackHero.bybitFuture.clearRiskFilter')}
              </Button>
            ) : null}
            <Button 
              type="button" 
              variant={isBulkModeActive ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                setIsBulkModeActive(!isBulkModeActive);
                setSelectedIds([]);
              }}
            >
              {isBulkModeActive ? t('cashbackHero.bybitFuture.disableBulk') : t('cashbackHero.bybitFuture.enableBulk')}
            </Button>
          </div>

          {isBulkModeActive && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t('cashbackHero.bybitFuture.bulkPurchaseTypeTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('cashbackHero.bybitFuture.bulkPurchaseTypeHint', { selected: visibleSelectedCount, count: bulkEditableItems.length })}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={bulkPurchaseType} onValueChange={setBulkPurchaseType}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder={t('cashbackHero.bybitFuture.purchaseType')} />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{t(`cashbackHero.bybitFuture.purchaseTypeOptions.${option}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => void applyBulkPurchaseType()}
                disabled={!bulkPurchaseType || bulkEditableItems.length === 0 || bulkSaving || editingId !== null}
              >
                {bulkSaving ? t('common.loading') : t('cashbackHero.bybitFuture.applyBulkPurchaseType')}
              </Button>
            </div>
          </div>
          )}

          <div className="min-w-0 overflow-x-auto rounded-lg border">
            <div className={mode === 'dialog' ? 'max-h-[42vh] overflow-auto' : 'max-h-[65vh] overflow-auto'}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    {isBulkModeActive && (
                    <th className="px-3 py-2">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                        aria-label={t('cashbackHero.bybitFuture.selectVisibleTransactions')}
                        disabled={visibleItems.length === 0 || editingId !== null}
                      />
                    </th>
                    )}
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.movement')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.amount')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.bank')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.purchaseType')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.suggestedTargetCard')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.date')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.gbitDeadline')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.curveCard')}</th>
                    <th className="px-3 py-2">{t('cashbackHero.bybitFuture.days')}</th>
                    <th className="px-3 py-2">GBIT</th>
                    <th className="px-3 py-2">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t border-border/60">
                      <td colSpan={12} className="px-3 py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</td>
                    </tr>
                  ) : null}
                  {visibleItems.map((item) => (
                    (() => {
                      const isEditing = editingId === item.id;
                      const isSelected = selectedIds.includes(item.id);
                      const daysLeft = getDaysLeftForGbit(item);
                      const daysLabel = daysLeft <= 0 ? t('cashbackHero.bybitFuture.expired') : String(daysLeft);
                      const gbitDeadline = getGbitDeadline(item);
                      const suggestedCard = suggestedTargetById.get(item.id) ?? (item.purchaseType ? 'Unibanco' : '');
                      return (
                    <tr key={item.id} className="border-t border-border/60">
                      {isBulkModeActive && (
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleSelected(item.id, checked === true)}
                          aria-label={t('cashbackHero.bybitFuture.selectTransaction')}
                          disabled={editingId !== null}
                        />
                      </td>
                      )}
                      <td className="px-3 py-2">{isEditing ? <Input value={editDraft.movement} onChange={(event) => setEditDraft((prev) => ({ ...prev, movement: event.target.value }))} className="h-8 min-w-[140px]" /> : item.movement}</td>
                      <td className="px-3 py-2 font-medium">{isEditing ? <Input value={editDraft.amount} inputMode="decimal" onChange={(event) => setEditDraft((prev) => ({ ...prev, amount: event.target.value }))} className="h-8 min-w-[120px]" /> : formatCurrency(item.amount, 'EUR')}</td>
                      <td className="px-3 py-2">{isEditing ? (
                        <Select value={editDraft.bank} onValueChange={(value) => setEditDraft((prev) => ({ ...prev, bank: value }))}>
                          <SelectTrigger className="h-8 min-w-[120px]">
                            <SelectValue placeholder={t('cashbackHero.bybitFuture.bank')} />
                          </SelectTrigger>
                          <SelectContent>
                            {BANK_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (item.bank || '-')}</td>
                      <td className="px-3 py-2">{isEditing ? (
                        <Select value={editDraft.purchaseType} onValueChange={(value) => setEditDraft((prev) => ({ ...prev, purchaseType: value }))}>
                          <SelectTrigger className="h-8 min-w-[140px]">
                            <SelectValue placeholder={t('cashbackHero.bybitFuture.purchaseType')} />
                          </SelectTrigger>
                          <SelectContent>
                            {PURCHASE_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>{t(`cashbackHero.bybitFuture.purchaseTypeOptions.${option}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (item.purchaseType ? t(`cashbackHero.bybitFuture.purchaseTypeOptions.${item.purchaseType}`) : '-')}</td>
                      <td className="px-3 py-2">{suggestedCard || '-'}</td>
                      <td className="px-3 py-2">{isEditing ? <Input type="date" value={editDraft.date} onChange={(event) => setEditDraft((prev) => ({ ...prev, date: event.target.value }))} className="h-8 min-w-[150px]" /> : item.date}</td>
                      <td className="px-3 py-2">
                        <span className={daysLeft <= 0 ? 'font-semibold text-red-700 dark:text-red-300' : ''}>{gbitDeadline}</span>
                      </td>
                      <td className="px-3 py-2">{isEditing ? (
                        <Select value={editDraft.curveCard} onValueChange={(value) => setEditDraft((prev) => ({ ...prev, curveCard: value }))}>
                          <SelectTrigger className="h-8 min-w-[120px]">
                            <SelectValue placeholder={t('cashbackHero.bybitFuture.curveCard')} />
                          </SelectTrigger>
                          <SelectContent>
                            {CURVE_CARD_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (item.curveCard || '-')}</td>
                      <td className="px-3 py-2">
                        <span className={daysLeft <= 0 ? 'font-semibold text-red-700 dark:text-red-300' : daysLeft <= 7 ? 'font-semibold text-red-600 dark:text-red-300' : daysLeft <= 14 ? 'font-semibold text-amber-600 dark:text-amber-300' : ''}>
                          {daysLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Button type="button" size="sm" variant={item.gbit ? 'default' : 'outline'} onClick={() => toggleGbit(item.id)} className="h-7 gap-1" disabled={isEditing}>
                          <Check className="h-3.5 w-3.5" />
                          {item.gbit ? 'Yes' : 'No'}
                        </Button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button type="button" size="sm" onClick={() => saveEdit(item.id)}>{t('cashbackHero.bybitFuture.save')}</Button>
                              <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>{t('cashbackHero.bybitFuture.cancel')}</Button>
                            </>
                          ) : (
                            <>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      <Dialog open={manualFormOpen} onOpenChange={setManualFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="text-left">
            <DialogTitle>{t('cashbackHero.bybitFuture.manualTitle')}</DialogTitle>
            <DialogDescription>{t('cashbackHero.bybitFuture.managerDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={addManual} className="space-y-2">
            <Input value={movement} onChange={(event) => setMovement(event.target.value)} placeholder={t('cashbackHero.bybitFuture.movement')} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={t('cashbackHero.bybitFuture.amountPlaceholder')} />
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cashbackHero.bybitFuture.bank')} />
                </SelectTrigger>
                <SelectContent>
                  {BANK_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={curveCard} onValueChange={setCurveCard}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cashbackHero.bybitFuture.curveCard')} />
                </SelectTrigger>
                <SelectContent>
                  {CURVE_CARD_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={purchaseType} onValueChange={setPurchaseType}>
              <SelectTrigger>
                <SelectValue placeholder={t('cashbackHero.bybitFuture.purchaseType')} />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{t(`cashbackHero.bybitFuture.purchaseTypeOptions.${option}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suggestedTargetCard ? (
              <p className="text-xs text-muted-foreground">
                {t('cashbackHero.bybitFuture.suggestedTargetCard')}: <span className="font-semibold text-foreground">{suggestedTargetCard}</span>
              </p>
            ) : null}
            <Button type="submit" className="w-full">{t('cashbackHero.bybitFuture.add')}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );

  if (mode === 'page') {
    return (
      <>
        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">{content}</section>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="left-0 top-0 box-border !block h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 overflow-x-hidden overflow-y-auto rounded-none border-0 p-4 sm:left-[50%] sm:top-[50%] sm:h-auto sm:w-full sm:max-h-[90vh] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6">
          {content}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
