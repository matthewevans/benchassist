import { Link, useLocation } from 'react-router-dom';
import { Users, PlusCircle, ClipboardList, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

const TAB_ITEMS = [
  { path: '/', label: 'Teams', icon: Users },
  { path: '/games/new', label: 'New Game', icon: PlusCircle },
  { path: '/practice', label: 'Practice', icon: ClipboardList },
  { path: '/games', label: 'Games', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

function isTabActive(pathname: string, tabPath: string): boolean {
  if (tabPath === '/') {
    return pathname === '/' || pathname.startsWith('/teams');
  }
  if (tabPath === '/games') {
    return pathname === '/games';
  }
  return pathname === tabPath || pathname.startsWith(tabPath + '/');
}

export function TabBar() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 lg:hidden',
        'border-t border-border/50',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center justify-around h-[49px]">
        {TAB_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isTabActive(location.pathname, path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'text-[10px] md:text-[13px]',
                active ? 'text-primary' : 'text-[#8E8E93]',
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
