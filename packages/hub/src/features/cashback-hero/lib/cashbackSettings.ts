import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';
const STORAGE_KEY = 'd12-cashback-chart-months';

export type CashbackChartMonths = 3 | 6 | 12;

function normalizeChartMonths(value: number | null | undefined): CashbackChartMonths {
  if (value === 3 || value === 6 || value === 12) return value;
  return 12;
}

function readLocal(): CashbackChartMonths {
  return normalizeChartMonths(Number(localStorage.getItem(STORAGE_KEY) ?? 12));
}

function writeLocal(months: CashbackChartMonths): void {
  localStorage.setItem(STORAGE_KEY, String(months));
}

export async function loadCashbackChartMonths(): Promise<CashbackChartMonths> {
  const local = readLocal();
  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('cashback_chart_months')
      .eq('id', GLOBAL_SETTINGS_ID)
      .maybeSingle();

    if (error) throw error;
    if (!data) return local;

    const remote = normalizeChartMonths((data as { cashback_chart_months: number | null }).cashback_chart_months);
    writeLocal(remote);
    return remote;
  } catch (err) {
    console.error('Failed to load cashback chart months from database, using local fallback:', err);
    return local;
  }
}

export async function persistCashbackChartMonths(months: CashbackChartMonths): Promise<void> {
  writeLocal(months);
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        { id: GLOBAL_SETTINGS_ID, cashback_chart_months: months, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
    if (error) throw error;
  } catch (err) {
    console.error('Failed to persist cashback chart months:', err);
  }
}
