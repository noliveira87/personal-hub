import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Building2, ExternalLink, Loader2, Pencil, Receipt, Trash2 } from 'lucide-react';

import AppSectionHeader from '@/components/AppSectionHeader';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { QuoteModal } from '@/features/contracts/components/QuoteModal';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { deleteQuote, loadQuoteById } from '@/features/contracts/lib/quotes';
import { ContractQuote } from '@/features/contracts/types/contract';
import { useI18n } from '@/i18n/I18nProvider';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const PAYMENT_TERMS_V2_PREFIX = '__payment_phases_v2__:';

type DisplayPaymentTerm = {
  text: string;
  amount: string;
  percentage: string;
  paymentDate: string;
  paid: boolean;
};

function parseLocalizedNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function computePaymentTermAmount(percentageText: string, quoteTotal: number | null): number | null {
  if (quoteTotal == null) return null;
  const percentage = parseLocalizedNumber(percentageText);
  if (percentage == null) return null;
  return roundToCents((quoteTotal * percentage) / 100);
}

function parsePaymentTermsLines(paymentTerms: string): DisplayPaymentTerm[] {
  const raw = paymentTerms.trim();

  if (raw.startsWith(PAYMENT_TERMS_V2_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(PAYMENT_TERMS_V2_PREFIX.length)) as Array<{
        percentage?: string;
        description?: string;
        amount?: string;
        paymentDate?: string;
        paid?: boolean;
      }>;

      if (Array.isArray(parsed)) {
        return parsed
          .map(term => {
            const percentage = (term.percentage ?? '').trim();
            const description = (term.description ?? '').trim();
            const amount = (term.amount ?? '').trim();
            const paymentDate = (term.paymentDate ?? '').trim();
            const paid = Boolean(term.paid);

            const text = percentage && description
              ? `${percentage}% ${description}`
              : percentage
                ? `${percentage}%`
                : description;

            return { text, amount, percentage, paymentDate, paid };
          })
          .filter(term => term.text || term.amount || term.paymentDate || term.paid);
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
    .map(line => ({ text: line, amount: '', percentage: '', paymentDate: '', paid: false }));
}

function formatPaymentTermDate(value: string): string {
  if (!value) return '';

  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return value;
  }
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

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatCurrency } = useI18n();
  const { contracts } = useContracts();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [quote, setQuote] = useState<ContractQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await loadQuoteById(id);
        if (active) {
          setQuote(data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [id]);

  const linkedContract = useMemo(() => {
    if (!quote?.contractId) return null;
    return contracts.find(contract => contract.id === quote.contractId) ?? null;
  }, [contracts, quote?.contractId]);

  const getQuoteStatusLabel = (status: ContractQuote['approvalStatus']) => {
    if (status === 'approved') return t('contracts.quotes.approvalStatusApproved');
    if (status === 'rejected') return t('contracts.quotes.approvalStatusRejected');
    return t('contracts.quotes.approvalStatusPending');
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!await confirm({ title: t('contracts.quotes.confirmDelete'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) return;

    try {
      await deleteQuote(quote.id, quote.pdfUrl);
      toast.success(t('contracts.quotes.deleted'));
      navigate('/contracts/quotes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaved = (saved: ContractQuote) => {
    setQuote(saved);
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('contracts.quotes.loading')}</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">{t('contracts.quotes.detailNotFound')}</p>
        <Link to="/contracts/quotes" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          ← {t('contracts.quotes.backToQuotes')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AppSectionHeader
        title="D12 Contracts"
        icon={Receipt}
        backTo="/contracts/quotes"
        backLabel={t('contracts.quotes.backToQuotes')}
        actions={(
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalOpen(true)}>
              <Pencil className="h-4 w-4" />
              <span>{t('contracts.quotes.edit')}</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              <span>{t('contracts.quotes.delete')}</span>
            </Button>
          </div>
        )}
      />

      <div>
        <h1 className="text-xl font-bold text-foreground">{t('contracts.quotes.detailTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('contracts.quotes.detailSubtitle')}</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{quote.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
              {quote.vatRate != null && (
                <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {t('contracts.quotes.vatRateBadge', { rate: quote.vatRate })}
                </span>
              )}
            </div>
          </div>

          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQuoteStatusBadgeClasses(quote.approvalStatus)}`}>
            {t('contracts.quotes.approvalStatusLabel')}: {getQuoteStatusLabel(quote.approvalStatus)}
          </span>
        </div>

        {quote.price != null && (
          <p className="text-xl font-bold tabular-nums text-foreground">
            {t('contracts.quotes.priceWithVatLabel')}: {formatCurrency(quote.price, quote.currency)}
          </p>
        )}

        {quote.priceNet != null && (
          <p className="text-sm text-muted-foreground">
            {t('contracts.quotes.priceNetLabel')}: {formatCurrency(quote.priceNet, quote.currency)}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          {t('contracts.quotes.linkedContractLabel')}: {linkedContract ? `${linkedContract.name} - ${linkedContract.provider}` : t('contracts.quotes.noLinkedContract')}
        </p>

        {quote.pdfUrl && (
          <a
            href={quote.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {t('contracts.quotes.openPdf')}
          </a>
        )}
      </div>

      {quote.description && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">{t('contracts.quotes.descriptionLabel')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{quote.description}</p>
        </div>
      )}

      {quote.paymentTerms && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">{t('contracts.quotes.paymentTermsLabel')}</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {parsePaymentTermsLines(quote.paymentTerms).map((term, idx) => (
              <li key={`${quote.id}-detail-payment-term-${idx}`} className="flex flex-wrap items-center gap-1.5">
                <span>• {term.text}{term.amount ? ` - ${term.amount}` : ''}</span>
                {computePaymentTermAmount(term.percentage, quote.price) != null && (
                  <span className="text-xs text-foreground/85">
                    ({t('contracts.quotes.paymentTermsCalculatedAmountLabel')} {formatCurrency(computePaymentTermAmount(term.percentage, quote.price)!, quote.currency)})
                  </span>
                )}
                {term.paymentDate && (
                  <span className="text-xs text-muted-foreground/90">
                    {t('contracts.quotes.paymentTermsPaymentDateLabel')}: {formatPaymentTermDate(term.paymentDate)}
                  </span>
                )}
                {term.paid && (
                  <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                    {t('contracts.quotes.paymentTermsPaidLabel')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <QuoteModal
          contracts={contracts}
          quote={quote}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
      {confirmDialog}
    </div>
  );
}
