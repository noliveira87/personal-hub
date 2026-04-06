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
import { getCarChargingTransactionName, mapContractCategoryToExpenseCategory } from '@/features/home-expenses/lib/contractMapping';
import { encodeCarChargingNotes, parseCarChargingNotes, type CarChargingLocation } from '@/features/home-expenses/lib/carCharging';

interface Props {
  editTx?: Transaction;
  onClose?: () => void;
  open?: boolean;
  initialDate?: string;
  initialType?: TransactionType;
  initialCategory?: ExpenseCategory;
  initialContractId?: string;
  initialName?: string;
  initialNotes?: string;
  trigger?: ReactNode;
}

function getTodayLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TransactionForm({ editTx, onClose, open: controlledOpen, initialDate, initialType, initialCategory, initialContractId, initialName, initialNotes, trigger }: Props) {
  const { addTx, updateTx } = useData();
  const { contracts } = useContracts();
  const { t } = useI18n();
  const isLegacyCarChargingEdit = editTx?.source === 'legacy-car-charging';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    if (!v) onClose?.();
  };

  const [type, setType] = useState<TransactionType>(editTx?.type ?? initialType ?? 'expense');
  const [name, setName] = useState(editTx?.name ?? initialName ?? '');
  const [amount, setAmount] = useState(editTx?.amount?.toString() ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(editTx?.category ?? initialCategory ?? 'other');
  const [notes, setNotes] = useState(editTx?.notes ?? initialNotes ?? '');
  const [date, setDate] = useState(editTx?.date ?? getTodayLocalDateString());
  const [recurring, setRecurring] = useState(editTx?.recurring ?? false);
  const [contractId, setContractId] = useState(editTx?.contractId ?? initialContractId ?? 'none');
  const [chargingLocation, setChargingLocation] = useState<CarChargingLocation>('home');
  const [chargingDescription, setChargingDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const sourceNotes = editTx?.notes ?? initialNotes ?? '';
    const parsedChargingNotes = parseCarChargingNotes(sourceNotes);

    if (editTx) {
      setType(editTx.type ?? 'expense');
      setName(editTx.name ?? '');
      setAmount(editTx.amount?.toString() ?? '');
      setCategory(editTx.category ?? 'other');
      setNotes(parsedChargingNotes.location ? parsedChargingNotes.description : (editTx.notes ?? ''));
      setDate(editTx.date ?? getTodayLocalDateString());
      setRecurring(editTx.recurring ?? false);
      setContractId(editTx.contractId ?? 'none');
      setChargingLocation(parsedChargingNotes.location ?? 'home');
      setChargingDescription(parsedChargingNotes.description);
      return;
    }

    setType(initialType ?? 'expense');
    setName(initialName ?? '');
    setAmount('');
    setCategory(initialCategory ?? 'other');
    setNotes(parsedChargingNotes.location ? parsedChargingNotes.description : (initialNotes ?? ''));
    setDate(getTodayLocalDateString());
    setRecurring(false);
    setContractId(initialContractId ?? 'none');
    setChargingLocation(parsedChargingNotes.location ?? 'home');
    setChargingDescription(parsedChargingNotes.description);
  }, [editTx, initialDate, initialType, initialCategory, initialContractId, initialName, initialNotes]);

  const selectedContract = contractId !== 'none'
    ? contracts.find(contract => contract.id === contractId)
    : undefined;

  const reset = () => {
    setType(initialType ?? 'expense');
    setName(initialName ?? '');
    setAmount('');
    setCategory(initialCategory ?? 'other');
    setNotes(initialNotes ?? '');
    setDate(getTodayLocalDateString());
    setRecurring(false);
    setContractId(initialContractId ?? 'none');
    setChargingLocation('home');
    setChargingDescription('');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    setSubmitError(null);

    const nextCategory = type === 'expense' ? category : undefined;
    if (type === 'expense' && nextCategory === 'car' && chargingLocation === 'outside' && !chargingDescription.trim()) {
      setSubmitError(t('contracts.electricity.outsideNeedsDescription'));
      return;
    }

    const nextNotes = type === 'expense'
      ? nextCategory === 'car'
        ? encodeCarChargingNotes(chargingLocation, chargingLocation === 'outside' ? chargingDescription : undefined)
        : nextCategory === 'other'
          ? (notes.trim() || undefined)
          : undefined
      : undefined;
    const nextContractId = type === 'expense' && selectedContract ? selectedContract.id : undefined;
    const nextName = type === 'expense' && nextCategory === 'car' && selectedContract?.category === 'car'
      ? getCarChargingTransactionName(selectedContract.name)
      : name.trim();

    try {
      if (editTx) {
        await updateTx(editTx.id, {
          type,
          name: nextName,
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
          name: nextName,
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
      {!editTx && controlledOpen === undefined && (
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
            <Button type="button" variant={type === 'income' ? 'default' : 'outline'} className={type === 'income' ? 'flex-1 bg-income hover:bg-income/90' : 'flex-1'} onClick={() => setType('income')} disabled={isLegacyCarChargingEdit}>
              {t('homeExpenses.form.income')}
            </Button>
            <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} className={type === 'expense' ? 'flex-1 bg-expense hover:bg-expense/90' : 'flex-1'} onClick={() => setType('expense')} disabled={isLegacyCarChargingEdit}>
              {t('homeExpenses.form.expense')}
            </Button>
          </div>

          {type === 'income' && (
            <>
              <div>
                <Label htmlFor="name">{t('homeExpenses.form.name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('homeExpenses.form.namePlaceholder')} className="mt-1" required disabled={isLegacyCarChargingEdit} />
              </div>

              <div>
                <Label htmlFor="amount">{t('homeExpenses.form.amount')}</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('homeExpenses.form.amountPlaceholder')} className="mt-1 tabular-nums" required />
              </div>
            </>
          )}

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
                    if (next !== 'car') {
                      setChargingLocation('home');
                      setChargingDescription('');
                    }
                  }}
                  disabled={isLegacyCarChargingEdit}
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
                        setName(
                          contract.category === 'car'
                            ? getCarChargingTransactionName(contract.name)
                            : `${contract.name} (${contract.provider})`,
                        );
                      }
                    }}
                    disabled={isLegacyCarChargingEdit}
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
                      {selectedContract.category === 'car'
                        ? t('homeExpenses.form.carContractHint')
                        : t('homeExpenses.form.linkedContractHint')}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="name">{t('homeExpenses.form.name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('homeExpenses.form.namePlaceholder')} className="mt-1" required disabled={isLegacyCarChargingEdit} />
              </div>

              <div>
                <Label htmlFor="amount">{t('homeExpenses.form.amount')}</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('homeExpenses.form.amountPlaceholder')} className="mt-1 tabular-nums" required />
              </div>

              {category === 'car' && (
                <>
                  <div>
                    <Label>{t('contracts.electricity.location')}</Label>
                    <Select value={chargingLocation} onValueChange={(value) => setChargingLocation(value as CarChargingLocation)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">{t('contracts.electricity.home')}</SelectItem>
                        <SelectItem value="outside">{t('contracts.electricity.outside')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {chargingLocation === 'outside' && (
                    <div>
                      <Label htmlFor="charging-description">{t('contracts.electricity.description')}</Label>
                      <Textarea
                        id="charging-description"
                        value={chargingDescription}
                        onChange={(e) => {
                          setChargingDescription(e.target.value);
                          setNotes(e.target.value);
                        }}
                        placeholder={t('contracts.electricity.descriptionPlaceholder')}
                        className="mt-1"
                      />
                    </div>
                  )}
                </>
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

          {!isLegacyCarChargingEdit && (
            <div className="flex items-center gap-3">
              <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
              <Label htmlFor="recurring">{t('homeExpenses.form.recurringMonthly')}</Label>
            </div>
          )}

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
