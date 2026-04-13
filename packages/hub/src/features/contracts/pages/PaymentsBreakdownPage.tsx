import { useMemo } from 'react';
import { FileText, Wallet, Building2 } from 'lucide-react';

import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { ContractPaymentType } from '@/features/contracts/types/contract';
import { getMonthlyEquivalent } from '@/features/contracts/lib/contractUtils';

export default function PaymentsBreakdownPage() {
  const { contracts } = useContracts();
  const { t } = useI18n();

  const contractsWithPayment = useMemo(
    () => contracts.filter((contract) => !!contract.paymentType),
    [contracts],
  );

  const byPaymentType = useMemo(() => {
    const map = new Map<ContractPaymentType, { count: number; monthlyTotal: number }>();

    contractsWithPayment.forEach((contract) => {
      if (!contract.paymentType) return;
      const current = map.get(contract.paymentType) ?? { count: 0, monthlyTotal: 0 };
      map.set(contract.paymentType, {
        count: current.count + 1,
        monthlyTotal: current.monthlyTotal + getMonthlyEquivalent(contract),
      });
    });

    return Array.from(map.entries())
      .map(([paymentType, value]) => ({
        paymentType,
        count: value.count,
        monthlyTotal: Math.round(value.monthlyTotal * 100) / 100,
      }))
      .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
  }, [contractsWithPayment]);

  const byDirectDebitBank = useMemo(() => {
    const map = new Map<string, { contracts: typeof contracts; timing: string }[]>();

    contractsWithPayment.forEach((contract) => {
      if (contract.paymentType !== 'direct-debit' || !contract.paymentSource) return;

      const bank = contract.paymentSource.trim();
      if (!map.has(bank)) {
        map.set(bank, []);
      }

      const bankData = map.get(bank)!;
      const key = `${bank}|${contract.directDebitTiming}`;
      const existing = bankData.find(d => d.timing === contract.directDebitTiming);
      
      if (existing) {
        existing.contracts.push(contract);
      } else {
        bankData.push({
          contracts: [contract],
          timing: contract.directDebitTiming || 'unknown',
        });
      }
    });

    return Array.from(map.entries())
      .map(([bank, timingData]) => ({
        bank,
        totalCount: timingData.reduce((sum, td) => sum + td.contracts.length, 0),
        timings: timingData.map(td => ({
          timing: td.timing,
          timingLabel: td.timing === 'start' ? t('contracts.form.directDebitStart') : t('contracts.form.directDebitEnd'),
          count: td.contracts.length,
          contracts: td.contracts,
        })),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [contractsWithPayment, t]);

  const byCardType = useMemo(() => {
    const map = new Map<string, typeof contracts>();

    contractsWithPayment.forEach((contract) => {
      if (contract.paymentType !== 'card' || !contract.paymentSource) return;

      const card = contract.paymentSource.trim();
      if (!map.has(card)) {
        map.set(card, []);
      }
      map.get(card)!.push(contract);
    });

    return Array.from(map.entries())
      .map(([card, contracts]) => ({
        card,
        count: contracts.length,
        contracts,
      }))
      .sort((a, b) => b.count - a.count);
  }, [contractsWithPayment]);

  const byEntityReference = useMemo(() => {
    const contracts = contractsWithPayment.filter(c => c.paymentType === 'entity-reference' && c.paymentSource);
    
    if (contracts.length === 0) return [];

    const map = new Map<string, typeof contractsWithPayment>();

    contracts.forEach((contract) => {
      const entity = contract.paymentSource!.trim();
      if (!map.has(entity)) {
        map.set(entity, []);
      }
      map.get(entity)!.push(contract);
    });

    return Array.from(map.entries())
      .map(([entity, refs]) => ({
        entity,
        count: refs.length,
        contracts: refs,
      }))
      .sort((a, b) => b.count - a.count);
  }, [contractsWithPayment]);

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
          {/* Payment Types Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
            {byPaymentType.map((row, i) => (
              <div
                key={row.paymentType}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-up"
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
                </div>
              </div>
            ))}
          </div>

          {/* Direct Debit Banks Breakdown */}
          {byDirectDebitBank.length > 0 && (
            <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
              <h2 className="text-lg font-semibold text-foreground mb-4">Débitos Diretos por Banco</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {byDirectDebitBank.map((bankData, i) => (
                  <div
                    key={bankData.bank}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length) * 60}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{bankData.bank}</p>
                          <p className="text-xs text-muted-foreground">{bankData.totalCount} contrato(s)</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {bankData.timings.map((timing) => (
                          <div
                            key={`${bankData.bank}-${timing.timing}`}
                            className="rounded-lg bg-muted/30 p-3.5 border border-border/40"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{timing.timingLabel}</p>
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-semibold text-xs">
                                {timing.count}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {timing.contracts.slice(0, 3).map((contract) => (
                                <div key={contract.id} className="text-xs">
                                  <p className="text-foreground truncate">
                                    • {contract.name || t('contracts.form.unnamedContract')}
                                  </p>
                                  {contract.provider && (
                                    <p className="text-muted-foreground text-xs ml-4">{contract.provider}</p>
                                  )}
                                </div>
                              ))}
                              {timing.contracts.length > 3 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{timing.contracts.length - 3} mais
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards Breakdown */}
          {byCardType.length > 0 && (
            <div className="animate-fade-up" style={{ animationDelay: `${120 + byDirectDebitBank.length * 60}ms` }}>
              <h2 className="text-lg font-semibold text-foreground mb-4">{t(`contracts.paymentTypeLabels.card`)}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {byCardType.map((cardData, i) => (
                  <div
                    key={cardData.card}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length + byDirectDebitBank.length) * 60}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{cardData.card}</p>
                          <p className="text-xs text-muted-foreground">{cardData.count} contrato(s)</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/30 p-3.5 border border-border/40">
                        <div className="space-y-1.5">
                          {cardData.contracts.slice(0, 3).map((contract) => (
                            <div key={contract.id} className="text-xs">
                              <p className="text-foreground truncate">
                                • {contract.name || t('contracts.form.unnamedContract')}
                              </p>
                              {contract.provider && (
                                <p className="text-muted-foreground text-xs ml-4">{contract.provider}</p>
                              )}
                            </div>
                          ))}
                          {cardData.contracts.length > 3 && (
                            <p className="text-xs text-muted-foreground italic">
                              +{cardData.contracts.length - 3} mais
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity References Breakdown */}
          {byEntityReference.length > 0 && (
            <div className="animate-fade-up" style={{ animationDelay: `${120 + (byDirectDebitBank.length + byCardType.length) * 60}ms` }}>
              <h2 className="text-lg font-semibold text-foreground mb-4">{t(`contracts.paymentTypeLabels.entity-reference`)}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {byEntityReference.map((entityData, i) => (
                  <div
                    key={entityData.entity}
                    className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${(i + byPaymentType.length + byDirectDebitBank.length + byCardType.length) * 60}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="rounded-xl p-2.5 bg-primary/10">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{entityData.entity}</p>
                          <p className="text-xs text-muted-foreground">{entityData.count} contrato(s)</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/30 p-3.5 border border-border/40">
                        <div className="space-y-1.5">
                          {entityData.contracts.slice(0, 3).map((contract) => (
                            <div key={contract.id} className="text-xs">
                              <p className="text-foreground truncate">
                                • {contract.name || t('contracts.form.unnamedContract')}
                              </p>
                              {contract.provider && (
                                <p className="text-muted-foreground text-xs ml-4">{contract.provider}</p>
                              )}
                            </div>
                          ))}
                          {entityData.contracts.length > 3 && (
                            <p className="text-xs text-muted-foreground italic">
                              +{entityData.contracts.length - 3} mais
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}