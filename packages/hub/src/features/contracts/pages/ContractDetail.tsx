import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Edit, Trash2, Bell, FileText, TrendingUp } from 'lucide-react';

import AppSectionHeader from '@/components/AppSectionHeader';
import { LazySection } from '@/components/LazySection';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';

import { useContracts } from '@/features/contracts/context/ContractContext';
import { CategoryBadge } from '@/features/contracts/components/CategoryBadge';
import { StatusBadge } from '@/features/contracts/components/StatusBadge';
import { PriceHistoryModal } from '@/features/contracts/components/PriceHistoryModal';
import { QuotesSection } from '@/features/contracts/components/QuotesSection';
import CarElectricityChart from '@/features/contracts/components/CarElectricityChart';
import ElectricityKwhChart from '@/features/contracts/components/ElectricityKwhChart';
import WaterConsumptionChart from '@/features/contracts/components/WaterConsumptionChart';
import { getDaysUntilExpiry, getUrgencyLevel, formatExpiryCountdown } from '@/features/contracts/lib/contractUtils';
import { getContractCategoryIcon } from '@/features/contracts/types/contract';

function formatAlertSummary(alert: { kind: 'days-before' | 'specific-date'; daysBefore: number; specificDate: string | null; reason: string | null }): string {
  if (alert.kind === 'specific-date') {
    if (!alert.specificDate) return 'Specific date alert';
    const parsed = parseISO(alert.specificDate);
    const dateLabel = Number.isNaN(parsed.getTime()) ? alert.specificDate : format(parsed, 'MMM d, yyyy');
    return alert.reason ? `${dateLabel} · ${alert.reason}` : dateLabel;
  }

  return `${alert.daysBefore} days before`;
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContract, deleteContract } = useContracts();
  const { formatCurrency, t } = useI18n();
  const contract = getContract(id!);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const { priceMap } = usePriceHistoryMap(contract ? [contract.id] : []);
  const latestPrice = contract ? priceMap.get(contract.id) : null;

  if (!contract) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('contracts.detail.notFound')}</p>
        <Link to="/contracts" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          ← {t('contracts.detail.backToContracts')}
        </Link>
      </div>
    );
  }

  const urgency = getUrgencyLevel(getDaysUntilExpiry(contract));

  const handleDelete = async () => {
    if (!window.confirm(t('contracts.detail.deleteDialog'))) return;
    try {
      await deleteContract(contract.id);
      navigate('/contracts');
    } catch (err) {
      console.error('Error deleting contract:', err);
      alert(t('contracts.detail.deleteFailed'));
    }
  };

  const infoRows: Array<{ label: string; value: string | null; isStatus?: boolean }> = [
    { label: t('contracts.provider'), value: contract.provider },
    { label: t('contracts.detail.type'), value: t(`contracts.typeLabels.${contract.type}`) },
    ...(contract.type === 'mortgage' && contract.housingUsage
      ? [{ label: t('contracts.detail.housingUse'), value: t(`contracts.housingUsageLabels.${contract.housingUsage}`) }]
      : []),
    { label: t('contracts.detail.billing'), value: t(`contracts.billingLabels.${contract.billingFrequency}`) },
    {
      label: t('contracts.detail.paymentType'),
      value: contract.paymentType ? t(`contracts.paymentTypeLabels.${contract.paymentType}`) : '—',
    },
    {
      label: t('contracts.detail.paymentSource'),
      value: contract.paymentSource || '—',
    },
    ...(contract.paymentType === 'direct-debit' && contract.directDebitTiming
      ? [{ label: t('contracts.form.directDebitTiming'), value: t(`contracts.form.directDebit${contract.directDebitTiming === 'start' ? 'Start' : 'End'}`) }]
      : []),
    { label: t('contracts.detail.renewal'), value: t(`contracts.renewalLabels.${contract.renewalType}`) },
    { label: t('contracts.detail.startDate'), value: format(parseISO(contract.startDate), 'MMM d, yyyy') },
    {
      label: t('contracts.detail.endDate'),
      value: contract.endDate ? format(parseISO(contract.endDate), 'MMM d, yyyy') : t('contracts.detail.noEndDate'),
    },
    { label: t('contracts.detail.currency'), value: contract.currency },
    {
      label: t('contracts.defaultMonthlyValue'),
      value: contract.defaultMonthlyValue != null ? formatCurrency(contract.defaultMonthlyValue, contract.currency) : '—',
    },
    { label: t('common.status'), value: null, isStatus: true },
  ];

  const formatPercent = (value: number | null | undefined) => (value == null ? '—' : `${String(value).replace('.', ',')}%`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AppSectionHeader title="D12 Contracts" icon={FileText} backTo="/contracts" backLabel={t('common.back')} />

      <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '60ms' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{getContractCategoryIcon(contract.category, contract.type)}</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">{contract.name}</h1>
              <p className="text-sm text-muted-foreground">{contract.provider}</p>
              <div className="mt-2 flex items-center gap-2">
                <CategoryBadge category={contract.category} contractType={contract.type} />
                <StatusBadge status={contract.status} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to={`/contracts/edit/${contract.id}`} className="rounded-lg border p-2 transition-colors hover:bg-muted active:scale-95">
              <Edit className="h-4 w-4" />
            </Link>
            <button onClick={handleDelete} className="rounded-lg border p-2 text-destructive transition-colors hover:bg-destructive/10 active:scale-95">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">{t('contracts.detail.price')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {latestPrice ? formatCurrency(latestPrice.price, latestPrice.currency || contract.currency) : t('contracts.detail.noPrice')}
              {latestPrice ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">• {format(parseISO(latestPrice.date), 'MMM d')}</span>
              ) : null}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {t(`contracts.billingLabels.${contract.billingFrequency}`).toLowerCase()}</span>
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t('contracts.detail.expiresIn')}</p>
            <p
              className={cn(
                'text-2xl font-bold tabular-nums',
                urgency === 'critical' && 'text-urgent',
                urgency === 'warning' && 'text-warning'
              )}
            >
              {formatExpiryCountdown(contract)}
            </p>
          </div>
        </div>

        {contract.priceHistoryEnabled ? (
          <button
            onClick={() => setShowPriceHistory(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <TrendingUp className="h-4 w-4" />
            {t('contracts.detail.viewPriceHistory')}
          </button>
        ) : null}
      </div>

      <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '140ms' }}>
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t('contracts.detail.contractDetailsLabel')}</h2>
        <div className="grid grid-cols-2 gap-4">
          {infoRows.map((row) => (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground">{row.label}</p>
              {row.isStatus ? (
                <StatusBadge status={contract.status} />
              ) : (
                <p className="mt-0.5 text-sm font-medium text-foreground">{row.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {contract.type === 'car' ? (
        <LazySection threshold={0.05} rootMargin="200px">
          <CarElectricityChart contractId={contract.id} contractName={contract.name} />
        </LazySection>
      ) : null}

      {contract.category === 'electricity' ? <ElectricityKwhChart contractId={contract.id} /> : null}

      {contract.category === 'water' ? <WaterConsumptionChart contractId={contract.id} /> : null}

      {contract.type === 'mortgage' && contract.mortgageDetails ? (
        <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '170ms' }}>
          <h2 className="mb-4 text-sm font-semibold text-foreground">{t('contracts.detail.mortgage.title')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.principalAmount')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {contract.mortgageDetails.principalAmount != null ? formatCurrency(contract.mortgageDetails.principalAmount, contract.currency) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.term')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {contract.mortgageDetails.totalTermYears ?? '—'} {t('contracts.detail.mortgage.years')} · {contract.mortgageDetails.totalTermMonths ?? '—'} {t('contracts.detail.mortgage.months')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.fixedRate')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {contract.mortgageDetails.fixedRateYears ?? '—'} {t('contracts.detail.mortgage.years')} · {contract.mortgageDetails.fixedRateMonths ?? '—'} {t('contracts.detail.mortgage.months')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.variableRate')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {contract.mortgageDetails.variableRateYears ?? '—'} {t('contracts.detail.mortgage.years')} · {contract.mortgageDetails.variableRateMonths ?? '—'} {t('contracts.detail.mortgage.months')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.tanFixed')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{formatPercent(contract.mortgageDetails.tanFixed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.tanVariable')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{formatPercent(contract.mortgageDetails.tanVariable)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.spread')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{formatPercent(contract.mortgageDetails.spread)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contracts.detail.mortgage.taeg')}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{formatPercent(contract.mortgageDetails.taeg)}</p>
            </div>
          </div>
        </div>
      ) : null}

      {contract.notes ? (
        <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '200ms' }}>
          <h2 className="mb-2 text-sm font-semibold text-foreground">{t('common.notes')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{contract.notes}</p>
        </div>
      ) : null}

      <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '260ms' }}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4" /> {t('contracts.alerts.title')}
        </h2>

        <div className="mb-4">
          <Link
            to={`/contracts/alerts?contractId=${contract.id}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('contracts.alerts.newCustomAlert')}
          </Link>
        </div>

        {contract.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('contracts.alerts.empty')}</p>
        ) : (
          <div className="space-y-2">
            {contract.alerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="text-sm text-foreground">{formatAlertSummary(alert)}</span>
                <div className="flex gap-3 text-xs">
                  <span className={alert.enabled ? 'text-success' : 'text-muted-foreground'}>
                    {alert.enabled ? '✓' : '✗'} {t('contracts.alerts.channelApp')}
                  </span>
                  <span className={alert.telegramEnabled ? 'text-success' : 'text-muted-foreground'}>
                    {alert.telegramEnabled ? '✓' : '✗'} {t('contracts.alerts.channelTelegram')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {contract.documentLinks && contract.documentLinks.length > 0 ? (
        <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '320ms' }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4" /> {t('common.notes')}
          </h2>
          <div className="space-y-2">
            {contract.documentLinks.map((doc, index) => (
              <div key={index} className="flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                <FileText className="h-3 w-3" /> {doc}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <LazySection threshold={0.05} rootMargin="200px">
        <QuotesSection contractId={contract.id} contractCurrency={contract.currency} animationDelay="350ms" />
      </LazySection>

      {showPriceHistory ? (
        <PriceHistoryModal
          contractId={contract.id}
          contractName={contract.name}
          currentPrice={latestPrice?.price ?? 0}
          currency={contract.currency}
          onClose={() => setShowPriceHistory(false)}
        />
      ) : null}
    </div>
  );
}
