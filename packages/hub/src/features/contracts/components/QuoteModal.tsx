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
  amount: string;
  paymentDate: string;
  paid: boolean;
};

type StoredPaymentPhaseV2 = {
  percentage: string;
  description: string;
  amount: string;
  paymentDate: string;
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

function calculateTotalWithVat(priceNet: number | null, vatRate: number | null): number | null {
  if (priceNet == null) return null;
  if (vatRate == null) return roundToCents(priceNet);
  return roundToCents(priceNet * (1 + vatRate / 100));
}

function calculatePhaseAmount(percentageText: string, totalWithVat: number | null): number | null {
  if (totalWithVat == null) return null;
  const percentage = parseLocalizedNumber(percentageText);
  if (percentage == null) return null;
  return roundToCents(totalWithVat * (percentage / 100));
}

function parsePaymentTermsV2(paymentTerms: string): PaymentPhase[] | null {
  if (!paymentTerms.startsWith(PAYMENT_TERMS_V2_PREFIX)) {
    return null;
  }

  try {
    const rawJson = paymentTerms.slice(PAYMENT_TERMS_V2_PREFIX.length);
    const parsed = JSON.parse(rawJson) as StoredPaymentPhaseV2[];

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map(phase => ({
      id: crypto.randomUUID(),
      percentage: typeof phase.percentage === 'string' ? phase.percentage : '',
      description: typeof phase.description === 'string' ? phase.description : '',
      amount: typeof phase.amount === 'string' ? phase.amount : '',
      paymentDate: typeof phase.paymentDate === 'string' ? phase.paymentDate : '',
      paid: Boolean(phase.paid),
    }));
  } catch {
    return null;
  }
}

function parsePaymentTermsToPhases(paymentTerms: string | null | undefined): PaymentPhase[] {
  const raw = paymentTerms?.trim();
  if (!raw) {
    return [{ id: crypto.randomUUID(), percentage: '', description: '', amount: '', paymentDate: '', paid: false }];
  }

  const v2Phases = parsePaymentTermsV2(raw);
  if (v2Phases && v2Phases.length > 0) {
    return v2Phases;
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
        amount: '',
        paymentDate: '',
        paid: false,
      };
    }

    return {
      id: crypto.randomUUID(),
      percentage: '',
      description: cleanedLine,
      amount: '',
      paymentDate: '',
      paid: false,
    };
  });

  return phases.length > 0 ? phases : [{ id: crypto.randomUUID(), percentage: '', description: '', amount: '', paymentDate: '', paid: false }];
}

function serializePaymentPhases(phases: PaymentPhase[]): string {
  const normalizedPhases: StoredPaymentPhaseV2[] = phases
    .map(phase => ({
      percentage: phase.percentage.trim(),
      description: phase.description.trim(),
      amount: phase.amount.trim(),
      paymentDate: phase.paymentDate,
      paid: phase.paid,
    }))
    .filter(phase => phase.percentage || phase.description || phase.amount || phase.paymentDate || phase.paid);

  if (normalizedPhases.length === 0) {
    return '';
  }

  return `${PAYMENT_TERMS_V2_PREFIX}${JSON.stringify(normalizedPhases)}`;
}

export function QuoteModal({
  initialContractId,
  defaultCurrency = 'EUR',
  contracts = [],
  quote,
  onClose,
  onSaved,
}: QuoteModalProps) {
  const { t, formatCurrency } = useI18n();
  const isEdit = !!quote;

  // Whether we should show the contract selector (not locked to a specific contract)
  const showContractSelector = initialContractId === undefined;

  const [contractId, setContractId] = useState<string>(quote?.contractId ?? initialContractId ?? '');
  const [title, setTitle] = useState(quote?.title ?? '');
  const [provider, setProvider] = useState(quote?.provider ?? '');
  const [description, setDescription] = useState(quote?.description ?? '');
  const [priceNet, setPriceNet] = useState(() => {
    if (quote?.priceNet != null) return String(quote.priceNet);
    if (quote?.price != null) return String(quote.price);
    return '';
  });
  const [vatRate, setVatRate] = useState(quote?.vatRate != null ? String(quote.vatRate) : '');
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
  const parsedPriceNet = parseLocalizedNumber(priceNet);
  const parsedVatRate = parseLocalizedNumber(vatRate);
  const totalPriceWithVat = calculateTotalWithVat(parsedPriceNet, parsedVatRate);

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
    setPaymentPhases(prev => [...prev, { id: crypto.randomUUID(), percentage: '', description: '', amount: '', paymentDate: '', paid: false }]);
  };

  const updatePaymentPhase = (id: string, field: 'percentage' | 'description' | 'amount' | 'paymentDate', value: string) => {
    setPaymentPhases(prev => prev.map(phase => (
      phase.id === id
        ? { ...phase, [field]: value }
        : phase
    )));
  };

  const updatePaymentPhasePaid = (id: string, paid: boolean) => {
    setPaymentPhases(prev => prev.map(phase => (
      phase.id === id
        ? { ...phase, paid }
        : phase
    )));
  };

  const removePaymentPhase = (id: string) => {
    setPaymentPhases(prev => {
      if (prev.length <= 1) {
        return [{ id: crypto.randomUUID(), percentage: '', description: '', amount: '', paymentDate: '', paid: false }];
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
        priceNet: parsedPriceNet,
        vatRate: parsedVatRate,
        price: totalPriceWithVat,
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

          {/* Price + VAT + Currency */}
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t('contracts.quotes.priceNetLabel')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceNet}
                  onChange={e => setPriceNet(e.target.value)}
                  placeholder={t('contracts.quotes.priceNetPlaceholder')}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t('contracts.quotes.vatRateLabel')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vatRate}
                  onChange={e => setVatRate(e.target.value)}
                  placeholder={t('contracts.quotes.vatRatePlaceholder')}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
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

            <div className="sm:col-span-2 rounded-lg border bg-muted/20 px-3 py-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('contracts.quotes.priceWithVatLabel')}
              </label>
              <p className="text-sm font-semibold text-foreground">
                {totalPriceWithVat != null ? t('contracts.quotes.priceWithVatValue', { amount: formatCurrency(totalPriceWithVat, currency) }) : '—'}
              </p>
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
                <div key={phase.id} className="rounded-lg border bg-background/70 p-2.5 space-y-2.5">
                  {(() => {
                    const calculatedAmount = calculatePhaseAmount(phase.percentage, totalPriceWithVat);
                    return (
                      <>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('contracts.quotes.paymentTermsLabel')} {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePaymentPhase(phase.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title={t('contracts.quotes.delete')}
                      aria-label={t('contracts.quotes.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_1fr]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('contracts.quotes.paymentTermsPercentageLabel')}
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={phase.percentage}
                        onChange={e => updatePaymentPhase(phase.id, 'percentage', e.target.value)}
                        placeholder={t('contracts.quotes.paymentTermsPercentagePlaceholder')}
                        className="w-full rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1} %`}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('contracts.quotes.paymentTermsDescriptionLabel')}
                      </p>
                      <input
                        type="text"
                        value={phase.description}
                        onChange={e => updatePaymentPhase(phase.id, 'description', e.target.value)}
                        placeholder={t('contracts.quotes.paymentTermsDescriptionPlaceholder')}
                        className="min-w-0 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1}`}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {t('contracts.quotes.paymentTermsCalculatedAmountLabel')}{' '}
                    <span className="font-medium text-foreground">
                      {calculatedAmount != null ? formatCurrency(calculatedAmount, currency) : '—'}
                    </span>
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('contracts.quotes.paymentTermsAmountLabel')}
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={phase.amount}
                        onChange={e => updatePaymentPhase(phase.id, 'amount', e.target.value)}
                        placeholder={t('contracts.quotes.paymentTermsAmountPlaceholder')}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1} ${t('contracts.quotes.paymentTermsAmountPlaceholder')}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('contracts.quotes.paymentTermsPaymentDateLabel')}
                      </p>
                      <input
                        type="date"
                        value={phase.paymentDate}
                        onChange={e => updatePaymentPhase(phase.id, 'paymentDate', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1} ${t('contracts.quotes.paymentTermsPaymentDateLabel')}`}
                      />
                    </div>

                    <label className="inline-flex h-10 w-fit items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium text-foreground whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={phase.paid}
                        onChange={e => updatePaymentPhasePaid(phase.id, e.target.checked)}
                        className="h-4 w-4 rounded border-muted-foreground accent-primary"
                        aria-label={`${t('contracts.quotes.paymentTermsLabel')} ${index + 1} ${t('contracts.quotes.paymentTermsPaidLabel')}`}
                      />
                      <span>{t('contracts.quotes.paymentTermsPaidLabel')}</span>
                    </label>
                  </div>
                      </>
                    );
                  })()}
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

