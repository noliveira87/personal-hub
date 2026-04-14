import { addMonths } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { MONTHS } from '@/features/home-expenses/lib/types';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';

const MONTH_KEYS = [
  'homeExpenses.months.january',
  'homeExpenses.months.february',
  'homeExpenses.months.march',
  'homeExpenses.months.april',
  'homeExpenses.months.may',
  'homeExpenses.months.june',
  'homeExpenses.months.july',
  'homeExpenses.months.august',
  'homeExpenses.months.september',
  'homeExpenses.months.october',
  'homeExpenses.months.november',
  'homeExpenses.months.december',
] as const;

export default function MonthYearSelector() {
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthLabel = t(MONTH_KEYS[selectedMonth]) || MONTHS[selectedMonth];
  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const navigateMonth = (direction: -1 | 1) => {
    const next = addMonths(new Date(selectedYear, selectedMonth, 1), direction);
    if (direction > 0) {
      const max = new Date(currentYear, currentMonth, 1);
      if (next > max) {
        return;
      }
    }
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
  };

  return (
    <div className="flex w-full min-w-0 items-center justify-between rounded-xl border bg-card px-2 py-2 overflow-hidden">
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => navigateMonth(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 text-sm font-medium text-foreground capitalize">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{monthLabel} {selectedYear}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 disabled:opacity-40"
        onClick={() => navigateMonth(1)}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
