import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-ios-body font-medium transition-all disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground rounded-xl active:bg-primary/80',
        destructive: 'bg-destructive text-white rounded-xl active:bg-destructive/80',
        'destructive-plain': 'text-destructive',
        outline: 'bg-secondary text-secondary-foreground rounded-xl active:bg-secondary/80',
        secondary: 'bg-secondary text-primary rounded-xl active:bg-secondary/80',
        ghost: 'active:bg-accent/80',
        link: 'text-primary underline-offset-4 hover:underline',
        plain: 'text-primary',
      },
      size: {
        default: 'h-[50px] px-5 text-ios-body font-semibold',
        sm: 'h-[38px] px-4 text-ios-subheadline',
        xs: 'h-8 px-3 text-ios-footnote',
        lg: 'h-[50px] px-6 text-ios-body font-semibold w-full',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-xs': 'size-7',
        'icon-lg': 'size-12',
        capsule: 'h-8 px-4 rounded-full text-ios-footnote',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
