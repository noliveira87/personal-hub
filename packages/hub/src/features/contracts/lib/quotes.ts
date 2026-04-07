import { supabase } from '@/lib/supabase';
import { ContractQuote } from '@/features/contracts/types/contract';

const QUOTES_BUCKET = 'contract-quotes';

type QuoteRow = {
  id: string;
  contract_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  date: string | null;
  pdf_url: string | null;
  alert_date: string | null;
  alert_enabled: boolean;
  telegram_alert_enabled: boolean;
  alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToQuote(row: QuoteRow): ContractQuote {
  return {
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    price: row.price != null ? Number(row.price) : null,
    currency: row.currency,
    date: row.date,
    pdfUrl: row.pdf_url,
    alertDate: row.alert_date,
    alertEnabled: row.alert_enabled ?? false,
    telegramAlertEnabled: row.telegram_alert_enabled ?? false,
    alertSentAt: row.alert_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadAllQuotes(): Promise<ContractQuote[]> {
  const { data, error } = await supabase
    .from('contract_quotes')
    .select('*')
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading quotes:', error);
    throw new Error(`Failed to load quotes: ${error.message}`);
  }

  return (data ?? []).map(mapRowToQuote);
}

export async function loadQuotesByContract(contractId: string): Promise<ContractQuote[]> {
  const { data, error } = await supabase
    .from('contract_quotes')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading contract quotes:', error);
    throw new Error(`Failed to load quotes: ${error.message}`);
  }

  return (data ?? []).map(mapRowToQuote);
}

export async function createQuote(
  quote: Omit<ContractQuote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContractQuote> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('contract_quotes')
    .insert([{
      id,
      contract_id: quote.contractId ?? null,
      title: quote.title,
      description: quote.description ?? null,
      price: quote.price ?? null,
      currency: quote.currency,
      date: quote.date ?? null,
      pdf_url: quote.pdfUrl ?? null,
      alert_date: quote.alertDate ?? null,
      alert_enabled: quote.alertEnabled ?? false,
      telegram_alert_enabled: quote.telegramAlertEnabled ?? false,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating quote:', error);
    throw new Error(`Failed to create quote: ${error.message}`);
  }

  return mapRowToQuote(data);
}

export async function updateQuote(quote: ContractQuote): Promise<ContractQuote> {
  const { data, error } = await supabase
    .from('contract_quotes')
    .update({
      contract_id: quote.contractId ?? null,
      title: quote.title,
      description: quote.description ?? null,
      price: quote.price ?? null,
      currency: quote.currency,
      date: quote.date ?? null,
      pdf_url: quote.pdfUrl ?? null,
      alert_date: quote.alertDate ?? null,
      alert_enabled: quote.alertEnabled ?? false,
      telegram_alert_enabled: quote.telegramAlertEnabled ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quote.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating quote:', error);
    throw new Error(`Failed to update quote: ${error.message}`);
  }

  return mapRowToQuote(data);
}

export async function deleteQuote(id: string, pdfUrl: string | null): Promise<void> {
  if (pdfUrl) {
    await deleteQuotePdf(pdfUrl);
  }

  const { error } = await supabase
    .from('contract_quotes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting quote:', error);
    throw new Error(`Failed to delete quote: ${error.message}`);
  }
}

export async function uploadQuotePdf(
  file: File,
  quoteId: string
): Promise<string> {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('PDF file must be smaller than 10MB.');
  }

  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `quotes/${quoteId}.${ext}`;

  const { error } = await supabase.storage
    .from(QUOTES_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('Error uploading quote PDF:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  const { data } = supabase.storage.from(QUOTES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteQuotePdf(pdfUrl: string): Promise<void> {
  try {
    const url = new URL(pdfUrl);
    const segments = url.pathname.split('/');
    const bucketIdx = segments.findIndex(s => s === QUOTES_BUCKET);
    if (bucketIdx === -1) return;
    const filePath = segments.slice(bucketIdx + 1).join('/');
    if (!filePath) return;

    await supabase.storage.from(QUOTES_BUCKET).remove([filePath]);
  } catch {
    // best-effort – don't block deletion of the DB row
  }
}
