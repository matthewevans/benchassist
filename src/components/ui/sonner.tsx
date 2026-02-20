import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  // Our theme is applied via .dark class on <html>, sonner reads it automatically
  // when theme="system" is passed
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-center"
      // Clear the 49px tab bar + safe area inset so toasts are never obscured
      offset="calc(49px + env(safe-area-inset-bottom) + 8px)"
      toastOptions={{
        classNames: {
          // iOS-style text action button: primary tint, no fill, semibold
          actionButton:
            'bg-transparent! text-primary! font-semibold! shadow-none! border-none! text-ios-body! px-0! ml-4!',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          // 14px matches iOS notification/alert corner radius
          '--border-radius': '14px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
