import { supabase } from '@/lib/supabase';
import { Contract, PriceHistory, normalizeAlertSetting } from '@/features/contracts/types/contract';

type ContractRow = {
  id: string;
  name: string;
  category: string;
  provider: string;
  type: string;
  housing_usage: string | null;
  mortgage_details: unknown;
  start_date: string;
  end_date: string | null;
  no_end_date: boolean;
  renewal_type: string;
  billing_frequency: string;
  payment_type: string | null;
  payment_source: string | null;
  price: number;
  currency: string;
  notes: string | null;
  status: string;
  alerts: unknown;
  telegram_alert_enabled: boolean;
  document_links: string[] | null;
  price_history_enabled: boolean;
  default_monthly_value: number | null;
  created_at: string;
  updated_at: string;
};

function mapRowToContract(row: ContractRow): Contract {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Contract['category'],
    provider: row.provider,
    type: row.type as Contract['type'],
    housingUsage: row.housing_usage as Contract['housingUsage'],
    mortgageDetails: row.mortgage_details && typeof row.mortgage_details === 'object'
      ? row.mortgage_details as Contract['mortgageDetails']
      : null,
    startDate: row.start_date,
    endDate: row.end_date,
    noEndDate: row.no_end_date,
    renewalType: row.renewal_type as Contract['renewalType'],
    billingFrequency: row.billing_frequency as Contract['billingFrequency'],
    paymentType: (row.payment_type as Contract['paymentType']) ?? null,
    paymentSource: row.payment_source ?? null,
    directDebitTiming: (row.direct_debit_timing as Contract['directDebitTiming']) ?? null,
    price: row.price,
    currency: row.currency,
    notes: row.notes,
    status: row.status as Contract['status'],
    alerts: Array.isArray(row.alerts)
      ? row.alerts.map(normalizeAlertSetting)
      : [],
    telegramAlertEnabled: row.telegram_alert_enabled,
    documentLinks: row.document_links,
    priceHistoryEnabled: row.price_history_enabled ?? true, // Default to true if null
    defaultMonthlyValue: row.default_monthly_value ?? null,
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
    housing_usage: contract.housingUsage,
    mortgage_details: contract.mortgageDetails,
    start_date: contract.startDate,
    end_date: normalizedEndDate,
    no_end_date: contract.noEndDate,
    renewal_type: contract.renewalType,
    billing_frequency: contract.billingFrequency,
    payment_type: contract.paymentType,
    payment_source: contract.paymentSource,
    direct_debit_timing: contract.directDebitTiming,
    price: contract.price,
    currency: contract.currency,
    notes: contract.notes,
    status: contract.status,
    alerts: contract.alerts,
    telegram_alert_enabled: contract.telegramAlertEnabled,
    document_links: contract.documentLinks,
    price_history_enabled: contract.priceHistoryEnabled,
    default_monthly_value: contract.defaultMonthlyValue ?? null,
    updated_at: new Date().toISOString(),
  };
}

type PriceHistoryRow = {
  id: string;
  contract_id: string | null;
  amount: number;
  date: string;
  name: string;
  created_at: string;
};

function mapRowToPriceHistory(row: PriceHistoryRow): PriceHistory {
  return {
    id: row.id,
    contractId: row.contract_id ?? '',
    price: Number(row.amount),
    currency: 'EUR',
    date: row.date,
    notes: row.name,
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
    .from('home_expenses_transactions')
    .select('id, contract_id, amount, date, name, created_at')
    .eq('type', 'expense')
    .eq('contract_id', contractId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading price history:', error);
    throw new Error(`Failed to load price history: ${error.message}`);
  }

  return (data ?? []).map(mapRowToPriceHistory);
}

export async function loadAllPriceHistory(): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('home_expenses_transactions')
    .select('id, contract_id, amount, date, name, created_at')
    .eq('type', 'expense')
    .not('contract_id', 'is', null)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading all price history:', error);
    throw new Error(`Failed to load all price history: ${error.message}`);
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
  void contractId;
  void price;
  void currency;
  void date;
  void notes;
  throw new Error('Contract price history is now managed from Home Expenses.');
}

export async function deletePriceHistoryEntry(id: string): Promise<void> {
  void id;
  throw new Error('Contract price history is now managed from Home Expenses.');
}

export async function updatePriceHistoryEntry(
  id: string,
  price: number,
  currency: string,
  date: string,
  notes?: string
): Promise<PriceHistory> {
  void id;
  void price;
  void currency;
  void date;
  void notes;
  throw new Error('Contract price history is now managed from Home Expenses.');
}

export async function getLatestPriceForContract(contractId: string): Promise<PriceHistory | null> {
  const { data, error } = await supabase
    .from('home_expenses_transactions')
    .select('id, contract_id, amount, date, name, created_at')
    .eq('type', 'expense')
    .eq('contract_id', contractId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting latest price:', error);
    throw new Error(`Failed to get latest price: ${error.message}`);
  }

  if (!data) return null;

  return mapRowToPriceHistory(data);
}

