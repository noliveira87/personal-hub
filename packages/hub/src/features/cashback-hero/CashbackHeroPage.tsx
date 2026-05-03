import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parse, addMonths, subMonths, subDays, parseISO, getDaysInMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { chartAxisTickStyle, chartAxisTickStyleCompact, chartTooltipContentStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from '@/lib/chartTheme';
import { enUS, pt } from 'date-fns/locale';
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
  CreditCard,
  X,
} from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import AppLoadingState from '@/components/AppLoadingState';
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
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
import {
  type CashbackChartMonths,
  loadCashbackChartMonths,
  persistCashbackChartMonths,
} from '@/features/cashback-hero/lib/cashbackSettings';
import {
  DEFAULT_CASHBACK_CARD_RULES,
  loadCashbackCardRulesSettings,
  type CashbackCardRulesSettings,
} from '@/features/cashback-hero/lib/cardRulesSettings';
import { useCashbackStore } from '@/features/cashback-hero/use-cashback-store';
import {
  createCashbackHomeExpenseLink,
  getActiveTier,
  getNextTier,
  UNIBANCO_TIERS,
} from '@/features/cashback-hero/lib/cashback';
import { useCryptoQuotes } from '@/features/portfolio/hooks/use-btc-quote';
import { useOptionalContracts } from '@/features/contracts/context/ContractContext';
import { mapContractCategoryToExpenseCategory } from '@/features/home-expenses/lib/contractMapping';
import { insertTransaction } from '@/features/home-expenses/lib/store';
import { getContractCategoryIcon, type Contract } from '@/features/contracts/types/contract';
import type { ExpenseCategory } from '@/features/home-expenses/lib/types';

type CardInsightKey = 'unibanco' | 'cetelem' | 'universo';
type InsightPriority = 'high' | 'medium' | 'low';

type InsightItem = {
  line: string;
  isCardSpecific: boolean;
  cardKey?: CardInsightKey;
  priority: InsightPriority;
  impactEur?: number;
};

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isCardMatch(cardUsed: string, cardName: string): boolean {
  if (!cardName.trim()) return false;
  const pattern = new RegExp(escapeRegex(cardName.trim()), 'i');
  return pattern.test(cardUsed.trim());
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

const UNIBANCO_ANNUAL_BASELINE_EUR = 50;
function getUniversoCycleKey(dateRaw: string, statementDay: number): string {
  const parsed = parseISO(dateRaw);
  if (Number.isNaN(parsed.getTime())) {
    return dateRaw.slice(0, 7);
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const day = parsed.getDate();
  const normalizedStatementDay = Math.min(31, Math.max(1, statementDay));
  const cycleAnchor = day >= normalizedStatementDay
    ? new Date(year, month, normalizedStatementDay)
    : new Date(year, month - 1, normalizedStatementDay);

  return format(cycleAnchor, 'yyyy-MM');
}

function getUniversoCycleRangeFromMonthKey(monthKey: string, statementDay: number): { start: string; endExclusive: string } {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const normalizedStatementDay = Math.min(31, Math.max(1, statementDay));

  const start = new Date(year, month - 1, normalizedStatementDay);
  const end = new Date(year, month, normalizedStatementDay);

  return {
    start: format(start, 'yyyy-MM-dd'),
    endExclusive: format(end, 'yyyy-MM-dd'),
  };
}

function getUniversoExpectedAmountForPurchase(purchase: CashbackPurchase, defaultRate: number): number {
  if (!Number.isFinite(purchase.amount) || purchase.amount <= 0) return 0;
  return Math.round(purchase.amount * defaultRate * 100) / 100;
}

function getUniversoPotentialAmount(
  purchase: CashbackPurchase,
  entry: CashbackEntry,
  defaultRate: number,
): number {
  const raw = getEntryAmountForDisplay(entry);
  const expected = getUniversoExpectedAmountForPurchase(purchase, defaultRate);
  return Math.max(raw, expected);
}

function computeUniversoEntryCapMap(
  purchases: CashbackPurchase[],
  options: {
    sourceRegex: RegExp;
    cycleCapEur: number;
    statementDay: number;
  },
): Map<string, number> {
  const universoEntries = purchases
    .flatMap((purchase) => purchase.cashbackEntries.map((entry) => ({
      entryId: entry.id,
      source: entry.source,
      rawAmount: getEntryAmountForDisplay(entry),
      entryDate: entry.dateReceived,
      purchaseDate: purchase.date,
      purchaseCreatedAt: purchase.createdAt ?? '',
      purchaseId: purchase.id,
      cycleKey: getUniversoCycleKey(entry.dateReceived, options.statementDay),
    })))
    .filter((entry) => options.sourceRegex.test(entry.source))
    .sort((a, b) => (
      a.entryDate.localeCompare(b.entryDate)
      || a.purchaseDate.localeCompare(b.purchaseDate)
      || a.purchaseCreatedAt.localeCompare(b.purchaseCreatedAt)
      || a.purchaseId.localeCompare(b.purchaseId)
      || a.entryId.localeCompare(b.entryId)
    ));

  const capByEntryId = new Map<string, number>();
  const cycleUsage = new Map<string, number>();

  universoEntries.forEach((entry) => {
    const used = cycleUsage.get(entry.cycleKey) ?? 0;
    const remaining = Math.max(0, options.cycleCapEur - used);
    const effectiveAmount = Math.max(0, Math.min(entry.rawAmount, remaining));

    capByEntryId.set(entry.entryId, effectiveAmount);
    cycleUsage.set(entry.cycleKey, used + effectiveAmount);
  });

  return capByEntryId;
}

function getEffectiveEntryAmounts(
  purchase: CashbackPurchase,
  cappedEntryAmounts?: Map<string, number>,
): Array<{ id: string; amount: number }> {
  if (purchase.isReferral) {
    return purchase.cashbackEntries.map((entry) => ({
      id: entry.id,
      amount: Math.max(0, cappedEntryAmounts?.get(entry.id) ?? getEntryAmountForDisplay(entry)),
    }));
  }

  let remaining = Math.max(0, purchase.amount);
  return purchase.cashbackEntries.map((entry) => {
    const amount = Math.max(0, cappedEntryAmounts?.get(entry.id) ?? getEntryAmountForDisplay(entry));
    const effectiveAmount = Math.max(0, Math.min(amount, remaining));
    remaining -= effectiveAmount;
    return { id: entry.id, amount: effectiveAmount };
  });
}

type MerchantCategoryHint = {
  displayMerchant: string;
  normalizedMerchant: string;
  category: CashbackCategory;
  count: number;
};

function normalizeMerchantName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategoryFromMerchant(
  merchant: string,
  hints: MerchantCategoryHint[],
): CashbackCategory | null {
  const normalized = normalizeMerchantName(merchant);
  if (!normalized) return null;

  const exact = hints.find((hint) => hint.normalizedMerchant === normalized);
  if (exact) return exact.category;

  const keywordRules: Array<{ pattern: RegExp; category: CashbackCategory }> = [
    { pattern: /\b(continente|pingo doce|mercadona|auchan|lidl|aldi|intermarche|mini preco|minipreco|supermercado)\b/, category: 'groceries' },
    { pattern: /\b(amazon|worten|fnac|radio popular|mediamarkt|pc diga|globaldata)\b/, category: 'tech' },
    { pattern: /\b(uber|bolt|via verde|galp|bp|repsol|prio|moove|cp|fertagus|carris|metro)\b/, category: 'transport' },
    { pattern: /\b(booking|airbnb|ryanair|easyjet|tap|hotel|viagem)\b/, category: 'travel' },
    { pattern: /\b(mc ?donald|burger king|kfc|glovo|uber eats|restaurante|pizzaria|cafe)\b/, category: 'dining' },
    { pattern: /\b(farmacia|wells|hospital|clinica|dental|saude)\b/, category: 'health' },
    { pattern: /\b(zara|h&m|primark|shein|temu|ali express|aliexpress|shop)\b/, category: 'shopping' },
  ];

  const matched = keywordRules.find((rule) => rule.pattern.test(normalized));
  return matched?.category ?? null;
}

function getEffectiveTotalCashback(purchase: CashbackPurchase, cappedEntryAmounts?: Map<string, number>): number {
  return getEffectiveEntryAmounts(purchase, cappedEntryAmounts).reduce((sum, item) => sum + item.amount, 0);
}

function getDisplayPercentFromPurchase(purchase: CashbackPurchase, cappedEntryAmounts?: Map<string, number>): number {
  if (!Number.isFinite(purchase.amount) || purchase.amount <= 0) return 0;

  // For display, never show more than 100% cashback for a purchase.
  const effectiveCashback = getEffectiveTotalCashback(purchase, cappedEntryAmounts);
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

function CashbackBadge({ purchase, cappedEntryAmounts }: { purchase: CashbackPurchase; cappedEntryAmounts?: Map<string, number> }) {
  if (purchase.isReferral) {
    return (
      <span className="inline-flex rounded-lg border border-blue-600 bg-blue-500/20 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-500/30 dark:text-blue-200">
        Referral
      </span>
    );
  }
  return <CashbackPercentBadge percent={getDisplayPercentFromPurchase(purchase, cappedEntryAmounts)} />;
}

function getCashbackComponentSources(purchase: CashbackPurchase): string[] {
  return Array.from(
    new Set(
      purchase.cashbackEntries
        .map((entry) => entry.source.trim())
        .filter(Boolean),
    ),
  );
}

function CashbackHeroPage() {
  const { formatCurrency, t, language } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const { purchases, loading, error, reload, addPurchase, addCashbackEntry, editCashbackEntry, syncUnibancoMonth, syncCetelemPurchase, deletePurchase, deleteCashbackEntry, updatePurchase } = useCashbackStore();
  const contractsContext = useOptionalContracts();
  const contracts = contractsContext?.contracts ?? [];
  const { sources, addSource, removeSource, resetSources } = useCashbackSources();
  const { cards } = useCashbackCards();
  const navigate = useNavigate();

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
  const [cashbackRules, setCashbackRules] = useState<CashbackCardRulesSettings>(DEFAULT_CASHBACK_CARD_RULES);

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

  const universoSourceRegex = useMemo(
    () => new RegExp(escapeRegex(cashbackRules.universo.sourceName), 'i'),
    [cashbackRules.universo.sourceName],
  );
  const universoCycleCapEur = cashbackRules.universo.cycleCashbackCap;
  const universoRate = cashbackRules.universo.cashbackRate;
  const universoStatementDay = cashbackRules.universo.statementDay;
  const unibancoAnnualCapEur = cashbackRules.unibanco.annualCashbackCap;
  const unibancoTopTierSpendCap = cashbackRules.unibanco.topTierSpendCap;
  const cetelemRate = cashbackRules.cetelem.cashbackRate;
  const cetelemMonthlyCapEur = cashbackRules.cetelem.monthlyCashbackCap;
  const cetelemAnnualCapEur = cashbackRules.cetelem.annualCashbackCap;

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

  const merchantCategoryHints = useMemo<MerchantCategoryHint[]>(() => {
    const grouped = new Map<string, { displayMerchant: string; categoryCounts: Map<CashbackCategory, number>; total: number }>();

    purchases.forEach((purchase) => {
      const normalized = normalizeMerchantName(purchase.merchant);
      if (!normalized) return;

      const current = grouped.get(normalized) ?? {
        displayMerchant: purchase.merchant,
        categoryCounts: new Map<CashbackCategory, number>(),
        total: 0,
      };

      current.displayMerchant = purchase.merchant;
      current.total += 1;
      current.categoryCounts.set(purchase.category, (current.categoryCounts.get(purchase.category) ?? 0) + 1);
      grouped.set(normalized, current);
    });

    return Array.from(grouped.entries())
      .map(([normalizedMerchant, info]) => {
        const sortedCategories = Array.from(info.categoryCounts.entries())
          .sort((a, b) => b[1] - a[1]);
        const topCategory = sortedCategories[0]?.[0] ?? 'other';
        return {
          normalizedMerchant,
          displayMerchant: info.displayMerchant,
          category: topCategory,
          count: info.total,
        };
      })
      .sort((a, b) => b.count - a.count || a.displayMerchant.localeCompare(b.displayMerchant));
  }, [purchases]);

  const merchantSuggestions = useMemo(
    () => merchantCategoryHints.map((hint) => hint.displayMerchant),
    [merchantCategoryHints],
  );

  const cappedEntryAmounts = useMemo(
    () => computeUniversoEntryCapMap(purchases, {
      sourceRegex: universoSourceRegex,
      cycleCapEur: universoCycleCapEur,
      statementDay: universoStatementDay,
    }),
    [purchases, universoSourceRegex, universoCycleCapEur, universoStatementDay],
  );

  const dateFnsLocale = useMemo(() => (language === 'pt' ? pt : enUS), [language]);

  const [chartMonths, setChartMonths] = useState<CashbackChartMonths>(12);

  useEffect(() => {
    void loadCashbackChartMonths().then((months) => setChartMonths(months));
  }, []);

  const handleChartMonthsChange = (value: string) => {
    const months = Number(value) as CashbackChartMonths;
    setChartMonths(months);
    void persistCashbackChartMonths(months);
  };

  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const monthMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      monthMap.set(format(d, 'yyyy-MM'), 0);
    }
    purchases.forEach((purchase) => {
      const month = purchase.date.slice(0, 7);
      if (monthMap.has(month)) {
        monthMap.set(month, (monthMap.get(month) ?? 0) + getEffectiveTotalCashback(purchase, cappedEntryAmounts));
      }
    });
    return Array.from(monthMap.entries()).map(([month, cashback]) => ({
      month,
      label: format(parse(`${month}-01`, 'yyyy-MM-dd', new Date()), 'MMM yy', { locale: dateFnsLocale }),
      cashback: Math.round(cashback * 100) / 100,
    }));
  }, [purchases, cappedEntryAmounts, dateFnsLocale]);

  const universoCycles = useMemo(() => {
    if (selectedMonth === 'all') return [];

    // A calendar month always overlaps with exactly 2 Universo cycles:
    // - Cycle A: starts on 15th of the PREVIOUS month (covers days 1–14 of selected month)
    // - Cycle B: starts on 15th of the CURRENT month (covers days 15–end of selected month)
    // We always show both, even if a cycle has no entries yet.
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-based

    // Cycle A key: previous month in yyyy-MM format
    const cycleAKey = format(new Date(year, month - 2, 1), 'yyyy-MM');
    // Cycle B key: current month
    const cycleBKey = selectedMonth;

    const today = format(new Date(), 'yyyy-MM-dd');

    const buildCycle = (cycleKey: string) => {
      const cycleRange = getUniversoCycleRangeFromMonthKey(cycleKey, universoStatementDay);
      // Skip future cycles that haven't started yet
      if (cycleRange.start > today) return null;

      const allInCycle = purchases
        .flatMap((p) => p.cashbackEntries.map((e) => ({ entry: e })))
        .filter(({ entry }) => universoSourceRegex.test(entry.source))
        .filter(({ entry }) => entry.dateReceived >= cycleRange.start && entry.dateReceived < cycleRange.endExclusive);

      // Do not show Universo cycle cards if there are no transactions yet for that cycle.
      if (allInCycle.length === 0) return null;

      const effectiveTotal = allInCycle.reduce(
        (sum, { entry }) => sum + (cappedEntryAmounts.get(entry.id) ?? getEntryAmountForDisplay(entry)), 0,
      );
      const capReached = effectiveTotal + 0.0001 >= universoCycleCapEur;
      const remaining = Math.max(0, universoCycleCapEur - effectiveTotal);
      const pct = universoCycleCapEur > 0 ? Math.min(100, (effectiveTotal / universoCycleCapEur) * 100) : 100;
      const cycleLabel = `${format(parseISO(cycleRange.start), 'dd/MM')}–${format(parseISO(cycleRange.endExclusive), 'dd/MM')}`;
      const isActive = today >= cycleRange.start && today < cycleRange.endExclusive;
      return { cycleKey, effectiveTotal, capReached, remaining, pct, cycleLabel, isActive };
    };

    return [buildCycle(cycleAKey), buildCycle(cycleBKey)].filter(Boolean) as NonNullable<ReturnType<typeof buildCycle>>[];
  }, [selectedMonth, purchases, cappedEntryAmounts, universoCycleCapEur, universoSourceRegex, universoStatementDay]);

  const unibancoStatus = useMemo(() => {
    if (selectedMonth === 'all') return null;
    const eligible = monthPurchases.filter((p) => (p.isUnibanco ?? false) && !(p.isReferral ?? false));
    if (eligible.length === 0) return null;
    const spent = eligible.reduce((sum, p) => sum + p.amount, 0);
    const activeTier = getActiveTier(spent);
    const nextTier = getNextTier(spent);
    const topTier = UNIBANCO_TIERS[0];
    const isTopTier = activeTier?.minSpend === topTier.minSpend;
    const target = nextTier?.minSpend ?? topTier.minSpend;
    const pct = isTopTier ? 100 : Math.min(100, (spent / target) * 100);
    const remaining = Math.max(0, target - spent);
    const currentCashback = activeTier?.cashback ?? 0;
    const targetCashback = isTopTier ? topTier.cashback : (nextTier?.cashback ?? topTier.cashback);
    const cashbackPct = isTopTier ? 100 : targetCashback > 0 ? Math.min(100, (currentCashback / targetCashback) * 100) : 0;

    // Annual cap context (excluding currently selected month)
    const selectedYear = selectedMonth.slice(0, 4);
    const monthlySpendMap = new Map<string, number>();
    purchases
      .filter((p) => (p.isUnibanco ?? false) && !(p.isReferral ?? false))
      .filter((p) => p.date.startsWith(`${selectedYear}-`))
      .filter((p) => p.date.slice(0, 7) !== selectedMonth)
      .forEach((p) => {
        const key = p.date.slice(0, 7);
        monthlySpendMap.set(key, (monthlySpendMap.get(key) ?? 0) + p.amount);
      });

    const annualCashbackTracked = Array.from(monthlySpendMap.values()).reduce((sum, monthSpend) => {
      const tier = getActiveTier(monthSpend);
      return sum + (tier?.cashback ?? 0);
    }, 0);
    const annualCashbackUsed = Math.min(
      unibancoAnnualCapEur,
      UNIBANCO_ANNUAL_BASELINE_EUR + annualCashbackTracked + currentCashback,
    );
    const annualCashbackRemaining = Math.max(0, unibancoAnnualCapEur - annualCashbackUsed);
    
    // Calculate Unibanco cycle (1st to last day of month) and days remaining
    const [yearStr, monthStr] = selectedMonth.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10) - 1;
    const monthDate = new Date(yearNum, monthNum, 1);
    const monthEnd = endOfMonth(monthDate);
    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const daysRemaining = today.getTime() <= monthEnd.getTime() ? Math.ceil((monthEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
    const cycleLabel = `1–${getDaysInMonth(monthDate)} ${format(monthDate, 'MMM', { locale: dateFnsLocale })}`;
    
    return {
      spent,
      activeTier,
      nextTier,
      isTopTier,
      target,
      pct,
      remaining,
      currentCashback,
      targetCashback,
      cashbackPct,
      daysRemaining,
      cycleLabel,
      annualCashbackUsed,
      annualCashbackRemaining,
    };
  }, [selectedMonth, monthPurchases, purchases, unibancoAnnualCapEur, dateFnsLocale]);

  const purchaseSearchIndex = useMemo(() => {
    const byId = new Map<string, string>();

    monthPurchases.forEach((purchase) => {
      const categoryLabel = getCategoryLabel(purchase.category).toLowerCase();
      const sourceLabels = purchase.cashbackEntries.map((entry) => entry.source.toLowerCase());
      const stateLabels = [
        purchase.isReferral ? 'referral' : '',
        purchase.isUnibanco ? 'unibanco' : '',
        purchase.isCetelem ? 'cetelem' : '',
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

      byId.set(purchase.id, searchable);
    });

    return byId;
  }, [monthPurchases]);

  const cetelemStatus = useMemo(() => {
    if (selectedMonth === 'all') return null;

    const [yearStr] = selectedMonth.split('-');
    const yearlyCetelemPurchases = purchases
      .filter((p) => !(p.isReferral ?? false))
      .filter((p) => p.date.startsWith(`${yearStr}-`))
      .filter((p) => isCardMatch(extractCardFromNotes(p.notes), cashbackRules.cetelem.cardName));

    if (yearlyCetelemPurchases.length === 0) return null;

    const selectedMonthPurchases = yearlyCetelemPurchases
      .filter((p) => p.date.slice(0, 7) === selectedMonth);
    if (selectedMonthPurchases.length === 0) return null;

    const monthlySpend = new Map<string, number>();
    yearlyCetelemPurchases.forEach((p) => {
      const key = p.date.slice(0, 7);
      monthlySpend.set(key, (monthlySpend.get(key) ?? 0) + p.amount);
    });

    const sortedMonthKeys = Array.from(monthlySpend.keys()).sort();
    let annualUsedBeforeCurrent = 0;
    let annualUsedToDate = 0;
    let currentMonthSpent = 0;
    let currentMonthCashback = 0;
    let currentMonthCap = cetelemMonthlyCapEur;

    sortedMonthKeys.forEach((monthKey) => {
      if (monthKey > selectedMonth) return;

      const spend = monthlySpend.get(monthKey) ?? 0;
      const rawMonthCashback = Math.min(cetelemMonthlyCapEur, spend * cetelemRate);
      const monthCapFromAnnual = Math.max(0, cetelemAnnualCapEur - annualUsedToDate);
      const effectiveMonthCap = Math.min(cetelemMonthlyCapEur, monthCapFromAnnual);
      const effectiveMonthCashback = Math.min(rawMonthCashback, effectiveMonthCap);

      if (monthKey === selectedMonth) {
        annualUsedBeforeCurrent = annualUsedToDate;
        currentMonthSpent = spend;
        currentMonthCap = effectiveMonthCap;
        currentMonthCashback = effectiveMonthCashback;
      }

      annualUsedToDate += effectiveMonthCashback;
    });

    const annualRemaining = Math.max(0, cetelemAnnualCapEur - annualUsedToDate);
    const monthlyPct = currentMonthCap > 0 ? Math.min(100, (currentMonthCashback / currentMonthCap) * 100) : 100;
    const monthlyRemainingCashback = Math.max(0, currentMonthCap - currentMonthCashback);
    const monthlyRemainingSpend = monthlyRemainingCashback > 0
      ? monthlyRemainingCashback / cetelemRate
      : 0;

    return {
      currentMonthSpent,
      currentMonthCashback,
      currentMonthCap,
      monthlyPct,
      monthlyRemainingSpend,
      annualUsedBeforeCurrent,
      annualUsedToDate,
      annualRemaining,
      annualPct: cetelemAnnualCapEur > 0 ? Math.min(100, (annualUsedToDate / cetelemAnnualCapEur) * 100) : 100,
    };
  }, [selectedMonth, purchases, cashbackRules.cetelem.cardName, cetelemAnnualCapEur, cetelemMonthlyCapEur, cetelemRate]);

  const filteredPurchases = useMemo(() => {
    let result = [...monthPurchases];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((purchase) => (purchaseSearchIndex.get(purchase.id) ?? '').includes(term));
    }

    if (categoryFilter !== 'all') {
      result = result.filter((purchase) => purchase.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter((purchase) => purchase.cashbackEntries.some((entry) => entry.source === sourceFilter));
    }

    if (sortByPercent) {
      result.sort((a, b) => getDisplayPercentFromPurchase(b, cappedEntryAmounts) - getDisplayPercentFromPurchase(a, cappedEntryAmounts));
    } else {
      result.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    }

    return result;
  }, [monthPurchases, search, categoryFilter, sourceFilter, sortByPercent, cappedEntryAmounts, purchaseSearchIndex]);

  const stats = useMemo(() => {
    const monthSpent = monthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const monthCashback = monthPurchases.reduce((sum, purchase) => sum + getEffectiveTotalCashback(purchase, cappedEntryAmounts), 0);
    const overallSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const overallCashback = purchases.reduce((sum, purchase) => sum + getEffectiveTotalCashback(purchase, cappedEntryAmounts), 0);
    const eligibleAveragePurchases = monthPurchases.filter((purchase) => !purchase.isReferral);
    const avgPercent = eligibleAveragePurchases.length > 0
      ? eligibleAveragePurchases.reduce((sum, purchase) => sum + getDisplayPercentFromPurchase(purchase, cappedEntryAmounts), 0) / eligibleAveragePurchases.length
      : 0;

    const bestPurchase = monthPurchases.reduce<CashbackPurchase | null>((currentBest, purchase) => {
      if (!currentBest) return purchase;
      return getDisplayPercentFromPurchase(purchase, cappedEntryAmounts) > getDisplayPercentFromPurchase(currentBest, cappedEntryAmounts) ? purchase : currentBest;
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
  }, [monthPurchases, purchases, cappedEntryAmounts]);

  const insights = useMemo(() => {
    if (monthPurchases.length === 0) return [] as InsightItem[];

    const noCashbackPurchases = monthPurchases.filter((purchase) => !purchase.isReferral && purchase.cashbackEntries.length === 0);
    const totalWithoutCashback = noCashbackPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    const list: InsightItem[] = [];
    const pushGeneralInsight = (line: string, priority: InsightPriority = 'low', impactEur?: number) => list.push({ line, isCardSpecific: false, priority, impactEur });
    const pushCardInsight = (cardKey: CardInsightKey, line: string, priority: InsightPriority = 'medium', impactEur?: number) => list.push({ line, isCardSpecific: true, cardKey, priority, impactEur });

    // --- Unibanco tier insight ---
    if (selectedMonth !== 'all') {
      const unibancoEligible = monthPurchases.filter((p) => (p.isUnibanco ?? false) && !(p.isReferral ?? false));
      const unibancoSpent = unibancoEligible.reduce((sum, p) => sum + p.amount, 0);
      const maxTier = UNIBANCO_TIERS.reduce((best, tier) => (tier.cashback > best.cashback ? tier : best), UNIBANCO_TIERS[0]);
      const tier20 = UNIBANCO_TIERS.find((tier) => tier.cashback === 20) ?? maxTier;
      const topTierThreshold = unibancoTopTierSpendCap > 0 ? unibancoTopTierSpendCap : UNIBANCO_TIERS[0].minSpend;
      const targetSpendFor20 = Math.max(topTierThreshold, tier20.minSpend);

      if (unibancoEligible.length === 0) {
        pushCardInsight('unibanco', t('cashbackHero.insights.unibancoNoSpend', { min: String(targetSpendFor20) }), 'medium', tier20.cashback);
      } else if (unibancoSpent + 0.0001 >= targetSpendFor20) {
        pushCardInsight('unibanco', t('cashbackHero.insights.unibancoTopTier', { cashback: String(tier20.cashback) }), 'low');
        if (unibancoSpent > targetSpendFor20) {
          pushCardInsight('unibanco', t('cashbackHero.insights.unibancoOverCap', {
            over: (unibancoSpent - topTierThreshold).toFixed(2),
            cap: String(topTierThreshold),
          }), 'medium', unibancoSpent - topTierThreshold);
        }
      } else {
        const unibancoPotential = Math.max(0, ((tier20.cashback / Math.max(1, targetSpendFor20)) * (targetSpendFor20 - unibancoSpent)));
        pushCardInsight('unibanco', t('cashbackHero.insights.unibancoTo20Goal', {
          remaining: (targetSpendFor20 - unibancoSpent).toFixed(2),
          cashback: String(tier20.cashback),
        }), 'high', unibancoPotential);
      }

      if (cetelemStatus) {
        if (cetelemStatus.currentMonthCap <= 0 || cetelemStatus.annualRemaining <= 0) {
          pushCardInsight('cetelem', t('cashbackHero.insights.cetelemAnnualCapReached'), 'medium');
        } else if (cetelemStatus.monthlyRemainingSpend > 0.01) {
          pushCardInsight('cetelem', t('cashbackHero.insights.cetelemToMonthlyGoal', {
            remainingSpend: formatCurrency(cetelemStatus.monthlyRemainingSpend, 'EUR'),
            cashback: formatCurrency(cetelemStatus.currentMonthCap, 'EUR'),
          }), 'high', Math.max(0, cetelemStatus.currentMonthCap - cetelemStatus.currentMonthCashback));
        } else {
          pushCardInsight('cetelem', t('cashbackHero.insights.cetelemMonthlyGoalReached', {
            cashback: formatCurrency(cetelemStatus.currentMonthCashback, 'EUR'),
          }), 'low');
        }
      }

      const unibancoNoCashbackCount = unibancoEligible.filter((p) => getEffectiveTotalCashback(p, cappedEntryAmounts) <= 0).length;
      if (unibancoNoCashbackCount > 0) {
        pushCardInsight('unibanco', t('cashbackHero.insights.unibancoNoCashbackDueToCap', {
          count: String(unibancoNoCashbackCount),
        }), 'high', unibancoNoCashbackCount * 1.5);
      }

      // --- Universo cap insight (cycle 15 -> 15, cap €10) ---
      const universoCycleRange = getUniversoCycleRangeFromMonthKey(selectedMonth, universoStatementDay);
      const universoEntriesInCycle = purchases
        .flatMap((purchase) => purchase.cashbackEntries.map((entry) => ({ purchase, entry })))
        .filter(({ entry }) => universoSourceRegex.test(entry.source))
        .filter(({ entry }) => entry.dateReceived >= universoCycleRange.start && entry.dateReceived < universoCycleRange.endExclusive);

      const universoEffectiveTotal = universoEntriesInCycle.reduce((sum, { entry }) => {
        return sum + (cappedEntryAmounts.get(entry.id) ?? getEntryAmountForDisplay(entry));
      }, 0);
      const capReached = universoEffectiveTotal + 0.0001 >= universoCycleCapEur;
      const remainingToCap = Math.max(0, universoCycleCapEur - universoEffectiveTotal);
      const cycleEndInclusive = subDays(parseISO(universoCycleRange.endExclusive), 1);
      const cycleLabel = `${format(parseISO(universoCycleRange.start), 'dd/MM')}–${format(cycleEndInclusive, 'dd/MM')}`;

      if (capReached) {
        pushCardInsight('universo', t('cashbackHero.insights.universoCapReached', {
          cycle: cycleLabel,
          cap: formatCurrency(universoCycleCapEur, 'EUR'),
          used: formatCurrency(universoEffectiveTotal, 'EUR'),
        }), 'low');
      } else {
        pushCardInsight('universo', t('cashbackHero.insights.universoNoCapHit', {
          cycle: cycleLabel,
          cap: formatCurrency(universoCycleCapEur, 'EUR'),
          used: formatCurrency(universoEffectiveTotal, 'EUR'),
          remaining: formatCurrency(remainingToCap, 'EUR'),
        }), 'medium', remainingToCap);
      }
    }

    const eligibleForCoverage = monthPurchases.filter((p) => !(p.isReferral ?? false));
    if (eligibleForCoverage.length > 0) {
      const purchasesWithCashback = eligibleForCoverage.filter((purchase) => getEffectiveTotalCashback(purchase, cappedEntryAmounts) > 0);
      const stackedPurchases = purchasesWithCashback.filter((purchase) => purchase.cashbackEntries.length > 1);
      if (purchasesWithCashback.length > 0 && stackedPurchases.length > 0) {
        const stackRate = (stackedPurchases.length / purchasesWithCashback.length) * 100;
        pushGeneralInsight(t('cashbackHero.insights.stackRate', {
          stacked: String(stackedPurchases.length),
          total: String(purchasesWithCashback.length),
          rate: stackRate.toFixed(0),
        }), 'low');

        const stackLift = stackedPurchases.reduce((sum, purchase) => {
          const effectiveAmounts = getEffectiveEntryAmounts(purchase, cappedEntryAmounts)
            .map((item) => item.amount)
            .filter((amount) => amount > 0)
            .sort((a, b) => b - a);

          if (effectiveAmounts.length <= 1) return sum;
          const incremental = effectiveAmounts.slice(1).reduce((carry, amount) => carry + amount, 0);
          return sum + incremental;
        }, 0);

        if (stackLift > 0.0001) {
          pushGeneralInsight(t('cashbackHero.insights.stackLift', {
            amount: formatCurrency(stackLift, 'EUR'),
          }), 'medium', stackLift);
        }

        const stackComboTotals = stackedPurchases.reduce<Record<string, number>>((acc, purchase) => {
          const effectiveByEntryId = new Map(getEffectiveEntryAmounts(purchase, cappedEntryAmounts).map((item) => [item.id, item.amount]));
          const combo = Array.from(new Set(purchase.cashbackEntries.map((entry) => entry.source)))
            .sort((a, b) => a.localeCompare(b))
            .join(' + ');
          const comboTotal = purchase.cashbackEntries.reduce((sum, entry) => {
            return sum + (effectiveByEntryId.get(entry.id) ?? 0);
          }, 0);

          if (!combo) return acc;
          acc[combo] = (acc[combo] ?? 0) + comboTotal;
          return acc;
        }, {});

        const topStackCombo = Object.entries(stackComboTotals)
          .sort((a, b) => b[1] - a[1])[0];

        if (topStackCombo && topStackCombo[1] > 0.0001) {
          pushGeneralInsight(t('cashbackHero.insights.topStackCombo', {
            combo: topStackCombo[0],
            amount: formatCurrency(topStackCombo[1], 'EUR'),
          }), 'low', topStackCombo[1]);
        }
      }
    }

    const sourceTotals = monthPurchases.reduce<Record<string, number>>((acc, purchase) => {
      const effectiveByEntryId = new Map(getEffectiveEntryAmounts(purchase, cappedEntryAmounts).map((item) => [item.id, item.amount]));
      for (const entry of purchase.cashbackEntries) {
        const effectiveAmount = effectiveByEntryId.get(entry.id) ?? 0;
        acc[entry.source] = (acc[entry.source] ?? 0) + effectiveAmount;
      }
      return acc;
    }, {});

    const topSource = Object.entries(sourceTotals)
      .sort((a, b) => b[1] - a[1])[0];

    if (topSource && topSource[1] > 0) {
      pushGeneralInsight(t('cashbackHero.insights.topSource', {
        source: topSource[0],
        amount: formatCurrency(topSource[1], 'EUR'),
      }), 'low');
    }

    // --- General insights ---

    if (noCashbackPurchases.length > 0) {
      pushGeneralInsight(t('cashbackHero.insights.noCashback', {
        count: String(noCashbackPurchases.length),
        total: formatCurrency(totalWithoutCashback, 'EUR'),
      }), 'high', totalWithoutCashback);
    }

    if (stats.avgPercent < 2 && stats.eligibleAveragePurchasesCount >= 3) {
      pushGeneralInsight(t('cashbackHero.insights.lowAverage'), 'medium');
    }

    return list;
  }, [
    monthPurchases,
    selectedMonth,
    stats,
    formatCurrency,
    t,
    cappedEntryAmounts,
    purchases,
    cetelemStatus,
    universoCycleCapEur,
    universoSourceRegex,
    universoStatementDay,
    unibancoTopTierSpendCap,
  ]);

  const visibleInsights = useMemo(() => {
    const priorityWeight: Record<InsightPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...insights]
      .sort((a, b) => {
        const byPriority = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (byPriority !== 0) return byPriority;
        return (b.impactEur ?? 0) - (a.impactEur ?? 0);
      });
  }, [insights]);

  const insightGroups = useMemo(() => {
    const cardLabelMap: Record<CardInsightKey, string> = {
      unibanco: 'UNIBANCO',
      cetelem: 'CETELEM',
      universo: 'UNIVERSO',
    };

    const groups: Array<{ key: string; label: string; items: InsightItem[] }> = [];
    const generalItems = visibleInsights.filter((item) => !item.isCardSpecific);
    if (generalItems.length > 0) {
      groups.push({ key: 'general', label: t('cashbackHero.insights.generalPill'), items: generalItems });
    }

    (['unibanco', 'cetelem', 'universo'] as CardInsightKey[]).forEach((cardKey) => {
      const items = visibleInsights.filter((item) => item.isCardSpecific && item.cardKey === cardKey);
      if (items.length > 0) {
        groups.push({ key: cardKey, label: cardLabelMap[cardKey], items });
      }
    });

    return groups;
  }, [visibleInsights, t]);

  const monthLabel = selectedMonth === 'all'
    ? t('cashbackHero.months.all')
    : format(parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date()), 'MMMM yyyy', { locale: dateFnsLocale });

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
        await syncUnibancoMonth(month, cashbackRules.unibanco);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      }
    }
  }, [syncUnibancoMonth, cashbackRules.unibanco]);

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
    const approved = await confirm({
      title: t('cashbackHero.confirmDelete'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!approved) return;
    try {
      const purchase = purchases.find((item) => item.id === id);
      await deletePurchase(id);
      if (purchase?.isUnibanco) {
        await syncUnibancoForMonths([purchase.date.slice(0, 7)]);
      }
      if (purchase?.isCetelem) {
        await reload();
      }
      toast.success(t('cashbackHero.deletePurchase'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const requestDeleteCashback = async (purchaseId: string, entryId: string) => {
    const approved = await confirm({
      title: t('cashbackHero.cashback.deleteCashback'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!approved) return;
    try {
      await deleteCashbackEntry(purchaseId, entryId);
      toast.success(t('cashbackHero.cashback.deleteCashback'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    }
  };

  const hasThreeProgressCards = Boolean(unibancoStatus && cetelemStatus && universoCycles.length > 0);
  const compactProgressCards = hasThreeProgressCards;
  const showProgressWidgets = monthPurchases.length > 0 && Boolean(unibancoStatus || cetelemStatus || universoCycles.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title={t('cashbackHero.title')}
        icon={Coins}
        backTo="/"
        backLabel={t('common.back')}
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3" onClick={() => navigate(`/cashback-hero/bybit-gbit?month=${selectedMonth}`)}>
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{t('cashbackHero.bybitFuture.headerAction')}</span>
            </Button>
            <Button size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3" onClick={() => setShowAddPurchase(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('cashbackHero.addPurchase')}</span>
            </Button>
          </div>
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
              <p className="mt-1 text-xs text-muted-foreground">{getDisplayPercentFromPurchase(stats.bestPurchase, cappedEntryAmounts).toFixed(2).replace(/\.?0+$/, '')}%</p>
            ) : null}
          </div>

        </div>

        {/* Monthly cashback bar chart */}
        {monthlyChartData.some((d) => d.cashback > 0) ? (
          <div className="mt-4 rounded-xl border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('cashbackHero.chart.monthlyTitle')}
              </p>
              <Select value={String(chartMonths)} onValueChange={handleChartMonthsChange}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t('cashbackHero.chart.months3')}</SelectItem>
                  <SelectItem value="6">{t('cashbackHero.chart.months6')}</SelectItem>
                  <SelectItem value="12">{t('cashbackHero.chart.months12')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-44 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData.slice(-chartMonths)} margin={{ left: 2, right: 6, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={chartAxisTickStyleCompact as any} />
                <YAxis tickFormatter={(value: number) => `€${value}`} width={40} tick={chartAxisTickStyleCompact as any} />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(value: number) => [formatCurrency(value), t('cashbackHero.chart.tooltipLabel')]}
                />
                <Bar
                  dataKey="cashback"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Card progress widgets: Unibanco tier + Universo cap(s) */}
        {showProgressWidgets ? (
          <div
            className={cn(
              'mt-4 grid gap-3',
              hasThreeProgressCards
                ? 'grid-cols-1 lg:grid-cols-3'
                : (unibancoStatus && cetelemStatus) || (unibancoStatus && universoCycles.length > 0) || (cetelemStatus && universoCycles.length > 0)
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : 'grid-cols-1',
            )}
          >

            {/* Unibanco tier */}
            {unibancoStatus ? (
              <div className={cn(
                'h-full rounded-xl border',
                compactProgressCards ? 'p-3.5 lg:min-h-[132px]' : 'p-4 lg:min-h-[142px]',
                unibancoStatus.isTopTier
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card',
              )}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{cashbackRules.unibanco.cardName}</span>
                  </div>
                  <div className="flex max-w-[70%] flex-wrap items-center justify-end gap-1">
                    {unibancoStatus.daysRemaining > 0 && (
                      <span className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        {t('cashbackHero.cardWidget.unibancoDaysRemaining', { days: unibancoStatus.daysRemaining })}
                      </span>
                    )}
                    {unibancoStatus.activeTier ? (
                      <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        +{formatCurrency(unibancoStatus.activeTier.cashback, 'EUR')}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t('cashbackHero.cardWidget.unibancoNoTier')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-2 flex items-end justify-between gap-2">
                  <p className={cn('tabular-nums font-bold text-foreground', compactProgressCards ? 'text-base' : 'text-lg')}>
                    {formatCurrency(unibancoStatus.currentCashback, 'EUR')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/ {formatCurrency(unibancoStatus.targetCashback, 'EUR')}</span>
                  </p>
                  <span className={cn('whitespace-nowrap font-medium text-muted-foreground', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                    {t('cashbackHero.cardWidget.unibancoAnnualCapCompact', {
                      used: formatCurrency(unibancoStatus.annualCashbackUsed, 'EUR'),
                      cap: formatCurrency(unibancoAnnualCapEur, 'EUR'),
                    })}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', unibancoStatus.isTopTier ? 'bg-primary' : 'bg-primary/60')}
                    style={{ width: `${unibancoStatus.cashbackPct}%` }}
                  />
                </div>
                <p className={cn('mt-1.5 text-muted-foreground', compactProgressCards ? 'text-[10px]' : 'text-[11px]')}>
                  {unibancoStatus.isTopTier
                    ? t('cashbackHero.cardWidget.unibancoTopTier', { cashback: formatCurrency(unibancoStatus.activeTier!.cashback, 'EUR') })
                    : t('cashbackHero.cardWidget.monthlyRemainingCashback', { amount: formatCurrency(unibancoStatus.targetCashback - unibancoStatus.currentCashback, 'EUR') })}
                </p>
{unibancoStatus.daysRemaining > 0 && unibancoStatus.daysRemaining <= 3 && (
                  <p className={cn('mt-2 font-semibold text-amber-600 dark:text-amber-300', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                    {t('cashbackHero.cardWidget.unibancoDaysWarning', { days: unibancoStatus.daysRemaining })}
                  </p>
                )}
                {!unibancoStatus.isTopTier && unibancoStatus.remaining > 0 && (
                  <p className={cn('mt-1.5 text-sky-600 dark:text-sky-300', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                    💡 {t('cashbackHero.cardWidget.maxiSimulator', { amount: formatCurrency(unibancoStatus.remaining, 'EUR') })}
                  </p>
                )}
              </div>
            ) : null}

            {/* Cetelem monthly + annual cap */}
            {cetelemStatus ? (
              <div className={cn(
                'h-full rounded-xl border',
                compactProgressCards ? 'p-3.5 lg:min-h-[132px]' : 'p-4 lg:min-h-[142px]',
                cetelemStatus.currentMonthCap > 0 && cetelemStatus.currentMonthCashback + 0.0001 >= cetelemStatus.currentMonthCap
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card',
              )}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{cashbackRules.cetelem.cardName}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {(cetelemRate * 100).toFixed(2).replace(/\.00$/, '')}%
                    </span>
                  </div>
                </div>
                <div className="mb-2 flex items-end justify-between gap-2">
                  <p className={cn('tabular-nums font-bold text-foreground', compactProgressCards ? 'text-base' : 'text-lg')}>
                    {formatCurrency(cetelemStatus.currentMonthCashback, 'EUR')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/ {formatCurrency(cetelemStatus.currentMonthCap, 'EUR')}</span>
                  </p>
                  <span className={cn('whitespace-nowrap font-medium text-muted-foreground', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                    {t('cashbackHero.cardWidget.cetelemAnnualCapCompact', {
                      used: formatCurrency(cetelemStatus.annualUsedToDate, 'EUR'),
                      cap: formatCurrency(cetelemAnnualCapEur, 'EUR'),
                    })}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', cetelemStatus.monthlyPct >= 100 ? 'bg-primary' : 'bg-primary/60')}
                    style={{ width: `${cetelemStatus.monthlyPct}%` }}
                  />
                </div>
<p className={cn('mt-1.5 text-muted-foreground', compactProgressCards ? 'text-[10px]' : 'text-[11px]')}>
                  {cetelemStatus.monthlyRemainingSpend <= 0
                    ? t('cashbackHero.cardWidget.cetelemMonthlyTop', { cashback: formatCurrency(cetelemStatus.currentMonthCap, 'EUR') })
                    : t('cashbackHero.cardWidget.monthlyRemainingCashback', { amount: formatCurrency(cetelemStatus.currentMonthCap - cetelemStatus.currentMonthCashback, 'EUR') })}
                </p>
                {cetelemStatus.monthlyRemainingSpend > 0 && (
                  <p className={cn('mt-1.5 text-sky-600 dark:text-sky-300', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                    💡 {t('cashbackHero.cardWidget.maxiSimulator', { amount: formatCurrency(cetelemStatus.monthlyRemainingSpend, 'EUR') })}
                  </p>
                )}
              </div>
            ) : null}

            {/* Universo cap cycles — single card, cycles side by side */}
            {universoCycles.length > 0 ? (
              <div className={cn(
                'h-full rounded-xl border',
                compactProgressCards ? 'p-3.5 lg:min-h-[132px]' : 'p-4 lg:min-h-[142px]',
                universoCycles.some((c) => c.isActive && c.capReached)
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border bg-card',
              )}>
                <div className="mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{cashbackRules.universo.sourceName}</span>
                </div>
                <div className={cn(
                  compactProgressCards ? 'grid gap-2.5' : 'grid gap-3',
                  universoCycles.length > 1
                    ? 'grid-cols-2'
                    : 'grid-cols-1',
                )}>
                  {universoCycles.map((cycle) => (
                    <div key={cycle.cycleKey}>
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        <span className={cn(
                          'whitespace-nowrap rounded-full border border-border bg-muted/60 py-0.5 font-medium text-muted-foreground',
                          compactProgressCards ? 'px-1 text-[8px]' : 'px-1.5 text-[9px]',
                        )}>
                          {cycle.cycleLabel}
                        </span>
                        {cycle.isActive && !cycle.capReached ? (
                          <span className={cn(
                            'whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 py-0.5 font-medium text-primary',
                            compactProgressCards ? 'px-1 text-[8px]' : 'px-1.5 text-[9px]',
                          )}>
                            {t('cashbackHero.cardWidget.universoActiveBadge')}
                          </span>
                        ) : null}
                        {cycle.capReached ? (
                          <span className={cn(
                            'whitespace-nowrap rounded-full border border-amber-500/40 bg-amber-500/10 py-0.5 font-bold text-amber-600 dark:text-amber-400',
                            compactProgressCards ? 'px-1 text-[7px]' : 'px-1.5 text-[8px]',
                          )}>
                            {t('cashbackHero.cardWidget.universoCapReachedBadge')}
                          </span>
                        ) : null}
                      </div>
                      <p className={cn('mb-1 tabular-nums font-bold text-foreground', compactProgressCards ? 'text-sm' : 'text-base')}>
                        {formatCurrency(cycle.effectiveTotal, 'EUR')}
                        <span className={cn('ml-1 font-normal text-muted-foreground', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                          / {formatCurrency(universoCycleCapEur, 'EUR')}
                        </span>
                      </p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full transition-all', cycle.capReached ? 'bg-amber-500' : 'bg-primary/60')}
                          style={{ width: `${cycle.pct}%` }}
                        />
                      </div>
<p className={cn('mt-1 text-muted-foreground', compactProgressCards ? 'text-[9px]' : 'text-[10px]')}>
                        {cycle.capReached
                          ? t('cashbackHero.cardWidget.universoCapReachedFull', { cap: formatCurrency(universoCycleCapEur, 'EUR') })
                          : t('cashbackHero.cardWidget.monthlyRemainingCashback', { amount: formatCurrency(cycle.remaining, 'EUR') })}
                      </p>
                      {!cycle.capReached && cycle.remaining > 0 && cycle.isActive && (
                        <p className={cn('mt-1 text-sky-600 dark:text-sky-300', compactProgressCards ? 'text-[8px]' : 'text-[9px]')}>
                          💡 {t('cashbackHero.cardWidget.maxiSimulator', { amount: formatCurrency(Math.ceil(universoCycleCapEur / (universoRate || 0.01) - (cycle.effectiveTotal / (universoRate || 0.01))), 'EUR') })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        ) : null}

        {insights.length > 0 ? (
          <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
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
                    {visibleInsights.length}
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
                    {visibleInsights.length}
                  </span>
                </div>
                <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-3">
                  {insightGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label} <span className="ml-1 text-[10px]">({group.items.length})</span>
                      </div>
                      {group.items.map(({ line, isCardSpecific, priority }, index) => (
                        <div
                          key={`${group.key}-${line}-${index}`}
                          className={cn(
                            'group rounded-xl border bg-background/80 p-3 backdrop-blur-sm transition-colors',
                            isCardSpecific
                              ? 'border-primary/35 ring-1 ring-primary/15'
                              : 'border-border/70 hover:border-primary/35',
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              isCardSpecific
                                ? 'border border-primary/30 bg-primary/10 text-primary'
                                : 'border border-border bg-muted/60 text-muted-foreground',
                            )}>
                              {isCardSpecific ? <CreditCard className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                              {isCardSpecific ? t('cashbackHero.insights.cardRulePill') : t('cashbackHero.insights.generalPill')}
                            </span>
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              priority === 'high'
                                ? 'border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : priority === 'medium'
                                  ? 'border border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                  : 'border border-border bg-muted/60 text-muted-foreground',
                            )}>
                              {priority === 'high'
                                ? t('cashbackHero.insights.priorityHigh')
                                : priority === 'medium'
                                  ? t('cashbackHero.insights.priorityMedium')
                                  : t('cashbackHero.insights.priorityLow')}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2.5">
                            <p className="flex-1 text-sm leading-5 text-foreground/90">
                              {line.includes(':') ? (
                                <>
                                  <span className="font-semibold">{line.slice(0, line.indexOf(':'))}:</span>
                                  {line.slice(line.indexOf(':') + 1)}
                                </>
                              ) : line}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground"
                              title={t('cashbackHero.cardWidget.auditInfo')}
                              onClick={() => {
                                toast.info(`${t('cashbackHero.cardWidget.auditInfo')}: ${line}`);
                              }}
                            >
                              ℹ
                            </Button>
                          </div>
                        </div>
                      ))}
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
            <AppLoadingState label={t('common.loading')} variant="list" />
          ) : null}

          {!loading && filteredPurchases.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t('cashbackHero.noCompras')}
            </div>
          ) : !loading ? (
            filteredPurchases.slice(0, visibleCount).map((purchase) => {
              const isExpanded = Boolean(expandedIds[purchase.id]);
              const totalCashback = getEffectiveTotalCashback(purchase, cappedEntryAmounts);
              const effectiveEntries = new Map(getEffectiveEntryAmounts(purchase, cappedEntryAmounts).map((item) => [item.id, item.amount]));
              const purchaseNotes = stripCardFromNotes(purchase.notes);
              const purchaseCardUsed = extractCardFromNotes(purchase.notes);
              const componentSources = getCashbackComponentSources(purchase);
              const visibleComponentSources = componentSources.slice(0, 3);
              const hiddenComponentCount = Math.max(0, componentSources.length - visibleComponentSources.length);
              const hasStackedCashback = purchase.cashbackEntries.length > 1;

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
                          {purchase.isUnibanco && componentSources.length === 0 ? (
                            <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {t('cashbackHero.badges.unibanco')}
                            </span>
                          ) : null}
                          {hasStackedCashback ? (
                            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              {t('cashbackHero.badges.stacked', { count: String(purchase.cashbackEntries.length) })}
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
                        {componentSources.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {t('cashbackHero.cashback.componentsLabel')}:
                            </span>
                            {visibleComponentSources.map((source) => (
                              <span
                                key={`${purchase.id}-${source}`}
                                className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                              >
                                {source}
                              </span>
                            ))}
                            {hiddenComponentCount > 0 ? (
                              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {t('cashbackHero.cashback.componentsMore', { count: hiddenComponentCount })}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {/* Right side: Highlight (Badge + Amount) */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <CashbackBadge purchase={purchase} cappedEntryAmounts={cappedEntryAmounts} />
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
                          {purchase.cashbackEntries.map((entry) => {
                            const rawEntryAmount = getEntryAmountForDisplay(entry);
                            const universoPotentialAmount = universoSourceRegex.test(entry.source)
                              ? getUniversoPotentialAmount(purchase, entry, universoRate)
                              : rawEntryAmount;
                            const effectiveEntryAmount = effectiveEntries.get(entry.id) ?? entry.amount;
                            const isUniversoCapped = universoSourceRegex.test(entry.source)
                              && effectiveEntryAmount + 0.0001 < universoPotentialAmount;

                            return (
                            <div key={entry.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{entry.source}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatDateLabel(entry.dateReceived)}</span>
                                  {isUniversoCapped ? (
                                    <span className="rounded-md border border-warning/35 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                      {t('cashbackHero.cashback.universoCapReachedLabel')}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end leading-tight">
                                  <p className="text-sm font-semibold text-primary">+{formatCurrency(effectiveEntryAmount, 'EUR')}</p>
                                  {isUniversoCapped ? (
                                    <p className="text-[11px] text-muted-foreground line-through">
                                      +{formatCurrency(universoPotentialAmount, 'EUR')}
                                    </p>
                                  ) : null}
                                </div>
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
                            );
                          })}
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
        unibancoCardName={cashbackRules.unibanco.cardName}
        cetelemCardName={cashbackRules.cetelem.cardName}
        activeContracts={activeContracts}
        merchantCategoryHints={merchantCategoryHints}
        merchantSuggestions={merchantSuggestions}
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

          if (purchasePayload.isCetelem) {
            await syncCetelemPurchase(savedPurchase.id, savedPurchase, cashbackRules.cetelem);
          }

          toast.success(t('cashbackHero.addPurchase'));
        }}
      />

      <EditPurchaseDialog
        purchase={editingPurchase}
        cardOptions={cards}
        unibancoCardName={cashbackRules.unibanco.cardName}
        cetelemCardName={cashbackRules.cetelem.cardName}
        merchantCategoryHints={merchantCategoryHints}
        merchantSuggestions={merchantSuggestions}
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

          if (editingPurchase.isCetelem || payload.isCetelem) {
            const updatedPurchase = purchases.find((p) => p.id === editingPurchase.id);
            if (updatedPurchase) {
              await syncCetelemPurchase(editingPurchase.id, updatedPurchase, cashbackRules.cetelem);
            }
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

      {confirmDialog}
    </div>
  );
}

function AddPurchaseDialog({
  open,
  cardOptions,
  unibancoCardName,
  cetelemCardName,
  activeContracts,
  merchantCategoryHints,
  merchantSuggestions,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  cardOptions: string[];
  unibancoCardName: string;
  cetelemCardName: string;
  activeContracts: Contract[];
  merchantCategoryHints: MerchantCategoryHint[];
  merchantSuggestions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    merchant: string;
    category: CashbackCategory;
    date: string;
    amount: number;
    notes?: string;
    isReferral?: boolean;
    isUnibanco?: boolean;
    isCetelem?: boolean;
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
  const [categoryEditedManually, setCategoryEditedManually] = useState(false);

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
        isUnibanco: !isReferral && isCardMatch(cardUsed, unibancoCardName),
        isCetelem: !isReferral && isCardMatch(cardUsed, cetelemCardName),
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
    setCategoryEditedManually(false);
    setLinkToHomeExpense(false);
    setLinkedContractId(activeContracts[0]?.id ?? '');
    onOpenChange(false);
  };

  const handleMerchantChange = (value: string) => {
    setMerchant(value);

    if (categoryEditedManually) return;

    const suggested = inferCategoryFromMerchant(value, merchantCategoryHints);
    if (suggested && suggested !== category) {
      setCategory(suggested);
    }
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
            <Input
              value={merchant}
              onChange={(event) => handleMerchantChange(event.target.value)}
              placeholder={t('cashbackHero.form.merchant')}
              list="cashback-merchant-suggestions-add"
            />
            <datalist id="cashback-merchant-suggestions-add">
              {merchantSuggestions.map((suggestion) => (
                <option key={`add-${suggestion}`} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.category')}</label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as CashbackCategory);
                  setCategoryEditedManually(true);
                }}
              >
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
  const CURVE_CASH_DEFAULT_GBP_RATE = 0;
  const WHITEBIT_ASSETS = ['BTC', 'ETH'] as const;
  const availableSources = useMemo(() => {
    const hasBybit = sources.some((value) => /bybit/i.test(value));
    const hasWhitebit = sources.some((value) => /white\s*bit/i.test(value));
    let values = hasBybit ? sources : [...sources, 'Bybit'];
    if (!hasWhitebit) values = [...values, 'WhiteBIT'];
    if (editingEntry?.source && !values.includes(editingEntry.source)) {
      values = [editingEntry.source, ...values];
    }
    return [...new Set(values)];
  }, [sources, editingEntry?.source]);
  const getWhitebitAssetFromSource = useCallback((value: string): (typeof WHITEBIT_ASSETS)[number] => {
    const match = value.match(/white\s*bit\s*(btc|eth)?/i);
    const parsed = match?.[1]?.toUpperCase();
    return parsed === 'ETH' ? 'ETH' : 'BTC';
  }, []);
  const getSourceValueForSelect = useCallback((value: string): string => {
    if (/white\s*bit/i.test(value)) {
      return availableSources.find((candidate) => /white\s*bit/i.test(candidate)) ?? 'WhiteBIT';
    }
    if (/bybit/i.test(value)) {
      return availableSources.find((candidate) => /bybit/i.test(candidate)) ?? 'Bybit';
    }
    if (/curve/i.test(value)) {
      return availableSources.find((candidate) => /curve/i.test(candidate)) ?? value;
    }
    return value.trim() ? value : (availableSources[0] ?? '');
  }, [availableSources]);

  const [source, setSource] = useState(() => availableSources[0] ?? '');
  const [amount, setAmount] = useState('');
  const [points, setPoints] = useState('');
  const [gbpAmount, setGbpAmount] = useState('');
  const [whitebitAsset, setWhitebitAsset] = useState<(typeof WHITEBIT_ASSETS)[number]>('BTC');
  const [whitebitAmount, setWhitebitAmount] = useState('');
  const [gbpEurRate, setGbpEurRate] = useState(CURVE_CASH_DEFAULT_GBP_RATE);
  const [dateReceived, setDateReceived] = useState(format(new Date(), 'yyyy-MM-dd'));
  const isEditing = editingEntry !== null;
  const isBybitSource = /bybit/i.test(source);
  const isCurveCashSource = /curve/i.test(source);
  const isWhitebitSource = /white\s*bit/i.test(source);
  const isAutoCalculatedAmount = isBybitSource || isCurveCashSource || isWhitebitSource;
  const { pricesEur: cryptoPricesEur } = useCryptoQuotes(isWhitebitSource && open);
  const whitebitEurRate = cryptoPricesEur[whitebitAsset] ?? 0;

  // Reset source when sources list changes and current is gone
  useEffect(() => {
    if (!availableSources.includes(source)) {
      setSource(availableSources[0] ?? '');
    }
  }, [availableSources, source]);

  useEffect(() => {
    if (!open) return;

    if (editingEntry) {
      setSource(getSourceValueForSelect(editingEntry.source));
      setAmount(String(editingEntry.amount));
      if (/bybit/i.test(editingEntry.source)) {
        if (editingEntry.points != null) {
          setPoints(String(editingEntry.points));
        } else {
          const inferredPoints = Math.round((editingEntry.amount / BYBIT_EUR_PER_POINT) * 100) / 100;
          setPoints(String(inferredPoints));
        }
        setGbpAmount('');
        setWhitebitAmount('');
      } else if (/curve/i.test(editingEntry.source)) {
        setPoints('');
        setGbpAmount(editingEntry.points != null ? String(editingEntry.points) : '');
        setWhitebitAmount('');
      } else if (/white\s*bit/i.test(editingEntry.source)) {
        setPoints('');
        setGbpAmount('');
        setWhitebitAsset(getWhitebitAssetFromSource(editingEntry.source));
        setWhitebitAmount(editingEntry.points != null ? String(editingEntry.points) : '');
      } else {
        setPoints('');
        setGbpAmount('');
        setWhitebitAmount('');
      }
      setDateReceived(editingEntry.dateReceived);
      return;
    }

    setSource((prev) => (availableSources.includes(prev) ? prev : (availableSources[0] ?? '')));
    setAmount('');
    setPoints('');
    setGbpAmount('');
    setWhitebitAsset('BTC');
    setWhitebitAmount('');
    setDateReceived(format(new Date(), 'yyyy-MM-dd'));
  }, [open, editingEntry, availableSources, BYBIT_EUR_PER_POINT, getSourceValueForSelect, getWhitebitAssetFromSource]);

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

  // Fetch GBP/EUR rate for selected date using a CORS-enabled endpoint.
  useEffect(() => {
    if (!isCurveCashSource || !open) return;
    let cancelled = false;

    const today = format(new Date(), 'yyyy-MM-dd');
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateReceived) ? dateReceived : today;
    const endpointTag = normalizedDate <= today ? normalizedDate : 'latest';
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${endpointTag}/v1/currencies/gbp.json`;

    fetch(url)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!cancelled && typeof data === 'object' && data !== null && 'gbp' in data) {
          const gbp = (data as { gbp?: Record<string, number> }).gbp;
          const eur = gbp?.eur;
          if (typeof eur === 'number' && Number.isFinite(eur) && eur > 0) {
            setGbpEurRate(eur);
            return;
          }
        }
        setGbpEurRate(0);
      })
      .catch((err) => {
        console.warn('Failed to fetch GBP/EUR rate:', err);
        fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.json')
          .then((res) => res.json())
          .then((data: unknown) => {
            if (!cancelled && typeof data === 'object' && data !== null && 'gbp' in data) {
              const gbp = (data as { gbp?: Record<string, number> }).gbp;
              const eur = gbp?.eur;
              if (typeof eur === 'number' && Number.isFinite(eur) && eur > 0) {
                setGbpEurRate(eur);
                return;
              }
            }
            setGbpEurRate(0);
          })
          .catch(() => { setGbpEurRate(0); });
      });

    return () => { cancelled = true; };
  }, [isCurveCashSource, open, dateReceived]);

  // Convert GBP → EUR automatically for Curve Cash
  useEffect(() => {
    if (!isCurveCashSource) return;
    const parsed = Number(gbpAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || gbpEurRate <= 0) {
      if (gbpAmount.trim() !== '') setAmount('');
      return;
    }
    const converted = Math.round(parsed * gbpEurRate * 100) / 100;
    const maxAmount = targetPurchase && !targetPurchase.isReferral ? targetPurchase.amount : Number.POSITIVE_INFINITY;
    setAmount(Math.min(converted, maxAmount).toFixed(2));
  }, [isCurveCashSource, gbpAmount, gbpEurRate, targetPurchase]);

  // Convert WhiteBIT crypto units (BTC/ETH) → EUR automatically
  useEffect(() => {
    if (!isWhitebitSource) return;
    const parsed = Number(whitebitAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || whitebitEurRate <= 0) {
      if (whitebitAmount.trim() !== '') setAmount('');
      return;
    }
    const converted = Math.round(parsed * whitebitEurRate * 100) / 100;
    const maxAmount = targetPurchase && !targetPurchase.isReferral ? targetPurchase.amount : Number.POSITIVE_INFINITY;
    setAmount(Math.min(converted, maxAmount).toFixed(2));
  }, [isWhitebitSource, whitebitAmount, whitebitEurRate, targetPurchase]);

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
    } else if (isWhitebitSource && whitebitAmount.trim() !== '') {
      const parsedCrypto = Number(whitebitAmount.replace(',', '.'));
      if (!Number.isFinite(parsedCrypto) || parsedCrypto <= 0) {
        toast.error(t('cashbackHero.cashback.whitebitCryptoAmountLabel'));
        return;
      }
      if (!(whitebitEurRate > 0)) {
        toast.error(t('cashbackHero.cashback.whitebitQuoteUnavailable'));
        return;
      }
      parsedPoints = parsedCrypto;
      parsedAmount = Math.round(parsedCrypto * whitebitEurRate * 100) / 100;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('cashbackHero.form.amount'));
      return;
    }

    if (targetPurchase && !targetPurchase.isReferral) {
      parsedAmount = Math.min(parsedAmount, targetPurchase.amount);
    }

    const sourceToPersist = isWhitebitSource ? `WhiteBIT ${whitebitAsset}` : source;

    try {
      await onSubmit({ source: sourceToPersist, amount: parsedAmount, points: parsedPoints, dateReceived });
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

  const amountField = (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.amount')}</label>
      <Input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="0.00"
        disabled={isAutoCalculatedAmount}
        aria-readonly={isAutoCalculatedAmount}
        className={isAutoCalculatedAmount ? 'bg-muted/50 text-foreground font-semibold tabular-nums disabled:opacity-100 cursor-not-allowed' : undefined}
      />
      {isBybitSource ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.bybitConvertedHint')}</p>
      ) : null}
      {isCurveCashSource ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.curveCashConvertedHint')} {gbpEurRate > 0 ? `• 1 £ ≈ €${gbpEurRate.toFixed(4)}` : null}</p>
      ) : null}
      {isWhitebitSource ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('cashbackHero.cashback.whitebitConvertedHint')} {whitebitEurRate > 0 ? `• 1 ${whitebitAsset} ≈ €${whitebitEurRate.toFixed(2)}` : null}
        </p>
      ) : null}
    </div>
  );

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

          {isBybitSource ? amountField : null}

          {isCurveCashSource ? (
            <>
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
              {amountField}
            </>
          ) : null}

          {isWhitebitSource ? (
            <>
              <div className="space-y-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.whitebitAssetLabel')}</label>
                <Select value={whitebitAsset} onValueChange={(value) => setWhitebitAsset(value as (typeof WHITEBIT_ASSETS)[number])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WHITEBIT_ASSETS.map((asset) => (
                      <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.cashback.whitebitCryptoAmountLabel')}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={whitebitAmount}
                    onChange={(event) => setWhitebitAmount(event.target.value)}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t('cashbackHero.cashback.whitebitCryptoAmountHint')}</p>
                </div>
              </div>
              {amountField}
            </>
          ) : null}

          {!isBybitSource && !isCurveCashSource && !isWhitebitSource ? amountField : null}

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
  unibancoCardName,
  cetelemCardName,
  merchantCategoryHints,
  merchantSuggestions,
  onOpenChange,
  onSubmit,
}: {
  purchase: CashbackPurchase | null;
  cardOptions: string[];
  unibancoCardName: string;
  cetelemCardName: string;
  merchantCategoryHints: MerchantCategoryHint[];
  merchantSuggestions: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { merchant: string; category: CashbackCategory; date: string; amount: number; notes?: string; isReferral?: boolean; isUnibanco?: boolean; isCetelem?: boolean }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<CashbackCategory>('other');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cardUsed, setCardUsed] = useState('');
  const [isReferral, setIsReferral] = useState(false);
  const [categoryEditedManually, setCategoryEditedManually] = useState(false);
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
      setCategoryEditedManually(false);
    }
  }, [purchase]);

  const handleMerchantChange = (value: string) => {
    setMerchant(value);

    if (categoryEditedManually) return;

    const suggested = inferCategoryFromMerchant(value, merchantCategoryHints);
    if (suggested && suggested !== category) {
      setCategory(suggested);
    }
  };

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
        isUnibanco: !isReferral && isCardMatch(cardUsed, unibancoCardName),
        isCetelem: !isReferral && isCardMatch(cardUsed, cetelemCardName),
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
            <Input
              value={merchant}
              onChange={(event) => handleMerchantChange(event.target.value)}
              placeholder={t('cashbackHero.form.merchant')}
              list="cashback-merchant-suggestions-edit"
            />
            <datalist id="cashback-merchant-suggestions-edit">
              {merchantSuggestions.map((suggestion) => (
                <option key={`edit-${suggestion}`} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('cashbackHero.form.category')}</label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as CashbackCategory);
                  setCategoryEditedManually(true);
                }}
              >
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

export default CashbackHeroPage;