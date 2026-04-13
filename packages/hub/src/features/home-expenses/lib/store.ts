import { formatHiddenAmount, isHideAmountsEnabled } from '@/lib/moneyPrivacy';
import { supabase } from '@/lib/supabase';
import { Transaction } from './types';

const TABLE = 'home_expenses_transactions';
const LEGACY_KEY = 'finflow-transactions';

type TransactionRow = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category: string | null;
  notes: string | null;
  amount: number;
  date: string;
  recurring: boolean;
  contract_id: string | null;
  kwh: number | null;
  created_at?: string;
};

export type LegacyCarChargingRow = {
  id: string;
  contract_id: string;
  year: number;
  month: number;
  day: number | null;
  value_eur: number;
  charging_location: 'home' | 'outside' | null;
  charging_note: string | null;
};

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    category: row.category as Transaction['category'] ?? undefined,
    notes: row.notes ?? undefined,
    amount: Number(row.amount),
    date: row.date,
    recurring: row.recurring,
    contractId: row.contract_id ?? undefined,
    isContractExpense: Boolean(row.contract_id),
    kwh: row.kwh != null ? Number(row.kwh) : undefined,
  };
}

function transactionToRow(tx: Transaction): TransactionRow {
  return {
    id: tx.id,
    name: tx.name,
    type: tx.type,
    category: tx.category ?? null,
    notes: tx.notes ?? null,
    amount: tx.amount,
    date: tx.date,
    recurring: tx.recurring,
    contract_id: tx.contractId ?? null,
    kwh: tx.kwh ?? null,
  };
}

function mapTransactionWriteError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (/kwh/i.test(message) && /column|schema cache|home_expenses_transactions/i.test(message)) {
    return new Error('Missing database column `kwh` in `home_expenses_transactions`. Run the updated SQL migration first.');
  }

  return error instanceof Error ? error : new Error(message);
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(rowToTransaction);
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(transactionToRow(tx));
  if (error) throw mapTransactionWriteError(error);
}

export async function fetchLegacyCarChargingEntries(contractIds: string[]): Promise<LegacyCarChargingRow[]> {
  if (contractIds.length === 0) return [];

  const { data, error } = await supabase
    .from('car_electricity_history')
    .select('id, contract_id, year, month, day, value_eur, charging_location, charging_note')
    .in('contract_id', contractIds)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('day', { ascending: false });

  if (error) throw error;
  return (data ?? []) as LegacyCarChargingRow[];
}

export async function updateLegacyCarChargingEntry(id: string, updates: Partial<LegacyCarChargingRow>): Promise<void> {
  const row: Partial<LegacyCarChargingRow> = {};
  if (updates.contract_id !== undefined) row.contract_id = updates.contract_id;
  if (updates.year !== undefined) row.year = updates.year;
  if (updates.month !== undefined) row.month = updates.month;
  if ('day' in updates) row.day = updates.day ?? null;
  if (updates.value_eur !== undefined) row.value_eur = updates.value_eur;
  if ('charging_location' in updates) row.charging_location = updates.charging_location ?? null;
  if ('charging_note' in updates) row.charging_note = updates.charging_note ?? null;

  const { data, error } = await supabase
    .from('car_electricity_history')
    .update(row)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Legacy car charging entry was not updated. Check car_electricity_history policies.');
  }
}

export async function deleteLegacyCarChargingEntry(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('car_electricity_history')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Legacy car charging entry was not deleted. Check car_electricity_history policies.');
  }
}

export async function updateTransactionInDb(id: string, updates: Partial<Transaction>): Promise<void> {
  const row: Partial<TransactionRow> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.type !== undefined) row.type = updates.type;
  if ('category' in updates) row.category = updates.category ?? null;
  if ('notes' in updates) row.notes = updates.notes ?? null;
  if (updates.amount !== undefined) row.amount = updates.amount;
  if (updates.date !== undefined) row.date = updates.date;
  if (updates.recurring !== undefined) row.recurring = updates.recurring;
  if ('contractId' in updates) row.contract_id = updates.contractId ?? null;
  if ('kwh' in updates) row.kwh = updates.kwh ?? null;
  const { error } = await supabase.from(TABLE).update(row).eq('id', id);
  if (error) throw mapTransactionWriteError(error);
}

export async function deleteTransactionFromDb(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** One-time migration: reads legacy localStorage data and returns it (without deleting). */
export function readLegacyTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed: Transaction[] = JSON.parse(raw);
    // Only migrate manual (non-contract) transactions
    return parsed.filter((t) => !t.isContractExpense);
  } catch {
    return [];
  }
}

export function clearLegacyTransactions(): void {
  localStorage.removeItem(LEGACY_KEY);
}

/**
 * Parse a YYYY-MM-DD date string as LOCAL time (not UTC).
 * Using new Date('YYYY-MM-DD') parses as UTC midnight, which in UTC+1
 * rolls back to the previous day and breaks month/year comparisons.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatCurrency(value: number): string {
  if (isHideAmountsEnabled()) {
    return formatHiddenAmount('EUR');
  }

  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}
