import type { ReactNode } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'bg-card rounded-t-[10px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'data-[state=open]:duration-350 data-[state=closed]:duration-250',
            'max-h-[85vh] flex flex-col',
            'pb-[env(safe-area-inset-bottom)]',
            className,
          )}
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Grab indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div
              data-testid="grab-indicator"
              className="w-9 h-[5px] rounded-full bg-[#C7C7CC] dark:bg-[#48484A]"
            />
          </div>

          {/* Title */}
          {title && (
            <SheetPrimitive.Title className="text-ios-headline text-center px-4 pb-3">
              {title}
            </SheetPrimitive.Title>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
