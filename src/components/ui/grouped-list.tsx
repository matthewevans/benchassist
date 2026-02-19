import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface GroupedListProps {
  header?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
}

export function GroupedList({ header, footer, children, className }: GroupedListProps) {
  return (
    <section className={cn('', className)}>
      {header && (
        <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
          {header}
        </h3>
      )}
      <div className="bg-card rounded-[10px] overflow-hidden">{children}</div>
      {footer && <p className="text-ios-footnote text-muted-foreground px-4 pt-1.5">{footer}</p>}
    </section>
  );
}

interface GroupedListRowProps {
  children: ReactNode;
  /** Show disclosure chevron on right */
  chevron?: boolean;
  /** Right-side accessory content (overrides chevron) */
  trailing?: ReactNode;
  /** Click handler — makes row interactive */
  onClick?: () => void;
  /** Whether this is the last row (no bottom separator) */
  last?: boolean;
  className?: string;
}

export function GroupedListRow({
  children,
  chevron = false,
  trailing,
  onClick,
  last = false,
  className,
}: GroupedListRowProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full min-h-11 px-4 text-ios-body text-left',
        onClick && 'active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors',
        !last && 'border-b border-border/50',
        className,
      )}
    >
      <div className="flex-1 min-w-0 py-2.5">{children}</div>
      {trailing ??
        (chevron && (
          <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A] shrink-0 ml-2" />
        ))}
    </Comp>
  );
}
