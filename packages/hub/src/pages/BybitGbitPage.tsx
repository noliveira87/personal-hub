import { format } from 'date-fns';
import { CalendarDays, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppSectionHeader from '@/components/AppSectionHeader';
import BybitGbitManagerDialog from '@/features/cashback-hero/components/BybitGbitManagerDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/components/ui/button';

export default function BybitGbitPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [openManualAddSignal, setOpenManualAddSignal] = useState(0);

  const selectedMonth = useMemo(() => {
    const month = searchParams.get('month');
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      return month;
    }
    return format(new Date(), 'yyyy-MM');
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title={t('cashbackHero.bybitFuture.headerAction')}
        icon={CalendarDays}
        backTo="/cashback-hero"
        backLabel={t('common.back')}
        actions={(
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpenManualAddSignal((prev) => prev + 1)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('cashbackHero.bybitFuture.add')}</span>
          </Button>
        )}
      />

      <div className="mx-auto max-w-6xl px-4 pb-8 pt-20 lg:px-6 lg:pt-24">
        <BybitGbitManagerDialog mode="page" selectedMonth={selectedMonth} openManualAddSignal={openManualAddSignal} />
      </div>
    </div>
  );
}
