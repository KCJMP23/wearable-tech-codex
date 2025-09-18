import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { forwardRef } from 'react';

const inputStyles = cva(
  'block w-full rounded-2xl border px-4 py-3 text-base transition-all duration-200 placeholder:text-primary-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-primary-200 bg-white focus:border-accent-500 focus:ring-2 focus:ring-accent-100',
        filled: 'border-primary-200 bg-primary-50 focus:border-accent-500 focus:ring-2 focus:ring-accent-100',
        ghost: 'border-transparent bg-transparent focus:border-accent-500 focus:bg-white focus:ring-2 focus:ring-accent-100',
        error: 'border-red-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 text-red-900',
      },
      size: {
        sm: 'px-3 py-2 text-sm rounded-xl',
        md: 'px-4 py-3 text-base rounded-2xl',
        lg: 'px-5 py-4 text-lg rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const labelStyles = cva(
  'block text-sm font-medium mb-2 transition-colors',
  {
    variants: {
      variant: {
        default: 'text-primary-700',
        error: 'text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputStyles> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = 'text',
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const hasError = Boolean(errorMessage);
    const finalVariant = hasError ? 'error' : variant;

    return (
      <div className={twMerge('space-y-1', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={labelStyles({ variant: hasError ? 'error' : 'default' })}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={twMerge(
              inputStyles({ variant: finalVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            id={inputId}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400">
              {rightIcon}
            </div>
          )}
        </div>
        {errorMessage && (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p className="text-sm text-primary-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputStyles };