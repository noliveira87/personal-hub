import { cn } from '@/lib/utils';
import { ContractStatus } from '@/features/contracts/types/contract';
import { useI18n } from '@/i18n/I18nProvider';

const statusStyles: Record<ContractStatus, string> = {
  active: 'bg-success/10 text-success',
  'pending-cancellation': 'bg-warning/10 text-warning',
  expired: 'bg-urgent/10 text-urgent',
  archived: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[status])}>
      {t(`contracts.statusLabels.${status}`)}
    </span>
  );
}
