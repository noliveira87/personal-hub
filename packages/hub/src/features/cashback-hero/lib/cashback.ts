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
  is_unibanco: boolean | null;
  created_at: string;
  updated_at: string;
};

type CashbackEntryRow = {
  id: string;
  purchase_id: string;
  source: string;
  amount: number | null;
  points: number | null;
  date_received: string;
  created_at: string;
  updated_at: string;
};

export type UnibancoSyncResult = {
  status: 'synced' | 'no-cashback' | 'out-of-campaign';
  month: string;
  spent: number;
  amount: number;
};

const UNIBANCO_SOURCE = 'Unibanco';
const UNIBANCO_CAMPAIGN_START = '2026-04-01';
const UNIBANCO_CAMPAIGN_MONTHS = 12;
const UNIBANCO_CAMPAIGN_CAP = 200;

function getMonthDateRange(monthKey: string): { start: string; endExclusive: string; monthEnd: string } {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  const monthEndDate = new Date(Date.UTC(year, month, 0));
  return {
    start: startDate.toISOString().slice(0, 10),
    endExclusive: endDate.toISOString().slice(0, 10),
    monthEnd: monthEndDate.toISOString().slice(0, 10),
  };
}

function monthKeyFromDate(raw: string): string {
  return raw.slice(0, 7);
}

function isMonthWithinCampaign(monthKey: string): boolean {
  const [y, m] = monthKey.split('-').map(Number);
  const [startY, startM] = UNIBANCO_CAMPAIGN_START.slice(0, 7).split('-').map(Number);
  const diff = (y - startY) * 12 + (m - startM);
  return diff >= 0 && diff < UNIBANCO_CAMPAIGN_MONTHS;
}

export type UnibancoTier = { minSpend: number; cashback: number };

export const UNIBANCO_TIERS: UnibancoTier[] = [
  { minSpend: 500, cashback: 20 },
  { minSpend: 300, cashback: 10 },
  { minSpend: 100, cashback: 5 },
];

export const UNIBANCO_CAMPAIGN_MAX = UNIBANCO_CAMPAIGN_CAP;
export const UNIBANCO_CAMPAIGN_START_DATE = UNIBANCO_CAMPAIGN_START;
export const UNIBANCO_CAMPAIGN_TOTAL_MONTHS = UNIBANCO_CAMPAIGN_MONTHS;

export function getActiveTier(spent: number): UnibancoTier | null {
  return UNIBANCO_TIERS.find((t) => spent >= t.minSpend) ?? null;
}

export function getNextTier(spent: number): UnibancoTier | null {
  return [...UNIBANCO_TIERS].reverse().find((t) => spent < t.minSpend) ?? null;
}

function computeUnibancoMonthlyCashback(spent: number): number {
  return getActiveTier(spent)?.cashback ?? 0;
}

/**
 * Distribute cashback chronologically up to the tier spend cap.
 * Rate = tierCashback / tierMinSpend (e.g. €20/€500 = 4%).
 * Earlier purchases are filled first at that rate; spend beyond the cap earns nothing.
 * Any cent rounding remainder goes to the largest slices.
 */
function distributeWithTierCap(
  purchases: Array<{ id: string; amount: number | null; date: string; created_at?: string }>,
  tierMinSpend: number,
  finalCashback: number,
): Array<{ purchaseId: string; amount: number }> {
  if (purchases.length === 0 || finalCashback <= 0 || tierMinSpend <= 0) return [];

  const rate = finalCashback / tierMinSpend; // € cashback per € eligible spend
  // Sort chronologically; tiebreak by created_at (insertion order) then id.
  const sorted = [...purchases].sort((a, b) =>
    a.date.localeCompare(b.date)
    || (a.created_at ?? '').localeCompare(b.created_at ?? '')
    || a.id.localeCompare(b.id),
  );

  let capRemaining = tierMinSpend;
  const raw: Array<{ purchaseId: string; baseCents: number }> = [];

  for (const p of sorted) {
    if (capRemaining <= 0) break;
    const amount = Math.max(0, Number(p.amount ?? 0));
    const eligible = Math.min(amount, capRemaining);
    const baseCents = Math.floor(eligible * rate * 100);
    if (baseCents > 0) raw.push({ purchaseId: p.id, baseCents });
    capRemaining -= amount;
  }

  // Distribute rounding remainder to largest slices.
  const targetCents = Math.round(finalCashback * 100);
  let unallocated = Math.max(0, targetCents - raw.reduce((s, r) => s + r.baseCents, 0));
  [...raw].sort((a, b) => b.baseCents - a.baseCents).forEach((r) => {
    if (unallocated <= 0) return;
    r.baseCents += 1;
    unallocated -= 1;
  });

  return raw
    .filter((r) => r.baseCents > 0)
    .map((r) => ({ purchaseId: r.purchaseId, amount: r.baseCents / 100 }));
}

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
    points: row.points != null ? Number(row.points) : undefined,
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
    isUnibanco: row.is_unibanco ?? false,
    isCetelem: row.is_cetelem ?? false,
    createdAt: row.created_at,
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
      is_unibanco: purchase.isUnibanco ?? false,
      is_cetelem: purchase.isCetelem ?? false,
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

export async function createCashbackHomeExpenseLink(
  purchaseId: string,
  homeExpenseTransactionId: string,
  contractId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('cashback_purchase_home_expense_links')
    .insert([{
      id: crypto.randomUUID(),
      purchase_id: purchaseId,
      home_expense_transaction_id: homeExpenseTransactionId,
      contract_id: contractId,
      created_at: now,
      updated_at: now,
    }]);

  if (error) {
    throw new Error(formatSupabaseError('Failed to link cashback purchase to home expense', error));
  }
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
      points: entry.points ?? null,
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
  const { data: linkRow, error: linkError } = await supabase
    .from('cashback_purchase_home_expense_links')
    .select('home_expense_transaction_id')
    .eq('purchase_id', purchaseId)
    .maybeSingle();

  const relationMissing = String(linkError?.message ?? '').toLowerCase().includes('cashback_purchase_home_expense_links');
  if (linkError && !relationMissing) {
    throw new Error(formatSupabaseError('Failed to load cashback-home-expense link before deleting purchase', linkError));
  }

  const linkedHomeExpenseTransactionId = (linkRow as { home_expense_transaction_id?: string } | null)?.home_expense_transaction_id;
  if (linkedHomeExpenseTransactionId) {
    const { error: deleteLinkedTxError } = await supabase
      .from('home_expenses_transactions')
      .delete()
      .eq('id', linkedHomeExpenseTransactionId);

    if (deleteLinkedTxError) {
      throw new Error(formatSupabaseError('Failed to delete linked home expense transaction', deleteLinkedTxError));
    }
  }

  const { error } = await supabase
    .from('cashback_purchases')
    .delete()
    .eq('id', purchaseId);

  if (error) {
    throw new Error(formatSupabaseError('Failed to delete purchase', error));
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
  if (fields.points !== undefined) dbFields.points = fields.points;
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
    } else if (key === 'isUnibanco') {
      dbFields.is_unibanco = value;
    } else if (key === 'isCetelem') {
      dbFields.is_cetelem = value;
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

export async function syncUnibancoMonthlyCashback(monthKey: string): Promise<UnibancoSyncResult> {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error('Invalid month format. Expected YYYY-MM.');
  }

  if (!isMonthWithinCampaign(monthKey)) {
    return {
      status: 'out-of-campaign',
      month: monthKey,
      spent: 0,
      amount: 0,
    };
  }

  const { start, endExclusive, monthEnd } = getMonthDateRange(monthKey);
  const autoEntryIdPrefix = `unibanco-cashback-${monthKey}-entry`;
  const legacyAnchorPurchaseId = `unibanco-cashback-${monthKey}-purchase`;
  const now = new Date().toISOString();

  const { data: purchaseRows, error: purchaseError } = await supabase
    .from('cashback_purchases')
    .select('id, date, amount, is_referral, is_unibanco, created_at')
    .gte('date', start)
    .lt('date', endExclusive);

  if (purchaseError) {
    throw new Error(formatSupabaseError('Failed to load monthly purchases for Unibanco sync', purchaseError));
  }

  const eligiblePurchases = ((purchaseRows ?? []) as Array<{ id: string; date: string; amount: number | null; is_referral: boolean | null; is_unibanco: boolean | null; created_at: string }>)
    .filter((row) => row.id !== legacyAnchorPurchaseId)
    .filter((row) => row.is_unibanco ?? false)
    .filter((row) => !(row.is_referral ?? false));

  const spent = eligiblePurchases
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const activeTier = getActiveTier(spent);
  const tierCashback = activeTier?.cashback ?? 0;

  const { data: usedRows, error: usedError } = await supabase
    .from('cashback_entries')
    .select('amount, date_received')
    .eq('source', UNIBANCO_SOURCE)
    .gte('date_received', UNIBANCO_CAMPAIGN_START)
    .lt('date_received', start);

  if (usedError) {
    throw new Error(formatSupabaseError('Failed to load Unibanco campaign usage', usedError));
  }

  const usedTotal = ((usedRows ?? []) as Array<{ amount: number | null; date_received: string }>)
    .filter((row) => isMonthWithinCampaign(monthKeyFromDate(row.date_received)))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const remainingCap = Math.max(0, UNIBANCO_CAMPAIGN_CAP - usedTotal);
  const finalCashback = Math.min(tierCashback, remainingCap);

  // Fetch all existing auto Unibanco entries for this month (any format/version).
  const { data: existingEntryRows, error: fetchExistingError } = await supabase
    .from('cashback_entries')
    .select('id')
    .eq('source', UNIBANCO_SOURCE)
    .gte('date_received', start)
    .lt('date_received', endExclusive);

  if (fetchExistingError) {
    throw new Error(formatSupabaseError('Failed to fetch existing Unibanco entries', fetchExistingError));
  }

  const existingEntryIds = ((existingEntryRows ?? []) as Array<{ id: string }>).map((r) => r.id);

  const deleteExisting = async () => {
    if (existingEntryIds.length === 0) return;
    const { error } = await supabase
      .from('cashback_entries')
      .delete()
      .in('id', existingEntryIds);
    if (error) {
      throw new Error(formatSupabaseError('Failed to clear existing Unibanco entries', error));
    }
  };

  if (finalCashback <= 0 || eligiblePurchases.length === 0) {
    await deleteExisting();

    // Cleanup legacy anchor purchase if it still exists.
    await supabase.from('cashback_purchases').delete().eq('id', legacyAnchorPurchaseId);

    return {
      status: 'no-cashback',
      month: monthKey,
      spent,
      amount: 0,
    };
  }

  await deleteExisting();

  // For the top tier (≥€500): cap cashback-earning spend at €500 — purchases beyond earn 0%.
  // For lower tiers: all spend qualifies, so cap = actual spent → effectively proportional.
  const TOP_TIER_THRESHOLD = UNIBANCO_TIERS[0].minSpend; // 500
  const distributionCap = activeTier!.minSpend === TOP_TIER_THRESHOLD && spent > TOP_TIER_THRESHOLD
    ? TOP_TIER_THRESHOLD
    : spent;

  const distributed = distributeWithTierCap(eligiblePurchases, distributionCap, finalCashback);

  if (distributed.length > 0) {
    const rows = distributed.map((slice) => ({
      id: `${autoEntryIdPrefix}-${slice.purchaseId}`,
      purchase_id: slice.purchaseId,
      source: UNIBANCO_SOURCE,
      amount: slice.amount,
      date_received: monthEnd,
      created_at: now,
      updated_at: now,
    }));

    const { error: upsertError } = await supabase
      .from('cashback_entries')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(formatSupabaseError('Failed to upsert distributed Unibanco cashback entries', upsertError));
    }
  }

  // Cleanup legacy anchor purchase if it still exists.
  await supabase.from('cashback_purchases').delete().eq('id', legacyAnchorPurchaseId);

  return {
    status: 'synced',
    month: monthKey,
    spent,
    amount: finalCashback,
  };
}

export async function syncCetelemCashback(purchaseId: string, purchase: CashbackPurchase): Promise<void> {
  if (!purchase.isCetelem) {
    return;
  }

  const cetelemCashback = purchase.amount * 0.03; // 3% cashback
  const now = new Date().toISOString();
  const entryId = `cetelem-cashback-${purchaseId}`;

  // Delete existing Cetelem entry for this purchase
  const { error: deleteError } = await supabase
    .from('cashback_entries')
    .delete()
    .eq('purchase_id', purchaseId)
    .eq('source', 'Cetelem');

  if (deleteError) {
    throw new Error(formatSupabaseError('Failed to delete existing Cetelem entry', deleteError));
  }

  // Create new Cetelem entry with 3% cashback
  const { error: insertError } = await supabase
    .from('cashback_entries')
    .insert([{
      id: entryId,
      purchase_id: purchaseId,
      source: 'Cetelem',
      amount: Math.round(cetelemCashback * 100) / 100, // Round to 2 decimals
      date_received: purchase.date,
      created_at: now,
      updated_at: now,
    }]);

  if (insertError) {
    throw new Error(formatSupabaseError('Failed to create Cetelem cashback entry', insertError));
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

// --- Cards ---

export async function loadCashbackCards(): Promise<string[]> {
  const { data, error } = await supabase
    .from('cashback_cards')
    .select('name')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(formatSupabaseError('Failed to load cashback cards', error));
  }

  const rows = (data ?? []) as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

export async function addCashbackCard(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('cashback_cards')
    .insert([{ id: crypto.randomUUID(), name, sort_order: sortOrder, created_at: new Date().toISOString() }]);

  if (error) {
    throw new Error(formatSupabaseError('Failed to add cashback card', error));
  }
}

export async function removeCashbackCard(name: string): Promise<void> {
  const { error } = await supabase
    .from('cashback_cards')
    .delete()
    .eq('name', name);

  if (error) {
    throw new Error(formatSupabaseError('Failed to remove cashback card', error));
  }
}

export async function replaceAllCashbackCards(names: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('cashback_cards')
    .delete()
    .neq('id', '');

  if (deleteError) {
    throw new Error(formatSupabaseError('Failed to reset cashback cards', deleteError));
  }

  if (names.length === 0) return;

  const now = new Date().toISOString();
  const rows = names.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    sort_order: index,
    created_at: now,
  }));

  const { error: insertError } = await supabase.from('cashback_cards').insert(rows);

  if (insertError) {
    throw new Error(formatSupabaseError('Failed to insert default cards', insertError));
  }
}