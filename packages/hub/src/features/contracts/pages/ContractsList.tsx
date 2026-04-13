import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { useI18n } from '@/i18n/I18nProvider';
import { Contract, ContractStatus } from '@/features/contracts/types/contract';
import { getDaysUntilExpiry } from '@/features/contracts/lib/contractUtils';
import { usePriceHistoryMap } from '@/hooks/use-price-history-map';
import { Plus, Search, SlidersHorizontal, Loader, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppSectionHeader from '@/components/AppSectionHeader';
import { ContractCard } from '@/features/contracts/components/ContractCard';

type ContractViewCategory = 'cafofo' | 'apartamento' | 'carro' | 'outros';

const VIEW_CATEGORY_ORDER: ContractViewCategory[] = ['cafofo', 'apartamento', 'carro', 'outros'];

function getContractViewCategory(contract: Contract): ContractViewCategory {
  const text = `${contract.name} ${contract.provider} ${contract.notes ?? ''}`.toLowerCase();

  if (contract.category === 'car') {
    return 'carro';
  }

  if (
    contract.category === 'apartment-insurance'
    || contract.housingUsage === 'secondary-home'
    || text.includes('apartamento')
    || text.includes('sta clara')
    || text.includes('st clara')
  ) {
    return 'apartamento';
  }

  if (
    contract.housingUsage === 'primary-residence'
    || [
      'mortgage',
      'home-insurance',
      'gas',
      'electricity',
      'internet',
      'mobile',
      'water',
      'tv-streaming',
      'maintenance',
      'security-alarm',
    ].includes(contract.category)
    || text.includes('cafofo')
  ) {
    return 'cafofo';
  }

  return 'outros';
}

export default function ContractsList() {
  const navigate = useNavigate();
  const { contracts, loading, error } = useContracts();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ContractViewCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'renewal' | 'price' | 'name'>('renewal');
  const [showFilters, setShowFilters] = useState(false);

  // Get contract IDs for price history fetching
  const contractIds = useMemo(() => contracts.map(c => c.id), [contracts]);
  const { priceMap, loading: pricesLoading } = usePriceHistoryMap(contractIds);

  const filtered = useMemo(() => {
    const result = contracts.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.provider.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || getContractViewCategory(c) === categoryFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'renewal') return getDaysUntilExpiry(a) - getDaysUntilExpiry(b);
      if (sortBy === 'price') return (priceMap.get(b.id)?.price ?? b.price) - (priceMap.get(a.id)?.price ?? a.price);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [contracts, search, categoryFilter, statusFilter, sortBy, priceMap]);

  const groupedContracts = useMemo(() => {
    const grouped = new Map<ContractViewCategory, Contract[]>();
    VIEW_CATEGORY_ORDER.forEach((category) => grouped.set(category, []));

    filtered.forEach((contract) => {
      grouped.get(getContractViewCategory(contract))!.push(contract);
    });

    return VIEW_CATEGORY_ORDER
      .map((category) => ({
        category,
        contracts: grouped.get(category) ?? [],
      }))
      .filter((section) => section.contracts.length > 0);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('contracts.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-destructive font-medium">{t('contracts.errorLoading')}</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          {t('contracts.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppSectionHeader
        title={t('contracts.menu')}
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
              onClick={() => navigate('/contracts/new')}
              aria-label={t('contracts.addContract')}
              title={t('contracts.addContract')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('contracts.addContract')}</span>
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/contracts/insights" aria-label={t('layout.nav.insights')} title={t('layout.nav.insights')} className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('layout.nav.insights')}</span>
                </Link>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl sm:hidden"
              asChild
              aria-label={t('layout.nav.insights')}
            >
              <Link to="/contracts/insights" title={t('layout.nav.insights')}>
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('contracts.allContracts')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{contracts.length} {t('contracts.total')}</p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('contracts.searchPlaceholder')}
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
              onChange={e => setCategoryFilter(e.target.value as ContractViewCategory | 'all')}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{t('contracts.allCategories') ?? 'All Categories'}</option>
              {VIEW_CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>{t(`contracts.viewCategories.${category}`)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ContractStatus | 'all')}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{t('contracts.allStatuses') ?? 'All Statuses'}</option>
              {Object.entries({
                active: 'active',
                'pending-cancellation': 'pending-cancellation',
                expired: 'expired',
                archived: 'archived',
              } as Record<string, ContractStatus>).map(([k, v]) => (
                <option key={k} value={v}>{t(`contracts.statusLabels.${v}`)}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'renewal' | 'price' | 'name')}
              className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="renewal">{t('contracts.sortByRenewal') ?? 'Sort by Renewal Date'}</option>
              <option value="price">{t('contracts.sortByPrice') ?? 'Sort by Price'}</option>
              <option value="name">{t('contracts.sortByName') ?? 'Sort by Name'}</option>
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-6">
        {groupedContracts.map((section) => (
          <section key={section.category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`contracts.viewCategories.${section.category}`)}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t('contracts.payments.contractsCount', { count: String(section.contracts.length) })}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.contracts.map((contract, i) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  index={i}
                  latestPrice={priceMap.get(contract.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('contracts.noContractsFound') ?? 'No contracts found.'}</p>
          <Link to="/contracts/new" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
            {t('contracts.addFirstContract') ?? 'Add your first contract →'}
          </Link>
        </div>
      )}
    </div>
  );
}
