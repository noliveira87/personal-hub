import { createContext, useContext, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowUpDown, CalendarDays, TrendingUp, X, CheckSquare } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

const links = [
  { to: '/home-expenses', labelKey: 'homeExpenses.layout.nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/home-expenses/transactions', labelKey: 'homeExpenses.layout.nav.transactions', icon: ArrowUpDown },
  { to: '/home-expenses/monthly', labelKey: 'homeExpenses.layout.nav.monthly', icon: CalendarDays },
  { to: '/home-expenses/insights', labelKey: 'homeExpenses.layout.nav.insights', icon: TrendingUp },
  { to: '/home-expenses/checklist', labelKey: 'homeExpenses.layout.nav.checklist', icon: CheckSquare },
];

type HomeExpensesMobileNavContextValue = {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const HomeExpensesMobileNavContext = createContext<HomeExpensesMobileNavContextValue | null>(null);

export function useHomeExpensesMobileNav() {
  return useContext(HomeExpensesMobileNavContext);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const contextValue = useMemo(() => ({ mobileOpen, setMobileOpen }), [mobileOpen]);

  return (
    <HomeExpensesMobileNavContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl fixed h-full z-30 pt-16">
        <nav className="flex-1 p-4 space-y-1 border-t border-border">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              <l.icon className="w-4 h-4" />
              {t(l.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-background/92 backdrop-blur-xl" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-x-0 top-0 border-b border-border bg-card/98 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end px-4 py-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-2 px-4 pb-5">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`
                  }
                >
                  <l.icon className="h-5 w-5" />
                  {t(l.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </div>
      </main>
      </div>
    </HomeExpensesMobileNavContext.Provider>
  );
}
