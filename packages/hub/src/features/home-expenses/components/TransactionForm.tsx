import { ReactNode, useEffect, useState } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { Transaction, EXPENSE_CATEGORIES, TransactionType, ExpenseCategory } from '@/features/home-expenses/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { mapContractCategoryToExpenseCategory, sanitizeCarContractName } from '@/features/home-expenses/lib/contractMapping';
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
  const [kwh, setKwh] = useState(editTx?.kwh?.toString() ?? '');
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
      setKwh(editTx.kwh?.toString() ?? '');
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
    setKwh('');
  }, [editTx, initialDate, initialType, initialCategory, initialContractId, initialName, initialNotes]);

  const selectedContract = contractId !== 'none'
    ? contracts.find(contract => contract.id === contractId)
    : undefined;

  const filteredContracts = contracts.filter((contract) => {
    if (contract.status !== 'active') {
      return false;
    }

    if (category === 'car' || category === 'carRenting') {
      return contract.category === 'car' || contract.type === 'car';
    }

    return true;
  });

  const isSelectedContractAvailable = contractId === 'none'
    || filteredContracts.some((contract) => contract.id === contractId);

  const getDefaultCategoryForContract = (contractCategory: NonNullable<typeof selectedContract>['category']): ExpenseCategory => {
    if (contractCategory === 'car') {
      return 'carRenting';
    }

    return mapContractCategoryToExpenseCategory(contractCategory) ?? 'other';
  };

  useEffect(() => {
    if (!isSelectedContractAvailable) {
      setContractId('none');
    }
  }, [isSelectedContractAvailable]);

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
    setKwh('');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed)) return;

    if (parsed === 0) {
      setSubmitError(t('homeExpenses.form.amountCannotBeZero'));
      return;
    }

    if (type === 'income' && parsed < 0) {
      setSubmitError(t('homeExpenses.form.incomeMustBePositive'));
      return;
    }

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
    const nextName = type === 'expense' && selectedContract
      ? nextCategory === 'car' && selectedContract.category === 'car'
        ? t('homeExpenses.form.carChargingTransactionName', {
            name: sanitizeCarContractName(selectedContract.name),
          })
        : name.trim()
      : name.trim();

    const parsedKwh = category === 'electricity' && kwh.trim() ? parseFloat(kwh) : undefined;

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
          kwh: parsedKwh,
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
          kwh: parsedKwh,
        });
      }
      reset();
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save transaction. Please try again.');
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
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>{editTx ? t('homeExpenses.form.editTransaction') : t('homeExpenses.form.newTransaction')}</DialogTitle>
          <DialogDescription>
            {type === 'expense' ? t('homeExpenses.form.addTransaction') : t('homeExpenses.form.newTransaction')}
          </DialogDescription>
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
                <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('homeExpenses.form.amountPlaceholder')} className="mt-1 tabular-nums" required />
              </div>
            </>
          )}

          {type === 'expense' && (
            <>
              {showLinkedContract && (
                <div>
                  <Label>{t('homeExpenses.form.linkedContract')}</Label>
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

                      const nextCategory = getDefaultCategoryForContract(contract.category);

                      setCategory(nextCategory);
                      setName(
                        nextCategory === 'car'
                          ? t('homeExpenses.form.carChargingTransactionName', {
                              name: sanitizeCarContractName(contract.name),
                            })
                          : `${contract.name} (${contract.provider})`,
                      );
                      setAmount(contract.defaultMonthlyValue != null ? contract.defaultMonthlyValue.toString() : '');
                    }}
                    disabled={isLegacyCarChargingEdit}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('homeExpenses.form.optional')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('homeExpenses.form.noLinkedContract')}</SelectItem>
                      {filteredContracts.map(contract => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.name} ({contract.provider})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedContract && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedContract.category === 'car' && category === 'car'
                        ? t('homeExpenses.form.carContractHint')
                        : t('homeExpenses.form.linkedContractHint')}
                    </p>
                  )}
                </div>
              )}

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
                    if ((next === 'car' || next === 'carRenting') && selectedContract && selectedContract.category !== 'car' && selectedContract.type !== 'car') {
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

              <div>
                <Label htmlFor="name">{t('homeExpenses.form.name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('homeExpenses.form.namePlaceholder')} className="mt-1" required disabled={isLegacyCarChargingEdit} />
              </div>

              <div>
                <Label htmlFor="amount">{t('homeExpenses.form.amount')}</Label>
                <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('homeExpenses.form.amountPlaceholder')} className="mt-1 tabular-nums" required />
              </div>

              {category === 'electricity' && (
                <div>
                  <Label htmlFor="kwh">kWh ({t('homeExpenses.form.optional')})</Label>
                  <Input id="kwh" type="number" step="0.01" value={kwh} onChange={(e) => setKwh(e.target.value)} placeholder="0.00" className="mt-1 tabular-nums" />
                </div>
              )}

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

          <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
            <Button type="submit" className="w-full">
              {editTx ? t('homeExpenses.form.saveChanges') : t('homeExpenses.form.addTransaction')}
            </Button>
            {submitError && (
              <p className="mt-3 text-sm text-destructive">{submitError}</p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
