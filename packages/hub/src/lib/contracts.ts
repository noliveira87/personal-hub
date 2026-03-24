import { supabase } from '@/lib/supabase';
import { Contract, PriceHistory } from '@/types/contract';

type ContractRow = {
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
  alerts: unknown;
  telegram_alert_enabled: boolean;
  document_links: string[] | null;
  price_history_enabled: boolean;
  created_at: string;
  updated_at: string;
};

function mapRowToContract(row: ContractRow): Contract {
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
    notes: row.notes,
    status: row.status as any,
    alerts: Array.isArray(row.alerts) ? row.alerts as any : [],
    telegramAlertEnabled: row.telegram_alert_enabled,
    documentLinks: row.document_links,
    priceHistoryEnabled: row.price_history_enabled ?? true, // Default to true if null
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContractToRow(contract: Contract) {
  const normalizedEndDate = contract.noEndDate ? null : contract.endDate;

  return {
    id: contract.id,
    name: contract.name,
    category: contract.category,
    provider: contract.provider,
    type: contract.type,
    start_date: contract.startDate,
    end_date: normalizedEndDate,
    no_end_date: contract.noEndDate,
    renewal_type: contract.renewalType,
    billing_frequency: contract.billingFrequency,
    price: contract.price,
    currency: contract.currency,
    notes: contract.notes,
    status: contract.status,
    alerts: contract.alerts,
    telegram_alert_enabled: contract.telegramAlertEnabled,
    document_links: contract.documentLinks,
    price_history_enabled: contract.priceHistoryEnabled,
    updated_at: new Date().toISOString(),
  };
}

type PriceHistoryRow = {
  id: string;
  contract_id: string;
  price: number;
  currency: string;
  date: string;
  notes: string | null;
  created_at: string;
};

function mapRowToPriceHistory(row: PriceHistoryRow): PriceHistory {
  return {
    id: row.id,
    contractId: row.contract_id,
    price: row.price,
    currency: row.currency,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// CONTRACTS OPERATIONS

export async function loadContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading contracts:', error);
    throw new Error(`Failed to load contracts: ${error.message}`);
  }

  return (data ?? []).map(mapRowToContract);
}

export async function createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('contracts')
    .insert([
      {
        id,
        ...mapContractToRow({
          ...contract,
          id,
          createdAt: now,
          updatedAt: now,
        }),
        created_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating contract:', error);
    throw new Error(`Failed to create contract: ${error.message}`);
  }

  return mapRowToContract(data);
}

export async function updateContract(contract: Contract): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .update(mapContractToRow(contract))
    .eq('id', contract.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating contract:', error);
    throw new Error(`Failed to update contract: ${error.message}`);
  }

  return mapRowToContract(data);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting contract:', error);
    throw new Error(`Failed to delete contract: ${error.message}`);
  }
}

// PRICE HISTORY OPERATIONS

export async function loadPriceHistoryForContract(contractId: string): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('contract_price_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error loading price history:', error);
    throw new Error(`Failed to load price history: ${error.message}`);
  }

  return (data ?? []).map(mapRowToPriceHistory);
}

export async function addPriceHistoryEntry(
  contractId: string,
  price: number,
  currency: string,
  date: string,
  notes?: string
): Promise<PriceHistory> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('contract_price_history')
    .insert([
      {
        id,
        contract_id: contractId,
        price,
        currency,
        date,
        notes: notes || null,
        created_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error adding price history entry:', error);
    throw new Error(`Failed to add price history: ${error.message}`);
  }

  return mapRowToPriceHistory(data);
}

export async function deletePriceHistoryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('contract_price_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting price history entry:', error);
    throw new Error(`Failed to delete price history: ${error.message}`);
  }
}

export async function updatePriceHistoryEntry(
  id: string,
  price: number,
  currency: string,
  date: string,
  notes?: string
): Promise<PriceHistory> {
  const { data, error } = await supabase
    .from('contract_price_history')
    .update({
      price,
      currency,
      date,
      notes: notes || null,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating price history entry:', error);
    throw new Error(`Failed to update price history: ${error.message}`);
  }

  if (data) {
    return mapRowToPriceHistory(data);
  }

  const { data: existing, error: existingError } = await supabase
    .from('contract_price_history')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    console.error('Error loading existing price history entry for fallback:', existingError);
    throw new Error(`Failed to update price history: ${existingError.message}`);
  }

  if (!existing) {
    throw new Error('Failed to update price history: entry not found or not accessible');
  }

  const { error: deleteError } = await supabase
    .from('contract_price_history')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting price history entry during fallback update:', deleteError);
    throw new Error(`Failed to update price history: ${deleteError.message}`);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('contract_price_history')
    .insert([
      {
        id,
        contract_id: existing.contract_id,
        price,
        currency,
        date,
        notes: notes || null,
        created_at: existing.created_at,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting price history entry during fallback update:', insertError);
    throw new Error(`Failed to update price history: ${insertError.message}`);
  }

  return mapRowToPriceHistory(inserted);
}

export async function getLatestPriceForContract(contractId: string): Promise<PriceHistory | null> {
  const { data, error } = await supabase
    .from('contract_price_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting latest price:', error);
    throw new Error(`Failed to get latest price: ${error.message}`);
  }

  if (!data) return null;

  return mapRowToPriceHistory(data);
}