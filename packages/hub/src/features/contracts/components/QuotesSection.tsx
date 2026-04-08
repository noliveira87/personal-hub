import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Pencil, Trash2, ExternalLink, Loader2, Bell, Building2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { ContractQuote } from '@/features/contracts/types/contract';
import { loadQuotesByContract, deleteQuote } from '@/features/contracts/lib/quotes';
import { QuoteModal } from './QuoteModal';
import { toast } from '@/components/ui/sonner';
import { format, parseISO } from 'date-fns';

interface QuotesSectionProps {
  contractId: string;
  contractCurrency: string;
  animationDelay?: string;
}

function getQuoteStatusBadgeClasses(status: ContractQuote['approvalStatus']) {
  if (status === 'approved') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (status === 'rejected') {
    return 'bg-destructive/10 text-destructive border-destructive/20';
  }

  return 'bg-muted text-muted-foreground border-border';
}

function parsePaymentTermsLines(paymentTerms: string): string[] {
  return paymentTerms
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[-•]\s*/, ''));
}

export function QuotesSection({
  contractId,
  contractCurrency,
  animationDelay = '0ms',
}: QuotesSectionProps) {
  const { t, formatCurrency } = useI18n();
  const [quotes, setQuotes] = useState<ContractQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ContractQuote | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadQuotesByContract(contractId);
      setQuotes(data);
    } catch {
      // silently fail on load — non-critical section
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    load();
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
    if (!window.confirm(t('contracts.quotes.confirmDelete'))) return;
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

  const getQuoteStatusLabel = (status: ContractQuote['approvalStatus']) => {
    if (status === 'approved') return t('contracts.quotes.approvalStatusApproved');
    if (status === 'rejected') return t('contracts.quotes.approvalStatusRejected');
    return t('contracts.quotes.approvalStatusPending');
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
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{t('contracts.quotes.empty')}</p>
        ) : (
          <div className="space-y-3">
            {quotes.map(quote => (
              <div
                key={quote.id}
                className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-2"
              >
                {/* Top row: title + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{quote.title}</p>
                    {quote.provider && (
                      <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        <Building2 className="h-3 w-3" />
                        {quote.provider}
                      </span>
                    )}
                    {quote.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(quote.date), 'd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQuoteStatusBadgeClasses(quote.approvalStatus)}`}>
                      {getQuoteStatusLabel(quote.approvalStatus)}
                    </span>
                    {quote.pdfUrl && (
                      <a
                        href={quote.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                        title={t('contracts.quotes.openPdf')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(quote)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      title={t('contracts.quotes.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(quote)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title={t('contracts.quotes.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                {quote.price != null && (
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {formatCurrency(quote.price, quote.currency)}
                  </p>
                )}

                {/* Description */}
                {quote.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {quote.description}
                  </p>
                )}

                {quote.paymentTerms && (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className="font-medium text-foreground mb-1">{t('contracts.quotes.paymentTermsLabel')}</p>
                    <ul className="space-y-0.5">
                      {parsePaymentTermsLines(quote.paymentTerms).map((line, idx) => (
                        <li key={`${quote.id}-payment-term-${idx}`}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alert badge */}
                {(quote.alertEnabled || quote.telegramAlertEnabled) && quote.alertDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bell className="w-3 h-3" />
                    <span>{quote.alertDate}</span>
                    {quote.alertEnabled && <span className="text-success">· App</span>}
                    {quote.telegramAlertEnabled && <span className="text-primary">· Telegram</span>}
                  </div>
                )}
              </div>
            ))}
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
    </>
  );
}
