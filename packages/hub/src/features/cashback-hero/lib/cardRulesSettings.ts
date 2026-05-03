import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';
const STORAGE_KEY = 'd12-cashback-card-rules';

export type UnibancoCardRules = {
  cardName: string;
  statementDay: number;
  annualCashbackCap: number;
  campaignStart: string;
  campaignMonths: number;
  topTierSpendCap: number;
};

export type CetelemCardRules = {
  cardName: string;
  statementDay: number;
  cashbackRate: number;
  monthlyCashbackCap: number;
  annualCashbackCap: number;
};

export type UniversoCardRules = {
  sourceName: string;
  statementDay: number;
  cashbackRate: number;
  cycleCashbackCap: number;
};

export const BYBIT_GBIT_CARD_OPTIONS = ['Cetelem', 'Bybit Minina', 'Unibanco'] as const;
export type BybitGbitCardOption = typeof BYBIT_GBIT_CARD_OPTIONS[number];

export const BYBIT_PURCHASE_TYPE_OPTIONS = [
  'tvde',
  'streaming',
  'electricCharging',
  'supermarket',
  'restaurant',
  'fuel',
  'travel',
  'shopping',
  'services',
  'health',
  'other',
] as const;

export type BybitGbitRules = {
  nunoTierTarget: number;
  mininaTierTarget: number;
  cetelemEligibleTypes: string[];
  cardPriority: string[];
};

export type CashbackCardRulesSettings = {
  unibanco: UnibancoCardRules;
  cetelem: CetelemCardRules;
  universo: UniversoCardRules;
  bybit: BybitGbitRules;
};

export const DEFAULT_CASHBACK_CARD_RULES: CashbackCardRulesSettings = {
  unibanco: {
    cardName: 'Unibanco',
    statementDay: 1,
    annualCashbackCap: 200,
    campaignStart: '2026-04-01',
    campaignMonths: 12,
    topTierSpendCap: 500,
  },
  cetelem: {
    cardName: 'Cetelem',
    statementDay: 1,
    cashbackRate: 0.03,
    monthlyCashbackCap: 15,
    annualCashbackCap: 120,
  },
  universo: {
    sourceName: 'Universo',
    statementDay: 15,
    cashbackRate: 0.05,
    cycleCashbackCap: 10,
  },
  bybit: {
    nunoTierTarget: 3500,
    mininaTierTarget: 250,
    cetelemEligibleTypes: ['tvde', 'streaming', 'electricCharging', 'supermarket', 'restaurant', 'fuel'],
    cardPriority: ['Cetelem', 'Bybit Minina', 'Unibanco'],
  },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function sanitizeName(value: string | undefined, fallback: string): string {
  const clean = (value ?? '').trim();
  return clean || fallback;
}

function normalizeSettings(raw: Partial<CashbackCardRulesSettings> | null | undefined): CashbackCardRulesSettings {
  const unibanco = raw?.unibanco ?? {};
  const cetelem = raw?.cetelem ?? {};
  const universo = raw?.universo ?? {};
  const bybit = raw?.bybit ?? {};

  return {
    unibanco: {
      cardName: sanitizeName(unibanco.cardName, DEFAULT_CASHBACK_CARD_RULES.unibanco.cardName),
      statementDay: Math.round(clamp(unibanco.statementDay ?? DEFAULT_CASHBACK_CARD_RULES.unibanco.statementDay, 1, 31)),
      annualCashbackCap: clamp(unibanco.annualCashbackCap ?? DEFAULT_CASHBACK_CARD_RULES.unibanco.annualCashbackCap, 0, 100000),
      campaignStart: normalizeDate(unibanco.campaignStart, DEFAULT_CASHBACK_CARD_RULES.unibanco.campaignStart),
      campaignMonths: Math.round(clamp(unibanco.campaignMonths ?? DEFAULT_CASHBACK_CARD_RULES.unibanco.campaignMonths, 1, 120)),
      topTierSpendCap: clamp(unibanco.topTierSpendCap ?? DEFAULT_CASHBACK_CARD_RULES.unibanco.topTierSpendCap, 0, 100000),
    },
    cetelem: {
      cardName: sanitizeName(cetelem.cardName, DEFAULT_CASHBACK_CARD_RULES.cetelem.cardName),
      statementDay: Math.round(clamp(cetelem.statementDay ?? DEFAULT_CASHBACK_CARD_RULES.cetelem.statementDay, 1, 31)),
      cashbackRate: clamp(cetelem.cashbackRate ?? DEFAULT_CASHBACK_CARD_RULES.cetelem.cashbackRate, 0, 1),
      monthlyCashbackCap: clamp(cetelem.monthlyCashbackCap ?? DEFAULT_CASHBACK_CARD_RULES.cetelem.monthlyCashbackCap, 0, 100000),
      annualCashbackCap: clamp(cetelem.annualCashbackCap ?? DEFAULT_CASHBACK_CARD_RULES.cetelem.annualCashbackCap, 0, 100000),
    },
    universo: {
      sourceName: sanitizeName(universo.sourceName, DEFAULT_CASHBACK_CARD_RULES.universo.sourceName),
      statementDay: Math.round(clamp(universo.statementDay ?? DEFAULT_CASHBACK_CARD_RULES.universo.statementDay, 1, 31)),
      cashbackRate: clamp(universo.cashbackRate ?? DEFAULT_CASHBACK_CARD_RULES.universo.cashbackRate, 0, 1),
      cycleCashbackCap: clamp(universo.cycleCashbackCap ?? DEFAULT_CASHBACK_CARD_RULES.universo.cycleCashbackCap, 0, 100000),
    },
    bybit: {
      nunoTierTarget: clamp(bybit.nunoTierTarget ?? DEFAULT_CASHBACK_CARD_RULES.bybit.nunoTierTarget, 0, 1000000),
      mininaTierTarget: clamp(bybit.mininaTierTarget ?? DEFAULT_CASHBACK_CARD_RULES.bybit.mininaTierTarget, 0, 1000000),
      cetelemEligibleTypes: Array.isArray(bybit.cetelemEligibleTypes)
        ? bybit.cetelemEligibleTypes.filter((t): t is string => typeof t === 'string')
        : DEFAULT_CASHBACK_CARD_RULES.bybit.cetelemEligibleTypes,
      cardPriority: Array.isArray(bybit.cardPriority)
        ? bybit.cardPriority.filter((c): c is string => typeof c === 'string')
        : DEFAULT_CASHBACK_CARD_RULES.bybit.cardPriority,
    },
  };
}

function readLocal(): CashbackCardRulesSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CASHBACK_CARD_RULES;
    return normalizeSettings(JSON.parse(raw) as Partial<CashbackCardRulesSettings>);
  } catch {
    return DEFAULT_CASHBACK_CARD_RULES;
  }
}

function writeLocal(value: CashbackCardRulesSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export async function loadCashbackCardRulesSettings(): Promise<CashbackCardRulesSettings> {
  const local = readLocal();
  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('cashback_card_rules')
      .eq('id', GLOBAL_SETTINGS_ID)
      .maybeSingle();

    if (error) throw error;
    const remoteRaw = (data as { cashback_card_rules?: unknown } | null)?.cashback_card_rules;
    if (!remoteRaw || typeof remoteRaw !== 'object') return local;

    const remote = normalizeSettings(remoteRaw as Partial<CashbackCardRulesSettings>);
    writeLocal(remote);
    return remote;
  } catch (error) {
    console.error('Failed to load cashback card rules from database, using local fallback:', error);
    return local;
  }
}

export async function persistCashbackCardRulesSettings(value: CashbackCardRulesSettings): Promise<void> {
  const normalized = normalizeSettings(value);
  writeLocal(normalized);
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        { id: GLOBAL_SETTINGS_ID, cashback_card_rules: normalized, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
    if (error) throw error;
  } catch (error) {
    console.error('Failed to persist cashback card rules:', error);
  }
}
