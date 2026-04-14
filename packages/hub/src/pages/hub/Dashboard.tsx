import { useMemo, useState } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import AppLoadingState from '@/components/AppLoadingState';
import { StatsCard } from '@/components/StatsCard';
import { ContractCard } from '@/features/contracts/components/ContractCard';
import { getDaysUntilExpiry, getMonthlyEquivalent, getCurrentMonthCost } from '@/features/contracts/lib/contractUtils';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, LayoutDashboard, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { parseISO } from 'date-fns';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';

type ContractViewCategory = 'cafofo' | 'apartamento' | 'carro' | 'outros';

const VIEW_CATEGORY_ORDER: ContractViewCategory[] = ['cafofo', 'apartamento', 'carro', 'outros'];

function getContractViewCategory(contract: { category: string; housingUsage: string | null; name: string; provider: string; notes: string | null }): ContractViewCategory {
  const text = `${contract.name} ${contract.provider} ${contract.notes ?? ''}`.toLowerCase();

  if (contract.category === 'car') {
    return 'carro';
  }

  if (
    contract.category === 'apartment-insurance'
    || contract.housingUsage === 'secondary-home'
    || text.includes('apartamento')
    || text.includes('sta clara')
    || text.includes('st clara')
  ) {
    return 'apartamento';
  }

  if (
    contract.housingUsage === 'primary-residence'
    || [
      'mortgage',
      'home-insurance',
      'gas',
      'electricity',
      'internet',
      'mobile',
      'water',
      'tv-streaming',
      'maintenance',
      'security-alarm',
    ].includes(contract.category)
    || text.includes('cafofo')
  ) {
    return 'cafofo';
  }

  return 'outros';
}

export default function Dashboard() {
  const { t } = useI18n();
  const CARDS_PER_ROW = 3;
  const INITIAL_VISIBLE = CARDS_PER_ROW;
  const { contracts, loading, error } = useContracts();
  const { formatCurrency, hideAmounts } = useI18n();
  const contractIds = useMemo(() => contracts.map((contract) => contract.id), [contracts]);
  const { priceMap } = usePriceHistoryMap(contractIds);
  const currentMonthLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    []
  );

  const active = contracts.filter(c => c.status === 'active');
  const expiringSoon = active
    .map(c => ({ ...c, daysLeft: getDaysUntilExpiry(c) }))
    .filter(c => c.daysLeft >= 0 && c.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const { monthlyTotal, currentMonthTotal } = useMemo(() => {
    const monthlyTotal = active.reduce((sum, contract) => {
      const latestPrice = priceMap.get(contract.id);
      const priceResolvedContract = {
        ...contract,
        price: latestPrice?.price ?? contract.price,
        currency: latestPrice?.currency ?? contract.currency,
      };

      return sum + getMonthlyEquivalent(priceResolvedContract);
    }, 0);

    const currentMonthTotal = active.reduce((sum, contract) => {
      const latestPrice = priceMap.get(contract.id);
      const priceResolvedContract = {
        ...contract,
        price: latestPrice?.price ?? contract.price,
        currency: latestPrice?.currency ?? contract.currency,
      };

      if (latestPrice) {
        const entryDate = parseISO(latestPrice.date);
        const now = new Date();
        const isCurrentMonthEntry =
          entryDate.getFullYear() === now.getFullYear() &&
          entryDate.getMonth() === now.getMonth();

        return sum + (isCurrentMonthEntry ? latestPrice.price : 0);
      }

      return sum + getCurrentMonthCost(priceResolvedContract, new Date(), priceResolvedContract.price);
    }, 0);

    return { monthlyTotal, currentMonthTotal };
  }, [active, priceMap, hideAmounts]);

  const within7 = expiringSoon.filter(c => c.daysLeft <= 7).length;
  const within15 = expiringSoon.filter(c => c.daysLeft <= 15).length;
  const within30 = expiringSoon.filter(c => c.daysLeft <= 30).length;
  const [visibleByCategory, setVisibleByCategory] = useState<Record<ContractViewCategory, number>>({
    cafofo: INITIAL_VISIBLE,
    apartamento: INITIAL_VISIBLE,
    carro: INITIAL_VISIBLE,
    outros: INITIAL_VISIBLE,
  });

  const activeByCategory = useMemo(() => {
    const grouped = new Map<ContractViewCategory, typeof active>();
    VIEW_CATEGORY_ORDER.forEach((category) => grouped.set(category, []));

    active.forEach((contract) => {
      grouped.get(getContractViewCategory(contract))!.push(contract);
    });

    return VIEW_CATEGORY_ORDER
      .map((category) => ({
        category,
        contracts: grouped.get(category) ?? [],
      }))
      .filter((section) => section.contracts.length > 0);
  }, [active]);

  if (loading) {
    return (
      <div className="py-6">
        <AppLoadingState label={t('contracts.loading')} variant="dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-destructive font-medium">{t('contracts.errorLoading')}</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} size="sm">
          {t('contracts.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppSectionHeader
        title={t('contracts.hubTitle')}
        icon={LayoutDashboard}
        actions={(
          <div className="flex items-center gap-2">
            <Link
              to="/contracts/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
              aria-label={t('contracts.addContract')}
              title={t('contracts.addContract')}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('contracts.addContract')}</span>
            </Link>

            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex gap-1.5">
              <Link to="/contracts/insights" aria-label={t('layout.nav.insights')} title={t('layout.nav.insights')} className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span>{t('layout.nav.insights')}</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl sm:hidden"
              asChild
              aria-label={t('layout.nav.insights')}
            >
              <Link to="/contracts/insights" title={t('layout.nav.insights')}>
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <h1 className="text-2xl font-bold text-foreground">{t('contracts.hubTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('contracts.overview')}</p>
      </div>

      {/* Stats row */}
      <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label={t('contracts.active')} value={active.length} sublabel={`${contracts.length} ${t('contracts.total')}`} />
          <StatsCard label={t('contracts.monthlyBaseline')} value={formatCurrency(monthlyTotal)} sublabel={t('contracts.monthlyBaseline')} />
          <StatsCard label={t('contracts.currentMonth')} value={formatCurrency(currentMonthTotal)} sublabel={currentMonthLabel} />
          <StatsCard
            label={t('contracts.expiring')}
            value={within30}
            variant={within7 > 0 ? 'urgent' : within15 > 0 ? 'warning' : 'default'}
            sublabel={within7 > 0 ? `${within7} ≤ 7` : undefined}
          />
        </div>
        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('contracts.monthlyBaseline')}</span> = {t('contracts.monthlyBaselineDesc')}
          <span className="mx-1">•</span>
          <span className="font-medium text-foreground">{t('contracts.currentMonth')}</span> = {t('contracts.currentMonthDesc')}
        </div>
      </div>

      {/* Alert buckets */}
      {expiringSoon.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {[
            { days: 7, count: within7, variant: 'urgent' as const },
            { days: 15, count: within15, variant: 'warning' as const },
            { days: 30, count: within30, variant: 'warning' as const },
            { days: 60, count: expiringSoon.length, variant: 'default' as const },
          ].map(bucket => (
            <div key={bucket.days} className="bg-card rounded-lg p-3 border-2 border-border text-center shadow-sm">
              <p className="text-xs text-muted-foreground">{t('contracts.dashboard.withinDays', { days: String(bucket.days) })}</p>
              <p className={`text-xl font-bold tabular-nums ${
                bucket.variant === 'urgent' && bucket.count > 0 ? 'text-urgent' :
                bucket.variant === 'warning' && bucket.count > 0 ? 'text-warning' : 'text-foreground'
              }`}>
                {bucket.count}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <section className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('contracts.dashboard.expiringSoon')}</h2>
            <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              {t('contracts.dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoon.slice(0, 6).map((contract, i) => (
              <ContractCard key={contract.id} contract={contract} index={i} latestPrice={priceMap.get(contract.id)} />
            ))}
          </div>
        </section>
      )}

      {/* All Active — grouped by category */}
      <section className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('contracts.dashboard.allActive')}</h2>
          <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            {t('contracts.dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-6">
          {activeByCategory.map((section) => (
            <div key={section.category}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-bold text-foreground pl-3 border-l-4 border-primary">
                  {t(`contracts.viewCategories.${section.category}`)}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t('contracts.payments.contractsCount', { count: String(section.contracts.length) })}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.contracts.slice(0, visibleByCategory[section.category]).map((contract, i) => (
                  <ContractCard key={contract.id} contract={contract} index={i} latestPrice={priceMap.get(contract.id)} />
                ))}
              </div>

              {section.contracts.length > CARDS_PER_ROW && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setVisibleByCategory((current) => ({
                      ...current,
                      [section.category]: current[section.category] >= section.contracts.length
                        ? CARDS_PER_ROW
                        : Math.min(current[section.category] + CARDS_PER_ROW, section.contracts.length),
                    }))}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted"
                  >
                    {visibleByCategory[section.category] >= section.contracts.length ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        {t('contracts.dashboard.hide')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        {t('contracts.dashboard.loadMore')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
