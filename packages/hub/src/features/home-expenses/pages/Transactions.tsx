import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import TransactionList from '@/features/home-expenses/components/TransactionList';
import AppSectionHeader from '@/components/AppSectionHeader';
import { ArrowUpDown } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function Transactions() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 pt-16">
      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={ArrowUpDown}
        backTo="/"
        actions={(
          <div className="flex items-center gap-2">
            <MonthYearSelector />
            <TransactionForm />
          </div>
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.transactions.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.transactions.subtitle')}</p>
      </div>
      <TransactionList />
    </div>
  );
}
