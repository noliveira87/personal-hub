import { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@shared-ui/use-dark-mode';

interface AppSectionHeaderProps {
  title: string;
  icon: LucideIcon;
  actions?: ReactNode;
  backTo?: string | number;
  backLabel?: string;
  showSettings?: boolean;
}

export default function AppSectionHeader({
  title,
  icon: Icon,
  actions,
  backTo = '/',
  backLabel,
  showSettings = true,
}: AppSectionHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDark } = useDarkMode();
  const { hideAmounts, t, toggleHideAmounts } = useI18n();
  const resolvedBackLabel = backLabel ?? t('common.backToProjects');
  const isContractsLayoutPath = /^\/(dashboard|contracts)(\/|$)/.test(location.pathname);
  const isHomeExpensesLayoutPath = /^\/home-expenses(\/|$)/.test(location.pathname);

  return (
    <header
      className={`fixed right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg ${
        isContractsLayoutPath
          ? 'top-14 left-0 lg:top-0 lg:left-0'
          : isHomeExpensesLayoutPath
            ? 'top-14 left-0 lg:top-0 lg:left-0'
            : 'top-0 left-0'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(backTo)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{resolvedBackLabel}</span>
        </Button>

        <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-bold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHideAmounts}
            className="text-muted-foreground"
            aria-label={hideAmounts ? t("common.showAmounts") : t("common.hideAmounts")}
            title={hideAmounts ? t("common.showAmounts") : t("common.hideAmounts")}
          >
            {hideAmounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          {showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings', { state: { fromPath: location.pathname } })}
              className="text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {actions}
        </div>
      </div>
    </header>
  );
}
