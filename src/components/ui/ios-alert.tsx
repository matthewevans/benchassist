import { Dialog as AlertPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

interface IOSAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function IOSAlert({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: IOSAlertProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[270px] bg-card rounded-[14px] overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-[1.05] data-[state=closed]:zoom-out-95',
            'duration-200',
          )}
        >
          {/* Content */}
          <div className="px-4 pt-5 pb-4 text-center">
            <AlertPrimitive.Title className="text-ios-headline">{title}</AlertPrimitive.Title>
            {message && (
              <AlertPrimitive.Description className="text-ios-footnote text-muted-foreground mt-1">
                {message}
              </AlertPrimitive.Description>
            )}
          </div>

          {/* Buttons — stacked vertically with hairline separators */}
          <div className="border-t border-border/50">
            {/* Destructive / Confirm action */}
            <button
              onClick={onConfirm}
              className={cn(
                'w-full h-11 text-ios-body border-b border-border/50',
                destructive ? 'text-destructive font-normal' : 'text-primary font-normal',
              )}
            >
              {confirmLabel}
            </button>
            {/* Cancel — bold weight per iOS convention (draws eye to safe action) */}
            <button
              onClick={onCancel}
              className="w-full h-11 text-ios-body font-semibold text-primary"
            >
              {cancelLabel}
            </button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
