import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  getEnergyMilestonesForContract,
  setEnergyMilestonesForContract,
  type EnergyMilestone,
  type EnergyMilestoneType,
} from '@/features/contracts/lib/solarInstallMonth';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  kwh: number | null;
}

interface KwhDataPoint {
  date: string;
  monthKey: string;
  month: string;
  kwh: number | null;
}

const chartConfig = {
  kwh: {
    label: 'kWh',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function ElectricityKwhChart({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<KwhDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<EnergyMilestone[]>([]);
  const [draftMilestones, setDraftMilestones] = useState<EnergyMilestone[]>([]);
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);

  useEffect(() => {
    const saved = getEnergyMilestonesForContract(contractId);
    setMilestones(saved);
    setDraftMilestones(saved);
  }, [contractId]);

  useEffect(() => {
    async function loadKwhData() {
      try {
        const { data: transactions, error } = await supabase
          .from('home_expenses_transactions')
          .select('id, date, amount, kwh')
          .eq('contract_id', contractId)
          .order('date', { ascending: true });

        if (error) throw error;

        const kwhEntries: KwhDataPoint[] = (transactions as Transaction[])
          .filter(t => t.kwh != null)
          .map(t => ({
            date: t.date,
            monthKey: format(parseISO(t.date), 'yyyy-MM'),
            month: format(parseISO(t.date), 'MMM yy'),
            kwh: t.kwh,
          }));

        setData(kwhEntries);
      } catch (error) {
        console.error('Failed to load kWh data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    loadKwhData();
  }, [contractId]);

  const stats = useMemo(() => {
    if (data.length === 0) return { total: 0, average: 0, min: 0, max: 0 };

    const values = data.filter(d => d.kwh != null).map(d => d.kwh!);
    if (values.length === 0) return { total: 0, average: 0, min: 0, max: 0 };

    return {
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [data]);

  const milestoneMarkers = useMemo(() => {
    return milestones
      .map((milestone) => {
        const point = data.find((entry) => entry.monthKey === milestone.monthKey);
        if (!point) return null;

        return {
          ...milestone,
          month: point.month,
          label: format(parseISO(`${milestone.monthKey}-01`), 'MMM yyyy'),
        };
      })
      .filter((item): item is EnergyMilestone & { month: string; label: string } => item != null);
  }, [data, milestones]);

  const solarInstallMonthOptions = useMemo(() => {
    const unique = new Map<string, string>();
    data.forEach((point) => {
      if (!unique.has(point.monthKey)) {
        unique.set(point.monthKey, format(parseISO(point.date), 'MMM yyyy'));
      }
    });

    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  const comparisonBaselineMonth = useMemo(() => {
    const primary = milestones.find((item) => item.type === 'solar' || item.type === 'solar-expansion');
    return primary?.monthKey ?? milestones[0]?.monthKey ?? '';
  }, [milestones]);

  const solarComparison = useMemo(() => {
    if (!comparisonBaselineMonth) return null;

    const before = data
      .filter((point) => point.monthKey < comparisonBaselineMonth && point.kwh != null)
      .map((point) => point.kwh as number);
    const after = data
      .filter((point) => point.monthKey >= comparisonBaselineMonth && point.kwh != null)
      .map((point) => point.kwh as number);

    if (before.length === 0 || after.length === 0) {
      return {
        hasData: false,
        beforeAverage: 0,
        afterAverage: 0,
        delta: 0,
        deltaPercent: null as number | null,
      };
    }

    const beforeAverage = before.reduce((sum, value) => sum + value, 0) / before.length;
    const afterAverage = after.reduce((sum, value) => sum + value, 0) / after.length;
    const delta = afterAverage - beforeAverage;
    const deltaPercent = beforeAverage > 0 ? (delta / beforeAverage) * 100 : null;

    return {
      hasData: true,
      beforeAverage,
      afterAverage,
      delta,
      deltaPercent,
    };
  }, [data, comparisonBaselineMonth]);

  const startEditingMilestones = () => {
    setDraftMilestones(milestones);
    setIsEditingMilestones(true);
  };

  const cancelEditingMilestones = () => {
    setDraftMilestones(milestones);
    setIsEditingMilestones(false);
  };

  const saveMilestones = () => {
    const normalized = draftMilestones
      .filter((item) => /^\d{4}-\d{2}$/.test(item.monthKey))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    setMilestones(normalized);
    setEnergyMilestonesForContract(contractId, normalized);
    setIsEditingMilestones(false);
  };

  const addDraftMilestone = () => {
    const fallbackMonth = solarInstallMonthOptions[0]?.value ?? '';
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

  const milestoneTypeLabel = (type: EnergyMilestoneType) => {
    if (type === 'solar') return t('contracts.kwh.milestoneTypeSolar');
    if (type === 'solar-expansion') return t('contracts.kwh.milestoneTypeSolarExpansion');
    if (type === 'battery') return t('contracts.kwh.milestoneTypeBattery');
    return t('contracts.kwh.milestoneTypeOther');
  };

  const renderKwhDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: KwhDataPoint }) => {
    if (cx == null || cy == null) return null;

    const isInstallMonth = milestones.some((item) => item.monthKey === payload?.monthKey);
    if (isInstallMonth) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill="hsl(var(--background))" stroke="hsl(var(--warning))" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={4.5} fill="hsl(var(--warning))" />
        </g>
      );
    }

    return <circle cx={cx} cy={cy} r={3.5} fill="hsl(var(--primary))" />;
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-2">{t('contracts.kwh.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('contracts.kwh.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">{t('contracts.kwh.title')}</h2>
        <div className="flex flex-col gap-1.5">
          {isEditingMilestones ? (
            <div className="space-y-2">
              {draftMilestones.map((milestone) => (
                <div key={milestone.id} className="flex flex-wrap items-center gap-2">
                  <select
                    value={milestone.monthKey}
                    onChange={(event) => updateDraftMilestone(milestone.id, { monthKey: event.target.value })}
                    className="h-8 min-w-36 rounded-md border bg-background px-2 text-xs text-foreground"
                  >
                    <option value="">{t('contracts.kwh.solarInstallMonthPlaceholder')}</option>
                    {solarInstallMonthOptions.map((option) => (
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
              <div className="flex items-center gap-2">
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
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('contracts.kwh.energyMilestonesLabel')}:</span>
              {milestoneMarkers.length > 0 ? milestoneMarkers.map((milestone) => (
                <span key={milestone.id} className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                  {milestoneTypeLabel(milestone.type)} · {milestone.label}
                </span>
              )) : (
                <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                  {t('contracts.kwh.solarInstallMonthNotSet')}
                </span>
              )}
              <button
                type="button"
                onClick={startEditingMilestones}
                className="h-8 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
              >
                {milestones.length > 0 ? t('contracts.kwh.solarInstallMonthEdit') : t('contracts.kwh.solarInstallMonthSet')}
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">{t('contracts.kwh.solarInstallMonthHelp')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.kwh.total')}</p>
          <p className="text-lg font-bold text-foreground">{stats.total.toFixed(0)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.kwh.average')}</p>
          <p className="text-lg font-bold text-foreground">{stats.average.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.kwh.min')}</p>
          <p className="text-lg font-bold text-foreground">{stats.min.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.kwh.max')}</p>
          <p className="text-lg font-bold text-foreground">{stats.max.toFixed(1)} kWh</p>
        </div>
      </div>

      {/* Chart */}
      {data.length > 1 && (
        <div className="mt-4">
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {milestoneMarkers.map((milestone, index) => (
                  <ReferenceLine
                    key={milestone.id}
                    x={milestone.month}
                    stroke="hsl(var(--warning))"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    label={index === milestoneMarkers.length - 1 ? {
                      value: t('contracts.kwh.solarInstallMarkerLabel'),
                      position: 'insideTopRight',
                      fill: 'hsl(var(--warning))',
                      fontSize: 11,
                      fontWeight: 700,
                    } : undefined}
                  />
                ))}
                {milestoneMarkers[0] && (
                  <ReferenceArea
                    x1={milestoneMarkers[0].month}
                    x2={milestoneMarkers[0].month}
                    fill="hsl(var(--warning))"
                    fillOpacity={0.14}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="kwh"
                  stroke="hsl(var(--primary))"
                  dot={renderKwhDot}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          {milestoneMarkers.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {milestoneMarkers.map((milestone) => (
                <div key={milestone.id} className="inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-xs font-medium text-warning">
                    {milestoneTypeLabel(milestone.type)}: {milestone.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {milestones.length > 0 && milestoneMarkers.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('contracts.kwh.solarInstallMonthNoData')}
            </p>
          )}
        </div>
      )}

      {comparisonBaselineMonth && solarComparison && (
        <div className="mt-4 rounded-lg border bg-muted/20 p-3">
          {solarComparison.hasData ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-muted-foreground">{t('contracts.kwh.solarComparisonBeforeAvg')}</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">{solarComparison.beforeAverage.toFixed(1)} kWh</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t('contracts.kwh.solarComparisonAfterAvg')}</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">{solarComparison.afterAverage.toFixed(1)} kWh</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t('contracts.kwh.solarComparisonDelta')}</p>
                <p className={`text-sm font-semibold tabular-nums ${solarComparison.delta <= 0 ? 'text-success' : 'text-warning'}`}>
                  {solarComparison.delta > 0 ? '+' : ''}{solarComparison.delta.toFixed(1)} kWh
                  {solarComparison.deltaPercent != null ? ` (${solarComparison.deltaPercent > 0 ? '+' : ''}${solarComparison.deltaPercent.toFixed(1)}%)` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('contracts.kwh.solarComparisonInsufficientData')}</p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-muted-foreground text-xs font-medium">Date</th>
              <th className="text-right py-2 text-muted-foreground text-xs font-medium">kWh</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 text-foreground">{format(parseISO(row.date), 'MMM d, yyyy')}</td>
                <td className="text-right text-foreground font-medium tabular-nums">{row.kwh?.toFixed(2)} kWh</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
