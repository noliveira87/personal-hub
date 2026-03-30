import { useMemo } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_ICONS } from '@/features/contracts/types/contract';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, BellRing, FileText } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';

export default function AlertsPage() {
  const { contracts } = useContracts();
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active' || c.status === 'pending-cancellation');
    const items: { contract: typeof active[0]; daysLeft: number; alertDay: number }[] = [];

    active.forEach(c => {
      const daysLeft = getDaysUntilExpiry(c);
      c.alerts.forEach(alert => {
        if (alert.enabled && daysLeft <= alert.daysBefore && daysLeft >= 0) {
          items.push({ contract: c, daysLeft, alertDay: alert.daysBefore });
        }
      });
      // Also show contracts expiring within 30 days even without explicit alerts
      if (daysLeft >= 0 && daysLeft <= 30 && c.alerts.length === 0) {
        items.push({ contract: c, daysLeft, alertDay: 0 });
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts]);

  return (
    <div className="space-y-6 pt-16">
      <AppSectionHeader title="D12 Contracts" icon={FileText} />

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">{alerts.length} active alerts</p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No alerts at the moment. All good! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((item, i) => {
            const urgency = getUrgencyLevel(item.daysLeft);
            return (
              <div
                key={`${item.contract.id}-${item.alertDay}-${i}`}
                onClick={() => navigate(`/contracts/${item.contract.id}`)}
                className={cn(
                  'bg-card rounded-xl p-4 border flex items-center gap-4 cursor-pointer',
                  'hover:shadow-md transition-all active:scale-[0.98] animate-fade-up',
                  urgency === 'critical' && 'border-urgent/30',
                  urgency === 'warning' && 'border-warning/30',
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  urgency === 'critical' && 'bg-urgent/10',
                  urgency === 'warning' && 'bg-warning/10',
                  urgency === 'soon' && 'bg-warning/10',
                  urgency === 'normal' && 'bg-muted',
                )}>
                  <BellRing className={cn(
                    'w-4 h-4',
                    urgency === 'critical' && 'text-urgent',
                    urgency === 'warning' && 'text-warning',
                    urgency === 'soon' && 'text-warning',
                    urgency === 'normal' && 'text-muted-foreground',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {CATEGORY_ICONS[item.contract.category]} {item.contract.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.contract.provider} · Expires {item.contract.endDate ? format(parseISO(item.contract.endDate), 'MMM d, yyyy') : 'No date'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    urgency === 'critical' && 'text-urgent',
                    urgency === 'warning' && 'text-warning',
                    urgency === 'normal' && 'text-foreground',
                  )}>
                    {item.daysLeft}d
                  </p>
                  <p className="text-xs text-muted-foreground">remaining</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
