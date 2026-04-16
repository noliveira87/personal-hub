import { useState, useEffect, useCallback, useRef } from 'react';
import { Receipt, Plus, Pencil, Trash2, ExternalLink, Loader2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { ContractQuote } from '@/features/contracts/types/contract';
import { loadQuotesByContract, deleteQuote } from '@/features/contracts/lib/quotes';
import { QuoteModal } from './QuoteModal';
import { toast } from '@/components/ui/sonner';
import { format, parseISO } from 'date-fns';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

interface QuotesSectionProps {
  contractId: string;
  contractCurrency: string;
  animationDelay?: string;
}

type PaymentTermBalance = {
  amount: string;
  percentage: string;
  paid: boolean;
};

const PAYMENT_TERMS_V2_PREFIX = '__payment_phases_v2__:';

function getQuoteStatusBadgeClasses(status: ContractQuote['approvalStatus']) {
  if (status === 'approved') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (status === 'rejected') {
    return 'bg-destructive/10 text-destructive border-destructive/20';
  }

  return 'bg-muted text-muted-foreground border-border';
}

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

export function QuotesSection({
  contractId,
  contractCurrency,
  animationDelay = '0ms',
}: QuotesSectionProps) {
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [quotes, setQuotes] = useState<ContractQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ContractQuote | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setHasLoadedOnce(false);
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
    }
    // Avoid flashing a spinner when the query resolves quickly.
    loadingTimerRef.current = window.setTimeout(() => setLoading(true), 250);

    try {
      const data = await loadQuotesByContract(contractId);
      setQuotes(data);
    } catch {
      // silently fail on load — non-critical section
    } finally {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [contractId]);

  useEffect(() => {
    load();
    return () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }
    };
  }, [load]);

  const handleAdd = () => {
    setEditingQuote(null);
    setModalOpen(true);
  };

  const handleEdit = (quote: ContractQuote) => {
    setEditingQuote(quote);
    setModalOpen(true);
  };

  const handleDelete = async (quote: ContractQuote) => {
    if (!await confirm({ title: t('contracts.quotes.confirmDelete'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) return;
    try {
      await deleteQuote(quote.id, quote.pdfUrl);
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
      toast.success(t('contracts.quotes.deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  const handleSaved = (saved: ContractQuote) => {
    setQuotes(prev => {
      const idx = prev.findIndex(q => q.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
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
    <>
      <div
        className="bg-card rounded-xl p-6 border animate-fade-up"
        style={{ animationDelay }}
      >
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t('contracts.quotes.sectionTitle')}
          </h2>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('contracts.quotes.addButton')}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">{t('contracts.quotes.loading')}</span>
          </div>
        ) : !hasLoadedOnce ? (
          <div className="py-6" />
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{t('contracts.quotes.empty')}</p>
        ) : (
          <div className="space-y-3">
            {quotes.map(quote => {
              const remainingToPay = computeRemainingToPay(quote);

              return (
                <div
                  key={quote.id}
                  className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-2 cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/contracts/quotes/${quote.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/contracts/quotes/${quote.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                {/* Top row: title + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-foreground leading-tight sm:text-xl">{quote.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {quote.provider && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                          <Building2 className="h-3 w-3" />
                          {quote.provider}
                        </span>
                      )}
                      {quote.date && (
                        <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {format(parseISO(quote.date), 'd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQuoteStatusBadgeClasses(quote.approvalStatus)}`}>
                      {t('contracts.quotes.approvedSimpleLabel')}: {getQuoteApprovalSimpleLabel(quote.approvalStatus)}
                    </span>
                    {quote.pdfUrl && (
                      <a
                        href={quote.pdfUrl}
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
                        handleEdit(quote);
                      }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      title={t('contracts.quotes.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(quote);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title={t('contracts.quotes.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                {quote.price != null && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold tabular-nums text-primary sm:text-base">
                      {t('contracts.quotes.priceTotalLabel')}: {formatCurrency(quote.price, quote.currency)}
                    </p>
                    {remainingToPay != null && (
                      remainingToPay > 0 ? (
                        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1">
                          <span className="text-[11px] font-medium text-warning">{t('contracts.quotes.remainingToPayLabel')}:</span>
                          <span className="text-sm font-semibold tabular-nums text-warning">{formatCurrency(remainingToPay, quote.currency)}</span>
                        </div>
                      ) : (
                        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-positive/30 bg-positive/10 px-2.5 py-1">
                          <span className="text-[11px] font-medium text-positive">{t('contracts.quotes.fullyPaidLabel')}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <QuoteModal
          initialContractId={contractId}
          defaultCurrency={contractCurrency}
          quote={editingQuote}
          onClose={() => { setModalOpen(false); setEditingQuote(null); }}
          onSaved={handleSaved}
        />
      )}
      {confirmDialog}
    </>
  );
}
