import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Receipt, Link2, Bell } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { ContractQuote } from '@/features/contracts/types/contract';
import { loadAllQuotes, deleteQuote } from '@/features/contracts/lib/quotes';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { QuoteModal } from '@/features/contracts/components/QuoteModal';
import { toast } from '@/components/ui/sonner';
import { format, parseISO } from 'date-fns';
import AppSectionHeader from '@/components/AppSectionHeader';

export default function QuotesPage() {
  const { t, formatCurrency } = useI18n();
  const { contracts } = useContracts();
  const [quotes, setQuotes] = useState<ContractQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ContractQuote | null>(null);

  const contractMap = new Map(contracts.map(c => [c.id, c]));

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AppSectionHeader title="D12 Contracts" icon={Receipt} backTo="/contracts" backLabel={t('contracts.backToContracts')} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('contracts.quotes.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('contracts.quotes.pageSubtitle')}</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('contracts.quotes.addButton')}
        </button>
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
            const linkedContract = q.contractId ? contractMap.get(q.contractId) : null;
            return (
              <div key={q.id} className="bg-card rounded-xl border p-5 flex flex-col gap-2 animate-fade-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{q.title}</p>
                    {q.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(q.date), 'd MMM yyyy')}</p>
                    )}
                    {linkedContract && (
                      <div className="flex items-center gap-1 mt-1">
                        <Link2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{linkedContract.name} – {linkedContract.provider}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {q.pdfUrl && (
                      <a
                        href={q.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                        title={t('contracts.quotes.openPdf')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(q)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      title={t('contracts.quotes.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title={t('contracts.quotes.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {q.price != null && (
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(q.price, q.currency)}
                  </p>
                )}
                {q.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>
                )}
                {(q.alertEnabled || q.telegramAlertEnabled) && q.alertDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bell className="w-3 h-3" />
                    <span>{q.alertDate}</span>
                    {q.alertEnabled && <span className="text-success">· App</span>}
                    {q.telegramAlertEnabled && <span className="text-primary">· Telegram</span>}
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
