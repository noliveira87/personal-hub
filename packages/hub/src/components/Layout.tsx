import { createContext, useContext, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Bell, X, TrendingUp, Receipt } from 'lucide-react';

const navItems = [
  { to: '/dashboard', labelKey: 'contracts.menu', icon: LayoutDashboard },
  { to: '/contracts/quotes', labelKey: 'layout.nav.quotes', icon: Receipt },
  { to: '/contracts/calendar', labelKey: 'layout.nav.calendar', icon: CalendarDays },
  { to: '/contracts/alerts', labelKey: 'layout.nav.alerts', icon: Bell },
  { to: '/contracts/insights', labelKey: 'layout.nav.insights', icon: TrendingUp },
];

type ContractsMobileNavContextValue = {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const ContractsMobileNavContext = createContext<ContractsMobileNavContextValue | null>(null);

export function useContractsMobileNav() {
  return useContext(ContractsMobileNavContext);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const location = useLocation();
  const isContractsPage = /^\/(dashboard|contracts)(\/|$)/.test(location.pathname);
  const showSidebar = isContractsPage;
  const contextValue = useMemo(() => ({ mobileOpen, setMobileOpen }), [mobileOpen]);

  return (
    <ContractsMobileNavContext.Provider value={contextValue}>
    <div className="min-h-screen bg-background">
      {showSidebar && (
        <>
          {/* Mobile nav overlay */}
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
              <nav className="absolute top-0 left-0 right-0 bg-card border-b p-4 pt-20 animate-fade-up" onClick={e => e.stopPropagation()}>
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r bg-card/50 backdrop-blur-sm z-30 pt-16">
            <nav className="flex-1 p-3 space-y-1 border-t">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className={cn('min-h-screen', showSidebar && 'lg:pl-60 pt-16')}>
        {!showSidebar ? (
          <>{children}</>
        ) : (
          <div className="container py-6 lg:py-8 max-w-6xl">
            {children}
          </div>
        )}
      </main>
    </div>
    </ContractsMobileNavContext.Provider>
  );
}
