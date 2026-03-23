import { useMemo } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getDaysUntilExpiry, formatCurrency } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_ICONS } from '@/features/contracts/types/contract';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const { contracts } = useContracts();
  const navigate = useNavigate();

  const months = useMemo(() => {
    const start = startOfMonth(new Date());
    return eachMonthOfInterval({ start, end: addMonths(start, 11) });
  }, []);

  const contractsByMonth = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active' || c.status === 'pending-cancellation');
    const map = new Map<string, typeof active>();
    months.forEach(month => {
      const key = format(month, 'yyyy-MM');
      const end = endOfMonth(month);
      const matching = active.filter(c => {
        const endDate = parseISO(c.endDate);
        return endDate >= month && endDate <= end;
      });
      if (matching.length > 0) map.set(key, matching);
    });
    return map;
  }, [contracts, months]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Renewal Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Upcoming renewals over the next 12 months</p>
      </div>

      <div className="space-y-4">
        {months.map((month, mi) => {
          const key = format(month, 'yyyy-MM');
          const items = contractsByMonth.get(key);
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
                {format(month, 'MMMM yyyy')}
                {items && <span className="text-xs text-muted-foreground font-normal">({items.length})</span>}
              </h2>
              {items ? (
                <div className="space-y-2">
                  {items.map(c => {
                    const daysLeft = getDaysUntilExpiry(c);
                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/contracts/list/${c.id}`)}
                        className={cn(
                          'bg-card rounded-lg p-4 border flex items-center justify-between cursor-pointer',
                          'hover:shadow-md transition-all active:scale-[0.98]',
                          daysLeft <= 7 && 'border-urgent/30',
                          daysLeft > 7 && daysLeft <= 30 && 'border-warning/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{CATEGORY_ICONS[c.category]}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.provider} · {format(parseISO(c.endDate), 'MMM d')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(c.price, c.currency)}</p>
                          <p className={cn(
                            'text-xs',
                            daysLeft <= 7 ? 'text-urgent' : daysLeft <= 30 ? 'text-warning' : 'text-muted-foreground'
                          )}>
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-4 py-2">No renewals this month</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
