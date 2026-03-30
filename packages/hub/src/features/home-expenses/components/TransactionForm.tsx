import { useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { Transaction, EXPENSE_CATEGORIES, TransactionType, ExpenseCategory } from '@/features/home-expenses/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  editTx?: Transaction;
  onClose?: () => void;
  open?: boolean;
}

export default function TransactionForm({ editTx, onClose, open: controlledOpen }: Props) {
  const { transactions, setTransactions } = useData();
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    if (!v) onClose?.();
  };

  const [type, setType] = useState<TransactionType>(editTx?.type ?? 'expense');
  const [name, setName] = useState(editTx?.name ?? '');
  const [amount, setAmount] = useState(editTx?.amount?.toString() ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(editTx?.category ?? 'other');
  const [date, setDate] = useState(editTx?.date ?? new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(editTx?.recurring ?? false);

  const reset = () => {
    setType('expense');
    setName('');
    setAmount('');
    setCategory('other');
    setDate(new Date().toISOString().slice(0, 10));
    setRecurring(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;

    if (editTx) {
      setTransactions(
        transactions.map((t) => (t.id === editTx.id ? { ...t, type, name: name.trim(), amount: parsed, category: type === 'expense' ? category : undefined, date, recurring } : t))
      );
    } else {
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        type,
        name: name.trim(),
        amount: parsed,
        category: type === 'expense' ? category : undefined,
        date,
        recurring,
      };
      setTransactions([...transactions, newTx]);
    }
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!editTx && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t('homeExpenses.form.addTransaction')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTx ? t('homeExpenses.form.editTransaction') : t('homeExpenses.form.newTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={type === 'income' ? 'default' : 'outline'} className={type === 'income' ? 'flex-1 bg-income hover:bg-income/90' : 'flex-1'} onClick={() => setType('income')}>
              {t('homeExpenses.form.income')}
            </Button>
            <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} className={type === 'expense' ? 'flex-1 bg-expense hover:bg-expense/90' : 'flex-1'} onClick={() => setType('expense')}>
              {t('homeExpenses.form.expense')}
            </Button>
          </div>

          <div>
            <Label htmlFor="name">{t('homeExpenses.form.name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('homeExpenses.form.namePlaceholder')} className="mt-1" required />
          </div>

          <div>
            <Label htmlFor="amount">{t('homeExpenses.form.amount')}</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('homeExpenses.form.amountPlaceholder')} className="mt-1 tabular-nums" required />
          </div>

          {type === 'expense' && (
            <div>
              <Label>{t('homeExpenses.form.category')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.icon} {t(`homeExpenses.categories.${c.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="date">{t('homeExpenses.form.date')}</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" required />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
            <Label htmlFor="recurring">{t('homeExpenses.form.recurringMonthly')}</Label>
          </div>

          <Button type="submit" className="w-full">
            {editTx ? t('homeExpenses.form.saveChanges') : t('homeExpenses.form.addTransaction')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
