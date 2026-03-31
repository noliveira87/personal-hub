import { useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { useI18n } from '@/i18n/I18nProvider';

export default function AnnualSummarySection() {
  const { allTransactions, selectedYear } = useData();
  const { t, hideAmounts, formatCurrency } = useI18n();

  const totals = useMemo(() => {
    const yearTxs = allTransactions.filter((tx) => {
      const d = parseLocalDate(tx.date);
      return d.getFullYear() === selectedYear;
    });

    const income = yearTxs.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = yearTxs.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }, [allTransactions, selectedYear, hideAmounts]);

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 flex flex-col justify-center">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t('homeExpenses.annual.title')} — {selectedYear}</h3>
        <p className="text-xs text-muted-foreground mt-1">{t('homeExpenses.annual.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-income" />
            {t('homeExpenses.charts.income')}
          </p>
          <p className="mt-1 font-semibold tabular-nums text-income">{formatCurrency(totals.income)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-expense" />
            {t('homeExpenses.charts.expenses')}
          </p>
          <p className="mt-1 font-semibold tabular-nums text-expense">{formatCurrency(totals.expenses)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
          <p className="text-muted-foreground">{t('homeExpenses.charts.net')}</p>
          <p className={`mt-1 font-semibold tabular-nums ${totals.net >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(totals.net)}
          </p>
        </div>
      </div>
    </section>
  );
}