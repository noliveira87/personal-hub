import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, CalendarDays, Bell, Settings, Plus, Menu, X, TrendingUp, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contracts', label: 'All Contracts', icon: FileText },
  { to: '/contracts/new', label: 'Add Contract', icon: Plus },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/insights', label: 'Insights', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b px-4 h-14 flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground tracking-tight">ContractKeeper</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-transform">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-card border-b p-4 animate-fade-up" onClick={e => e.stopPropagation()}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => window.location.href = `${window.location.protocol}//${window.location.hostname}:8081/`}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-4 border-t pt-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
        </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r bg-card/50 backdrop-blur-sm z-30">
        <div className="px-6 h-16 flex items-center border-b">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">ContractKeeper</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t space-y-3">
          <p className="text-xs text-muted-foreground">Personal Dashboard</p>
          <button
            onClick={() => window.location.href = `${window.location.protocol}//${window.location.hostname}:8081/`}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-60 pt-14 lg:pt-0 min-h-screen">
        <div className="container py-6 lg:py-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
