import { useState, useMemo } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { ContractCard } from '@/features/contracts/components/ContractCard';
import { Contract, CATEGORY_LABELS, ContractCategory, ContractStatus, STATUS_LABELS } from '@/features/contracts/types/contract';
import { getDaysUntilExpiry } from '@/features/contracts/lib/contractUtils';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function ContractsList() {
  const { contracts } = useContracts();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ContractCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'renewal' | 'price' | 'name'>('renewal');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = contracts.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.provider.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'renewal') return getDaysUntilExpiry(a) - getDaysUntilExpiry(b);
      if (sortBy === 'price') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [contracts, search, categoryFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">All Contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">{contracts.length} total</p>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or provider..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2.5 rounded-lg border bg-card hover:bg-muted transition-colors active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 animate-fade-up">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="renewal">Sort by Renewal Date</option>
              <option value="price">Sort by Price</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((contract, i) => (
          <ContractCard key={contract.id} contract={contract} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No contracts found.</p>
          <Link to="/contracts/list/new" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
            Add your first contract →
          </Link>
        </div>
      )}
    </div>
  );
}
