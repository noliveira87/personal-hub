import { useContracts } from '@/features/contracts/context/ContractContext';
import { StatsCard } from '@/features/contracts/components/StatsCard';
import { ContractCard } from '@/features/contracts/components/ContractCard';
import { getDaysUntilExpiry, getMonthlyEquivalent, getAnnualEquivalent, formatCurrency } from '@/features/contracts/lib/contractUtils';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { contracts } = useContracts();

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
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Your contracts & subscriptions at a glance</p>
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
            <Link to="/contracts/list" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
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
          <Link to="/contracts/list" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
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
