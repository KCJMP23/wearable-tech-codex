'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const badgeStyles = cva(
  'inline-flex items-center gap-1.5 font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800 border border-primary-200',
        accent: 'bg-accent-100 text-accent-800 border border-accent-200',
        success: 'bg-green-100 text-green-800 border border-green-200',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        error: 'bg-red-100 text-red-800 border border-red-200',
        info: 'bg-blue-100 text-blue-800 border border-blue-200',
        neutral: 'bg-gray-100 text-gray-800 border border-gray-200',
        outline: 'bg-transparent text-primary-700 border border-primary-300',
        solid: 'bg-primary-900 text-white border border-primary-900',
        gradient: 'bg-gradient-to-r from-accent-500 to-sunset-500 text-white border-0',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-lg',
        md: 'px-2.5 py-1 text-sm rounded-xl',
        lg: 'px-3 py-1.5 text-base rounded-2xl',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      interactive: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRemove?: () => void;
}

export function Badge({
  className,
  variant,
  size,
  interactive,
  leftIcon,
  rightIcon,
  onRemove,
  children,
  onClick,
  ...props
}: BadgeProps) {
  const isInteractive = interactive || Boolean(onClick) || Boolean(onRemove);

  return (
    <span
      className={twMerge(
        badgeStyles({ variant, size, interactive: isInteractive }),
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as any);
              }
            }
          : undefined
      }
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      {onRemove && (
        <button
          type="button"
          className="ml-1 -mr-1 flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-accent-500"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

// Usage examples:
// <Badge>Default</Badge>
// <Badge variant="accent" size="lg">Large Accent</Badge>
// <Badge variant="success" leftIcon={<CheckIcon />}>Success</Badge>
// <Badge onRemove={() => console.log('removed')}>Removable</Badge>
// <Badge interactive onClick={() => console.log('clicked')}>Clickable</Badge>