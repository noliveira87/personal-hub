import AppSectionHeader from '@/components/AppSectionHeader';
import PropertyDealManager from '@/features/property-deals/components/PropertyDealManager';
import { Building2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

export default function PropertyDealDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { dealId } = useParams<{ dealId: string }>();
  const isNewRoute = location.pathname.endsWith('/new');
  const selectedDealIdFromRoute = isNewRoute ? 'new' : (dealId ?? null);

  return (
    <div className="space-y-6 pt-20">
      <AppSectionHeader
        title="Imoveis"
        icon={Building2}
        backTo="/property-deals"
        backLabel={t('common.back')}
      />

      <PropertyDealManager
        showCatalog={false}
        selectedDealIdFromRoute={selectedDealIdFromRoute}
        onSavedDeal={(savedDealId) => {
          navigate(`/property-deals/${savedDealId}`, { replace: true });
        }}
      />
    </div>
  );
}
