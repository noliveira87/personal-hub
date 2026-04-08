import { supabase } from '@/lib/supabase';
import { ContractQuote } from '@/features/contracts/types/contract';
import { compressPdfFile } from '@/lib/pdfCompression';

const QUOTES_BUCKET = 'contract-quotes';

type QuoteRow = {
  id: string;
  contract_id: string | null;
  title: string;
  provider: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  date: string | null;
  pdf_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  payment_terms: string | null;
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
    provider: row.provider,
    description: row.description,
    price: row.price != null ? Number(row.price) : null,
    currency: row.currency,
    date: row.date,
    pdfUrl: row.pdf_url,
    approvalStatus: row.approval_status ?? 'pending',
    paymentTerms: row.payment_terms,
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
      provider: quote.provider ?? null,
      description: quote.description ?? null,
      price: quote.price ?? null,
      currency: quote.currency,
      date: quote.date ?? null,
      pdf_url: quote.pdfUrl ?? null,
      approval_status: quote.approvalStatus ?? 'pending',
      payment_terms: quote.paymentTerms ?? null,
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
      provider: quote.provider ?? null,
      description: quote.description ?? null,
      price: quote.price ?? null,
      currency: quote.currency,
      date: quote.date ?? null,
      pdf_url: quote.pdfUrl ?? null,
      approval_status: quote.approvalStatus ?? 'pending',
      payment_terms: quote.paymentTerms ?? null,
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
  const fileToUpload = await compressPdfFile(file);

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileToUpload.size > maxSize) {
    throw new Error('PDF file must be smaller than 10MB.');
  }

  const ext = fileToUpload.name.split('.').pop() ?? 'pdf';
  const path = `quotes/${quoteId}.${ext}`;

  const { error } = await supabase.storage
    .from(QUOTES_BUCKET)
    .upload(path, fileToUpload, {
      contentType: fileToUpload.type || 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading quote PDF:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  const { data } = supabase.storage.from(QUOTES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteQuotePdf(pdfUrl: string): Promise<void> {
  const markers = [
    `/storage/v1/object/public/${QUOTES_BUCKET}/`,
    `/storage/v1/object/sign/${QUOTES_BUCKET}/`,
    `/object/public/${QUOTES_BUCKET}/`,
    `/object/sign/${QUOTES_BUCKET}/`,
  ];

  const resolvePath = (source: string) => {
    for (const marker of markers) {
      const markerIndex = source.indexOf(marker);
      if (markerIndex === -1) continue;
      const rawPath = source.slice(markerIndex + marker.length).split('?')[0];
      if (rawPath) return decodeURIComponent(rawPath);
    }

    return null;
  };

  let filePath = resolvePath(pdfUrl);
  if (!filePath) {
    try {
      const parsed = new URL(pdfUrl);
      filePath = resolvePath(parsed.pathname);
    } catch {
      filePath = null;
    }
  }

  if (!filePath) {
    throw new Error('Could not resolve quote PDF path from storage URL');
  }

  const { data, error } = await supabase.storage.from(QUOTES_BUCKET).remove([filePath]);
  if (error) {
    throw new Error(`Failed to delete quote PDF from storage: ${error.message}`);
  }

  const objectError = data?.find((item) => item.error)?.error;
  if (objectError) {
    throw new Error(objectError);
  }
}
