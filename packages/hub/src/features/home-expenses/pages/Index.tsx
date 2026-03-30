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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-8">
          <div className="min-h-[30rem] lg:h-[30rem]">
            <BalanceChart />
          </div>
          <div className="min-h-[14rem] lg:h-[14rem]">
            <AnnualSummarySection />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:col-span-4">
          <div className="min-h-[30rem] lg:h-[30rem]">
            <ExpensePieChart />
          </div>
          <div className="min-h-[14rem] lg:h-[14rem]">
            <HighlightsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
