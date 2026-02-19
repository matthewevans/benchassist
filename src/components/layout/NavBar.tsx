import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface NavBarProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  largeTitle?: boolean;
  className?: string;
}

export function NavBar({
  title,
  backTo,
  backLabel,
  leading,
  trailing,
  largeTitle = false,
  className,
}: NavBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-b border-border/50',
        'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      {/* Standard bar: 44px — three-column grid like iOS UINavigationBar */}
      <div className="grid grid-cols-3 items-center h-12 px-4 max-w-5xl mx-auto">
        {/* Leading: back button or custom leading content */}
        <div className="flex items-center min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              aria-label={`Back to ${backLabel ?? 'previous page'}`}
              className="flex items-center gap-0.5 text-primary -ml-2 pr-2 py-2 min-w-0"
            >
              <ChevronLeft className="size-[22px] stroke-[2.5] shrink-0" />
              {backLabel && <span className="text-ios-body truncate">{backLabel}</span>}
            </Link>
          ) : leading ? (
            leading
          ) : null}
        </div>

        {/* Center title (standard mode only) */}
        {!largeTitle ? (
          <h1 className="text-ios-headline text-center truncate">{title}</h1>
        ) : (
          <div />
        )}

        {/* Trailing actions */}
        <div className="flex items-center justify-end gap-2">{trailing}</div>
      </div>

      {/* Large title row */}
      {largeTitle && (
        <div className="px-4 pb-2 max-w-5xl mx-auto">
          <h1 className="text-ios-large-title">{title}</h1>
        </div>
      )}
    </header>
  );
}
