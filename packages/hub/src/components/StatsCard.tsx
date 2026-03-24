import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: 'default' | 'warning' | 'urgent';
  delay?: number;
}

export function StatsCard({ label, value, sublabel, variant = 'default', delay = 0 }: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 hover:border-border',
        variant === 'urgent' && 'border-urgent/35 shadow-urgent/5',
        variant === 'warning' && 'border-warning/35 shadow-warning/5',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={cn(
        'text-2xl font-bold mt-1 tabular-nums tracking-tight',
        variant === 'urgent' && 'text-urgent',
        variant === 'warning' && 'text-warning',
        variant === 'default' && 'text-foreground',
      )}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}
