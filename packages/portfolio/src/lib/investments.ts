import { Investment, InvestmentCategory, InvestmentType, MonthlySnapshot } from "@/types/investment";
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

function normalizeCategory(value: string): InvestmentCategory {
  return value === "short-term" || value === "long-term" ? value : "long-term";
}

function normalizeType(value: string): InvestmentType {
  if (value === "cash" || value === "etf" || value === "crypto" || value === "p2p" || value === "ppr") {
    return value;
  }

  return "cash";
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
