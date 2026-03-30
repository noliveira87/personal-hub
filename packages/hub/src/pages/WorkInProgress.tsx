import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function WorkInProgress() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="p-6 rounded-full bg-muted">
            <Construction className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('workInProgress.title')}</h1>
          <p className="text-muted-foreground">
            {t('workInProgress.description')}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.backToProjects')}
        </Link>
      </div>
    </div>
  );
}
