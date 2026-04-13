import { useMemo, useState } from 'react';
import { Building2, ChevronDown, FileText, Wallet } from 'lucide-react';

import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { ContractPaymentType } from '@/features/contracts/types/contract';

const PAYMENT_TYPE_ORDER: ContractPaymentType[] = ['direct-debit', 'entity-reference', 'card'];
const DIRECT_DEBIT_BANKS = ['ABanca', 'Santander', 'Crédito Agrícola'] as const;
const DIRECT_DEBIT_TIMINGS = ['start', 'end', 'undefined'] as const;

export default function PaymentsBreakdownPage() {
  const { contracts } = useContracts();
  const { t } = useI18n();
  const [openPaymentType, setOpenPaymentType] = useState<ContractPaymentType | null>(null);

  const contractsWithPayment = useMemo(
    () => contracts.filter((contract) => !!contract.paymentType),
    [contracts],
  );

  const byPaymentType = useMemo(() => {
    return PAYMENT_TYPE_ORDER.map((paymentType) => ({
      paymentType,
      count: contractsWithPayment.filter((contract) => contract.paymentType === paymentType).length,
    }));
  }, [contractsWithPayment]);

  const byDirectDebitBank = useMemo(() => {
    return DIRECT_DEBIT_BANKS.map((bank) => {
      const bankContracts = contractsWithPayment.filter(
        (contract) => contract.paymentType === 'direct-debit' && contract.paymentSource?.trim() === bank,
      );

      return {
        bank,
        totalCount: bankContracts.length,
        timings: DIRECT_DEBIT_TIMINGS.map((timing) => {
          const timingContracts = bankContracts.filter((contract) => {
            if (timing === 'undefined') {
              return contract.directDebitTiming == null;
            }

            return contract.directDebitTiming === timing;
          });

          return {
            timing,
            timingLabel:
              timing === 'start'
                ? t('contracts.form.directDebitStart')
                : timing === 'end'
                  ? t('contracts.form.directDebitEnd')
                  : t('contracts.payments.undefinedTiming'),
            count: timingContracts.length,
            contracts: timingContracts,
          };
        }),
      };
    });
  }, [contractsWithPayment, t]);

  const byCardType = useMemo(() => {
    const grouped = new Map<string, typeof contracts>();

    contractsWithPayment.forEach((contract) => {
      if (contract.paymentType !== 'card') return;

      const cardName = contract.paymentSource?.trim() || t('contracts.notDefined');
      const current = grouped.get(cardName) ?? [];
      current.push(contract);
      grouped.set(cardName, current);
    });

    return Array.from(grouped.entries())
      .map(([label, groupedContracts]) => ({
        label,
        count: groupedContracts.length,
        contracts: groupedContracts,
      }))
      .sort((a, b) => b.count - a.count);
  }, [contractsWithPayment, t]);

  const byEntityReference = useMemo(() => {
    const grouped = new Map<string, typeof contracts>();

    contractsWithPayment.forEach((contract) => {
      if (contract.paymentType !== 'entity-reference') return;

      const entityLabel = contract.paymentSource?.trim() || t('contracts.notDefined');
      const current = grouped.get(entityLabel) ?? [];
      current.push(contract);
      grouped.set(entityLabel, current);
    });

    return Array.from(grouped.entries())
      .map(([label, groupedContracts]) => ({
        label,
        count: groupedContracts.length,
        contracts: groupedContracts,
      }))
      .sort((a, b) => b.count - a.count);
  }, [contractsWithPayment, t]);

  return (
    <div className="space-y-8">
      <AppSectionHeader title={t('contracts.menu')} icon={FileText} />

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">{t('contracts.payments.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('contracts.payments.subtitle')}</p>
      </div>

      {contractsWithPayment.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {t('contracts.payments.empty')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
            {byPaymentType.map((row, i) => (
              <button
                key={row.paymentType}
                type="button"
                onClick={() => {
                  setOpenPaymentType((value) => (value === row.paymentType ? null : row.paymentType));
                }}
                className={[
                  'rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 animate-fade-up text-left',
                  'cursor-pointer hover:shadow-md hover:border-primary/40',
                  openPaymentType === row.paymentType ? 'border-primary/50 shadow-md' : '',
                ].join(' ')}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t(`contracts.paymentTypeLabels.${row.paymentType}`)}
                      </p>
                    </div>
                    <p className="text-2xl font-bold tracking-tight text-foreground">{row.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('contracts.payments.contractsCount', { count: String(row.count) })}</p>
                  </div>
                  <ChevronDown
                    className={[
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300',
                      openPaymentType === row.paymentType ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </div>
              </button>
            ))}
          </div>

          <div
            className={[
              'overflow-hidden transition-all duration-500 ease-out',
              openPaymentType === 'direct-debit' ? 'max-h-[2400px] opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}
          >
            <div className="animate-fade-up space-y-4 pt-2" style={{ animationDelay: '120ms' }}>
              <h2 className="text-lg font-semibold text-foreground">{t('contracts.payments.byDirectDebitBank')}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {byDirectDebitBank.map((bankData, i) => (
                  <div
                    key={bankData.bank}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length) * 60}ms` }}
                  >
                    <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{bankData.bank}</p>
                          <p className="text-xs text-muted-foreground">{t('contracts.payments.contractsCount', { count: String(bankData.totalCount) })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {bankData.timings.map((timing) => (
                        <div
                          key={`${bankData.bank}-${timing.timing}`}
                          className="rounded-xl border border-border/50 bg-background/70 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {timing.timingLabel}
                            </p>
                            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                              {timing.count}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {timing.contracts.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t('contracts.payments.noContractsInTiming')}</p>
                            ) : (
                              timing.contracts.map((contract) => (
                                <div key={contract.id} className="rounded-lg bg-muted/30 px-3 py-2">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {contract.name || t('contracts.form.unnamedContract')}
                                  </p>
                                  {contract.provider && (
                                    <p className="mt-1 text-xs text-muted-foreground truncate">{contract.provider}</p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={[
              'overflow-hidden transition-all duration-500 ease-out',
              openPaymentType === 'entity-reference' ? 'max-h-[2400px] opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}
          >
            <div className="animate-fade-up space-y-4 pt-2" style={{ animationDelay: '120ms' }}>
              <h2 className="text-lg font-semibold text-foreground">{t('contracts.paymentTypeLabels.entity-reference')}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {byEntityReference.map((group, i) => (
                  <div
                    key={group.label}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length) * 60}ms` }}
                  >
                    <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{group.label}</p>
                          <p className="text-xs text-muted-foreground">{t('contracts.payments.contractsCount', { count: String(group.count) })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {group.contracts.map((contract) => (
                        <div key={contract.id} className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-xs font-medium text-foreground truncate">
                            {contract.name || t('contracts.form.unnamedContract')}
                          </p>
                          {contract.provider && (
                            <p className="mt-1 text-xs text-muted-foreground truncate">{contract.provider}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={[
              'overflow-hidden transition-all duration-500 ease-out',
              openPaymentType === 'card' ? 'max-h-[2400px] opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}
          >
            <div className="animate-fade-up space-y-4 pt-2" style={{ animationDelay: '120ms' }}>
              <h2 className="text-lg font-semibold text-foreground">{t('contracts.paymentTypeLabels.card')}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {byCardType.map((group, i) => (
                  <div
                    key={group.label}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length) * 60}ms` }}
                  >
                    <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{group.label}</p>
                          <p className="text-xs text-muted-foreground">{t('contracts.payments.contractsCount', { count: String(group.count) })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {group.contracts.map((contract) => (
                        <div key={contract.id} className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-xs font-medium text-foreground truncate">
                            {contract.name || t('contracts.form.unnamedContract')}
                          </p>
                          {contract.provider && (
                            <p className="mt-1 text-xs text-muted-foreground truncate">{contract.provider}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}