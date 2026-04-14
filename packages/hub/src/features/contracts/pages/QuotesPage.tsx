import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Receipt, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { ContractQuote } from '@/features/contracts/types/contract';
import { loadAllQuotes, deleteQuote } from '@/features/contracts/lib/quotes';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { QuoteModal } from '@/features/contracts/components/QuoteModal';
import { toast } from '@/components/ui/sonner';
import { format, parseISO } from 'date-fns';
import AppSectionHeader from '@/components/AppSectionHeader';
import { Button } from '@/components/ui/button';

function getQuoteStatusBadgeClasses(status: ContractQuote['approvalStatus']) {
  if (status === 'approved') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (status === 'rejected') {
    return 'bg-destructive/10 text-destructive border-destructive/20';
  }

  return 'bg-muted text-muted-foreground border-border';
}

type PaymentTermBalance = {
  amount: string;
  percentage: string;
  paid: boolean;
};

const PAYMENT_TERMS_V2_PREFIX = '__payment_phases_v2__:';

function parseLocalizedNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function parsePaymentTermsForBalance(paymentTerms: string): PaymentTermBalance[] {
  const raw = paymentTerms.trim();

  if (raw.startsWith(PAYMENT_TERMS_V2_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(PAYMENT_TERMS_V2_PREFIX.length)) as Array<{
        percentage?: string;
        amount?: string;
        paid?: boolean;
      }>;

      if (Array.isArray(parsed)) {
        return parsed.map(term => ({
          percentage: (term.percentage ?? '').trim(),
          amount: (term.amount ?? '').trim(),
          paid: Boolean(term.paid),
        }));
      }
    } catch {
      // Fallback to legacy plain-text format.
    }
  }

  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[-•]\s*/, ''))
    .map(line => {
      const percentageMatch = line.match(/^(\d{1,3}(?:[.,]\d+)?)%/);
      return {
        percentage: percentageMatch?.[1] ?? '',
        amount: '',
        paid: false,
      };
    });
}

function resolvePaymentTermAmount(term: PaymentTermBalance, quoteTotal: number): number | null {
  const amountFromField = parseLocalizedNumber(term.amount);
  if (amountFromField != null) {
    return roundToCents(amountFromField);
  }

  const percentage = parseLocalizedNumber(term.percentage);
  if (percentage == null) {
    return null;
  }

  return roundToCents((quoteTotal * percentage) / 100);
}

function computeRemainingToPay(quote: ContractQuote): number | null {
  if (quote.approvalStatus !== 'approved') return null;
  if (quote.price == null) return null;

  const quoteTotal = roundToCents(quote.price);
  if (!quote.paymentTerms) {
    return quoteTotal;
  }

  const paymentTerms = parsePaymentTermsForBalance(quote.paymentTerms);
  const paidTotal = paymentTerms.reduce((sum, term) => {
    if (!term.paid) return sum;
    const resolvedAmount = resolvePaymentTermAmount(term, quoteTotal);
    return sum + (resolvedAmount ?? 0);
  }, 0);

  return roundToCents(Math.max(quoteTotal - paidTotal, 0));
}

export default function QuotesPage() {
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const [quotes, setQuotes] = useState<ContractQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ContractQuote | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setQuotes(await loadAllQuotes());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => { setEditingQuote(null); setModalOpen(true); };
  const handleEdit = (q: ContractQuote) => { setEditingQuote(q); setModalOpen(true); };

  const handleDelete = async (q: ContractQuote) => {
    if (!window.confirm(t('contracts.quotes.confirmDelete'))) return;
    try {
      await deleteQuote(q.id, q.pdfUrl);
      setQuotes(prev => prev.filter(x => x.id !== q.id));
      toast.success(t('contracts.quotes.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaved = (saved: ContractQuote) => {
    setQuotes(prev => {
      const idx = prev.findIndex(q => q.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setModalOpen(false);
    setEditingQuote(null);
  };

  const getQuoteApprovalSimpleLabel = (status: ContractQuote['approvalStatus']) => {
    return status === 'approved'
      ? t('contracts.quotes.approvedYes')
      : t('contracts.quotes.approvedNo');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AppSectionHeader
        title="D12 Contracts"
        icon={Receipt}
        backTo="/contracts"
        backLabel={t('contracts.backToContracts')}
        actions={(
          <Button size="sm" className="gap-1.5" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('contracts.quotes.addButton')}</span>
          </Button>
        )}
      />

      <div>
        <h1 className="text-xl font-bold text-foreground">{t('contracts.quotes.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('contracts.quotes.pageSubtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t('contracts.quotes.loading')}</span>
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-card rounded-xl p-10 border text-center">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('contracts.quotes.empty')}</p>
          <button
            onClick={handleAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('contracts.quotes.addButton')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => {
            const remainingToPay = computeRemainingToPay(q);

            return (
              <div
                key={q.id}
                className="bg-card rounded-xl border p-5 flex flex-col gap-2 animate-fade-up cursor-pointer transition-colors hover:bg-muted/20"
                onClick={() => navigate(`/contracts/quotes/${q.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/contracts/quotes/${q.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-foreground leading-tight sm:text-xl">{q.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {q.provider && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                          <Building2 className="h-3 w-3" />
                          {q.provider}
                        </span>
                      )}
                      {q.date && (
                        <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {format(parseISO(q.date), 'd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQuoteStatusBadgeClasses(q.approvalStatus)}`}>
                      {t('contracts.quotes.approvedSimpleLabel')}: {getQuoteApprovalSimpleLabel(q.approvalStatus)}
                    </span>
                    {q.pdfUrl && (
                      <a
                        href={q.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                        title={t('contracts.quotes.openPdf')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(q);
                      }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      title={t('contracts.quotes.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(q);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title={t('contracts.quotes.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {q.price != null && (
                  <div className="space-y-1">
                    <p className="text-base font-bold tabular-nums text-primary sm:text-lg">
                      {t('contracts.quotes.priceTotalLabel')}: {formatCurrency(q.price, q.currency)}
                    </p>
                    {remainingToPay != null && (
                      <div className="inline-flex w-fit items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1">
                        <span className="text-[11px] font-medium text-warning">{t('contracts.quotes.remainingToPayLabel')}:</span>
                        <span className="text-sm font-semibold tabular-nums text-warning">{formatCurrency(remainingToPay, q.currency)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <QuoteModal
          contracts={contracts}
          quote={editingQuote}
          onClose={() => { setModalOpen(false); setEditingQuote(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
