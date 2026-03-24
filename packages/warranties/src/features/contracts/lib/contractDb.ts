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
  try {
    // Ensure alerts is an array
    let alerts = [];
    if (row.alerts) {
      if (Array.isArray(row.alerts)) {
        alerts = row.alerts;
      } else if (typeof row.alerts === 'string') {
        alerts = JSON.parse(row.alerts);
      }
    }

    return {
      id: row.id || '',
      name: row.name || '',
      category: (row.category || 'other') as any,
      provider: row.provider || '',
      type: (row.type || 'other') as any,
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      endDate: row.end_date || null,
      noEndDate: row.no_end_date ?? false,
      renewalType: (row.renewal_type || 'auto-renew') as any,
      billingFrequency: (row.billing_frequency || 'monthly') as any,
      price: row.price ?? 0,
      currency: row.currency || 'EUR',
      notes: row.notes ?? '',
      status: (row.status || 'active') as any,
      alerts: alerts,
      telegramAlertEnabled: row.telegram_alert_enabled ?? false,
      documentLinks: row.document_links ?? [],
      priceHistoryEnabled: row.price_history_enabled ?? false,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error mapping contract row:', err, row);
    throw err;
  }
}

export async function loadContractsFromDb(): Promise<Contract[]> {
  if (!supabase) {
    throw new Error('Database not available');
  }

  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error loading contracts: ${error.message}`);
    }

    console.log('Raw data from DB:', data);
    const mapped = (data ?? []).map((row) => {
      console.log('Mapping row:', row);
      return mapContractRow(row as ContractRow);
    });
    console.log('Mapped contracts:', mapped);
    return mapped;
  } catch (err) {
    console.error('Error in loadContractsFromDb:', err);
    throw err;
  }
}

export async function upsertContractsInDb(contracts: Contract[]): Promise<void> {
  if (!supabase) {
    throw new Error('Database not available');
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
    throw new Error(`Error saving contracts: ${error.message}`);
  }
}

export async function deleteContractFromDb(contractId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Database not available');
  }

  console.log('Deleting contract from DB:', contractId);
  
  const { error, count } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId);

  console.log('Delete result:', { error, count });

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Error deleting contract: ${error.message}`);
  }
}

export async function loadPriceHistoryForContract(contractId: string): Promise<PriceHistory[]> {
  if (!supabase) {
    throw new Error('Database not available');
  }

  const { data, error } = await supabase
    .from('contract_price_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Error loading price history: ${error.message}`);
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
  if (!supabase) {
    throw new Error('Database not available');
  }

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
    throw new Error(`Error adding price history: ${error.message}`);
  }
}

export async function deletePriceHistory(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Database not available');
  }

  const { error } = await supabase
    .from('contract_price_history')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting price history: ${error.message}`);
  }
}
