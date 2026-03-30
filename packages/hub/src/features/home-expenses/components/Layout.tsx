import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowUpDown, CalendarDays, TrendingUp, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';

const links = [
  { to: '/home-expenses', labelKey: 'homeExpenses.layout.nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/home-expenses/transactions', labelKey: 'homeExpenses.layout.nav.transactions', icon: ArrowUpDown },
  { to: '/home-expenses/monthly', labelKey: 'homeExpenses.layout.nav.monthly', icon: CalendarDays },
  { to: '/home-expenses/insights', labelKey: 'homeExpenses.layout.nav.insights', icon: TrendingUp },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl fixed h-full z-30">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            <span className="text-primary">Fin</span>Flow
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{t('homeExpenses.layout.managerSubtitle')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
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

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          <span className="text-primary">Fin</span>Flow
        </h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-foreground">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <l.icon className="w-4 h-4" />
                {t(l.labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
