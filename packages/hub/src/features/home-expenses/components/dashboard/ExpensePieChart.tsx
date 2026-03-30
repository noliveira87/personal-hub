import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { EXPENSE_CATEGORIES } from '@/features/home-expenses/lib/types';
import { formatCurrency, parseLocalDate } from '@/features/home-expenses/lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/i18n/I18nProvider';

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 72%, 51%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(190, 90%, 50%)',
  'hsl(330, 80%, 60%)',
];

function CustomPieTooltip({ active, payload, fallbackTitle }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; fallbackTitle: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const title = item?.name || fallbackTitle;
  const value = typeof item?.value === 'number' ? item.value : 0;

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-md">
      <p className="max-w-[170px] truncate text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 tabular-nums text-base font-semibold text-foreground">{formatCurrency(value)}</p>
    </div>
  );
}

export default function ExpensePieChart() {
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const { t } = useI18n();

  const data = useMemo(() => {
    const monthExpenses = allTransactions.filter((t) => {
      const d = parseLocalDate(t.date);
      return t.type === 'expense' && d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const grouped = EXPENSE_CATEGORIES.map((cat) => {
      const total = monthExpenses.filter((t) => t.category === cat.value).reduce((s, t) => s + t.amount, 0);
      return { name: `${cat.icon} ${t(`homeExpenses.categories.${cat.value}`)}`, value: total };
    }).filter((d) => d.value > 0);

    const totalExpenses = grouped.reduce((sum, item) => sum + item.value, 0);

    return grouped
      .map((item) => ({
        ...item,
        share: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allTransactions, selectedYear, selectedMonth, t]);

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('homeExpenses.charts.noExpensesThisMonth')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('homeExpenses.charts.expenseDistribution')}</h3>
      <div className="h-[18rem] sm:h-[19rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="82%" paddingAngle={2} dataKey="value">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip fallbackTitle={t('homeExpenses.form.expense')} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-2.5 mt-4 pb-4 sm:grid-cols-2">
        {data.map((d, i) => (
          <div key={d.name} className="rounded-xl border border-border bg-background/80 px-3 py-2 text-xs shadow-sm">
            <p className="flex items-center gap-2 text-foreground/90">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="truncate font-medium">{d.name}</span>
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="tabular-nums font-semibold text-foreground">{d.share.toFixed(1)}%</span>
              <span className="tabular-nums font-semibold text-foreground/90">{formatCurrency(d.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
