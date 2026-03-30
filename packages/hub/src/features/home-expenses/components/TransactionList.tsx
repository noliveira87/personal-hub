import { useMemo, useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { formatCurrency, parseLocalDate } from '@/features/home-expenses/lib/store';
import { EXPENSE_CATEGORIES, Transaction } from '@/features/home-expenses/lib/types';
import { Pencil, Trash2, RotateCcw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TransactionForm from './TransactionForm';
import { isContractTransaction } from '@/features/home-expenses/lib/contractMapping';
import { useI18n } from '@/i18n/I18nProvider';

export default function TransactionList() {
  const { allTransactions, transactions, setTransactions, selectedYear, selectedMonth } = useData();
  const { t, locale } = useI18n();
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return allTransactions
      .filter((t) => {
        const d = parseLocalDate(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, selectedYear, selectedMonth]);

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const getCategoryLabel = (cat?: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.value === cat);
    return found ? `${found.icon} ${t(`homeExpenses.categories.${found.value}`)}` : '';
  };

  const isContractTx = (tx: Transaction): boolean => isContractTransaction(tx);

  return (
    <div className="space-y-2">
      {editTx && !isContractTx(editTx) && <TransactionForm editTx={editTx} onClose={() => setEditTx(null)} open />}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">{t('homeExpenses.list.noTransactionsThisMonth')}</div>
      )}
      {filtered.map((tx) => (
        <div key={tx.id} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm flex items-center justify-between gap-4 animate-fade-in sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2 h-8 rounded-full ${tx.type === 'income' ? 'bg-income' : 'bg-expense'}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground truncate">{tx.name}</span>
                {isContractTx(tx) && (
                  <span title={t('homeExpenses.list.fromContractManager')} className="text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                  </span>
                )}
                {tx.recurring && <RotateCcw className="w-3 h-3 text-muted-foreground" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {tx.type === 'expense' && getCategoryLabel(tx.category)}
                {tx.type === 'expense' && ' · '}
                {new Date(tx.date).toLocaleDateString(locale)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`tabular-nums font-semibold text-sm ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </span>
            {!isContractTx(tx) && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTx(tx)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tx.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
