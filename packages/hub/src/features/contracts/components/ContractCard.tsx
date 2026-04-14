import { useEffect, useState } from 'react';
import { Contract, BILLING_LABELS, getContractCategoryIcon } from '@/features/contracts/types/contract';
import { StatusBadge } from './StatusBadge';
import { getDaysUntilExpiry, getUrgencyLevel, formatExpiryCountdown } from '@/features/contracts/lib/contractUtils';
import { hasUnreadContractAlerts, subscribeContractAlertReadState } from '@/features/contracts/lib/alertReadState';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Bell, BellDot, CalendarDays } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface LatestPrice {
  price: number;
  date: string;
  currency?: string;
}

export function ContractCard({ contract, index = 0, latestPrice }: { contract: Contract; index?: number; latestPrice?: LatestPrice }) {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, t } = useI18n();
  const [, setReadStateVersion] = useState(0);
  const daysLeft = getDaysUntilExpiry(contract);
  const urgency = getUrgencyLevel(daysLeft);
  const hasAlerts = contract.alerts.length > 0;
  const hasUnreadAlerts = hasUnreadContractAlerts(contract);

  // Use latest price from history, fallback to contract price
  const displayPrice = latestPrice?.price ?? contract.price;
  const displayCurrency = latestPrice?.currency || contract.currency;
  const priceDate = latestPrice?.date;
  const startDateLabel = formatDate(contract.startDate, { month: 'short', day: 'numeric', year: 'numeric' });
  const endDateLabel = contract.endDate
    ? formatDate(contract.endDate, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const contractDateLabel = endDateLabel
    ? `${startDateLabel} - ${endDateLabel}`
    : startDateLabel;

  useEffect(() => subscribeContractAlertReadState(() => setReadStateVersion((prev) => prev + 1)), []);

  return (
    <div
      onClick={() => navigate(`/contracts/${contract.id}`)}
      className={cn(
        'w-full min-w-0 overflow-hidden bg-card rounded-xl p-5 border-2 border-border cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:border-border hover:-translate-y-0.5 active:scale-[0.98]',
        urgency === 'critical' && 'border-urgent/40 shadow-urgent/10',
        urgency === 'warning' && 'border-warning/40 shadow-warning/10',
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{getContractCategoryIcon(contract.category, contract.type)}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{contract.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{contract.provider}</p>
            {contract.paymentType ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {t(`contracts.paymentTypeLabels.${contract.paymentType}`)}{contract.paymentSource ? ` · ${contract.paymentSource}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasAlerts && (
            <span
              className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-full border',
                hasUnreadAlerts ? 'text-primary border-primary/40 bg-primary/10' : 'text-muted-foreground border-border bg-muted/40',
              )}
              title={hasUnreadAlerts ? 'Unread alerts' : 'Alerts'}
            >
              {hasUnreadAlerts ? <BellDot className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </span>
          )}
          <StatusBadge status={contract.status} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(displayPrice, displayCurrency)}
            {priceDate && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                • {formatDate(priceDate, { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="block text-xs font-normal text-muted-foreground sm:inline sm:ml-1">
              / {BILLING_LABELS[contract.billingFrequency].toLowerCase()}
            </span>
          </p>
        </div>
        <div className="min-w-0 sm:text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
            <CalendarDays className="w-3 h-3" />
            <span className="truncate">{contractDateLabel}</span>
          </div>
          {contract.status !== 'archived' && contract.status !== 'expired' && (
            <p className={cn(
              'text-xs font-medium mt-0.5',
              urgency === 'critical' && 'text-urgent',
              urgency === 'warning' && 'text-warning',
              urgency === 'soon' && 'text-warning',
              urgency === 'normal' && 'text-muted-foreground',
            )}>
              {formatExpiryCountdown(contract, true)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
