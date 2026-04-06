import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import TransactionList from '@/features/home-expenses/components/TransactionList';
import AppSectionHeader from '@/components/AppSectionHeader';
import { ArrowUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { useData } from '@/features/home-expenses/lib/DataContext';
import type { ExpenseCategory } from '@/features/home-expenses/lib/types';

const ALLOWED_CATEGORIES = new Set<ExpenseCategory>([
  'mortgage',
  'insurance',
  'electricity',
  'water',
  'internet',
  'car',
  'carRenting',
  'leisure',
  'gym',
  'socialSecurity',
  'other',
]);

export default function Transactions() {
  const { t } = useI18n();
  const { selectedYear, selectedMonth } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const [quickAddOpen, setQuickAddOpen] = useState(searchParams.get('open') === '1');

  useEffect(() => {
    setQuickAddOpen(searchParams.get('open') === '1');
  }, [searchParams]);

  const initialCategory = useMemo(() => {
    const category = searchParams.get('category');
    if (!category || !ALLOWED_CATEGORIES.has(category as ExpenseCategory)) {
      return undefined;
    }

    return category as ExpenseCategory;
  }, [searchParams]);

  const closeQuickAdd = () => {
    setQuickAddOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('contractId');
    nextParams.delete('category');
    nextParams.delete('name');
    nextParams.delete('notes');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <TransactionForm
        open={quickAddOpen}
        onClose={closeQuickAdd}
        initialDate={initialDate}
        initialType="expense"
        initialCategory={initialCategory}
        initialContractId={searchParams.get('contractId') ?? undefined}
        initialName={searchParams.get('name') ?? undefined}
        initialNotes={searchParams.get('notes') ?? undefined}
      />

      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={ArrowUpDown}
        backTo="/"
        actions={(
          <Button
            size="sm"
            className="h-10 w-10 rounded-xl px-0 gap-2 sm:h-9 sm:w-auto sm:px-3"
            aria-label={t('homeExpenses.form.addTransaction')}
            title={t('homeExpenses.form.addTransaction')}
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('homeExpenses.form.addTransaction')}</span>
          </Button>
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.transactions.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.transactions.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthYearSelector />
      </div>
      <TransactionList />
    </div>
  );
}
