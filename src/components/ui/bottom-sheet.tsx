import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils.ts';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const accessibleTitle = title?.trim() || 'Sheet';
  const accessibleDescription = description?.trim() || 'Sheet content';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'bg-card rounded-t-[10px]',
            'max-h-[85vh] flex flex-col',
            'pb-[env(safe-area-inset-bottom)]',
            className,
          )}
        >
          {/* Grab indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div
              data-testid="grab-indicator"
              className="w-9 h-[5px] rounded-full bg-[#C7C7CC] dark:bg-[#48484A]"
            />
          </div>

          {/* Title is always rendered for accessibility; visually hidden when absent */}
          <Drawer.Title className={title ? 'text-ios-headline text-center px-4 pb-3' : 'sr-only'}>
            {accessibleTitle}
          </Drawer.Title>
          <Drawer.Description className="sr-only">{accessibleDescription}</Drawer.Description>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

          {/* Footer: always visible above the safe area, not scrolled */}
          {footer && <div className="shrink-0 px-4 pt-2 pb-4">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
