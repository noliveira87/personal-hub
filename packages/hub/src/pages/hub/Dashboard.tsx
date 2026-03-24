import { useContracts } from '@/context/ContractContext';
import { StatsCard } from '@/components/StatsCard';
import { ContractCard } from '@/components/ContractCard';
import { getDaysUntilExpiry, getMonthlyEquivalent, getAnnualEquivalent, formatCurrency } from '@/lib/contractUtils';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, ArrowLeft, Moon, Sun, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@shared-ui/use-dark-mode';

export default function Dashboard() {
  const { contracts, loading, error } = useContracts();
  const { isDark, toggleDark } = useDarkMode();

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

  const monthlyTotal = active.reduce((sum, c) => sum + getMonthlyEquivalent(c), 0);
  const annualTotal = active.reduce((sum, c) => sum + getAnnualEquivalent(c), 0);

  const within7 = expiringSoon.filter(c => c.daysLeft <= 7).length;
  const within15 = expiringSoon.filter(c => c.daysLeft <= 15).length;
  const within30 = expiringSoon.filter(c => c.daysLeft <= 30).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground animate-fade-up">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 animate-fade-up" style={{ animationDelay: '60ms' }}>
            Your contracts & subscriptions at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to projects</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDark} className="hidden text-muted-foreground lg:inline-flex">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link
            to="/contracts/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 shadow-sm animate-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contract</span>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <StatsCard label="Active Contracts" value={active.length} sublabel={`${contracts.length} total`} />
        <StatsCard label="Monthly Cost" value={formatCurrency(monthlyTotal)} sublabel="estimated" />
        <StatsCard label="Annual Cost" value={formatCurrency(annualTotal)} sublabel="estimated" />
        <StatsCard
          label="Expiring ≤ 30 days"
          value={within30}
          variant={within7 > 0 ? 'urgent' : within15 > 0 ? 'warning' : 'default'}
          sublabel={within7 > 0 ? `${within7} within 7 days!` : undefined}
        />
      </div>

      {/* Alert buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
        {[
          { label: '7 days', count: within7, variant: 'urgent' as const },
          { label: '15 days', count: within15, variant: 'warning' as const },
          { label: '30 days', count: within30, variant: 'warning' as const },
          { label: '60 days', count: expiringSoon.length, variant: 'default' as const },
        ].map(bucket => (
          <div key={bucket.label} className="bg-card rounded-lg p-3 border text-center">
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

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Expiring Soon</h2>
            <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoon.slice(0, 6).map((contract, i) => (
              <ContractCard key={contract.id} contract={contract} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">All Active</h2>
          <Link to="/contracts" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.slice(0, 6).map((contract, i) => (
            <ContractCard key={contract.id} contract={contract} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
