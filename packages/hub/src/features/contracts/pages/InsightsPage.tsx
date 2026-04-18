import { useMemo, useState } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getAnnualEquivalent, getDisplayContractStatus, getMonthlyEquivalent } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_ICONS, ContractCategory } from '@/features/contracts/types/contract';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { FileText } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxisTickStyle, chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from '@/lib/chartTheme';
import {
  getGlobalEnergyMilestones,
  getEnergyMilestonesForContract,
  setGlobalEnergyMilestones,
  type EnergyMilestone,
  type EnergyMilestoneType,
} from '@/features/contracts/lib/solarInstallMonth';
import InsightsCategoryChart from '@/features/contracts/pages/InsightsCategoryChart';

export default function InsightsPage() {
  const { contracts, allPriceHistory } = useContracts();
  const { formatCurrency, t, locale } = useI18n();

  const active = contracts.filter((contract) => getDisplayContractStatus(contract) === 'active');
  const contractIds = useMemo(() => active.map((contract) => contract.id), [active]);
  const { priceMap } = usePriceHistoryMap(contractIds);
  const [selectedScope, setSelectedScope] = useState<string>('category:electricity');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState<EnergyMilestone[]>([]);
  const [milestonesVersion, setMilestonesVersion] = useState(0);

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
      .filter((item) => item.amount > 0)
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

  const effectiveYear = useMemo(() => {
    if (selectedYear === 'all') return null;
    const parsed = Number(selectedYear);
    if (Number.isNaN(parsed)) return availableHistoryYears[0] ?? null;
    return availableHistoryYears.includes(parsed) ? parsed : (availableHistoryYears[0] ?? parsed);
  }, [selectedYear, availableHistoryYears]);

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

  const storedEnergyMilestones = useMemo(() => {
    const globalMilestones = getGlobalEnergyMilestones();
    if (globalMilestones.length > 0) {
      return globalMilestones.slice().sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }

    const merged = electricityContractIds.flatMap((contractId) => getEnergyMilestonesForContract(contractId));

    if (merged.length > 0) {
      const byKey = new Map<string, (typeof merged)[number]>();
      merged.forEach((milestone) => {
        const dedupeKey = `${milestone.monthKey}:${milestone.type}`;
        if (!byKey.has(dedupeKey)) {
          byKey.set(dedupeKey, milestone);
        }
      });

      return Array.from(byKey.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }

    return [];
  }, [electricityContractIds, milestonesVersion]);

  const milestoneMonthOptions = useMemo(() => {
    const scopedContractIds = selectedScope === 'category:electricity'
      ? new Set(electricityContractIds)
      : new Set([selectedScope]);

    const unique = new Map<string, string>();
    allPriceHistory.forEach((entry) => {
      if (!scopedContractIds.has(entry.contractId)) return;
      const date = new Date(entry.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!unique.has(key)) {
        unique.set(
          key,
          new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString(locale, {
            month: 'short',
            year: 'numeric',
          }),
        );
      }
    });

    return Array.from(unique.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [allPriceHistory, selectedScope, electricityContractIds, locale]);

  const monthlyEvolutionData = useMemo(() => {
    const byMonth = new Map<string, number>();

    const scopedContractIds = selectedScope === 'category:electricity'
      ? new Set(electricityContractIds)
      : new Set([selectedScope]);

    const groupedByMonth = new Map<string, Array<{ contractId: string; date: string; price: number }>>();
    allPriceHistory.forEach((entry) => {
      if (!scopedContractIds.has(entry.contractId)) return;

      const date = new Date(entry.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      if (effectiveYear != null && year !== effectiveYear) return;

      const monthKey = `${year}-${month}`;
      const list = groupedByMonth.get(monthKey) ?? [];
      list.push({ contractId: entry.contractId, date: entry.date, price: entry.price });
      groupedByMonth.set(monthKey, list);
    });

    groupedByMonth.forEach((monthEntries, monthKey) => {
      const latestByContract = new Map<string, { date: string; price: number }>();
      monthEntries.forEach((entry) => {
        const current = latestByContract.get(entry.contractId);
        if (!current || entry.date > current.date) {
          latestByContract.set(entry.contractId, { date: entry.date, price: entry.price });
        }
      });

      const monthTotal = Array.from(latestByContract.values()).reduce((sum, value) => sum + value.price, 0);
      byMonth.set(monthKey, monthTotal);
    });

    if (effectiveYear == null) {
      return Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, value]) => {
          const [yearRaw, monthRaw] = monthKey.split('-');
          const label = new Date(Number(yearRaw), Number(monthRaw) - 1, 1).toLocaleDateString(locale, {
            month: 'short',
            year: '2-digit',
          });

          return {
            month: label,
            monthKey,
            value,
          };
        });
    }

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthKey = `${effectiveYear}-${String(monthIndex + 1).padStart(2, '0')}`;
      return {
        month: new Date(effectiveYear, monthIndex, 1).toLocaleDateString(locale, { month: 'short' }),
        monthKey,
        value: byMonth.get(monthKey) ?? null,
      };
    });
  }, [allPriceHistory, effectiveYear, selectedScope, electricityContractIds, locale]);

  const selectedContract = contracts.find((contract) => contract.id === selectedScope);
  const chartCurrency = selectedContract?.currency ?? 'EUR';
  const isElectricityScope = selectedScope === 'category:electricity';

  const milestoneMarkers = useMemo(() => {
    if (!isElectricityScope) return [] as Array<{ id: string; month: string; monthKey: string; type: EnergyMilestoneType }>;

    return storedEnergyMilestones
      .map((milestone) => {
        const point = monthlyEvolutionData.find((entry) => entry.monthKey === milestone.monthKey);
        if (!point) return null;
        return {
          id: milestone.id,
          month: point.month,
          monthKey: milestone.monthKey,
          type: milestone.type,
        };
      })
      .filter((item): item is { id: string; month: string; monthKey: string; type: EnergyMilestoneType } => item != null);
  }, [isElectricityScope, monthlyEvolutionData, storedEnergyMilestones]);

  const milestoneTypeLabel = (type: EnergyMilestoneType) => {
    if (type === 'solar') return t('contracts.kwh.milestoneTypeSolar');
    if (type === 'solar-expansion') return t('contracts.kwh.milestoneTypeSolarExpansion');
    if (type === 'battery') return t('contracts.kwh.milestoneTypeBattery');
    return t('contracts.kwh.milestoneTypeOther');
  };

  const milestoneLineMarkers = useMemo(() => {
    const byMonth = new Map<string, { month: string; monthKey: string; labels: string[] }>();

    milestoneMarkers.forEach((milestone) => {
      const existing = byMonth.get(milestone.monthKey);
      const typeLabel = milestoneTypeLabel(milestone.type);

      if (!existing) {
        byMonth.set(milestone.monthKey, {
          month: milestone.month,
          monthKey: milestone.monthKey,
          labels: [typeLabel],
        });
        return;
      }

      if (!existing.labels.includes(typeLabel)) {
        existing.labels.push(typeLabel);
      }
    });

    return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [milestoneMarkers]);

  const startEditingMilestones = () => {
    setDraftMilestones(storedEnergyMilestones);
    setIsEditingMilestones(true);
  };

  const cancelEditingMilestones = () => {
    setDraftMilestones(storedEnergyMilestones);
    setIsEditingMilestones(false);
  };

  const saveMilestones = () => {
    const normalized = draftMilestones
      .filter((item) => /^\d{4}-\d{2}$/.test(item.monthKey))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    setGlobalEnergyMilestones(normalized);
    setMilestonesVersion((prev) => prev + 1);
    setIsEditingMilestones(false);
  };

  const addDraftMilestone = () => {
    const fallbackMonth = milestoneMonthOptions[0]?.value ?? '';
    setDraftMilestones((prev) => [
      ...prev,
      {
        id: `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monthKey: fallbackMonth,
        type: 'solar',
      },
    ]);
  };

  const updateDraftMilestone = (id: string, updates: Partial<EnergyMilestone>) => {
    setDraftMilestones((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeDraftMilestone = (id: string) => {
    setDraftMilestones((prev) => prev.filter((item) => item.id !== id));
  };

  const renderEvolutionDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { monthKey: string } }) => {
    if (cx == null || cy == null) return null;

    const isMarkerMonth = milestoneMarkers.some((milestone) => milestone.monthKey === payload?.monthKey);
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
        <InsightsCategoryChart data={byCategory} />
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
              <option value="category:electricity">{t('contracts.insights.scopeElectricity')}</option>
              {chartContractOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <select
              value={effectiveYear == null ? 'all' : String(effectiveYear)}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">{t('contracts.insights.allYearsLabel')}</option>
              {availableHistoryYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {isElectricityScope && storedEnergyMilestones.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">{t('contracts.insights.solarInstallMonthAutoLabel')}</p>
            <button
              type="button"
              onClick={startEditingMilestones}
              className="h-7 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
            >
              {t('contracts.kwh.solarInstallMonthEdit')}
            </button>
          </div>
        )}
        {isElectricityScope && storedEnergyMilestones.length === 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">{t('contracts.insights.solarInstallMonthMissingLabel')}</p>
            <button
              type="button"
              onClick={startEditingMilestones}
              className="h-7 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
            >
              {t('contracts.kwh.solarInstallMonthSet')}
            </button>
          </div>
        )}

        {isElectricityScope && isEditingMilestones && (
          <div className="mb-3 space-y-2 rounded-lg border bg-muted/20 p-3">
            {draftMilestones.map((milestone) => (
              <div key={milestone.id} className="flex flex-wrap items-center gap-2">
                <select
                  value={milestone.monthKey}
                  onChange={(event) => updateDraftMilestone(milestone.id, { monthKey: event.target.value })}
                  className="h-8 min-w-36 rounded-md border bg-background px-2 text-xs text-foreground"
                >
                  <option value="">{t('contracts.kwh.solarInstallMonthPlaceholder')}</option>
                  {milestoneMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={milestone.type}
                  onChange={(event) => updateDraftMilestone(milestone.id, { type: event.target.value as EnergyMilestoneType })}
                  className="h-8 min-w-36 rounded-md border bg-background px-2 text-xs text-foreground"
                >
                  <option value="solar">{t('contracts.kwh.milestoneTypeSolar')}</option>
                  <option value="solar-expansion">{t('contracts.kwh.milestoneTypeSolarExpansion')}</option>
                  <option value="battery">{t('contracts.kwh.milestoneTypeBattery')}</option>
                  <option value="other">{t('contracts.kwh.milestoneTypeOther')}</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeDraftMilestone(milestone.id)}
                  className="h-8 rounded-md border border-destructive/30 px-2.5 text-xs font-medium text-destructive"
                >
                  {t('contracts.kwh.milestoneRemove')}
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addDraftMilestone}
                className="h-8 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
              >
                {t('contracts.kwh.milestoneAdd')}
              </button>
              <button
                type="button"
                onClick={saveMilestones}
                className="h-8 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={cancelEditingMilestones}
                className="h-8 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
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
                  labelFormatter={(label) => String(label)}
                />
                {isElectricityScope && milestoneLineMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.monthKey}
                    x={marker.month}
                    stroke="hsl(var(--warning))"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    label={{
                      value: marker.labels.join(' + '),
                      position: 'insideTopRight',
                      fill: 'hsl(var(--warning))',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                ))}
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
            {effectiveYear == null
              ? t('contracts.insights.noDataAllYears')
              : t('contracts.insights.noDataForYear', { year: effectiveYear })}
          </div>
        )}

        {isElectricityScope && milestoneMarkers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {milestoneMarkers.map((marker) => (
              <div key={marker.id} className="inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-xs font-medium text-warning">
                  {milestoneTypeLabel(marker.type)}: {marker.month}
                </span>
              </div>
            ))}
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
