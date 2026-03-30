import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { MONTHS } from '@/features/home-expenses/lib/types';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '@/i18n/I18nProvider';

const MONTH_KEYS = [
  'homeExpenses.months.january',
  'homeExpenses.months.february',
  'homeExpenses.months.march',
  'homeExpenses.months.april',
  'homeExpenses.months.may',
  'homeExpenses.months.june',
  'homeExpenses.months.july',
  'homeExpenses.months.august',
  'homeExpenses.months.september',
  'homeExpenses.months.october',
  'homeExpenses.months.november',
  'homeExpenses.months.december',
] as const;

export default function BalanceChart() {
  const { allTransactions, selectedYear } = useData();
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    const visibleMonths = (() => {
      if (selectedYear !== currentYear) {
        return MONTHS.map((_, i) => i);
      }

      const expenseMonths = new Set<number>();
      for (const tx of allTransactions) {
        if (tx.type !== 'expense') continue;
        const d = parseLocalDate(tx.date);
        expenseMonths.add(d.getMonth());
      }

      const months = MONTHS.map((_, i) => i).filter((m) => expenseMonths.has(m));
      return months.length > 0 ? months : [new Date().getMonth()];
    })();

    return visibleMonths.map((i) => {
      const name = MONTHS[i];
      const monthTxs = allTransactions.filter((t) => {
        const d = parseLocalDate(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      });
      const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const translated = t(MONTH_KEYS[i]) || name;
      return { name: translated.slice(0, 3), income, expenses, balance: income - expenses };
    });
  }, [allTransactions, selectedYear, t, currentYear]);

  return (
    <div className="h-full rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('homeExpenses.charts.monthlyBalance')} — {selectedYear}</h3>
      <div className="flex-1 min-h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={6} barCategoryGap="16%" margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: 12,
              }}
              formatter={(value: number) => [`€${value.toFixed(2)}`, undefined]}
            />
            <Bar dataKey="income" name={t('homeExpenses.charts.income')} fill="hsl(var(--income))" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name={t('homeExpenses.charts.expenses')} fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} minPointSize={6} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
