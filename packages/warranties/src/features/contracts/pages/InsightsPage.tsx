import { useMemo } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getAnnualEquivalent, getMonthlyEquivalent, formatCurrency } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_LABELS, CATEGORY_ICONS, ContractCategory } from '@/features/contracts/types/contract';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b8574', '#4a9e8a', '#5ab89f', '#6bd1b5', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function InsightsPage() {
  const { contracts } = useContracts();

  const active = contracts.filter(c => c.status === 'active');
  const monthlyTotal = active.reduce((s, c) => s + getMonthlyEquivalent(c), 0);
  const annualTotal = active.reduce((s, c) => s + getAnnualEquivalent(c), 0);

  const byCategory = useMemo(() => {
    const map = new Map<ContractCategory, number>();
    active.forEach(c => {
      const current = map.get(c.category) || 0;
      map.set(c.category, current + getMonthlyEquivalent(c));
    });
    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        icon: CATEGORY_ICONS[cat],
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [active]);

  const topExpensive = useMemo(() => {
    return [...active]
      .sort((a, b) => getAnnualEquivalent(b) - getAnnualEquivalent(a))
      .slice(0, 5);
  }, [active]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">Spending overview and analysis</p>
      </div>

      {/* Totals */}
      <div className="grid sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="bg-card rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Monthly Spending</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{formatCurrency(monthlyTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">across {active.length} active contracts</p>
        </div>
        <div className="bg-card rounded-xl p-6 border">
          <p className="text-sm text-muted-foreground">Annual Spending</p>
          <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{formatCurrency(annualTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">estimated total</p>
        </div>
      </div>

      {/* By category chart */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '160ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Spending by Category</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `€${v}`} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={110} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown list */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '240ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h2>
        <div className="space-y-3">
          {byCategory.map((cat, i) => (
            <div key={cat.category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm text-foreground">{cat.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(cat.amount)}</span>
                <span className="text-xs text-muted-foreground ml-1">/ mo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most expensive */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '320ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Most Expensive (Annual)</h2>
        <div className="space-y-3">
          {topExpensive.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-lg">{CATEGORY_ICONS[c.category]}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.provider}</p>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(getAnnualEquivalent(c), c.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
