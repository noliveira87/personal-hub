import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { Wallet, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';

export default function SummaryCards() {
  const { allTransactions, selectedYear, selectedMonth } = useData();
  const { t, hideAmounts, formatCurrency } = useI18n();

  const cards = useMemo(() => {
    const monthTxs = allTransactions.filter((t) => {
      const d = parseLocalDate(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;

    return [
      { label: t('homeExpenses.summary.monthlyIncome'), value: formatCurrency(income), icon: Wallet, colorClass: 'text-income' },
      { label: t('homeExpenses.summary.monthlyExpenses'), value: formatCurrency(expenses), icon: TrendingDown, colorClass: 'text-expense' },
      { label: t('homeExpenses.summary.netBalance'), value: formatCurrency(balance), icon: TrendingUp, colorClass: balance >= 0 ? 'text-positive' : 'text-negative' },
      { label: t('homeExpenses.summary.savingsRate'), value: `${savingsRate.toFixed(1)}%`, icon: Percent, colorClass: savingsRate >= 0 ? 'text-positive' : 'text-negative' },
    ];
  }, [allTransactions, selectedYear, selectedMonth, hideAmounts, t, formatCurrency]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.colorClass}`} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${card.colorClass}`}>{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
