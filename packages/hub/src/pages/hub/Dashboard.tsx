import { useMemo } from 'react';
import { useContracts } from '@/context/ContractContext';
import { StatsCard } from '@/components/StatsCard';
import { ContractCard } from '@/components/ContractCard';
import { getDaysUntilExpiry, getMonthlyEquivalent, getCurrentMonthCost, formatCurrency } from '@/lib/contractUtils';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, LayoutDashboard, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppSectionHeader from '@/components/AppSectionHeader';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { parseISO } from 'date-fns';

export default function Dashboard() {
  const { contracts, loading, error } = useContracts();
  const contractIds = useMemo(() => contracts.map((contract) => contract.id), [contracts]);
  const { priceMap } = usePriceHistoryMap(contractIds);
  const currentMonthLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading contracts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-destructive font-medium">Error loading contracts</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const active = contracts.filter(c => c.status === 'active');
  const expiringSoon = active
    .map(c => ({ ...c, daysLeft: getDaysUntilExpiry(c) }))
    .filter(c => c.daysLeft >= 0 && c.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const monthlyTotal = active.reduce((sum, contract) => {
    const latestPrice = priceMap.get(contract.id);
    const priceResolvedContract = {
      ...contract,
      price: latestPrice?.price ?? contract.price,
      currency: latestPrice?.currency ?? contract.currency,
    };

    return sum + getMonthlyEquivalent(priceResolvedContract);
  }, 0);

  const currentMonthTotal = active.reduce((sum, contract) => {
    const latestPrice = priceMap.get(contract.id);
    const priceResolvedContract = {
      ...contract,
      price: latestPrice?.price ?? contract.price,
      currency: latestPrice?.currency ?? contract.currency,
    };

    if (latestPrice) {
      const entryDate = parseISO(latestPrice.date);
      const now = new Date();
      const isCurrentMonthEntry =
        entryDate.getFullYear() === now.getFullYear() &&
        entryDate.getMonth() === now.getMonth();

      return sum + (isCurrentMonthEntry ? latestPrice.price : 0);
    }

    return sum + getCurrentMonthCost(priceResolvedContract, new Date(), priceResolvedContract.price);
  }, 0);

  const within7 = expiringSoon.filter(c => c.daysLeft <= 7).length;
  const within15 = expiringSoon.filter(c => c.daysLeft <= 15).length;
  const within30 = expiringSoon.filter(c => c.daysLeft <= 30).length;

  return (
    <div className="space-y-8 pt-16">
      <AppSectionHeader
        title="D12 Contracts"
        icon={LayoutDashboard}
        actions={(
          <Link
            to="/contracts/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contract</span>
          </Link>
        )}
      />

      <div className="rounded-2xl border-2 border-border bg-card p-5 animate-fade-up">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contracts Overview</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Clear monthly baseline and current-month spending in one place.</p>
      </div>

      {/* Stats row */}
      <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Active Contracts" value={active.length} sublabel={`${contracts.length} total`} />
          <StatsCard label="Monthly Baseline" value={formatCurrency(monthlyTotal)} sublabel="normalized recurring cost" />
          <StatsCard label="Current Month" value={formatCurrency(currentMonthTotal)} sublabel={currentMonthLabel} />
          <StatsCard
            label="Expiring ≤ 30 days"
            value={within30}
            variant={within7 > 0 ? 'urgent' : within15 > 0 ? 'warning' : 'default'}
            sublabel={within7 > 0 ? `${within7} within 7 days!` : undefined}
          />
        </div>
        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Monthly Baseline</span> = recurring normalized monthly average.
          <span className="mx-1">•</span>
          <span className="font-medium text-foreground">Current Month</span> = charges expected this month based on billing cycle.
        </div>
      </div>

      {/* Alert buckets */}
      {expiringSoon.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {[
            { label: '7 days', count: within7, variant: 'urgent' as const },
            { label: '15 days', count: within15, variant: 'warning' as const },
            { label: '30 days', count: within30, variant: 'warning' as const },
            { label: '60 days', count: expiringSoon.length, variant: 'default' as const },
          ].map(bucket => (
            <div key={bucket.label} className="bg-card rounded-lg p-3 border-2 border-border text-center shadow-sm">
              <p className="text-xs text-muted-foreground">Within {bucket.label}</p>
              <p className={`text-xl font-bold tabular-nums ${
                bucket.variant === 'urgent' && bucket.count > 0 ? 'text-urgent' :
                bucket.variant === 'warning' && bucket.count > 0 ? 'text-warning' : 'text-foreground'
              }`}>
                {bucket.count}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <section className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Expiring Soon</h2>
            <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoon.slice(0, 6).map((contract, i) => (
              <ContractCard key={contract.id} contract={contract} index={i} latestPrice={priceMap.get(contract.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">All Active</h2>
          <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.slice(0, 6).map((contract, i) => (
            <ContractCard key={contract.id} contract={contract} index={i} latestPrice={priceMap.get(contract.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
