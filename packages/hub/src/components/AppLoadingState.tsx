import { Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type AppLoadingStateVariant = 'compact' | 'list' | 'cards' | 'dashboard' | 'table';

interface AppLoadingStateProps {
  label: string;
  variant?: AppLoadingStateVariant;
  className?: string;
}

export default function AppLoadingState({
  label,
  variant = 'compact',
  className,
}: AppLoadingStateProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>

      {variant === 'compact' && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`loading-list-${index}`} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`loading-card-${index}`} className="rounded-2xl border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`loading-summary-${index}`} className="rounded-xl border bg-card p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 rounded-2xl border bg-card p-4">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-4 rounded-2xl border bg-card p-4">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-8 rounded-2xl border bg-card p-4">
              <Skeleton className="h-72 w-full" />
            </div>
            <div className="lg:col-span-4 rounded-2xl border bg-card p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`loading-highlight-${index}`} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {variant === 'table' && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`loading-table-row-${index}`} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
