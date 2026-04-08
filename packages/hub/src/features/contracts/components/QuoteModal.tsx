import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, Bell, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Contract, ContractQuote } from '@/features/contracts/types/contract';
import { createQuote, updateQuote, uploadQuotePdf } from '@/features/contracts/lib/quotes';
import { toast } from '@/components/ui/sonner';

interface QuoteModalProps {
  /** Pre-selected contract (from ContractDetail). If undefined, show a contract selector. */
  initialContractId?: string | null;
  defaultCurrency?: string;
  /** All contracts, used for the selector when no initialContractId is locked */
  contracts?: Contract[];
  quote?: ContractQuote | null;
  onClose: () => void;
  onSaved: (quote: ContractQuote) => void;
}

type PaymentPhase = {
  id: string;
  percentage: string;
  description: string;
};

function parsePaymentTermsToPhases(paymentTerms: string | null | undefined): PaymentPhase[] {
  const raw = paymentTerms?.trim();
  if (!raw) {
    return [{ id: crypto.randomUUID(), percentage: '', description: '' }];
  }

  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const phases = lines.map(line => {
    const cleanedLine = line.replace(/^[-•]\s*/, '');
    const match = cleanedLine.match(/^(\d{1,3}(?:[.,]\d+)?)%\s*(.*)$/);

    if (match) {
      return {
        id: crypto.randomUUID(),
        percentage: match[1],
        description: match[2] ?? '',
      };
    }

    return {
      id: crypto.randomUUID(),
      percentage: '',
      description: cleanedLine,
    };
  });

  return phases.length > 0 ? phases : [{ id: crypto.randomUUID(), percentage: '', description: '' }];
}

function serializePaymentPhases(phases: PaymentPhase[]): string {
  return phases
    .map(phase => ({
      percentage: phase.percentage.trim(),
      description: phase.description.trim(),
    }))
    .filter(phase => phase.percentage || phase.description)
    .map(phase => {
      if (phase.percentage && phase.description) {
        return `- ${phase.percentage}% ${phase.description}`;
      }
      if (phase.percentage) {
        return `- ${phase.percentage}%`;
      }
      return `- ${phase.description}`;
    })
    .join('\n');
}

export function QuoteModal({
  initialContractId,
  defaultCurrency = 'EUR',
  contracts = [],
  quote,
  onClose,
  onSaved,
}: QuoteModalProps) {
  const { t } = useI18n();
  const isEdit = !!quote;

  // Whether we should show the contract selector (not locked to a specific contract)
  const showContractSelector = initialContractId === undefined;

  const [contractId, setContractId] = useState<string>(quote?.contractId ?? initialContractId ?? '');
  const [title, setTitle] = useState(quote?.title ?? '');
  const [provider, setProvider] = useState(quote?.provider ?? '');
  const [description, setDescription] = useState(quote?.description ?? '');
  const [price, setPrice] = useState(quote?.price != null ? String(quote.price) : '');
  const [currency, setCurrency] = useState(quote?.currency ?? defaultCurrency);
  const [date, setDate] = useState(quote?.date ?? '');
  const [pdfUrl, setPdfUrl] = useState<string | null>(quote?.pdfUrl ?? null);
  const [approvalStatus, setApprovalStatus] = useState<ContractQuote['approvalStatus']>(quote?.approvalStatus ?? 'pending');
  const [paymentPhases, setPaymentPhases] = useState<PaymentPhase[]>(() => parsePaymentTermsToPhases(quote?.paymentTerms));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [alertDate, setAlertDate] = useState(quote?.alertDate ?? '');
  const [alertEnabled, setAlertEnabled] = useState(quote?.alertEnabled ?? false);
  const [telegramAlertEnabled, setTelegramAlertEnabled] = useState(quote?.telegramAlertEnabled ?? false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error(t('contracts.quotes.pdfOnly'));
      return;
    }
    setPdfFile(file);
    setRemovePdf(false);
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
    setRemovePdf(true);
    setPdfUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPaymentPhase = () => {
    setPaymentPhases(prev => [...prev, { id: crypto.randomUUID(), percentage: '', description: '' }]);
  };

  const updatePaymentPhase = (id: string, field: 'percentage' | 'description', value: string) => {
    setPaymentPhases(prev => prev.map(phase => (
      phase.id === id
        ? { ...phase, [field]: value }
        : phase
    )));
  };

  const removePaymentPhase = (id: string) => {
    setPaymentPhases(prev => {
      if (prev.length <= 1) {
        return [{ id: crypto.randomUUID(), percentage: '', description: '' }];
      }

      return prev.filter(phase => phase.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('contracts.quotes.titleRequired'));
      return;
    }

    setSaving(true);
    try {
      const parsedPrice = price.trim() ? parseFloat(price.replace(',', '.')) : null;
      const serializedPaymentTerms = serializePaymentPhases(paymentPhases);
      let finalPdfUrl: string | null = removePdf ? null : pdfUrl;
      const quoteId = quote?.id ?? crypto.randomUUID();

      if (pdfFile) {
        finalPdfUrl = await uploadQuotePdf(pdfFile, quoteId);
      }

      const payload: Omit<ContractQuote, 'id' | 'createdAt' | 'updatedAt'> = {
        contractId: contractId || null,
        title: title.trim(),
        provider: provider.trim() || null,
        description: description.trim() || null,
        price: parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : null,
        currency,
        date: date || null,
        pdfUrl: finalPdfUrl,
        approvalStatus,
        paymentTerms: serializedPaymentTerms || null,
        alertDate: alertDate || null,
        alertEnabled,
        telegramAlertEnabled,
        alertSentAt: quote?.alertSentAt ?? null,
      };

      let saved: ContractQuote;
      if (isEdit) {
        saved = await updateQuote({ ...quote!, ...payload });
      } else {
        saved = await createQuote(payload);
      }

      toast.success(isEdit ? t('contracts.quotes.updated') : t('contracts.quotes.created'));
      onSaved(saved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentPdf = pdfFile ? pdfFile.name : (removePdf ? null : pdfUrl);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? t('contracts.quotes.editTitle') : t('contracts.quotes.addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Contract selector (only on standalone QuotesPage) */}
          {showContractSelector && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('contracts.quotes.contractLabel')}
              </label>
              <select
                value={contractId}
                onChange={e => setContractId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">{t('contracts.quotes.noContract')}</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} – {c.provider}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.titleLabel')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('contracts.quotes.titlePlaceholder')}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.providerLabel')}
            </label>
            <input
              type="text"
              value={provider}
              onChange={e => setProvider(e.target.value)}
              placeholder={t('contracts.quotes.providerPlaceholder')}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.dateLabel')}
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Price + Currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('contracts.quotes.priceLabel')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={t('contracts.quotes.pricePlaceholder')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('contracts.quotes.currencyLabel')}
              </label>
              <input
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.approvalStatusLabel')}
            </label>
            <select
              value={approvalStatus}
              onChange={e => setApprovalStatus(e.target.value as ContractQuote['approvalStatus'])}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="pending">{t('contracts.quotes.approvalStatusPending')}</option>
              <option value="approved">{t('contracts.quotes.approvalStatusApproved')}</option>
              <option value="rejected">{t('contracts.quotes.approvalStatusRejected')}</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('contracts.quotes.descriptionPlaceholder')}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.paymentTermsLabel')}
            </label>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              {paymentPhases.map((phase, index) => (
                <div key={phase.id} className="grid grid-cols-[90px_1fr_auto] gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={phase.percentage}
                    onChange={e => updatePaymentPhase(phase.id, 'percentage', e.target.value)}
                    placeholder={t('contracts.quotes.paymentTermsPercentagePlaceholder')}
                    className="rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1} %`}
                  />
                  <input
                    type="text"
                    value={phase.description}
                    onChange={e => updatePaymentPhase(phase.id, 'description', e.target.value)}
                    placeholder={t('contracts.quotes.paymentTermsDescriptionPlaceholder')}
                    className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removePaymentPhase(phase.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title={t('contracts.quotes.delete')}
                    aria-label={t('contracts.quotes.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addPaymentPhase}
                className="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('contracts.quotes.paymentTermsAddPhase')}
              </button>
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('contracts.quotes.pdfLabel')}
            </label>
            {currentPdf ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">
                  {pdfFile ? pdfFile.name : t('contracts.quotes.pdfAttached')}
                </span>
                {!pdfFile && pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    {t('contracts.quotes.open')}
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleRemovePdf}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label="Remove PDF"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full rounded-lg border border-dashed bg-background px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {t('contracts.quotes.uploadPdf')}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Alerts */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              {t('contracts.quotes.alertSection')}
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('contracts.quotes.alertDate')}
              </label>
              <input
                type="date"
                value={alertDate}
                onChange={e => setAlertDate(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={e => setAlertEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground accent-primary"
                />
                <span className="text-sm text-foreground">{t('contracts.quotes.alertApp')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramAlertEnabled}
                  onChange={e => setTelegramAlertEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground accent-primary"
                />
                <span className="text-sm text-foreground">{t('contracts.quotes.alertTelegram')}</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t('contracts.quotes.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? t('contracts.quotes.save') : t('contracts.quotes.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

