import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
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
  backLabel = 'Back to projects',
  showSettings = true,
}: AppSectionHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDark } = useDarkMode();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(backTo)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Button>

        <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-bold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
