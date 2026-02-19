import { Link, useLocation } from 'react-router-dom';
import { Users, PlusCircle, ClipboardList, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

const SIDEBAR_ITEMS = [
  { path: '/', label: 'Teams', icon: Users },
  { path: '/games/new', label: 'New Game', icon: PlusCircle },
  { path: '/practice', label: 'Practice', icon: ClipboardList },
  { path: '/games', label: 'History', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') {
    return pathname === '/' || pathname.startsWith('/teams');
  }
  if (itemPath === '/games') {
    return pathname === '/games';
  }
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[280px] shrink-0 h-screen sticky top-0',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-r border-border/50',
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        <img src="/benchassist/small_logo_light_square.png" alt="" className="size-7 dark:hidden" />
        <img src="/benchassist/small_logo.png" alt="" className="size-7 hidden dark:block" />
        <span className="text-ios-headline">BenchAssist</span>
      </div>
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {SIDEBAR_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(location.pathname, path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 h-11 px-3 rounded-lg text-ios-body transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground active:bg-accent',
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 text-ios-caption2 text-muted-foreground">
        build {__BUILD_HASH__}
      </div>
    </aside>
  );
}
