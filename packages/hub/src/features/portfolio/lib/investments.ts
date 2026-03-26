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

function normalizeCategory(value: string): InvestmentCategory {
  return value === "short-term" || value === "long-term" ? value : "long-term";
}

function normalizeType(value: string): InvestmentType {
  if (value === "cash" || value === "aforro" || value === "etf" || value === "crypto" || value === "p2p" || value === "ppr") {
    return value;
  }

  return "cash";
}

function normalizeEarningKind(value: string): PortfolioEarningKind {
  return value === "cashback" || value === "survey" || value === "crypto_cashback"
    ? value
    : "cashback";
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
    kind: normalizeEarningKind(row.kind),
    date: row.date,
    amountEur: Number(row.amount_eur) || 0,
    cryptoAsset: row.crypto_asset === "BTC" || row.crypto_asset === "ETH" ? row.crypto_asset : undefined,
    cryptoUnits: row.crypto_units != null ? Number(row.crypto_units) : null,
    spotEurAtEarned: row.spot_eur_at_earned != null ? Number(row.spot_eur_at_earned) : null,
    notes: row.notes ?? undefined,
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

  const { data, error } = await supabase
    .from("portfolio_earnings")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error loading portfolio earnings:", error);
    return null;
  }

  return (data ?? []).map((row) => mapPortfolioEarningRow(row as PortfolioEarningRow));
}

export async function upsertPortfolioEarningsInDb(earnings: PortfolioEarning[]): Promise<void> {
  if (!supabase) return;

  const payload = earnings.map((item) => ({
    id: item.id,
    title: item.title,
    provider: item.provider ?? null,
    kind: item.kind,
    date: item.date,
    amount_eur: item.amountEur,
    crypto_asset: item.cryptoAsset ?? null,
    crypto_units: item.cryptoUnits ?? null,
    spot_eur_at_earned: item.spotEurAtEarned ?? null,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));

  const { error } = await supabase
    .from("portfolio_earnings")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Error upserting portfolio earnings:", error);
  }
}

export async function deletePortfolioEarningFromDb(id: string): Promise<void> {
  if (!supabase) return;

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
