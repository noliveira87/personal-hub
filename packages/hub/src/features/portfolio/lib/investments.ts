import { Investment, InvestmentCategory, InvestmentType, MonthlySnapshot, PortfolioEarning, PortfolioEarningKind } from "@/features/portfolio/types/investment";
import { supabase } from "@/lib/supabase";

type InvestmentRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  invested_amount: number;
  current_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MonthlySnapshotRow = {
  month: string;
  total_invested: number;
  total_current_value: number;
  total_profit_loss: number;
  overall_return_pct: number;
  monthly_inflow: number;
  monthly_performance: number;
  monthly_return_pct: number;
  updated_at: string;
};

type PortfolioEarningRow = {
  id: string;
  title: string;
  provider: string | null;
  kind: string;
  date: string;
  amount_eur: number;
  crypto_asset: string | null;
  crypto_units: number | null;
  spot_eur_at_earned: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PortfolioCardOrderRow = {
  category: string;
  ordered_ids: string[] | null;
  updated_at: string;
};

type CashbackHeroEntryRow = {
  id: string;
  source: string;
  amount: number | null;
  points: number | null;
  date_received: string;
  created_at: string;
  updated_at: string;
  cashback_purchases: {
    merchant: string;
  } | null;
};

const SOCIAL_MEDIA_NOTE_PREFIX = "KIND:social_media";
const CASHBACK_HERO_CUTOFF_DATE = "2026-04-01";
const CASHBACK_HERO_ENTRY_PREFIX = "cashback-entry:";
const CASHBACK_HERO_CUTOFF_TS = Date.parse(`${CASHBACK_HERO_CUTOFF_DATE}T00:00:00Z`);

function parseWhitebitAsset(source?: string | null): "BTC" | "ETH" | null {
  if (!source) return null;
  if (!/white\s*bit/i.test(source)) return null;
  if (/eth/i.test(source)) return "ETH";
  if (/btc/i.test(source)) return "BTC";
  return "BTC";
}

function isOnOrAfterCashbackCutoff(rawDate?: string | null): boolean {
  if (!rawDate) return false;
  const normalized = rawDate.length === 10 ? `${rawDate}T00:00:00Z` : rawDate;
  const parsedTs = Date.parse(normalized);
  return Number.isFinite(parsedTs) && parsedTs >= CASHBACK_HERO_CUTOFF_TS;
}

function normalizeCategory(value: string): InvestmentCategory {
  return value === "short-term" || value === "long-term" ? value : "long-term";
}

function normalizeType(value: string): InvestmentType {
  if (value === "cash" || value === "aforro" || value === "etf" || value === "crypto" || value === "p2p" || value === "ppr") {
    return value;
  }

  return "cash";
}

function normalizeEarningKind(value: string, notes?: string | null): PortfolioEarningKind {
  if ((notes ?? "").startsWith(SOCIAL_MEDIA_NOTE_PREFIX)) {
    return "social_media";
  }

  return value === "cashback" || value === "survey" || value === "crypto_cashback" || value === "social_media" || value === "dividend"
    ? value
    : "cashback";
}

function encodeEarningKind(kind: PortfolioEarningKind, notes?: string | null) {
  const cleanNotes = notes ?? null;

  if (kind === "social_media") {
    return {
      dbKind: "survey",
      dbNotes: cleanNotes ? `${SOCIAL_MEDIA_NOTE_PREFIX}\n${cleanNotes}` : SOCIAL_MEDIA_NOTE_PREFIX,
    };
  }

  return {
    dbKind: kind,
    dbNotes: cleanNotes,
  };
}

function decodeEarningNotes(notes?: string | null) {
  if (!notes) return undefined;
  if (!notes.startsWith(SOCIAL_MEDIA_NOTE_PREFIX)) return notes;
  const stripped = notes.slice(SOCIAL_MEDIA_NOTE_PREFIX.length).replace(/^\n/, "").trim();
  return stripped || undefined;
}

function mapInvestmentRow(row: InvestmentRow): Investment {
  return {
    id: row.id,
    name: row.name,
    category: normalizeCategory(row.category),
    type: normalizeType(row.type),
    investedAmount: Number(row.invested_amount) || 0,
    currentValue: Number(row.current_value) || 0,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshotRow(row: MonthlySnapshotRow): MonthlySnapshot {
  return {
    month: row.month,
    totalInvested: Number(row.total_invested) || 0,
    totalCurrentValue: Number(row.total_current_value) || 0,
    totalProfitLoss: Number(row.total_profit_loss) || 0,
    overallReturnPct: Number(row.overall_return_pct) || 0,
    monthlyInflow: Number(row.monthly_inflow) || 0,
    monthlyPerformance: Number(row.monthly_performance) || 0,
    monthlyReturnPct: Number(row.monthly_return_pct) || 0,
    updatedAt: row.updated_at,
  };
}

function mapPortfolioEarningRow(row: PortfolioEarningRow): PortfolioEarning {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider ?? undefined,
    kind: normalizeEarningKind(row.kind, row.notes),
    date: row.date,
    amountEur: Number(row.amount_eur) || 0,
    cryptoAsset: row.crypto_asset === "BTC" || row.crypto_asset === "ETH" ? row.crypto_asset : undefined,
    cryptoUnits: row.crypto_units != null ? Number(row.crypto_units) : null,
    spotEurAtEarned: row.spot_eur_at_earned != null ? Number(row.spot_eur_at_earned) : null,
    notes: decodeEarningNotes(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadInvestmentsFromDb(): Promise<Investment[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("portfolio_investments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading investments:", error);
    return null;
  }

  return (data ?? []).map((row) => mapInvestmentRow(row as InvestmentRow));
}

export async function upsertInvestmentsInDb(investments: Investment[]): Promise<void> {
  if (!supabase) return;

  if (!investments.length) {
    const { error } = await supabase
      .from("portfolio_investments")
      .delete()
      .neq("id", "");

    if (error) {
      console.error("Error clearing investments:", error);
    }

    return;
  }

  const payload = investments.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type,
    invested_amount: item.investedAmount,
    current_value: item.currentValue,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));

  const { error } = await supabase
    .from("portfolio_investments")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Error upserting investments:", error);
  }
}

export async function deleteInvestmentFromDb(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("portfolio_investments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting investment:", error);
  }
}

export async function loadMonthlySnapshotsFromDb(): Promise<MonthlySnapshot[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("portfolio_monthly_snapshots")
    .select("*")
    .order("month", { ascending: true });

  if (error) {
    console.error("Error loading monthly snapshots:", error);
    return null;
  }

  return (data ?? []).map((row) => mapSnapshotRow(row as MonthlySnapshotRow));
}

export async function upsertMonthlySnapshotsInDb(snapshots: MonthlySnapshot[]): Promise<void> {
  if (!supabase) return;

  if (!snapshots.length) return;

  const payload = snapshots.map((item) => ({
    month: item.month,
    total_invested: item.totalInvested,
    total_current_value: item.totalCurrentValue,
    total_profit_loss: item.totalProfitLoss,
    overall_return_pct: item.overallReturnPct,
    monthly_inflow: item.monthlyInflow,
    monthly_performance: item.monthlyPerformance,
    monthly_return_pct: item.monthlyReturnPct,
    updated_at: item.updatedAt,
  }));

  const { error } = await supabase
    .from("portfolio_monthly_snapshots")
    .upsert(payload, { onConflict: "month" });

  if (error) {
    console.error("Error upserting monthly snapshots:", error);
  }
}

export async function loadPortfolioEarningsFromDb(): Promise<PortfolioEarning[] | null> {
  if (!supabase) return null;

  const pageSize = 1000;
  let from = 0;
  const rows: PortfolioEarningRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("portfolio_earnings")
      .select("*")
      .order("date", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error loading portfolio earnings:", error);
      return null;
    }

    if (!data?.length) break;

    rows.push(...(data as PortfolioEarningRow[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  const legacyRows = rows
    .map((row) => mapPortfolioEarningRow(row))
    .filter((earning) => {
      const isCashbackKind = earning.kind === "cashback" || earning.kind === "crypto_cashback";
      return !(isCashbackKind && isOnOrAfterCashbackCutoff(earning.date));
    });

  const { data: cashbackRows, error: cashbackError } = await supabase
    .from("cashback_entries")
    .select("id, source, amount, points, date_received, created_at, updated_at, cashback_purchases(merchant)")
    .gte("date_received", CASHBACK_HERO_CUTOFF_DATE)
    .order("date_received", { ascending: false });

  if (cashbackError) {
    console.error("Error loading Reward Wallet entries for earnings linkage:", cashbackError);
    return legacyRows;
  }

  const linkedCashbackRows = ((cashbackRows ?? []) as CashbackHeroEntryRow[])
    .map((row): PortfolioEarning => {
      const amountEur = Number(row.amount ?? 0);
      const parsedPoints = row.points != null ? Number(row.points) : null;
      const cryptoAsset = parseWhitebitAsset(row.source);
      const isWhitebitCrypto = cryptoAsset !== null && parsedPoints != null && Number.isFinite(parsedPoints) && parsedPoints > 0;

      return {
        id: `${CASHBACK_HERO_ENTRY_PREFIX}${row.id}`,
        title: row.cashback_purchases?.merchant ?? "Cashback",
        provider: row.source,
        kind: isWhitebitCrypto ? "crypto_cashback" : "cashback",
        externalSource: "cashback_hero",
        date: row.date_received,
        amountEur,
        notes: undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        cryptoAsset: isWhitebitCrypto ? cryptoAsset : undefined,
        cryptoUnits: isWhitebitCrypto ? parsedPoints : null,
        spotEurAtEarned: isWhitebitCrypto && parsedPoints ? Math.round((amountEur / parsedPoints) * 100) / 100 : null,
      };
    })
    .filter((entry) => entry.amountEur > 0);

  return [...legacyRows, ...linkedCashbackRows].sort((a, b) => b.date.localeCompare(a.date));
}

export async function upsertPortfolioEarningsInDb(earnings: PortfolioEarning[]): Promise<void> {
  if (!supabase) return;

  const localEarnings = earnings.filter((item) => (
    item.externalSource !== "cashback_hero" && !item.id.startsWith(CASHBACK_HERO_ENTRY_PREFIX)
  ));

  const payload = localEarnings.map((item) => {
    const { dbKind, dbNotes } = encodeEarningKind(item.kind, item.notes ?? null);

    return {
      id: item.id,
      title: item.title,
      provider: item.provider ?? null,
      kind: dbKind,
      date: item.date,
      amount_eur: item.amountEur,
      crypto_asset: item.cryptoAsset ?? null,
      crypto_units: item.cryptoUnits ?? null,
      spot_eur_at_earned: item.spotEurAtEarned ?? null,
      notes: dbNotes,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  });

  const { error } = await supabase
    .from("portfolio_earnings")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Error upserting portfolio earnings:", error);
  }
}

export async function deletePortfolioEarningFromDb(id: string): Promise<void> {
  if (!supabase) return;

  if (id.startsWith(CASHBACK_HERO_ENTRY_PREFIX)) {
    const cashbackEntryId = id.slice(CASHBACK_HERO_ENTRY_PREFIX.length);

    const { error } = await supabase
      .from("cashback_entries")
      .delete()
      .eq("id", cashbackEntryId);

    if (error) {
      console.error("Error deleting linked Reward Wallet cashback entry:", error);
    }

    return;
  }

  const { error } = await supabase
    .from("portfolio_earnings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting portfolio earning:", error);
  }
}

export async function loadPortfolioCardOrderFromDb(): Promise<{ shortTermOrder: string[]; longTermOrder: string[] } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("portfolio_card_order")
    .select("category, ordered_ids, updated_at");

  if (error) {
    console.error("Error loading portfolio card order:", error);
    return null;
  }

  const rows = (data ?? []) as PortfolioCardOrderRow[];
  const shortTermOrder = rows.find((row) => row.category === "short-term")?.ordered_ids ?? [];
  const longTermOrder = rows.find((row) => row.category === "long-term")?.ordered_ids ?? [];

  return { shortTermOrder, longTermOrder };
}

export async function upsertPortfolioCardOrderInDb(shortTermOrder: string[], longTermOrder: string[]): Promise<void> {
  if (!supabase) return;

  const payload = [
    {
      category: "short-term",
      ordered_ids: shortTermOrder,
      updated_at: new Date().toISOString(),
    },
    {
      category: "long-term",
      ordered_ids: longTermOrder,
      updated_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase
    .from("portfolio_card_order")
    .upsert(payload, { onConflict: "category" });

  if (error) {
    console.error("Error upserting portfolio card order:", error);
  }
}
