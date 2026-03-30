import { useEffect, useMemo } from 'react';
import { useData } from '@/features/home-expenses/lib/DataContext';
import { MONTHS } from '@/features/home-expenses/lib/types';
import { parseLocalDate } from '@/features/home-expenses/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, allTransactions } = useData();
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  const availableMonths = useMemo(() => {
    if (selectedYear !== currentYear) {
      return MONTHS.map((_, i) => i);
    }

    const expenseMonths = new Set<number>();
    for (const tx of allTransactions) {
      if (tx.type !== 'expense') continue;
      const d = parseLocalDate(tx.date);
      expenseMonths.add(d.getMonth());
    }

    const months = MONTHS.map((_, i) => i).filter((m) => expenseMonths.has(m));
    return months.length > 0 ? months : [new Date().getMonth()];
  }, [allTransactions, selectedYear, currentYear]);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth, setSelectedMonth]);

  return (
    <div className="flex items-center gap-3">
      <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
        <SelectTrigger className="w-36 bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableMonths.map((i) => (
            <SelectItem key={i} value={String(i)}>{t(MONTH_KEYS[i]) || MONTHS[i]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
        <SelectTrigger className="w-24 bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[2024, 2025, 2026, 2027].map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
