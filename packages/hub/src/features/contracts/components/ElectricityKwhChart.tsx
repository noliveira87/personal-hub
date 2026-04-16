import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { getSolarInstallMonthForContract, setSolarInstallMonthForContract } from '@/features/contracts/lib/solarInstallMonth';

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
  const [solarInstallMonth, setSolarInstallMonth] = useState('');
  const [draftSolarInstallMonth, setDraftSolarInstallMonth] = useState('');
  const [isEditingSolarInstallMonth, setIsEditingSolarInstallMonth] = useState(false);

  useEffect(() => {
    const saved = getSolarInstallMonthForContract(contractId);
    setSolarInstallMonth(saved);
    setDraftSolarInstallMonth(saved);
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

  const solarInstallMarker = useMemo(() => {
    if (!solarInstallMonth) return null;

    const pointInMonth = data.find((point) => point.monthKey === solarInstallMonth);
    if (!pointInMonth) return null;

    return {
      month: pointInMonth.month,
      label: format(parseISO(`${solarInstallMonth}-01`), 'MMM yyyy'),
    };
  }, [data, solarInstallMonth]);

  const solarInstallMonthOptions = useMemo(() => {
    const unique = new Map<string, string>();
    data.forEach((point) => {
      if (!unique.has(point.monthKey)) {
        unique.set(point.monthKey, format(parseISO(point.date), 'MMM yyyy'));
      }
    });

    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  const solarComparison = useMemo(() => {
    if (!solarInstallMonth) return null;

    const before = data
      .filter((point) => point.monthKey < solarInstallMonth && point.kwh != null)
      .map((point) => point.kwh as number);
    const after = data
      .filter((point) => point.monthKey >= solarInstallMonth && point.kwh != null)
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
  }, [data, solarInstallMonth]);

  const startEditingSolarInstallMonth = () => {
    setDraftSolarInstallMonth(solarInstallMonth);
    setIsEditingSolarInstallMonth(true);
  };

  const cancelEditingSolarInstallMonth = () => {
    setDraftSolarInstallMonth(solarInstallMonth);
    setIsEditingSolarInstallMonth(false);
  };

  const saveSolarInstallMonth = () => {
    setSolarInstallMonth(draftSolarInstallMonth);
    setSolarInstallMonthForContract(contractId, draftSolarInstallMonth);
    setIsEditingSolarInstallMonth(false);
  };

  const renderKwhDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: KwhDataPoint }) => {
    if (cx == null || cy == null) return null;

    const isInstallMonth = payload?.monthKey === solarInstallMonth;
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
          {isEditingSolarInstallMonth ? (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t('contracts.kwh.solarInstallMonthLabel')}</span>
                <select
                  value={draftSolarInstallMonth}
                  onChange={(event) => setDraftSolarInstallMonth(event.target.value)}
                  className="h-8 min-w-44 rounded-md border bg-background px-2 text-xs text-foreground"
                >
                  <option value="">{t('contracts.kwh.solarInstallMonthPlaceholder')}</option>
                  {solarInstallMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={saveSolarInstallMonth}
                className="h-8 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={cancelEditingSolarInstallMonth}
                className="h-8 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('contracts.kwh.solarInstallMonthLabel')}:</span>
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                {solarInstallMarker?.label ?? t('contracts.kwh.solarInstallMonthNotSet')}
              </span>
              <button
                type="button"
                onClick={startEditingSolarInstallMonth}
                className="h-8 rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
              >
                {solarInstallMonth ? t('contracts.kwh.solarInstallMonthEdit') : t('contracts.kwh.solarInstallMonthSet')}
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
                {solarInstallMarker && (
                  <>
                    <ReferenceArea
                      x1={solarInstallMarker.month}
                      x2={solarInstallMarker.month}
                      fill="hsl(var(--warning))"
                      fillOpacity={0.14}
                    />
                    <ReferenceLine
                      x={solarInstallMarker.month}
                      stroke="hsl(var(--warning))"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      label={{
                        value: t('contracts.kwh.solarInstallMarkerLabel'),
                        position: 'insideTopRight',
                        fill: 'hsl(var(--warning))',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  </>
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
          {solarInstallMarker && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-xs font-medium text-warning">
                {t('contracts.kwh.solarInstallMarkerLabel')}: {solarInstallMarker.label}
              </span>
            </div>
          )}
          {solarInstallMonth && !solarInstallMarker && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('contracts.kwh.solarInstallMonthNoData')}
            </p>
          )}
        </div>
      )}

      {solarInstallMonth && solarComparison && (
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
