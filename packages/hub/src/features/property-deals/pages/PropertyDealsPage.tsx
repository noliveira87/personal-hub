import { useState } from 'react';
import AppSectionHeader from '@/components/AppSectionHeader';
import PropertyDealManager from '@/features/property-deals/components/PropertyDealManager';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PropertyDealsPage() {
  const [createRequestTick, setCreateRequestTick] = useState(0);

  return (
    <div className="space-y-6 pt-20">
      <AppSectionHeader
        title="Imoveis"
        icon={Building2}
        backTo="/"
        actions={(
          <Button
            size="sm"
            className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
            onClick={() => setCreateRequestTick((prev) => prev + 1)}
            aria-label="Novo imovel"
            title="Novo imovel"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo imovel</span>
          </Button>
        )}
      />

      <PropertyDealManager createRequestTick={createRequestTick} />
    </div>
  );
}
