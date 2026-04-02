import { useMemo, useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { MONTHS, EXPENSE_CATEGORIES, Transaction } from '@/features/home-expenses/lib/types';
import { Input } from '@/components/ui/input';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import AppSectionHeader from '@/components/AppSectionHeader';
import { CalendarDays, Plus } from 'lucide-react';
import { isContractTransaction } from '@/features/home-expenses/lib/contractMapping';
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

export default function Monthly() {
  const { allTransactions, updateTx, selectedYear, selectedMonth } = useData();
  const { t, hideAmounts, formatCurrency } = useI18n();
  const currentYear = new Date().getFullYear();
  const initialDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

  const monthlyData = useMemo(() => {
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
      return { name: t(MONTH_KEYS[i]) || name, month: i, income, expenses, balance: income - expenses, transactions: monthTxs };
    });
  }, [allTransactions, selectedYear, t, currentYear, hideAmounts]);

  const [editingCell, setEditingCell] = useState<{ txId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (txId: string, field: string, currentValue: number) => {
    setEditingCell({ txId, field });
    setEditValue(currentValue.toString());
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      void updateTx(editingCell.txId, { amount: parsed });
    }
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={CalendarDays}
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

      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.monthly.title')} — {selectedYear}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.monthly.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthYearSelector />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t('homeExpenses.monthlyTable.month')}</th>
              <th className="text-right py-3 px-4 font-semibold text-income">{t('homeExpenses.monthlyTable.income')}</th>
              <th className="text-right py-3 px-4 font-semibold text-expense">{t('homeExpenses.monthlyTable.expenses')}</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">{t('homeExpenses.monthlyTable.balance')}</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">{t('homeExpenses.monthlyTable.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row) => {
              const rate = row.income > 0 ? ((row.balance / row.income) * 100).toFixed(1) : '0.0';
              return (
                <tr key={row.month} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{row.name}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-income">{formatCurrency(row.income)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-expense">{formatCurrency(row.expenses)}</td>
                  <td className={`py-3 px-4 text-right tabular-nums font-semibold ${row.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatCurrency(row.balance)}
                  </td>
                  <td className={`py-3 px-4 text-right tabular-nums ${parseFloat(rate) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {rate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="py-3 px-4 font-bold text-foreground">{t('homeExpenses.monthlyTable.total')}</td>
              <td className="py-3 px-4 text-right tabular-nums font-bold text-income">
                {formatCurrency(monthlyData.reduce((s, r) => s + r.income, 0))}
              </td>
              <td className="py-3 px-4 text-right tabular-nums font-bold text-expense">
                {formatCurrency(monthlyData.reduce((s, r) => s + r.expenses, 0))}
              </td>
              <td className={`py-3 px-4 text-right tabular-nums font-bold ${monthlyData.reduce((s, r) => s + r.balance, 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(monthlyData.reduce((s, r) => s + r.balance, 0))}
              </td>
              <td className="py-3 px-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detailed breakdown per month */}
      <div className="space-y-4">
        {monthlyData.filter((m) => m.transactions.length > 0).map((m) => (
          <details key={m.month} className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <summary className="p-4 cursor-pointer font-medium text-foreground hover:bg-accent/50 transition-colors">
              {m.name} — {t('homeExpenses.monthlyTable.transactionsCount', { count: m.transactions.length })}
            </summary>
            <div className="px-4 pb-4">
              <table className="w-full text-sm">
                <tbody>
                  {m.transactions.map((tx) => {
                    const isContractTx = isContractTransaction(tx);
                    return (
                      <tr key={tx.id} className={`border-b border-border/30 ${isContractTx ? 'bg-muted/20' : ''}`}>
                        <td className="py-2 text-foreground">{tx.name}</td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {tx.type === 'expense' && EXPENSE_CATEGORIES.find((c) => c.value === tx.category)?.icon}
                        </td>
                        <td className="py-2 text-right">
                          {editingCell?.txId === tx.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                              className="w-28 h-7 text-right tabular-nums text-xs ml-auto"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`tabular-nums cursor-pointer hover:underline ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}
                              onClick={() => startEdit(tx.id, 'amount', tx.amount)}
                            >
                              {formatCurrency(tx.amount)}
                              {isContractTx && <span className="text-xs text-muted-foreground ml-1">{t('homeExpenses.list.contractTag')}</span>}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
