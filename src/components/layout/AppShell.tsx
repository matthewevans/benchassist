import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';
import { useTheme } from '@/hooks/useTheme.ts';
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

const NAV_ITEMS = [
  { path: '/', label: 'Teams' },
  { path: '/practice', label: 'Practice' },
  { path: '/games', label: 'History' },
];

function isNavActive(pathname: string, navPath: string): boolean {
  if (navPath === '/') {
    return pathname === '/' || pathname.startsWith('/teams');
  }
  return pathname === navPath || pathname.startsWith(navPath + '/');
}

export function AppShell() {
  const location = useLocation();
  const { preference, cycle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 font-bold text-lg tracking-tight">
            <img
              src={`${import.meta.env.BASE_URL}small_logo_light.png`}
              alt=""
              className="h-9 dark:hidden"
            />
            <img
              src={`${import.meta.env.BASE_URL}small_logo.png`}
              alt=""
              className="h-9 hidden dark:block"
            />
            BenchAssist
          </Link>
          <nav className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={cycle}
              aria-label={`Theme: ${preference}`}
              className="h-8 w-8 p-0"
            >
              {preference === 'system' ? (
                <MonitorIcon className="h-4 w-4" />
              ) : preference === 'light' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </Button>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isNavActive(location.pathname, item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="py-2 text-center text-[10px] text-muted-foreground/40">
        build {__BUILD_HASH__}
      </footer>
    </div>
  );
}
