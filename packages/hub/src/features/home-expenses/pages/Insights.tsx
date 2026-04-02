import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { MONTHS } from '@/features/home-expenses/lib/types';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Target, PiggyBank, Activity, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';

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

export default function Insights() {
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const { t, hideAmounts, formatCurrency } = useI18n();
  const currentYear = new Date().getFullYear();
  const initialDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

  const data = useMemo(() => {
    const monthTxs = allTransactions.filter((t) => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
    const prevMonthTxs = allTransactions.filter((t) => {
      const d = parseLocalDate(t.date);
      const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      return d.getFullYear() === py && d.getMonth() === pm;
    });

    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const balance = income - expenses;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;
    const fixedExpenses = monthTxs.filter((t) => t.type === 'expense' && t.recurring).reduce((s, t) => s + t.amount, 0);
    const moneyAfterFixed = income - fixedExpenses;

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();
    const currentDay = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth ? today.getDate() : daysInMonth;
    const dailySpendRate = currentDay > 0 ? expenses / currentDay : 0;
    const forecastExpenses = dailySpendRate * daysInMonth;
    const forecastBalance = income - forecastExpenses;

    const avgExpenses = (() => {
      const months = MONTHS.map((_, i) => {
        const mtxs = allTransactions.filter((t) => {
          const d = parseLocalDate(t.date);
          return d.getFullYear() === selectedYear && d.getMonth() === i && t.type === 'expense';
        });
        return mtxs.reduce((s, t) => s + t.amount, 0);
      }).filter((v) => v > 0);
      return months.length > 0 ? months.reduce((a, b) => a + b, 0) / months.length : 0;
    })();

    const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    const availableMonths = (() => {
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

    const monthlySeries = availableMonths.map((i) => {
      const name = MONTHS[i];
      const mtxs = allTransactions.filter((t) => {
        const d = parseLocalDate(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      });
      const inc = mtxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = mtxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const translated = t(MONTH_KEYS[i]) || name;
      return { monthName: translated, income: inc, expenses: exp, savings: inc - exp };
    });

    // Trend data
    const trendData = monthlySeries.map((m) => ({
      name: m.monthName.slice(0, 3),
      income: m.income,
      expenses: m.expenses,
      savings: m.savings,
    }));

    const maxExpenseMonth = monthlySeries.reduce<{ monthName: string; value: number } | null>((best, current) => {
      if (!best || current.expenses > best.value) {
        return { monthName: current.monthName, value: current.expenses };
      }
      return best;
    }, null);

    const maxSavingsMonth = monthlySeries.reduce<{ monthName: string; value: number } | null>((best, current) => {
      if (!best || current.savings > best.value) {
        return { monthName: current.monthName, value: current.savings };
      }
      return best;
    }, null);

    const expenseVolatility = (() => {
      const values = monthlySeries.map((m) => m.expenses);
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const meanAbsDeviation = values.reduce((sum, v) => sum + Math.abs(v - mean), 0) / values.length;
      return meanAbsDeviation;
    })();

    return {
      income,
      expenses,
      balance,
      savingsRate,
      fixedExpenses,
      moneyAfterFixed,
      forecastExpenses,
      forecastBalance,
      avgExpenses,
      expenseChange,
      trendData,
      prevExpenses,
      maxExpenseMonth,
      maxSavingsMonth,
      expenseVolatility,
    };
  }, [allTransactions, selectedYear, selectedMonth, t, currentYear, hideAmounts]);

  const cards = useMemo(() => [
    { icon: PiggyBank, label: t('homeExpenses.insights.monthlySavings'), value: formatCurrency(data.balance), sub: t('homeExpenses.insights.savingsRateSub', { value: `${data.savingsRate.toFixed(1)}%` }), color: data.balance >= 0 ? 'text-positive' : 'text-negative' },
    { icon: Activity, label: t('homeExpenses.insights.avgMonthlyExpenses'), value: formatCurrency(data.avgExpenses), sub: t('homeExpenses.insights.thisYearAverage'), color: 'text-expense' },
    { icon: Target, label: t('homeExpenses.insights.afterFixedExpenses'), value: formatCurrency(data.moneyAfterFixed), sub: `${t('homeExpenses.insights.fixedPrefix')}: ${formatCurrency(data.fixedExpenses)}`, color: data.moneyAfterFixed >= 0 ? 'text-positive' : 'text-negative' },
    { icon: TrendingUp, label: t('homeExpenses.insights.endOfMonthForecast'), value: formatCurrency(data.forecastBalance), sub: `${t('homeExpenses.insights.estimatedExpensesPrefix')}: ${formatCurrency(data.forecastExpenses)}`, color: data.forecastBalance >= 0 ? 'text-positive' : 'text-negative' },
  ], [data, t, formatCurrency]);

  return (
    <div className="space-y-6">
      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={TrendingUp}
        backTo="/"
        actions={(
          <TransactionForm
            initialDate={initialDate}
            trigger={(
              <Button
                size="sm"
                className="h-10 w-10 rounded-xl px-0 gap-2 sm:h-9 sm:w-auto sm:px-3"
                aria-label={t('homeExpenses.form.addTransaction')}
                title={t('homeExpenses.form.addTransaction')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('homeExpenses.form.addTransaction')}</span>
              </Button>
            )}
          />
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.insights.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.insights.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MonthYearSelector />
      </div>

      {data.prevExpenses > 0 && data.expenseChange > 5 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-foreground">
            {t('homeExpenses.insights.expensesIncreased', { value: `${data.expenseChange.toFixed(1)}%` })}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t('homeExpenses.insights.diagnosticsTitle')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('homeExpenses.insights.maxExpenseMonth')}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.maxExpenseMonth?.monthName ?? '-'}</p>
            <p className="mt-1 text-sm tabular-nums text-expense">{formatCurrency(data.maxExpenseMonth?.value ?? 0)}</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('homeExpenses.insights.maxSavingsMonth')}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.maxSavingsMonth?.monthName ?? '-'}</p>
            <p className={`mt-1 text-sm tabular-nums ${((data.maxSavingsMonth?.value ?? 0) >= 0) ? 'text-positive' : 'text-negative'}`}>
              {formatCurrency(data.maxSavingsMonth?.value ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('homeExpenses.insights.expenseVolatility')}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{t('homeExpenses.insights.avgMonthlyDeviation')}</p>
            <p className="mt-1 text-sm tabular-nums text-foreground">{formatCurrency(data.expenseVolatility)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t('homeExpenses.charts.savingsTrend')} — {selectedYear}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`€${value.toFixed(2)}`, name]}
              />
              <Line type="monotone" dataKey="income" name={t('homeExpenses.charts.income')} stroke="hsl(var(--income))" strokeWidth={2} dot={{ fill: 'hsl(var(--income))', r: 3 }} />
              <Line type="monotone" dataKey="expenses" name={t('homeExpenses.charts.expenses')} stroke="hsl(var(--expense))" strokeWidth={2} dot={{ fill: 'hsl(var(--expense))', r: 3 }} />
              <Line type="monotone" dataKey="savings" name={t('homeExpenses.charts.savings')} stroke="hsl(var(--positive))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--positive))', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
