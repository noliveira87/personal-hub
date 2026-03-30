import SummaryCards from '@/features/home-expenses/components/dashboard/SummaryCards';
import BalanceChart from '@/features/home-expenses/components/dashboard/BalanceChart';
import ExpensePieChart from '@/features/home-expenses/components/dashboard/ExpensePieChart';
import HighlightsPanel from '@/features/home-expenses/components/dashboard/HighlightsPanel';
import AnnualSummarySection from '@/features/home-expenses/components/dashboard/AnnualSummarySection';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import AppSectionHeader from '@/components/AppSectionHeader';
import { House } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function Index() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 pt-16">
      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={House}
        backTo="/"
        actions={(
          <div className="flex items-center gap-2">
            <MonthYearSelector />
            <TransactionForm />
          </div>
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.dashboard.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.dashboard.subtitle')}</p>
      </div>

      <SummaryCards />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="order-1 lg:order-1 lg:col-span-8 lg:h-[30rem]">
          <BalanceChart />
        </div>
        <div className="order-2 lg:order-2 lg:col-span-4 lg:h-[30rem]">
          <ExpensePieChart />
        </div>
        <div className="order-3 lg:order-3 lg:col-span-8">
          <AnnualSummarySection />
        </div>
        <div className="order-4 lg:order-4 lg:col-span-4">
          <HighlightsPanel />
        </div>
      </div>
    </div>
  );
}
