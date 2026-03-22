import { cn } from '@/lib/utils';
import { ContractStatus, STATUS_LABELS } from '@/types/contract';

const statusStyles: Record<ContractStatus, string> = {
  active: 'bg-success/10 text-success',
  'pending-cancellation': 'bg-warning/10 text-warning',
  expired: 'bg-urgent/10 text-urgent',
  archived: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
