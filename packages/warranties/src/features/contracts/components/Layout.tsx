import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, CalendarDays, Bell, Settings, Plus, Menu, X, TrendingUp, Moon, Sun, ArrowLeft, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@shared-ui/use-dark-mode';

const navItems = [
  { to: '/contracts', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contracts/list', label: 'All Contracts', icon: FileText },
  { to: '/contracts/list/new', label: 'Add Contract', icon: Plus },
  { to: '/contracts/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/contracts/alerts', label: 'Alerts', icon: Bell },
  { to: '/contracts/insights', label: 'Insights', icon: TrendingUp },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleDark } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to projects</span>
          </Button>
          <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileCheck2 className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-bold">D12 Contracts</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMobileOpen(!mobileOpen)} 
              className="lg:hidden p-2 rounded-lg hover:bg-muted active:scale-95 transition-transform"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-muted-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={() => navigate('/contracts/list/new')} 
              size="sm" 
              className="gap-1.5 hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contract</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm top-16" onClick={() => setMobileOpen(false)}>
          <nav className="bg-card border-b p-4 space-y-1" onClick={e => e.stopPropagation()}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/contracts'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-60 flex-col border-r bg-card/50 backdrop-blur-sm z-30">
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/contracts'}
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
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground">Personal Dashboard</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-60 pt-16 min-h-screen">
        <div className="container py-6 lg:py-8 max-w-6xl">
          <div className="flex items-center gap-3 mb-6 sm:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">D12 Contracts</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
