import { supabase } from '@/lib/supabase';
import { CashbackEntry, CashbackPurchase } from '@/features/cashback-hero/types';

type CashbackPurchaseRow = {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number | null;
  notes: string | null;
  is_referral: boolean | null;
  created_at: string;
  updated_at: string;
};

type CashbackEntryRow = {
  id: string;
  purchase_id: string;
  source: string;
  amount: number | null;
  date_received: string;
  created_at: string;
  updated_at: string;
};

function formatSupabaseError(prefix: string, error: unknown): string {
  if (!error || typeof error !== 'object') {
    return prefix;
  }

  const maybe = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean);
  return parts.length ? `${prefix}: ${parts.join(' | ')}` : prefix;
}

function mapEntryRow(row: CashbackEntryRow): CashbackEntry {
  return {
    id: row.id,
    source: row.source,
    amount: Number(row.amount ?? 0),
    dateReceived: row.date_received,
  };
}

function mapPurchaseRow(row: CashbackPurchaseRow, entries: CashbackEntryRow[]): CashbackPurchase {
  return {
    id: row.id,
    merchant: row.merchant,
    category: row.category as CashbackPurchase['category'],
    date: row.date,
    amount: Number(row.amount ?? 0),
    notes: row.notes ?? undefined,
    isReferral: row.is_referral ?? false,
    cashbackEntries: entries.map(mapEntryRow),
  };
}

export async function loadCashbackPurchases(): Promise<CashbackPurchase[]> {
  const { data: purchaseRows, error: purchaseError } = await supabase
    .from('cashback_purchases')
    .select('*, cashback_entries(*)')
    .order('date', { ascending: false });

  if (purchaseError) {
    throw new Error(formatSupabaseError('Failed to load cashback purchases', purchaseError));
  }

  const rows = (purchaseRows ?? []) as (CashbackPurchaseRow & { cashback_entries: CashbackEntryRow[] })[];
  return rows.map((row) => mapPurchaseRow(row, row.cashback_entries ?? []));
}

export async function createCashbackPurchase(
  purchase: Omit<CashbackPurchase, 'id' | 'cashbackEntries'>,
): Promise<CashbackPurchase> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('cashback_purchases')
    .insert([{
      id,
      merchant: purchase.merchant,
      category: purchase.category,
      date: purchase.date,
      amount: purchase.amount,
      notes: purchase.notes ?? null,
      is_referral: purchase.isReferral ?? false,
      created_at: now,
      updated_at: now,
    }])
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create purchase: ${error.message}`);
  }

  return mapPurchaseRow(data as CashbackPurchaseRow, []);
}

export async function createCashbackEntry(
  purchaseId: string,
  entry: Omit<CashbackEntry, 'id'>,
): Promise<CashbackEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('cashback_entries')
    .insert([{
      id,
      purchase_id: purchaseId,
      source: entry.source,
      amount: entry.amount,
      date_received: entry.dateReceived,
      created_at: now,
      updated_at: now,
    }])
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create cashback entry: ${error.message}`);
  }

  return mapEntryRow(data as CashbackEntryRow);
}

export async function removeCashbackPurchase(purchaseId: string): Promise<void> {
  const { error } = await supabase
    .from('cashback_purchases')
    .delete()
    .eq('id', purchaseId);

  if (error) {
    throw new Error(`Failed to delete purchase: ${error.message}`);
  }
}

export async function removeCashbackEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('cashback_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    throw new Error(`Failed to delete cashback entry: ${error.message}`);
  }
}

export async function updateCashbackEntry(
  entryId: string,
  fields: Partial<Omit<CashbackEntry, 'id'>>,
): Promise<void> {
  const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (fields.source !== undefined) dbFields.source = fields.source;
  if (fields.amount !== undefined) dbFields.amount = fields.amount;
  if (fields.dateReceived !== undefined) dbFields.date_received = fields.dateReceived;

  const { error } = await supabase
    .from('cashback_entries')
    .update(dbFields)
    .eq('id', entryId);

  if (error) {
    throw new Error(`Failed to update cashback entry: ${error.message}`);
  }
}

export async function updateCashbackPurchase(
  purchaseId: string,
  fields: Partial<Omit<CashbackPurchase, 'id' | 'cashbackEntries'>>,
): Promise<void> {
  const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'isReferral') {
      dbFields.is_referral = value;
    } else {
      dbFields[key] = value;
    }
  }

  const { error } = await supabase
    .from('cashback_purchases')
    .update(dbFields)
    .eq('id', purchaseId);

  if (error) {
    throw new Error(`Failed to update purchase: ${error.message}`);
  }
}

// --- Sources ---

export async function loadCashbackSources(): Promise<string[]> {
  const { data, error } = await supabase
    .from('cashback_sources')
    .select('name')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(formatSupabaseError('Failed to load cashback sources', error));
  }

  const rows = (data ?? []) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export async function addCashbackSource(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('cashback_sources')
    .insert([{ id: crypto.randomUUID(), name, sort_order: sortOrder, created_at: new Date().toISOString() }]);

  if (error) {
    throw new Error(formatSupabaseError('Failed to add cashback source', error));
  }
}

export async function removeCashbackSource(name: string): Promise<void> {
  const { error } = await supabase
    .from('cashback_sources')
    .delete()
    .eq('name', name);

  if (error) {
    throw new Error(formatSupabaseError('Failed to remove cashback source', error));
  }
}

export async function replaceAllCashbackSources(names: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('cashback_sources')
    .delete()
    .neq('id', '');

  if (deleteError) {
    throw new Error(formatSupabaseError('Failed to reset cashback sources', deleteError));
  }

  if (names.length === 0) return;

  const now = new Date().toISOString();
  const rows = names.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    sort_order: index,
    created_at: now,
  }));

  const { error: insertError } = await supabase.from('cashback_sources').insert(rows);

  if (insertError) {
    throw new Error(formatSupabaseError('Failed to insert default sources', insertError));
  }
}