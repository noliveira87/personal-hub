import { Contract, CATEGORY_ICONS, BILLING_LABELS } from '@/features/contracts/types/contract';
import { StatusBadge } from './StatusBadge';
import { getDaysUntilExpiry, formatCurrency, getUrgencyLevel, formatExpiryCountdown } from '@/features/contracts/lib/contractUtils';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LatestPrice {
  price: number;
  date: string;
  currency: string;
}

export function ContractCard({ contract, index = 0, latestPrice }: { contract: Contract; index?: number; latestPrice?: LatestPrice }) {
  const navigate = useNavigate();
  const daysLeft = getDaysUntilExpiry(contract);
  const urgency = getUrgencyLevel(daysLeft);
  
  // Use latest price from history, fallback to contract price
  const displayPrice = latestPrice?.price ?? contract.price;
  const displayCurrency = latestPrice?.currency || contract.currency;
  const priceDate = latestPrice?.date;

  return (
    <div
      onClick={() => navigate(`/contracts/${contract.id}`)}
      className={cn(
        'bg-card rounded-xl p-5 border-2 border-border cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:border-border hover:-translate-y-0.5 active:scale-[0.98]',
        urgency === 'critical' && 'border-urgent/40 shadow-urgent/10',
        urgency === 'warning' && 'border-warning/40 shadow-warning/10',
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[contract.category]}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{contract.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{contract.provider}</p>
          </div>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(displayPrice, displayCurrency)}
            {priceDate && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                • {format(parseISO(priceDate), 'MMM d')}
              </span>
            )}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {BILLING_LABELS[contract.billingFrequency].toLowerCase()}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span>{contract.endDate ? format(parseISO(contract.endDate), 'MMM d, yyyy') : 'No date'}</span>
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
