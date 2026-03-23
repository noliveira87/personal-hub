import { Contract, PriceHistory } from '@/features/contracts/types/contract';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ContractRow {
  id: string;
  name: string;
  category: string;
  provider: string;
  type: string;
  start_date: string;
  end_date: string | null;
  no_end_date: boolean;
  renewal_type: string;
  billing_frequency: string;
  price: number;
  currency: string;
  notes: string | null;
  status: string;
  alerts: any;
  telegram_alert_enabled: boolean;
  document_links: string[] | null;
  price_history_enabled: boolean;
  created_at: string;
  updated_at: string;
}

function mapContractRow(row: ContractRow): Contract {
  return {
    id: row.id,
    name: row.name,
    category: row.category as any,
    provider: row.provider,
    type: row.type as any,
    startDate: row.start_date,
    endDate: row.end_date,
    noEndDate: row.no_end_date,
    renewalType: row.renewal_type as any,
    billingFrequency: row.billing_frequency as any,
    price: row.price,
    currency: row.currency,
    notes: row.notes ?? '',
    status: row.status as any,
    alerts: row.alerts ?? [],
    telegramAlertEnabled: row.telegram_alert_enabled,
    documentLinks: row.document_links ?? [],
    priceHistoryEnabled: row.price_history_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadContractsFromDb(): Promise<Contract[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading contracts:', error);
    return null;
  }

  return (data ?? []).map((row) => mapContractRow(row as ContractRow));
}

export async function upsertContractsInDb(contracts: Contract[]): Promise<void> {
  if (!supabase) return;

  if (!contracts.length) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .neq('id', '');
    if (error) {
      console.error('Error clearing contracts:', error);
    }
    return;
  }

  const payload = contracts.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    provider: item.provider,
    type: item.type,
    start_date: item.startDate,
    end_date: item.endDate,
    no_end_date: item.noEndDate,
    renewal_type: item.renewalType,
    billing_frequency: item.billingFrequency,
    price: item.price,
    currency: item.currency,
    notes: item.notes || null,
    status: item.status,
    alerts: item.alerts,
    telegram_alert_enabled: item.telegramAlertEnabled,
    document_links: item.documentLinks && item.documentLinks.length ? item.documentLinks : null,
    price_history_enabled: item.priceHistoryEnabled,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));

  const { error } = await supabase
    .from('contracts')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting contracts:', error);
  }
}

export async function loadPriceHistoryForContract(contractId: string): Promise<PriceHistory[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('contract_price_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error loading price history:', error);
    return null;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    contractId: row.contract_id,
    price: row.price,
    currency: row.currency,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function addPriceHistory(priceHistory: PriceHistory): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('contract_price_history')
    .insert({
      id: priceHistory.id,
      contract_id: priceHistory.contractId,
      price: priceHistory.price,
      currency: priceHistory.currency,
      date: priceHistory.date,
      notes: priceHistory.notes || null,
      created_at: priceHistory.createdAt,
    });

  if (error) {
    console.error('Error adding price history:', error);
  }
}

export async function deletePriceHistory(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('contract_price_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting price history:', error);
  }
}
