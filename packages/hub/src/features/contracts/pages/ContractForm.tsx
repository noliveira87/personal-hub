import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '@/features/contracts/context/ContractContext';
import {
  Contract, ContractCategory, ContractType, RenewalType, BillingFrequency, ContractStatus, ContractPaymentType,
  CATEGORY_LABELS, CATEGORY_NAME_KEYS, TYPE_LABELS, RENEWAL_LABELS, BILLING_LABELS, PAYMENT_TYPE_LABELS, AlertSetting, HOUSING_USAGE_LABELS, normalizeAlertSetting,
} from '@/features/contracts/types/contract';
import { Plus, X, Loader, FileText, Send } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { sendTelegramMessage } from '@/lib/telegram';
import { toast } from '@/components/ui/sonner';
import { addTestAppAlert } from '@/features/contracts/lib/alertReadState';
import { getDisplayContractStatus } from '@/features/contracts/lib/contractUtils';

const defaultAlert = (kind: AlertSetting['kind'] = 'days-before'): AlertSetting => ({
  kind,
  daysBefore: 30,
  specificDate: kind === 'specific-date' ? new Date().toISOString().split('T')[0] : null,
  reason: null,
  enabled: true,
  telegramEnabled: false,
});

const defaultMortgageDetails = () => ({
  principalAmount: null,
  totalTermYears: null,
  totalTermMonths: null,
  fixedRateYears: null,
  fixedRateMonths: null,
  variableRateYears: null,
  variableRateMonths: null,
  tanFixed: null,
  tanVariable: null,
  spread: null,
  taeg: null,
});

const emptyContract = (): Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', category: 'other', provider: '', type: 'other',
  housingUsage: null,
  mortgageDetails: null,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  noEndDate: false,
  renewalType: 'auto-renew', billingFrequency: 'monthly',
  paymentType: null, paymentSource: null, directDebitTiming: null,
  price: 0, currency: 'EUR', notes: null, status: 'active',
  alerts: [defaultAlert()], telegramAlertEnabled: false, documentLinks: null,
  priceHistoryEnabled: true,
  defaultMonthlyValue: null,
});

const TYPE_CATEGORY_OPTIONS: Record<ContractType, ContractCategory[]> = {
  mortgage: ['mortgage'],
  insurance: ['home-insurance', 'apartment-insurance'],
  utility: ['gas', 'electricity', 'water'],
  telecom: ['internet', 'mobile'],
  subscription: ['tv-streaming', 'software', 'gym', 'other'],
  maintenance: ['maintenance', 'security-alarm'],
  car: ['car'],
  card: ['card-credit', 'card-debit', 'other'],
  other: ['other'],
};

function getAllowedCategories(type: ContractType): ContractCategory[] {
  return TYPE_CATEGORY_OPTIONS[type];
}

function getDefaultCategory(type: ContractType): ContractCategory {
  return getAllowedCategories(type)[0];
}

function isCategoryAllowed(type: ContractType, category: ContractCategory): boolean {
  return getAllowedCategories(type).includes(category);
}

const DIRECT_DEBIT_SOURCES = ['ABanca', 'Santander', 'Crédito Agrícola'] as const;

export default function ContractForm() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addContract, updateContract, getContract } = useContracts();
  const isEdit = !!id;
  const [submitting, setSubmitting] = useState(false);
  const [testingAlertIndex, setTestingAlertIndex] = useState<number | null>(null);

  const [form, setForm] = useState(emptyContract());
  const defaultEndDate = useState(() => new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0])[0];
  const categoryOptions = getAllowedCategories(form.type);

  useEffect(() => {
    if (isEdit) {
      const existing = getContract(id!);
      if (existing) {
        const { id: _, createdAt, updatedAt, ...rest } = existing;
        setForm({
          ...rest,
          alerts: rest.alerts.map(normalizeAlertSetting),
        });
      }
    }
  }, [id, isEdit, getContract]);

  useEffect(() => {
    if (!isCategoryAllowed(form.type, form.category)) {
      setForm(prev => ({
        ...prev,
        category: getDefaultCategory(prev.type),
      }));
    }
  }, [form.type, form.category]);

  useEffect(() => {
    const normalizedFormEndDate = form.noEndDate ? null : form.endDate;
    const syncedStatus = getDisplayContractStatus({
      status: form.status,
      endDate: normalizedFormEndDate,
    });

    if (syncedStatus !== form.status) {
      setForm((prev) => ({ ...prev, status: syncedStatus }));
    }
  }, [form.status, form.endDate, form.noEndDate]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const normalizedEndDate = form.noEndDate ? null : form.endDate;

      if (!form.noEndDate && !normalizedEndDate) {
        toast.error(t('contracts.form.validation.endDateRequired'));
        return;
      }

      if (normalizedEndDate && normalizedEndDate < form.startDate) {
        toast.error(t('contracts.form.validation.endDateAfterStart'));
        return;
      }

      const hasInvalidSpecificAlert = form.alerts.some(
        (alert) => alert.kind === 'specific-date' && (!alert.specificDate || !alert.reason?.trim()),
      );
      if (hasInvalidSpecificAlert) {
        toast.error(t('contracts.form.validation.specificAlertRequiresDateAndReason'));
        return;
      }

      // Always set price to 0 - prices are managed only through price history
      const submitData = {
        ...form,
        category: isCategoryAllowed(form.type, form.category) ? form.category : getDefaultCategory(form.type),
        housingUsage: form.type === 'mortgage' ? form.housingUsage : null,
        mortgageDetails: form.type === 'mortgage' ? (form.mortgageDetails ?? defaultMortgageDetails()) : null,
        endDate: normalizedEndDate,
        status: getDisplayContractStatus({
          status: form.status,
          endDate: normalizedEndDate,
        }),
        price: 0,
      };

      const savedContract = isEdit
        ? await updateContract({ ...submitData, id: id!, createdAt: getContract(id!)!.createdAt, updatedAt: new Date().toISOString() })
        : await addContract(submitData);

      navigate(`/contracts/${savedContract.id}`);
    } catch (err) {
      console.error('Error saving contract:', err);
      toast.error(t('contracts.form.validation.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const addAlert = () => set('alerts', [...form.alerts, defaultAlert()]);
  const removeAlert = (i: number) => set('alerts', form.alerts.filter((_, idx) => idx !== i));
  const updateAlert = (i: number, patch: Partial<AlertSetting>) =>
    set('alerts', form.alerts.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  const updateAlertKind = (i: number, kind: AlertSetting['kind']) => {
    set('alerts', form.alerts.map((alert, idx) => {
      if (idx !== i) return alert;
      if (kind === 'specific-date') {
        return {
          ...alert,
          kind,
          specificDate: alert.specificDate ?? new Date().toISOString().split('T')[0],
        };
      }

      return {
        ...alert,
        kind,
        specificDate: null,
      };
    }));
  };

  const buildAlertTestMessage = (alertConfig: AlertSetting): string => {
    const contractName = form.name.trim() || t('contracts.form.unnamedContract');
    const provider = form.provider.trim() || t('contracts.form.unknownProvider');
    const triggerText = alertConfig.kind === 'specific-date'
      ? t('contracts.alerts.triggerTextDate', { date: alertConfig.specificDate ?? 'n/a' })
      : t('contracts.alerts.triggerTextDaysBefore', { days: String(alertConfig.daysBefore) });
    const reasonText = alertConfig.reason?.trim()
      ? `\n${t('contracts.alerts.telegramMessageLabel')}: ${alertConfig.reason.trim()}`
      : '';
    
    let paymentText = '';
    if (form.paymentType === 'direct-debit') {
      const timing = form.directDebitTiming === 'start' 
        ? t('contracts.form.directDebitStart')
        : form.directDebitTiming === 'end'
        ? t('contracts.form.directDebitEnd')
        : 'N/A';
      paymentText = `\n${t('contracts.alerts.telegramPaymentTypeLabel')}: ${t('contracts.alerts.telegramDirectDebitLabel')} (${timing})`;
    }

    return `🧪 <b>${t('contracts.alerts.telegramTitle')}</b>\n\n${t('contracts.alerts.telegramContractLabel')}: <b>${contractName}</b>\n${t('contracts.alerts.telegramProviderLabel')}: ${provider}\n${t('contracts.alerts.telegramTriggerLabel')}: ${triggerText}${reasonText}${paymentText}`;
  };

  const testAlert = async (alertConfig: AlertSetting, index: number) => {
    if (!alertConfig.enabled && !alertConfig.telegramEnabled) {
      toast.error(t('contracts.alerts.validation.enableOneChannel'));
      return;
    }

    const preview = `${t('contracts.alerts.previewTitle', { contract: form.name.trim() || t('contracts.form.unnamedContract') })}\n${
      alertConfig.kind === 'specific-date'
        ? `${t('contracts.alerts.form.specificDate')}: ${alertConfig.specificDate ?? 'n/a'}\n${t('contracts.alerts.telegramMessageLabel')}: ${alertConfig.reason ?? 'n/a'}`
        : t('contracts.alerts.triggerTextDaysBefore', { days: String(alertConfig.daysBefore) })
    }`;

    try {
      setTestingAlertIndex(index);

      if (alertConfig.enabled) {
        addTestAppAlert({
          contractId: id ?? `draft:${form.name.trim() || 'contract'}`,
          contractName: form.name.trim() || t('contracts.form.unnamedContract'),
          provider: form.provider.trim() || t('contracts.form.unknownProvider'),
          triggerDate: new Date(),
          triggerLabel: t('contracts.alerts.testAlertLabel'),
          reason: alertConfig.reason?.trim() || preview,
        });
        toast(t('contracts.alerts.appTestPreviewTitle'), {
          description: preview,
        });
      }

      if (alertConfig.telegramEnabled) {
        if (!form.telegramAlertEnabled) {
          throw new Error(t('contracts.alerts.validation.enableContractTelegramFirst'));
        }
        await sendTelegramMessage(buildAlertTestMessage(alertConfig));
      }

      toast.success(t('contracts.alerts.toast.testSent'));
    } catch (error) {
      console.error('Failed to test alert:', error);
      const message = error instanceof Error ? error.message : t('contracts.alerts.toast.testFailed');
      toast.error(message);
    } finally {
      setTestingAlertIndex(null);
    }
  };

  const updateMortgage = <K extends keyof NonNullable<typeof form.mortgageDetails>>(key: K, value: NonNullable<typeof form.mortgageDetails>[K]) =>
    setForm(prev => ({
      ...prev,
      mortgageDetails: {
        ...(prev.mortgageDetails ?? defaultMortgageDetails()),
        [key]: value,
      },
    }));

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow';
  const labelClass = 'text-sm font-medium text-foreground mb-1.5 block';

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <AppSectionHeader title={t('contracts.menu')} icon={FileText} backTo="/contracts" backLabel={t('contracts.backToContracts')} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '60ms' }}>
          {isEdit ? t('common.edit') + ' ' + t('contracts.menu').toLowerCase() : t('contracts.addContract')}
        </h1>
        <button
          type="button"
          aria-label={t('common.close')}
          className="ml-2 p-2 rounded-full hover:bg-muted transition-colors"
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
        {/* Basic info */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{t('contracts.form.basicInformation')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('common.name')} *</label>
              <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required placeholder={t('contracts.namePlaceholder') ?? 'e.g. Home Insurance'} disabled={submitting} />
            </div>
            <div>
              <label className={labelClass}>{t('contracts.provider')} *</label>
              <input className={inputClass} value={form.provider} onChange={e => set('provider', e.target.value)} required placeholder={t('contracts.providerPlaceholder') ?? 'e.g. Allianz'} disabled={submitting} />
            </div>
            <div>
              <label className={labelClass}>{t('contracts.detail.type')}</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={e => {
                  const nextType = e.target.value as ContractType;
                  setForm(prev => ({
                    ...prev,
                    type: nextType,
                    category: isCategoryAllowed(nextType, prev.category)
                      ? prev.category
                      : getDefaultCategory(nextType),
                    housingUsage: nextType === 'mortgage' ? (prev.housingUsage ?? 'primary-residence') : null,
                    mortgageDetails: nextType === 'mortgage' ? (prev.mortgageDetails ?? defaultMortgageDetails()) : null,
                  }));
                }}
                disabled={submitting}
              >
                {Object.keys(TYPE_LABELS).map((k) => <option key={k} value={k}>{t(`contracts.typeLabels.${k}`)}</option>)}
              </select>
            </div>
            {form.type !== 'mortgage' && (
              <div>
                <label className={labelClass}>{t('contracts.form.category')}</label>
                <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value as ContractCategory)} disabled={submitting}>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>
                      {t(`contracts.categoryNames.${CATEGORY_NAME_KEYS[category]}`) || CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">{t('contracts.form.categoryDependsOnType')}</p>
              </div>
            )}
            {form.type === 'mortgage' && (
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs text-muted-foreground">{t('contracts.form.mortgageCategoryAuto')}</p>
                <label className={labelClass}>{t('contracts.detail.housingUse')}</label>
                <select
                  className={inputClass}
                  value={form.housingUsage ?? 'primary-residence'}
                  onChange={e => set('housingUsage', e.target.value as Contract['housingUsage'])}
                  disabled={submitting}
                >
                  {Object.entries(HOUSING_USAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {form.type === 'mortgage' && (
          <div className="bg-card rounded-xl p-6 border space-y-4">
            <h2 className="text-sm font-semibold text-foreground">{t('contracts.detail.mortgage.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('contracts.detail.mortgage.principalAmount')}</label>
                <input type="number" step="0.01" className={inputClass} value={form.mortgageDetails?.principalAmount ?? ''} onChange={e => updateMortgage('principalAmount', e.target.value ? parseFloat(e.target.value) : null)} disabled={submitting} />
              </div>
              <div />
              <div>
                <label className={labelClass}>Prazo total (anos)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.totalTermYears ?? ''} onChange={e => updateMortgage('totalTermYears', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Prazo total (meses)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.totalTermMonths ?? ''} onChange={e => updateMortgage('totalTermMonths', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Taxa fixa (anos)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.fixedRateYears ?? ''} onChange={e => updateMortgage('fixedRateYears', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Taxa fixa (meses)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.fixedRateMonths ?? ''} onChange={e => updateMortgage('fixedRateMonths', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Taxa variável (anos)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.variableRateYears ?? ''} onChange={e => updateMortgage('variableRateYears', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Taxa variável (meses)</label>
                <input type="number" className={inputClass} value={form.mortgageDetails?.variableRateMonths ?? ''} onChange={e => updateMortgage('variableRateMonths', e.target.value ? parseInt(e.target.value, 10) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>TAN fixa (%)</label>
                <input type="number" step="0.001" className={inputClass} value={form.mortgageDetails?.tanFixed ?? ''} onChange={e => updateMortgage('tanFixed', e.target.value ? parseFloat(e.target.value) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>TAN variável (%)</label>
                <input type="number" step="0.001" className={inputClass} value={form.mortgageDetails?.tanVariable ?? ''} onChange={e => updateMortgage('tanVariable', e.target.value ? parseFloat(e.target.value) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>Spread (%)</label>
                <input type="number" step="0.001" className={inputClass} value={form.mortgageDetails?.spread ?? ''} onChange={e => updateMortgage('spread', e.target.value ? parseFloat(e.target.value) : null)} disabled={submitting} />
              </div>
              <div>
                <label className={labelClass}>TAEG (%)</label>
                <input type="number" step="0.001" className={inputClass} value={form.mortgageDetails?.taeg ?? ''} onChange={e => updateMortgage('taeg', e.target.value ? parseFloat(e.target.value) : null)} disabled={submitting} />
              </div>
            </div>
          </div>
        )}

        {/* Dates & billing */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{t('contracts.form.datesAndBilling')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('contracts.detail.startDate')}</label>
              <input type="date" className={inputClass} value={form.startDate} onChange={e => set('startDate', e.target.value)} disabled={submitting} />
            </div>
            <div className="relative">
              <label className={labelClass}>{t('contracts.detail.endDate')}</label>
              <input 
                type="date" 
                className={inputClass} 
                value={form.endDate ?? ''} 
                onChange={e => set('endDate', e.target.value || null)}
                disabled={form.noEndDate || submitting} 
              />
              {form.noEndDate && (
                <div className="absolute inset-0 bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm rounded-lg flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">{t('contracts.detail.noEndDate')}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.noEndDate}
                  onChange={e => {
                    const checked = e.target.checked;
                    setForm(prev => ({
                      ...prev,
                      noEndDate: checked,
                      endDate: checked ? null : prev.endDate ?? defaultEndDate,
                    }));
                  }}
                  disabled={submitting}
                />
                <span>{t('contracts.detail.noEndDate')}</span>
              </label>
            </div>
            <div>
              <label className={labelClass}>{t('contracts.detail.renewal')}</label>
              <select className={inputClass} value={form.renewalType} onChange={e => set('renewalType', e.target.value as RenewalType)} disabled={submitting}>
                {Object.entries(RENEWAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('contracts.detail.billing')}</label>
              <select className={inputClass} value={form.billingFrequency} onChange={e => set('billingFrequency', e.target.value as BillingFrequency)} disabled={submitting}>
                {Object.entries(BILLING_LABELS).map(([k, v]) => <option key={k} value={k}>{t(`contracts.billingLabels.${k}`) || v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('contracts.paymentType')}</label>
              <select
                className={inputClass}
                value={form.paymentType ?? ''}
                onChange={e => {
                  const nextPaymentType = (e.target.value || null) as ContractPaymentType | null;
                  setForm(prev => ({
                    ...prev,
                    paymentType: nextPaymentType,
                    paymentSource: nextPaymentType === 'direct-debit'
                      ? (DIRECT_DEBIT_SOURCES.includes((prev.paymentSource ?? '') as typeof DIRECT_DEBIT_SOURCES[number]) ? prev.paymentSource : null)
                      : prev.paymentSource,
                    directDebitTiming: nextPaymentType === 'direct-debit'
                      ? (prev.directDebitTiming ?? 'end')
                      : null,
                  }));
                }}
                disabled={submitting}
              >
                <option value="">{t('contracts.notDefined')}</option>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{t(`contracts.paymentTypeLabels.${k}`) || v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {form.paymentType === 'direct-debit' ? t('contracts.form.directDebitBank') : t('contracts.paymentSource')}
              </label>
              {form.paymentType === 'direct-debit' ? (
                <select
                  className={inputClass}
                  value={form.paymentSource ?? ''}
                  onChange={e => set('paymentSource', e.target.value || null)}
                  disabled={submitting}
                >
                  <option value="">{t('contracts.form.selectOption')}</option>
                  {DIRECT_DEBIT_SOURCES.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={form.paymentSource ?? ''}
                  onChange={e => set('paymentSource', e.target.value || null)}
                  placeholder={t('contracts.paymentSourcePlaceholder')}
                  disabled={submitting}
                />
              )}
            </div>
            {form.paymentType === 'direct-debit' && (
            <div>
              <label className={labelClass}>{t('contracts.form.directDebitTiming')}</label>
              <select
                className={inputClass}
                value={form.directDebitTiming ?? ''}
                onChange={e => set('directDebitTiming', (e.target.value || null) as any)}
                disabled={submitting}
              >
                <option value="">{t('contracts.form.selectOption')}</option>
                <option value="start">{t('contracts.form.directDebitStart')}</option>
                <option value="end">{t('contracts.form.directDebitEnd')}</option>
              </select>
            </div>
            )}
            <div>
              <label className={labelClass}>{t('contracts.defaultMonthlyValue')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.defaultMonthlyValue ?? ''}
                onChange={e => set('defaultMonthlyValue', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('contracts.defaultMonthlyValuePlaceholder')}
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('contracts.defaultMonthlyValueHint')}</p>
            </div>
            <div>
              <label className={labelClass}>{t('contracts.detail.currency')}</label>
              <select className={inputClass} value={form.currency} onChange={e => set('currency', e.target.value)} disabled={submitting}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>
        </div>

        {/* Price History - now mandatory for all contracts */}

        {/* Status & notes */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{t('common.status')} & {t('common.notes')}</h2>
          <div>
            <label className={labelClass}>{t('common.status')}</label>
            <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as ContractStatus)} disabled={submitting}>
              {Object.entries({
                active: 'active',
                'pending-cancellation': 'pending-cancellation',
                expired: 'expired',
                archived: 'archived',
              } as Record<string, ContractStatus>).map(([k, v]) => <option key={k} value={v}>{t(`contracts.statusLabels.${v}`)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('common.notes')}</label>
            <textarea className={inputClass + ' min-h-[80px] resize-y'} value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} placeholder={t('contracts.form.optionalNotesPlaceholder')} disabled={submitting} />
          </div>
          
          {/* Info about price */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>{t('contracts.form.tipLabel')}</strong> {t('contracts.form.priceLinkTip')}
            </p>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t('contracts.alerts.title')}</h2>
            <button type="button" onClick={addAlert} disabled={submitting} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline disabled:opacity-50">
              <Plus className="w-3 h-3" /> {t('contracts.form.addAlert')}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={form.telegramAlertEnabled} onChange={e => set('telegramAlertEnabled', e.target.checked)} disabled={submitting} className="rounded" />
            <label className="text-sm text-foreground">{t('contracts.form.enableTelegramNotifications')}</label>
          </div>
          {form.alerts.map((alertItem, i) => (
            <div key={i} className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <select
                  value={alertItem.kind}
                  onChange={e => updateAlertKind(i, e.target.value as AlertSetting['kind'])}
                  disabled={submitting}
                  className="px-2 py-1.5 rounded border bg-card text-sm"
                >
                  <option value="days-before">{t('contracts.alerts.form.daysBeforeExpiry')}</option>
                  <option value="specific-date">{t('contracts.alerts.form.specificDate')}</option>
                </select>

                {alertItem.kind === 'days-before' ? (
                  <>
                    <input
                      type="number"
                      min="1"
                      value={alertItem.daysBefore}
                      onChange={e => updateAlert(i, { daysBefore: parseInt(e.target.value, 10) || 1 })}
                      disabled={submitting}
                      className="w-20 px-2 py-1.5 rounded border bg-card text-sm text-center"
                    />
                    <span className="text-sm text-muted-foreground">{t('contracts.form.daysBefore')}</span>
                  </>
                ) : (
                  <>
                    <input
                      type="date"
                      value={alertItem.specificDate ?? ''}
                      onChange={e => updateAlert(i, { specificDate: e.target.value || null })}
                      disabled={submitting}
                      className="px-2 py-1.5 rounded border bg-card text-sm"
                    />
                    <input
                      type="text"
                      value={alertItem.reason ?? ''}
                      onChange={e => updateAlert(i, { reason: e.target.value || null })}
                      disabled={submitting}
                      className="flex-1 min-w-[180px] px-2 py-1.5 rounded border bg-card text-sm"
                      placeholder={t('contracts.form.reasonForAlertPlaceholder')}
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => removeAlert(i)}
                  disabled={submitting}
                  className="p-1 hover:bg-muted rounded active:scale-95 disabled:opacity-50"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={alertItem.enabled} onChange={e => updateAlert(i, { enabled: e.target.checked })} disabled={submitting} />
                  {t('contracts.alerts.channelApp')}
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={alertItem.telegramEnabled} onChange={e => updateAlert(i, { telegramEnabled: e.target.checked })} disabled={submitting} />
                  {t('contracts.alerts.channelTelegram')}
                </label>
                <button
                  type="button"
                  onClick={() => testAlert(alertItem, i)}
                  disabled={submitting || testingAlertIndex === i}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border bg-card hover:bg-muted disabled:opacity-50"
                >
                  {testingAlertIndex === i ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {t('contracts.alerts.form.test')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader className="w-4 h-4 animate-spin" />}
          {submitting ? t('common.save') + '...' : isEdit ? t('common.save') : t('contracts.addContract')}
        </button>
      </form>
    </div>
  );
}
