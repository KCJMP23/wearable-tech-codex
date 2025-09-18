import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { forwardRef } from 'react';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 focus-visible:outline-accent-500 shadow-soft hover:shadow-soft-lg',
        secondary: 'bg-primary-100 text-primary-900 hover:bg-primary-200 active:bg-primary-300 focus-visible:outline-primary-500',
        outline: 'border-2 border-primary-300 bg-transparent text-primary-700 hover:bg-primary-50 hover:border-primary-400 active:bg-primary-100 focus-visible:outline-primary-500',
        ghost: 'bg-transparent text-primary-700 hover:bg-primary-100 active:bg-primary-200 focus-visible:outline-primary-500',
        accent: 'bg-accent-100 text-accent-800 hover:bg-accent-200 active:bg-accent-300 focus-visible:outline-accent-500',
        success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 focus-visible:outline-green-500 shadow-soft',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 focus-visible:outline-yellow-500 shadow-soft',
        danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:outline-red-500 shadow-soft',
        gradient: 'bg-gradient-warm text-white hover:opacity-90 active:opacity-80 focus-visible:outline-accent-500 shadow-soft hover:shadow-glow',
        link: 'bg-transparent text-accent-600 hover:text-accent-700 active:text-accent-800 underline-offset-4 hover:underline focus-visible:outline-accent-500',
      },
      size: {
        xs: 'h-8 px-3 text-xs rounded-xl',
        sm: 'h-9 px-4 text-sm rounded-xl',
        md: 'h-10 px-5 text-sm rounded-2xl',
        lg: 'h-11 px-6 text-base rounded-2xl',
        xl: 'h-12 px-8 text-base rounded-2xl',
        '2xl': 'h-14 px-10 text-lg rounded-3xl',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        fit: 'w-fit',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'auto',
      loading: false,
    },
  }
);

const iconSize = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
  '2xl': 'h-6 w-6',
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof buttonStyles> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size = 'md',
      width,
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const LoadingSpinner = () => (
      <svg
        className={twMerge('animate-spin', iconSize[size!])}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        className={twMerge(
          buttonStyles({ variant, size, width, loading }),
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={twMerge('flex-shrink-0', iconSize[size!])}>
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className={twMerge('flex-shrink-0', iconSize[size!])}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Button group component for grouping related buttons
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  attached?: boolean;
}

export function ButtonGroup({
  className,
  orientation = 'horizontal',
  spacing = 'sm',
  attached = false,
  children,
  ...props
}: ButtonGroupProps) {
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };

  const spacingClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  if (attached) {
    return (
      <div
        className={twMerge(
          'inline-flex',
          orientationClasses[orientation],
          '[&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none [&>button:not(:first-child):not(:last-child)]:rounded-none',
          orientation === 'vertical' &&
            '[&>button:first-child]:rounded-b-none [&>button:last-child]:rounded-t-none [&>button:not(:first-child):not(:last-child)]:rounded-none',
          className
        )}
        role="group"
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        'inline-flex',
        orientationClasses[orientation],
        spacingClasses[spacing],
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

// Icon button variant
export interface IconButtonProps
  extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      xs: 'h-8 w-8 p-0',
      sm: 'h-9 w-9 p-0',
      md: 'h-10 w-10 p-0',
      lg: 'h-11 w-11 p-0',
      xl: 'h-12 w-12 p-0',
      '2xl': 'h-14 w-14 p-0',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={twMerge(sizeClasses[size], className)}
        {...props}
      >
        <span className={iconSize[size]}>{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { Button, buttonStyles };

// Usage examples:
/*
<Button variant="primary" size="lg" loading={isLoading}>
  Submit Form
</Button>

<Button variant="outline" leftIcon={<PlusIcon />}>
  Add Item
</Button>

<Button variant="ghost" rightIcon={<ArrowRightIcon />}>
  Continue
</Button>

<ButtonGroup attached>
  <Button variant="outline">Option 1</Button>
  <Button variant="outline">Option 2</Button>
  <Button variant="outline">Option 3</Button>
</ButtonGroup>

<IconButton
  icon={<TrashIcon />}
  variant="danger"
  size="sm"
  aria-label="Delete item"
/>
*/