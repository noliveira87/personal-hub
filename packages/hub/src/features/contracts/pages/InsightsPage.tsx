import { Suspense, lazy, useMemo, useState } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getAnnualEquivalent, getMonthlyEquivalent } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_ICONS, ContractCategory } from '@/features/contracts/types/contract';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { FileText } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxisTickStyle, chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from '@/lib/chartTheme';
import { getGlobalSolarInstallMonth, getSolarInstallMonthForContract } from '@/features/contracts/lib/solarInstallMonth';

const InsightsCategoryChart = lazy(() => import('@/features/contracts/pages/InsightsCategoryChart'));

export default function InsightsPage() {
  const { contracts, allPriceHistory } = useContracts();
  const { formatCurrency, t, locale } = useI18n();

  const active = contracts.filter(c => c.status === 'active');
  const contractIds = useMemo(() => active.map((contract) => contract.id), [active]);
  const { priceMap } = usePriceHistoryMap(contractIds);
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const activeWithResolvedPrices = useMemo(() => {
    return active.map((contract) => {
      const latestPrice = priceMap.get(contract.id);

      return {
        ...contract,
        price: latestPrice?.price ?? contract.price,
        currency: latestPrice?.currency ?? contract.currency,
      };
    });
  }, [active, priceMap]);

  const categoryNames: Record<ContractCategory, string> = {
    'mortgage': t('contracts.categoryNames.mortgage'),
    'home-insurance': t('contracts.categoryNames.homeInsurance'),
    'apartment-insurance': t('contracts.categoryNames.apartmentInsurance'),
    'gas': t('contracts.categoryNames.gas'),
    'electricity': t('contracts.categoryNames.electricity'),
    'internet': t('contracts.categoryNames.internet'),
    'mobile': t('contracts.categoryNames.mobile'),
    'water': t('contracts.categoryNames.water'),
    'tv-streaming': t('contracts.categoryNames.tvStreaming'),
    'software': t('contracts.categoryNames.software'),
    'maintenance': t('contracts.categoryNames.maintenance'),
    'security-alarm': t('contracts.categoryNames.securityAlarm'),
    'car': t('contracts.categoryNames.car'),
    'card-credit': t('contracts.categoryNames.cardCredit'),
    'card-debit': t('contracts.categoryNames.cardDebit'),
    'gym': t('contracts.categoryNames.gym'),
    'other': t('contracts.categoryNames.other'),
  };

  const monthlyTotal = activeWithResolvedPrices.reduce((s, c) => s + getMonthlyEquivalent(c), 0);
  const annualTotal = activeWithResolvedPrices.reduce((s, c) => s + getAnnualEquivalent(c), 0);

  const byCategory = useMemo(() => {
    const map = new Map<ContractCategory, number>();
    activeWithResolvedPrices.forEach(c => {
      const current = map.get(c.category) || 0;
      map.set(c.category, current + getMonthlyEquivalent(c));
    });
    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        category: cat,
        label: categoryNames[cat],
        icon: CATEGORY_ICONS[cat],
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeWithResolvedPrices, categoryNames]);

  const topExpensive = useMemo(() => {
    return [...activeWithResolvedPrices]
      .sort((a, b) => getAnnualEquivalent(b) - getAnnualEquivalent(a))
      .slice(0, 5);
  }, [activeWithResolvedPrices]);

  const availableHistoryYears = useMemo(() => {
    const years = new Set<number>();
    allPriceHistory.forEach((entry) => years.add(new Date(entry.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [allPriceHistory]);

  const effectiveYear = availableHistoryYears.includes(selectedYear)
    ? selectedYear
    : (availableHistoryYears[0] ?? selectedYear);

  const chartContractOptions = useMemo(() => {
    return active
      .map((contract) => ({ id: contract.id, label: `${contract.name} (${contract.provider})` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-PT'));
  }, [active]);

  const electricityContractIds = useMemo(() => {
    return contracts
      .filter((contract) => contract.category === 'electricity')
      .map((contract) => contract.id);
  }, [contracts]);

  const storedSolarInstallMonth = useMemo(() => {
    const global = getGlobalSolarInstallMonth();
    if (global) return global;

    for (const contractId of electricityContractIds) {
      const perContract = getSolarInstallMonthForContract(contractId);
      if (perContract) return perContract;
    }

    return '';
  }, [electricityContractIds]);

  const monthlyEvolutionData = useMemo(() => {
    const byMonth = new Map<number, number>();

    const scopedContractIds = selectedScope === 'all'
      ? null
      : selectedScope === 'category:electricity'
        ? new Set(electricityContractIds)
        : new Set([selectedScope]);

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthEntries = allPriceHistory.filter((entry) => {
        const date = new Date(entry.date);
        if (date.getFullYear() !== effectiveYear || date.getMonth() !== monthIndex) {
          return false;
        }

        if (!scopedContractIds) {
          return true;
        }

        return scopedContractIds.has(entry.contractId);
      });

      if (monthEntries.length === 0) {
        continue;
      }

      const latestByContract = new Map<string, { date: string; price: number }>();
      monthEntries.forEach((entry) => {
        const current = latestByContract.get(entry.contractId);
        if (!current || entry.date > current.date) {
          latestByContract.set(entry.contractId, { date: entry.date, price: entry.price });
        }
      });

      const monthTotal = Array.from(latestByContract.values()).reduce((sum, value) => sum + value.price, 0);
      byMonth.set(monthIndex, monthTotal);
    }

    return Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      month: new Date(effectiveYear, monthIndex, 1).toLocaleDateString(locale, { month: 'short' }),
      value: byMonth.get(monthIndex) ?? null,
    }));
  }, [allPriceHistory, effectiveYear, selectedScope, electricityContractIds, locale]);

  const selectedContract = contracts.find((contract) => contract.id === selectedScope);
  const chartCurrency = selectedContract?.currency ?? 'EUR';
  const isElectricityScope = selectedScope === 'category:electricity';

  const solarMarkerMonthLabel = useMemo(() => {
    if (!isElectricityScope || storedSolarInstallMonth === '') return null;

    const [yearRaw, monthRaw] = storedSolarInstallMonth.split('-');
    const markerYear = Number(yearRaw);
    const markerMonth = Number(monthRaw);
    if (Number.isNaN(markerYear) || Number.isNaN(markerMonth) || markerYear !== effectiveYear) {
      return null;
    }

    return monthlyEvolutionData.find((point) => point.monthIndex === markerMonth - 1)?.month ?? null;
  }, [isElectricityScope, monthlyEvolutionData, storedSolarInstallMonth, effectiveYear]);

  const renderEvolutionDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { monthIndex: number } }) => {
    if (cx == null || cy == null) return null;

    const markerMonthIndex = (() => {
      const [yearRaw, monthRaw] = storedSolarInstallMonth.split('-');
      const markerYear = Number(yearRaw);
      const markerMonth = Number(monthRaw);
      if (Number.isNaN(markerYear) || Number.isNaN(markerMonth) || markerYear !== effectiveYear) return null;
      return markerMonth - 1;
    })();

    const isMarkerMonth = markerMonthIndex != null && markerMonthIndex === payload?.monthIndex;
    if (isMarkerMonth) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="hsl(var(--background))" stroke="hsl(var(--warning))" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={4} fill="hsl(var(--warning))" />
        </g>
      );
    }

    return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
  };

  return (
    <div className="space-y-8">
      <AppSectionHeader title="D12 Contracts" icon={FileText} />

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">{t('contracts.insights.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('contracts.insights.subtitle')}</p>
      </div>

      {/* Totals */}
      <div className="grid sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="bg-card rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">{t('contracts.insights.monthlySpending')}</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{formatCurrency(monthlyTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('contracts.insights.acrossActiveContracts', { count: active.length })}</p>
        </div>
        <div className="bg-card rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">{t('contracts.insights.annualSpending')}</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{formatCurrency(annualTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('contracts.insights.estimatedTotal')}</p>
        </div>
      </div>

      {/* By category chart */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '160ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('contracts.insights.monthlyByCategory')}</h2>
        <Suspense fallback={<div className="h-64 rounded-lg bg-muted/30 animate-pulse" />}>
          <InsightsCategoryChart data={byCategory} />
        </Suspense>
      </div>

      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t('contracts.insights.priceEvolution')}</h2>
          <div className="flex gap-2">
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">{t('contracts.insights.scopeAllContracts')}</option>
              <option value="category:electricity">{t('contracts.insights.scopeElectricity')}</option>
              {chartContractOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <select
              value={effectiveYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {availableHistoryYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {isElectricityScope && storedSolarInstallMonth && (
          <p className="mb-3 text-xs text-muted-foreground">{t('contracts.insights.solarInstallMonthAutoLabel')}</p>
        )}
        {isElectricityScope && !storedSolarInstallMonth && (
          <p className="mb-3 text-xs text-muted-foreground">{t('contracts.insights.solarInstallMonthMissingLabel')}</p>
        )}

        {monthlyEvolutionData.some((point) => point.value != null) ? (
          <div className="h-64 rounded-lg border bg-background p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEvolutionData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={chartAxisTickStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={chartAxisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(Number(value), chartCurrency)}
                  width={84}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(value: number) => formatCurrency(Number(value), chartCurrency)}
                  labelFormatter={(label) => `${label} ${effectiveYear}`}
                />
                {isElectricityScope && solarMarkerMonthLabel && (
                  <ReferenceLine
                    x={solarMarkerMonthLabel}
                    stroke="hsl(var(--warning))"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    label={{
                      value: t('contracts.insights.solarInstallMarkerLabel'),
                      position: 'insideTopRight',
                      fill: 'hsl(var(--warning))',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={renderEvolutionDot}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground rounded-lg border bg-muted/20">
            {t('contracts.insights.noDataForYear', { year: effectiveYear })}
          </div>
        )}

        {isElectricityScope && solarMarkerMonthLabel && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-xs font-medium text-warning">
              {t('contracts.insights.solarInstallMarkerLabel')}: {solarMarkerMonthLabel} {effectiveYear}
            </span>
          </div>
        )}
      </div>

      {/* Category breakdown list */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '240ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('contracts.insights.categoryBreakdown')}</h2>
        <div className="space-y-3">
          {byCategory.map((cat, i) => (
            <div key={cat.category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm text-foreground">{cat.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(cat.amount)}</span>
                <span className="text-xs text-muted-foreground ml-1">{t('contracts.insights.perMonth')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most expensive */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '320ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('contracts.insights.mostExpensiveAnnual')}</h2>
        <div className="space-y-3">
          {topExpensive.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-lg">{CATEGORY_ICONS[c.category]}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.provider}</p>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(getAnnualEquivalent(c), c.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
