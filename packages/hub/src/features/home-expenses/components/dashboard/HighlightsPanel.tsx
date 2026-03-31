import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { formatCurrency, parseLocalDate } from '@/features/home-expenses/lib/store';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function HighlightsPanel() {
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const { t, hideAmounts } = useI18n();

  const insights = useMemo(() => {
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

    const expenses = monthTxs.filter((t) => t.type === 'expense');
    const biggestExpense = expenses.length > 0 ? expenses.reduce((a, b) => (a.amount > b.amount ? a : b)) : null;

    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const fixedExpenses = expenses.filter((t) => t.recurring).reduce((s, t) => s + t.amount, 0);
    const moneyAfterFixed = income - fixedExpenses;

    const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

    return { biggestExpense, totalExpenses, expenseChange, moneyAfterFixed, prevExpenses };
  }, [allTransactions, selectedYear, selectedMonth, hideAmounts]);

  const items = [
    insights.biggestExpense && {
      icon: Award,
      label: t('homeExpenses.highlights.biggestExpense'),
      value: `${insights.biggestExpense.name} — ${formatCurrency(insights.biggestExpense.amount)}`,
      colorClass: 'text-expense',
    },
    {
      icon: insights.moneyAfterFixed >= 0 ? TrendingUp : TrendingDown,
      label: t('homeExpenses.highlights.afterFixedExpenses'),
      value: formatCurrency(insights.moneyAfterFixed),
      colorClass: insights.moneyAfterFixed >= 0 ? 'text-positive' : 'text-negative',
    },
    insights.prevExpenses > 0 && {
      icon: insights.expenseChange > 0 ? AlertTriangle : TrendingDown,
      label: t('homeExpenses.highlights.vsLastMonth'),
      value: `${insights.expenseChange > 0 ? '+' : ''}${insights.expenseChange.toFixed(1)}%`,
      colorClass: insights.expenseChange > 0 ? 'text-expense' : 'text-positive',
    },
  ].filter(Boolean) as { icon: typeof Award; label: string; value: string; colorClass: string }[];

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">{t('homeExpenses.charts.highlights')}</h3>
      <div className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{t('homeExpenses.charts.addTransactionsToSeeHighlights')}</p>}
        {items.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-3">
            <item.icon className={`w-4 h-4 mt-0.5 ${item.colorClass}`} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-semibold ${item.colorClass}`}>{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
