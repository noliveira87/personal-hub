import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Eye, EyeOff, Menu, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useDarkMode } from '@shared-ui/use-dark-mode';
import { useOptionalContracts } from '@/features/contracts/context/ContractContext';
import { getUnreadOccurredAppAlerts, markOccurredAppAlertsAsRead, subscribeContractAlertReadState } from '@/features/contracts/lib/alertReadState';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useHomeExpensesMobileNav } from '@/features/home-expenses/components/Layout';
import { useContractsMobileNav } from '@/components/Layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppSectionHeaderProps {
  title: string;
  icon: LucideIcon;
  actions?: ReactNode;
  backTo?: string | number;
  backLabel?: string;
  onBack?: () => void;
  showSettings?: boolean;
  settingsExtraContent?: ReactNode;
}

export default function AppSectionHeader({
  title,
  icon: Icon,
  actions,
  backTo,
  backLabel,
  onBack,
  showSettings = true,
  settingsExtraContent,
}: AppSectionHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDark } = useDarkMode();
  const { hideAmounts, language, setLanguage, t, toggleHideAmounts } = useI18n();
  const contractsContext = useOptionalContracts();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsVersion, setAlertsVersion] = useState(0);
  const bellMenuRef = useRef<HTMLDivElement | null>(null);
  const resolvedBackLabel = backLabel ?? t('common.backToProjects');
  const isContractsLayoutPath = /^\/(dashboard|contracts)(\/|$)/.test(location.pathname);
  const isHomeExpensesLayoutPath = /^\/home-expenses(\/|$)/.test(location.pathname);
  const homeExpensesMobileNav = useHomeExpensesMobileNav();
  const contractsMobileNav = useContractsMobileNav();

  const unreadAlerts = useMemo(() => {
    if (!contractsContext) return [];
    return getUnreadOccurredAppAlerts(contractsContext.contracts);
  }, [contractsContext, alertsVersion]);

  const unreadContractsCount = unreadAlerts.length;

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

  useEffect(() => subscribeContractAlertReadState(() => setAlertsVersion((prev) => prev + 1)), []);

  const resolvedBackTo = backTo ?? (
    location.pathname === '/dashboard'
      ? '/'
      : isContractsLayoutPath
        ? '/dashboard'
        : '/'
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof resolvedBackTo === 'number') {
      navigate(resolvedBackTo);
      return;
    }

    navigate(resolvedBackTo);
  };

  return (
    <header
      className={`fixed right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg ${
        isContractsLayoutPath
          ? 'top-0 left-0'
          : isHomeExpensesLayoutPath
            ? 'top-0 left-0 lg:top-0 lg:left-0'
            : 'top-0 left-0'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          {isContractsLayoutPath && contractsMobileNav && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => contractsMobileNav.setMobileOpen((prev) => !prev)}
              className="h-10 w-10 rounded-xl lg:hidden"
              aria-label={contractsMobileNav.mobileOpen ? 'Close navigation' : 'Open navigation'}
              title={contractsMobileNav.mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {isHomeExpensesLayoutPath && homeExpensesMobileNav && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => homeExpensesMobileNav.setMobileOpen((prev) => !prev)}
              className="h-10 w-10 rounded-xl lg:hidden"
              aria-label={homeExpensesMobileNav.mobileOpen ? 'Close navigation' : 'Open navigation'}
              title={homeExpensesMobileNav.mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{resolvedBackLabel}</span>
          </Button>
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-bold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isContractsLayoutPath && (
            <div className="relative block" ref={bellMenuRef}>
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
                <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[min(82vw,272px)] sm:w-[320px] rounded-xl border bg-card shadow-lg p-2 z-[60]">
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
                      unreadAlerts.map(item => (
                        <button
                          key={item.signature}
                          type="button"
                          onClick={() => {
                            navigate(`/contracts/${item.contractId}`);
                            setAlertsOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-2 rounded-lg transition-colors',
                            'hover:bg-muted'
                          )}
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-1">{item.contractName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.provider} · {item.triggerLabel} · occurred {format(item.triggerDate, 'MMM d, yyyy')}
                          </p>
                          {item.reason && <p className="text-xs text-muted-foreground line-clamp-2 break-words">{item.reason}</p>}
                        </button>
                      ))
                    )}
                  </div>

                  {unreadContractsCount > 0 && contractsContext && (
                    <button
                      type="button"
                      onClick={() => {
                        markOccurredAppAlertsAsRead(contractsContext.contracts);
                        setAlertsVersion(prev => prev + 1);
                        setAlertsOpen(false);
                      }}
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                    >
                      Mark all as read
                    </button>
                  )}

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-muted-foreground"
                  aria-label={t('common.settings')}
                  title={t('common.settings')}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn('w-72', settingsExtraContent && 'w-80')}>
                
                {/* Language Selection */}
                <div className="px-2 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t('common.language')}</p>
                  <div className="flex gap-2">
                    <Badge 
                      variant={language === 'pt' ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => setLanguage('pt')}
                    >
                      {t('common.portuguese')}
                    </Badge>
                    <Badge 
                      variant={language === 'en' ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => setLanguage('en')}
                    >
                      {t('common.english')}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuSeparator />
                
                {/* Theme Toggle */}
                <div className="px-2 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isDark ? (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    )}
                    <label htmlFor="theme-switch" className="text-sm font-medium cursor-pointer">
                      {isDark ? t('common.darkMode') : t('common.lightMode')}
                    </label>
                  </div>
                  <Switch id="theme-switch" checked={isDark} onCheckedChange={toggleDark} />
                </div>

                <DropdownMenuSeparator />
                
                {/* Hide Amounts Toggle */}
                <div className="px-2 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hideAmounts ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <label htmlFor="amounts-switch" className="text-sm font-medium cursor-pointer">
                      {hideAmounts ? t('common.hideAmounts') : t('common.showAmounts')}
                    </label>
                  </div>
                  <Switch id="amounts-switch" checked={hideAmounts} onCheckedChange={toggleHideAmounts} />
                </div>

                <DropdownMenuSeparator />

                {settingsExtraContent && (
                  <>
                    <div className="px-2 py-2">{settingsExtraContent}</div>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Settings Link */}
                <DropdownMenuItem
                  onClick={() =>
                    navigate('/settings', {
                      state: {
                        fromPath: location.pathname,
                        from: location.pathname.startsWith('/warranties') ? 'warranties' : undefined,
                      },
                    })
                  }
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span>{t('settingsPage.title')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {actions}
        </div>
      </div>
    </header>
  );
}
