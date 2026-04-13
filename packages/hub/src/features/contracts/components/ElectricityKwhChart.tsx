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
  kwh: number | null;
}

interface KwhDataPoint {
  date: string;
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

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-2">⚡ kWh Consumption</h2>
        <p className="text-sm text-muted-foreground">No kWh data recorded yet. Add kWh when logging expenses.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '130ms' }}>
      <h2 className="text-sm font-semibold text-foreground mb-4">⚡ kWh Consumption</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{stats.total.toFixed(0)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-lg font-bold text-foreground">{stats.average.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-lg font-bold text-foreground">{stats.min.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
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
                <Line
                  type="monotone"
                  dataKey="kwh"
                  stroke="hsl(var(--primary))"
                  dot={{ fill: 'hsl(var(--primary))' }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
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
