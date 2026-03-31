import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Eye, EyeOff, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@shared-ui/use-dark-mode';
import { useOptionalContracts } from '@/features/contracts/context/ContractContext';
import { hasUnreadContractAlerts } from '@/features/contracts/lib/alertReadState';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
  backTo,
  backLabel,
  showSettings = true,
}: AppSectionHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDark } = useDarkMode();
  const { hideAmounts, t, toggleHideAmounts } = useI18n();
  const contractsContext = useOptionalContracts();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const bellMenuRef = useRef<HTMLDivElement | null>(null);
  const resolvedBackLabel = backLabel ?? t('common.backToProjects');
  const isContractsLayoutPath = /^\/(dashboard|contracts)(\/|$)/.test(location.pathname);
  const isHomeExpensesLayoutPath = /^\/home-expenses(\/|$)/.test(location.pathname);

  const unreadContracts = useMemo(() => {
    if (!contractsContext) return [];

    return contractsContext.contracts
      .filter(hasUnreadContractAlerts)
      .map(contract => {
        const firstEnabled = contract.alerts.find(alert => alert.enabled) ?? null;
        let trigger = 'Alert configured';

        if (firstEnabled) {
          if (firstEnabled.kind === 'specific-date' && firstEnabled.specificDate) {
            const parsed = parseISO(firstEnabled.specificDate);
            trigger = isValid(parsed)
              ? format(parsed, 'MMM d, yyyy')
              : firstEnabled.specificDate;
          } else {
            trigger = `${firstEnabled.daysBefore} days before expiry`;
          }
        }

        const reason = firstEnabled?.reason?.trim() || null;
        return {
          id: contract.id,
          name: contract.name,
          provider: contract.provider,
          trigger,
          reason,
        };
      });
  }, [contractsContext]);

  const unreadContractsCount = unreadContracts.length;

  useEffect(() => {
    setAlertsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!bellMenuRef.current) return;
      if (!bellMenuRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  const resolvedBackTo = backTo ?? (
    location.pathname === '/dashboard'
      ? '/'
      : isContractsLayoutPath
        ? '/dashboard'
        : '/'
  );

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
          onClick={() => navigate(resolvedBackTo)}
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
            {hideAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {isContractsLayoutPath && (
            <div className="relative" ref={bellMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAlertsOpen(prev => !prev)}
                className="text-muted-foreground relative"
                aria-label="Open alerts"
                title="Open alerts"
              >
                <Bell className="h-4 w-4" />
                {unreadContractsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold">
                    {unreadContractsCount > 9 ? '9+' : unreadContractsCount}
                  </span>
                )}
              </Button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-[320px] rounded-xl border bg-card shadow-lg p-2 z-[60]">
                  <div className="px-2 pb-2 border-b border-border/60">
                    <p className="text-sm font-semibold text-foreground">Contract Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadContractsCount} unread
                    </p>
                  </div>

                  <div className="max-h-72 overflow-auto py-1">
                    {unreadContractsCount === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">No unread alerts.</p>
                    ) : (
                      unreadContracts.slice(0, 8).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            navigate(`/contracts/${item.id}`);
                            setAlertsOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-2 rounded-lg transition-colors',
                            'hover:bg-muted'
                          )}
                        >
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.provider} · {item.trigger}</p>
                          {item.reason && <p className="text-xs text-muted-foreground truncate">{item.reason}</p>}
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigate('/contracts/alerts');
                      setAlertsOpen(false);
                    }}
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    Open Alerts Page
                  </button>
                </div>
              )}
            </div>
          )}
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
