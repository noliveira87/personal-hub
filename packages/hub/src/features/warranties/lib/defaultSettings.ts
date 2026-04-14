import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { WarrantyCategory } from '@/lib/warranties';

const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';

const STORAGE_KEYS = {
  CATEGORY: 'd12-warranty-default-category',
  YEARS: 'd12-warranty-default-years',
} as const;

export interface WarrantyDefaultsSettings {
  defaultCategory: WarrantyCategory;
  defaultYears: 2 | 3;
}

type WarrantyDefaultsRow = {
  id: string;
  warranty_default_category: string | null;
  warranty_default_years: number | null;
};

export const DEFAULT_WARRANTY_DEFAULTS_SETTINGS: WarrantyDefaultsSettings = {
  defaultCategory: 'others',
  defaultYears: 3,
};

function normalizeDefaultCategory(value: string | null | undefined): WarrantyCategory {
  if (value === 'tech' || value === 'appliances' || value === 'tools' || value === 'others') return value;
  return DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultCategory;
}

function normalizeDefaultYears(value: number | null | undefined): 2 | 3 {
  return value === 2 ? 2 : 3;
}

function readLocalDefaults(): WarrantyDefaultsSettings {
  return {
    defaultCategory: normalizeDefaultCategory(localStorage.getItem(STORAGE_KEYS.CATEGORY)),
    defaultYears: normalizeDefaultYears(Number(localStorage.getItem(STORAGE_KEYS.YEARS) ?? DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultYears)),
  };
}

function writeLocalDefaults(settings: WarrantyDefaultsSettings): void {
  localStorage.setItem(STORAGE_KEYS.CATEGORY, settings.defaultCategory);
  localStorage.setItem(STORAGE_KEYS.YEARS, String(settings.defaultYears));
}

async function loadDefaultsRowFromDatabase(): Promise<WarrantyDefaultsRow | null> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('id, warranty_default_category, warranty_default_years')
    .eq('id', GLOBAL_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return (data as WarrantyDefaultsRow | null) ?? null;
}

async function upsertDefaultsRowToDatabase(settings: WarrantyDefaultsSettings): Promise<void> {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(
      {
        id: GLOBAL_SETTINGS_ID,
        warranty_default_category: settings.defaultCategory,
        warranty_default_years: settings.defaultYears,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) throw error;
}

export async function loadWarrantyDefaultsSettings(): Promise<WarrantyDefaultsSettings> {
  const localDefaults = readLocalDefaults();

  if (!isSupabaseConfigured) return localDefaults;

  try {
    const row = await loadDefaultsRowFromDatabase();
    if (!row) {
      await upsertDefaultsRowToDatabase(localDefaults);
      return localDefaults;
    }

    const settings: WarrantyDefaultsSettings = {
      defaultCategory: normalizeDefaultCategory(row.warranty_default_category),
      defaultYears: normalizeDefaultYears(row.warranty_default_years),
    };

    writeLocalDefaults(settings);
    return settings;
  } catch (error) {
    console.error('Failed to load warranty defaults from database, using local fallback:', error);
    return localDefaults;
  }
}

export async function persistWarrantyDefaultsSettings(settings: WarrantyDefaultsSettings): Promise<void> {
  const normalized: WarrantyDefaultsSettings = {
    defaultCategory: normalizeDefaultCategory(settings.defaultCategory),
    defaultYears: normalizeDefaultYears(settings.defaultYears),
  };

  writeLocalDefaults(normalized);

  if (!isSupabaseConfigured) return;

  try {
    await upsertDefaultsRowToDatabase(normalized);
  } catch (error) {
    console.error('Failed to persist warranty defaults to database, kept local fallback:', error);
  }
}
