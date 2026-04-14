import { useMemo, useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { EXPENSE_CATEGORIES, Transaction } from '@/features/home-expenses/lib/types';
import { Pencil, Trash2, RotateCcw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TransactionForm from './TransactionForm';
import { isContractTransaction } from '@/features/home-expenses/lib/contractMapping';
import { useI18n } from '@/i18n/I18nProvider';

export default function TransactionList() {
  const { allTransactions, deleteTx, selectedYear, selectedMonth } = useData();
  const { t, locale, formatCurrency } = useI18n();
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [txPendingDelete, setTxPendingDelete] = useState<Transaction | null>(null);

  const categoryOrder = useMemo(
    () => new Map(EXPENSE_CATEGORIES.map((category, index) => [category.value, index])),
    [],
  );

  const filtered = useMemo(() => {
    return allTransactions
      .filter((t) => {
        const d = parseLocalDate(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
      .sort((a, b) => {
        // Show income movements first.
        if (a.type !== b.type) {
          return a.type === 'income' ? -1 : 1;
        }

        if (a.type === 'expense' && b.type === 'expense') {
          const categoryA = categoryOrder.get(a.category ?? 'other') ?? Number.MAX_SAFE_INTEGER;
          const categoryB = categoryOrder.get(b.category ?? 'other') ?? Number.MAX_SAFE_INTEGER;
          if (categoryA !== categoryB) {
            return categoryA - categoryB;
          }
        }

        if (a.amount !== b.amount) {
          return b.amount - a.amount;
        }

        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [allTransactions, selectedYear, selectedMonth, categoryOrder]);

  const handleDelete = (id: string) => {
    void deleteTx(id);
  };

  const getCategoryLabel = (cat?: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.value === cat);
    return found ? `${found.icon} ${t(`homeExpenses.categories.${found.value}`)}` : '';
  };

  const getTransactionCategoryLabel = (tx: Transaction) => {
    if (tx.type === 'income') {
      return `⬆️ ${t('homeExpenses.form.income')}`;
    }

    return getCategoryLabel(tx.category);
  };

  const getCategoryHeaderLabel = (tx: Transaction) => {
    if (tx.type === 'income') {
      return `⬆️ ${t('homeExpenses.form.income')}`;
    }

    const found = EXPENSE_CATEGORIES.find((category) => category.value === (tx.category ?? 'other'));
    if (!found) {
      return null;
    }

    return `${found.icon} ${t(`homeExpenses.categories.${found.value}`)}`;
  };

  const getGroupKey = (tx: Transaction) => {
    if (tx.type !== 'expense') {
      return `type:${tx.type}`;
    }

    return `expense:${tx.category ?? 'other'}`;
  };

  const isContractTx = (tx: Transaction): boolean => isContractTransaction(tx);

  return (
    <div className="space-y-2">
      {editTx && <TransactionForm editTx={editTx} onClose={() => setEditTx(null)} open />}
      <AlertDialog open={txPendingDelete !== null} onOpenChange={(open) => { if (!open) setTxPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('homeExpenses.list.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('homeExpenses.list.deleteDialog.description', {
                name: txPendingDelete?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('homeExpenses.list.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!txPendingDelete) return;
                handleDelete(txPendingDelete.id);
                setTxPendingDelete(null);
              }}
            >
              {t('homeExpenses.list.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">{t('homeExpenses.list.noTransactionsThisMonth')}</div>
      )}
      {filtered.map((tx, index) => {
        const previous = index > 0 ? filtered[index - 1] : null;
        const shouldShowCategoryHeader = !previous || getGroupKey(previous) !== getGroupKey(tx);
        const categoryHeaderLabel = getCategoryHeaderLabel(tx);

        return (
          <div key={tx.id} className="space-y-2">
            {shouldShowCategoryHeader && categoryHeaderLabel && (
              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground">
                {categoryHeaderLabel}
              </div>
            )}

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm animate-fade-in sm:p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-8 rounded-full ${tx.type === 'income' ? 'bg-income' : 'bg-expense'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="block min-w-0 flex-1 font-medium text-sm text-foreground truncate" title={tx.name}>{tx.name}</span>
                    {isContractTx(tx) && (
                      <span
                        title={t('homeExpenses.list.linkedContract')}
                        aria-label={t('homeExpenses.list.linkedContract')}
                        className="text-muted-foreground shrink-0"
                      >
                        <Link2 className="w-3 h-3" />
                      </span>
                    )}
                    {tx.recurring && (
                      <span
                        title={t('homeExpenses.list.recurring')}
                        aria-label={t('homeExpenses.list.recurring')}
                        className="text-muted-foreground shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getTransactionCategoryLabel(tx)}
                    {' · '}
                    {new Date(tx.date).toLocaleDateString(locale)}
                  </span>
                  {tx.type === 'expense' && tx.category === 'other' && tx.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tx.notes}</p>
                  )}
                </div>
              </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`tabular-nums font-semibold text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  {!tx.isReadOnly && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTx(tx)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTxPendingDelete(tx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
