import { ReactNode, useEffect, useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { Transaction, EXPENSE_CATEGORIES, TransactionType, ExpenseCategory } from '@/features/home-expenses/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { mapContractCategoryToExpenseCategory } from '@/features/home-expenses/lib/contractMapping';

interface Props {
  editTx?: Transaction;
  onClose?: () => void;
  open?: boolean;
  initialDate?: string;
  trigger?: ReactNode;
}

export default function TransactionForm({ editTx, onClose, open: controlledOpen, initialDate, trigger }: Props) {
  const { addTx, updateTx } = useData();
  const { contracts } = useContracts();
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
  const [notes, setNotes] = useState(editTx?.notes ?? '');
  const [date, setDate] = useState(editTx?.date ?? initialDate ?? new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(editTx?.recurring ?? false);
  const [contractId, setContractId] = useState(editTx?.contractId ?? 'none');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!editTx) return;
    setType(editTx.type ?? 'expense');
    setName(editTx.name ?? '');
    setAmount(editTx.amount?.toString() ?? '');
    setCategory(editTx.category ?? 'other');
    setNotes(editTx.notes ?? '');
    setDate(editTx.date ?? initialDate ?? new Date().toISOString().slice(0, 10));
    setRecurring(editTx.recurring ?? false);
    setContractId(editTx.contractId ?? 'none');
  }, [editTx, initialDate]);

  const selectedContract = contractId !== 'none'
    ? contracts.find(contract => contract.id === contractId)
    : undefined;

  const reset = () => {
    setType('expense');
    setName('');
    setAmount('');
    setCategory('other');
    setNotes('');
    setDate(initialDate ?? new Date().toISOString().slice(0, 10));
    setRecurring(false);
    setContractId('none');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    setSubmitError(null);

    const nextCategory = type === 'expense'
      ? (selectedContract ? (mapContractCategoryToExpenseCategory(selectedContract.category) ?? 'other') : category)
      : undefined;
    const nextNotes = type === 'expense' && nextCategory === 'other' ? (notes.trim() || undefined) : undefined;
    const nextContractId = type === 'expense' && selectedContract ? selectedContract.id : undefined;

    try {
      if (editTx) {
        await updateTx(editTx.id, {
          type,
          name: name.trim(),
          amount: parsed,
          category: nextCategory,
          notes: nextNotes,
          date,
          recurring,
          contractId: nextContractId,
          isContractExpense: Boolean(nextContractId),
        });
      } else {
        await addTx({
          type,
          name: name.trim(),
          amount: parsed,
          category: nextCategory,
          notes: nextNotes,
          date,
          recurring,
          contractId: nextContractId,
          isContractExpense: Boolean(nextContractId),
        });
      }
      reset();
      setOpen(false);
    } catch {
      setSubmitError('Could not save transaction. Please try again.');
    }
  };

  const showLinkedContract = type === 'expense';

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!editTx && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t('homeExpenses.form.addTransaction')}
            </Button>
          )}
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
            <>
              <div>
                <Label>{t('homeExpenses.form.category')}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    const next = v as ExpenseCategory;
                    setCategory(next);
                    if (next === 'other') {
                      setContractId('none');
                    }
                  }}
                >
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

              {showLinkedContract && (
                <div>
                  <Label>Linked contract</Label>
                  <Select
                    value={contractId}
                    onValueChange={(value) => {
                      setContractId(value);
                      if (value === 'none') {
                        return;
                      }

                      const contract = contracts.find(item => item.id === value);
                      if (!contract) {
                        return;
                      }

                      const mappedCategory = mapContractCategoryToExpenseCategory(contract.category);
                      if (mappedCategory && mappedCategory !== 'other') {
                        setCategory(mappedCategory);
                      }

                      if (!name.trim()) {
                        setName(`${contract.name} (${contract.provider})`);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked contract</SelectItem>
                      {contracts
                        .filter(contract => contract.status === 'active')
                        .map(contract => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.name} ({contract.provider})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedContract && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This expense will feed the contract price history automatically.
                    </p>
                  )}
                </div>
              )}

              {category === 'other' && (
                <div>
                  <Label htmlFor="notes">{t('homeExpenses.form.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('homeExpenses.form.notesPlaceholder')}
                    className="mt-1"
                  />
                </div>
              )}
            </>
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
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
