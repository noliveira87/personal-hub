import { NavLink, useLocation, Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Bell, Menu, X, TrendingUp, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useDarkMode } from '@shared-ui/use-dark-mode';

const navItems = [
  { to: '/dashboard', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard },
  { to: '/calendar', labelKey: 'layout.nav.calendar', icon: CalendarDays },
  { to: '/alerts', labelKey: 'layout.nav.alerts', icon: Bell },
  { to: '/insights', labelKey: 'layout.nav.insights', icon: TrendingUp },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleDark } = useDarkMode();
  const { t } = useI18n();
  const location = useLocation();
  const isLandingPage = location.pathname === '/' || location.pathname === '/home-expenses';
  const isContractsPage = /^\/(dashboard|contracts|calendar|alerts|insights)/.test(location.pathname);
  const showSidebar = isContractsPage;
  const showDesktopHeaderToggle = !isLandingPage;

  return (
    <div className="min-h-screen bg-background">
      {showSidebar && (
        <>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 grid h-14 grid-cols-3 items-center border-b bg-card/80 px-4 backdrop-blur-lg">
        <div className="flex justify-start">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-transform">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <h1 className="text-center text-base font-semibold tracking-tight text-foreground">{t('layout.contractsTitle')}</h1>
        <div className="flex justify-end gap-2">
          <LanguageSwitcher compact />
          <button onClick={toggleDark} className="p-2 rounded-lg text-muted-foreground transition-transform hover:bg-muted active:scale-95">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-card border-b p-4 animate-fade-up" onClick={e => e.stopPropagation()}>
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
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r bg-card/50 backdrop-blur-sm z-30">
        <div className="px-6 h-16 flex items-center justify-between border-b">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">{t('layout.contractsTitle')}</h1>
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" />
            <span>{t('common.projects')}</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
        <div className="p-4 border-t">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToProjects')}
          </Link>
        </div>
      </aside>

      {showDesktopHeaderToggle && (
        <div className="hidden lg:flex fixed right-4 top-4 z-40 items-center gap-2">
          <LanguageSwitcher compact />
          <button onClick={toggleDark} className="rounded-lg border bg-card/80 p-2 text-muted-foreground shadow-sm backdrop-blur-sm transition-transform hover:bg-muted active:scale-95">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      )}
        </>
      )}

      {/* Main content */}
      <main className={cn("min-h-screen", showSidebar && "lg:pl-60 pt-14 lg:pt-0")}>
        {!showSidebar ? (
          <>{children}</>
        ) : (
          <div className="container py-6 lg:py-8 max-w-6xl">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
