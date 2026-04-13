import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  cubic_meters: number | null;
}

interface WaterDataPoint {
  date: string;
  month: string;
  cubicMeters: number | null;
}

const chartConfig = {
  cubicMeters: {
    label: 'm3',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function WaterConsumptionChart({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<WaterDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWaterData() {
      try {
        const { data: transactions, error } = await supabase
          .from('home_expenses_transactions')
          .select('id, date, amount, cubic_meters')
          .eq('contract_id', contractId)
          .order('date', { ascending: true });

        if (error) throw error;

        const entries: WaterDataPoint[] = (transactions as Transaction[])
          .filter((t) => t.cubic_meters != null)
          .map((t) => ({
            date: t.date,
            month: format(parseISO(t.date), 'MMM yy'),
            cubicMeters: t.cubic_meters,
          }));

        setData(entries);
      } catch (error) {
        console.error('Failed to load water consumption data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    void loadWaterData();
  }, [contractId]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0, lastReadingDate: null as string | null };
    }

    const values = data.filter((d) => d.cubicMeters != null).map((d) => d.cubicMeters!);
    const lastReadingDate = data[data.length - 1]?.date ?? null;
    if (values.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0, lastReadingDate };
    }

    return {
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      lastReadingDate,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <p className="text-sm text-muted-foreground">{t('contracts.waterConsumption.loading')}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-2">{t('contracts.waterConsumption.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('contracts.waterConsumption.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
      <h2 className="text-sm font-semibold text-foreground mb-4">{t('contracts.waterConsumption.title')}</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.waterConsumption.total')}</p>
          <p className="text-lg font-bold text-foreground">{stats.total.toFixed(2)} m3</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.waterConsumption.average')}</p>
          <p className="text-lg font-bold text-foreground">{stats.average.toFixed(2)} m3</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.waterConsumption.min')}</p>
          <p className="text-lg font-bold text-foreground">{stats.min.toFixed(2)} m3</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('contracts.waterConsumption.max')}</p>
          <p className="text-lg font-bold text-foreground">{stats.max.toFixed(2)} m3</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">{t('contracts.waterConsumption.lastReadingDate')}</p>
          <p className="text-lg font-bold text-foreground">
            {stats.lastReadingDate ? format(parseISO(stats.lastReadingDate), 'MMM d, yyyy') : '—'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'm3', angle: -90, position: 'insideLeft' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="cubicMeters" stroke="hsl(var(--primary))" dot={{ fill: 'hsl(var(--primary))' }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-muted-foreground text-xs font-medium">{t('contracts.waterConsumption.readingDate')}</th>
              <th className="text-right py-2 text-muted-foreground text-xs font-medium">m3</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="py-2 text-foreground">{format(parseISO(row.date), 'MMM d, yyyy')}</td>
                <td className="text-right text-foreground font-medium tabular-nums">{row.cubicMeters?.toFixed(2)} m3</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
