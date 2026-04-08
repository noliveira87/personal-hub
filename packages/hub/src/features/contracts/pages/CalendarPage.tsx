import { useMemo } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getDaysUntilExpiry } from '@/features/contracts/lib/contractUtils';
import { getContractCategoryIcon } from '@/features/contracts/types/contract';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, differenceInCalendarDays, isValid, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, FileText } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';

export default function CalendarPage() {
  const { contracts } = useContracts();
  const { formatCurrency, t, locale } = useI18n();
  const navigate = useNavigate();

  const months = useMemo(() => {
    const start = startOfMonth(new Date());
    return eachMonthOfInterval({ start, end: addMonths(start, 11) });
  }, []);

  const calendarByMonth = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active' || c.status === 'pending-cancellation');
    const today = new Date();
    const map = new Map<string, Array<{
      id: string;
      kind: 'renewal' | 'alert';
      contract: typeof active[0];
      date: Date;
      daysLeft: number;
      label: string;
    }>>();

    months.forEach(month => {
      const key = format(month, 'yyyy-MM');
      const end = endOfMonth(month);
      const entries: Array<{
        id: string;
        kind: 'renewal' | 'alert';
        contract: typeof active[0];
        date: Date;
        daysLeft: number;
        label: string;
      }> = [];

      active.forEach(contract => {
        if (contract.endDate) {
          const endDate = parseISO(contract.endDate);
          if (isValid(endDate) && endDate >= month && endDate <= end) {
            entries.push({
              id: `${contract.id}-renewal-${format(endDate, 'yyyy-MM-dd')}`,
              kind: 'renewal',
              contract,
              date: endDate,
              daysLeft: differenceInCalendarDays(endDate, today),
              label: t('contracts.calendar.renewalLabel'),
            });
          }
        }

        contract.alerts.forEach((alert, index) => {
          if (!alert.enabled) return;

          let alertDate: Date | null = null;

          if (alert.kind === 'specific-date' && alert.specificDate) {
            const parsed = parseISO(alert.specificDate);
            if (isValid(parsed)) alertDate = parsed;
          }

          if (alert.kind === 'days-before' && contract.endDate) {
            const expiryDate = parseISO(contract.endDate);
            if (isValid(expiryDate)) {
              alertDate = subDays(expiryDate, alert.daysBefore);
            }
          }

          if (!alertDate || alertDate < today || alertDate < month || alertDate > end) return;

          entries.push({
            id: `${contract.id}-alert-${index}-${format(alertDate, 'yyyy-MM-dd')}`,
            kind: 'alert',
            contract,
            date: alertDate,
            daysLeft: differenceInCalendarDays(alertDate, today),
            label: alert.reason?.trim() || (alert.kind === 'specific-date'
              ? t('contracts.calendar.customAlertLabel')
              : t('contracts.calendar.daysBeforeLabel', { days: alert.daysBefore })),
          });
        });
      });

      if (entries.length > 0) {
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());
        map.set(key, entries);
      }
    });

    return map;
  }, [contracts, months, t]);

  return (
    <div className="space-y-6">
      <AppSectionHeader title="D12 Contracts" icon={FileText} />

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">{t('contracts.calendar.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('contracts.calendar.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {months.map((month, mi) => {
          const key = format(month, 'yyyy-MM');
          const items = calendarByMonth.get(key);
          const isCurrentMonth = format(new Date(), 'yyyy-MM') === key;

          return (
            <div
              key={key}
              className="animate-fade-up"
              style={{ animationDelay: `${mi * 60}ms` }}
            >
              <h2 className={cn(
                'text-sm font-semibold mb-2 flex items-center gap-2',
                isCurrentMonth ? 'text-primary' : 'text-foreground'
              )}>
                {isCurrentMonth && <span className="w-2 h-2 rounded-full bg-primary" />}
                {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                {items && <span className="text-xs text-muted-foreground font-normal">({items.length})</span>}
              </h2>
              {items ? (
                <div className="space-y-2">
                  {items.map(entry => {
                    const c = entry.contract;
                    const daysLeft = entry.kind === 'renewal' ? getDaysUntilExpiry(c) : entry.daysLeft;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => navigate(`/contracts/${c.id}`)}
                        className={cn(
                          'bg-card rounded-lg p-4 border flex items-center justify-between cursor-pointer',
                          'hover:shadow-md transition-all active:scale-[0.98]',
                          entry.kind === 'alert' && 'border-primary/30',
                          entry.kind === 'renewal' && daysLeft <= 7 && 'border-urgent/30',
                          entry.kind === 'renewal' && daysLeft > 7 && daysLeft <= 30 && 'border-warning/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {entry.kind === 'alert' ? (
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Bell className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="text-lg">{getContractCategoryIcon(c.category, c.type)}</span>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.provider} · {entry.date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} · {entry.kind === 'alert' ? `${t('contracts.calendar.alertPrefix')}: ${entry.label}` : t('contracts.calendar.renewalLabel')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {entry.kind === 'renewal' ? formatCurrency(c.price, c.currency) : t('contracts.calendar.alertValue')}
                          </p>
                          <p className={cn(
                            'text-xs',
                            daysLeft <= 7 ? 'text-urgent' : daysLeft <= 30 ? 'text-warning' : 'text-muted-foreground'
                          )}>
                            {daysLeft < 0 ? t('contracts.calendar.passed') : t('contracts.calendar.daysLeft', { days: daysLeft })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-4 py-2">{t('contracts.calendar.emptyMonth')}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
