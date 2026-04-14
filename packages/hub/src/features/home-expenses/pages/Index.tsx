import { useEffect, useRef, useState } from 'react';
import SummaryCards from '@/features/home-expenses/components/dashboard/SummaryCards';
import BalanceChart from '@/features/home-expenses/components/dashboard/BalanceChart';
import ExpensePieChart from '@/features/home-expenses/components/dashboard/ExpensePieChart';
import HighlightsPanel from '@/features/home-expenses/components/dashboard/HighlightsPanel';
import AnnualSummarySection from '@/features/home-expenses/components/dashboard/AnnualSummarySection';
import MonthYearSelector from '@/features/home-expenses/components/MonthYearSelector';
import TransactionForm from '@/features/home-expenses/components/TransactionForm';
import AppSectionHeader from '@/components/AppSectionHeader';
import AppLoadingState from '@/components/AppLoadingState';
import { House, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { Link } from 'react-router-dom';

export default function Index() {
  const { t } = useI18n();
  const { loading } = useData();
  const topRightRef = useRef<HTMLDivElement | null>(null);
  const [topRightHeight, setTopRightHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = topRightRef.current;
    if (!el) return;

    const update = () => setTopRightHeight(el.getBoundingClientRect().height);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return <AppLoadingState label={t('app.loadingRoute')} variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <AppSectionHeader
        title={t('homeExpenses.appTitle')}
        icon={House}
        backTo="/"
        actions={(
          <div className="flex items-center gap-2">
            <TransactionForm
              trigger={(
                <Button
                  size="sm"
                  className="h-10 w-10 rounded-xl px-0 gap-2 sm:h-9 sm:w-auto sm:px-3"
                  aria-label={t('homeExpenses.form.addTransaction')}
                  title={t('homeExpenses.form.addTransaction')}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('homeExpenses.form.addTransaction')}</span>
                </Button>
              )}
            />

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/home-expenses/insights" aria-label="Open insights" title="Insights" className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Insights</span>
                </Link>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl sm:hidden"
              asChild
              aria-label="Insights"
            >
              <Link to="/home-expenses/insights" title="Insights">
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <h2 className="text-2xl font-bold text-foreground">{t('homeExpenses.pages.dashboard.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('homeExpenses.pages.dashboard.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthYearSelector />
      </div>

      <SummaryCards />

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start"
        style={{ ['--top-right-height' as string]: topRightHeight ? `${topRightHeight}px` : undefined } as React.CSSProperties}
      >
        <div className="order-1 lg:order-1 lg:col-span-8 lg:h-[var(--top-right-height)]">
          <BalanceChart />
        </div>
        <div ref={topRightRef} className="order-2 lg:order-2 lg:col-span-4">
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
