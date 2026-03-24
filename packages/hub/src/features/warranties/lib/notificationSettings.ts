import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';

const STORAGE_KEYS = {
  ENABLED: 'd12-warranties-enabled',
  ALERT_DAYS: 'd12-warranties-alert-days',
  ALERT_HISTORY: 'd12-warranty-alerts-sent',
} as const;

export interface WarrantyNotificationSettings {
  enabled: boolean;
  alertDays: number;
}

export type WarrantyAlertHistory = Record<string, string[]>;

type WarrantySettingsRow = {
  id: string;
  warranties_enabled: boolean | null;
  warranty_alert_days: number | null;
  warranty_alerts_sent: unknown;
  updated_at: string;
};

export const DEFAULT_WARRANTY_NOTIFICATION_SETTINGS: WarrantyNotificationSettings = {
  enabled: true,
  alertDays: 30,
};

function normalizeAlertDays(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.alertDays;
  return Math.max(1, Math.floor(Number(value)));
}

function normalizeAlertHistory(value: unknown): WarrantyAlertHistory {
  if (!value || typeof value !== 'object') return {};

  const result: WarrantyAlertHistory = {};
  for (const [key, rawEntries] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(rawEntries)) continue;
    result[key] = rawEntries.filter((entry): entry is string => typeof entry === 'string');
  }

  return result;
}

function readSettingsFromLocalStorage(): WarrantyNotificationSettings {
  return {
    enabled: localStorage.getItem(STORAGE_KEYS.ENABLED) !== 'false',
    alertDays: normalizeAlertDays(Number(localStorage.getItem(STORAGE_KEYS.ALERT_DAYS) ?? DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.alertDays)),
  };
}

function writeSettingsToLocalStorage(settings: WarrantyNotificationSettings): void {
  localStorage.setItem(STORAGE_KEYS.ENABLED, String(settings.enabled));
  localStorage.setItem(STORAGE_KEYS.ALERT_DAYS, String(normalizeAlertDays(settings.alertDays)));
}

function readAlertHistoryFromLocalStorage(): WarrantyAlertHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
    if (!raw) return {};
    return normalizeAlertHistory(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeAlertHistoryToLocalStorage(history: WarrantyAlertHistory): void {
  localStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(history));
}

async function loadSettingsRowFromDatabase(): Promise<WarrantySettingsRow | null> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('id, warranties_enabled, warranty_alert_days, warranty_alerts_sent, updated_at')
    .eq('id', GLOBAL_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return (data as WarrantySettingsRow | null) ?? null;
}

async function upsertSettingsRowToDatabase(partial: Partial<WarrantySettingsRow>): Promise<void> {
  const payload: Record<string, unknown> = {
    id: GLOBAL_SETTINGS_ID,
    updated_at: new Date().toISOString(),
  };

  if (partial.warranties_enabled !== undefined) payload.warranties_enabled = partial.warranties_enabled;
  if (partial.warranty_alert_days !== undefined) payload.warranty_alert_days = partial.warranty_alert_days;
  if (partial.warranty_alerts_sent !== undefined) payload.warranty_alerts_sent = partial.warranty_alerts_sent;

  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
}

export async function loadWarrantyNotificationSettings(): Promise<WarrantyNotificationSettings> {
  const localSettings = readSettingsFromLocalStorage();

  if (!isSupabaseConfigured) {
    return localSettings;
  }

  try {
    const row = await loadSettingsRowFromDatabase();
    if (!row) {
      await upsertSettingsRowToDatabase({
        warranties_enabled: localSettings.enabled,
        warranty_alert_days: localSettings.alertDays,
      });
      return localSettings;
    }

    const settings: WarrantyNotificationSettings = {
      enabled: row.warranties_enabled ?? DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.enabled,
      alertDays: normalizeAlertDays(row.warranty_alert_days),
    };

    writeSettingsToLocalStorage(settings);
    return settings;
  } catch (error) {
    console.error('Failed to load warranty notification settings from database, using local fallback:', error);
    return localSettings;
  }
}

export async function persistWarrantyNotificationSettings(settings: WarrantyNotificationSettings): Promise<void> {
  const normalizedSettings: WarrantyNotificationSettings = {
    enabled: settings.enabled,
    alertDays: normalizeAlertDays(settings.alertDays),
  };

  writeSettingsToLocalStorage(normalizedSettings);

  if (!isSupabaseConfigured) {
    return;
  }

  try {
    await upsertSettingsRowToDatabase({
      warranties_enabled: normalizedSettings.enabled,
      warranty_alert_days: normalizedSettings.alertDays,
    });
  } catch (error) {
    console.error('Failed to persist warranty notification settings to database, kept local fallback:', error);
  }
}

export async function loadWarrantyAlertHistory(): Promise<WarrantyAlertHistory> {
  const localHistory = readAlertHistoryFromLocalStorage();

  if (!isSupabaseConfigured) {
    return localHistory;
  }

  try {
    const row = await loadSettingsRowFromDatabase();
    if (!row) return localHistory;

    const history = normalizeAlertHistory(row.warranty_alerts_sent);
    writeAlertHistoryToLocalStorage(history);
    return history;
  } catch (error) {
    console.error('Failed to load warranty alert history from database, using local fallback:', error);
    return localHistory;
  }
}

export async function persistWarrantyAlertHistory(history: WarrantyAlertHistory): Promise<void> {
  writeAlertHistoryToLocalStorage(history);

  if (!isSupabaseConfigured) {
    return;
  }

  try {
    await upsertSettingsRowToDatabase({
      warranty_alerts_sent: history,
    });
  } catch (error) {
    console.error('Failed to persist warranty alert history to database, kept local fallback:', error);
  }
}
