import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Pencil, Trash2, ExternalLink, Loader2, Bell } from 'lucide-react';
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
                    {quote.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(quote.date), 'd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
