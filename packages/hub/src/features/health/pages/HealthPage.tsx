import { useState } from 'react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { HeartPulse, Plus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { HealthPerson } from '@/features/health/lib/healthData';
import HealthTimelineTable from '@/features/health/components/HealthTimelineTable';

export default function HealthPage() {
  const { t } = useI18n();
  const [person, setPerson] = useState<HealthPerson>('nuno');
  const [openNewCategory, setOpenNewCategory] = useState(false);

  return (
    <div className="min-h-screen">
      <AppSectionHeader
        title={t('health.title')}
        icon={HeartPulse}
        backTo="/"
        backLabel={t('health.back')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border p-1.5 bg-card">
              <button
                onClick={() => setPerson('nuno')}
                className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${
                  person === 'nuno' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {t('health.person.me')}
              </button>
              <button
                onClick={() => setPerson('minina')}
                className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${
                  person === 'minina' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {t('health.person.minina')}
              </button>
            </div>

            <button
              onClick={() => setOpenNewCategory(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-20 lg:pt-24 pb-6 space-y-6">
        <HealthTimelineTable person={person} openNewCategory={openNewCategory} onCloseNewCategory={() => setOpenNewCategory(false)} />
      </div>
    </div>
  );
}
