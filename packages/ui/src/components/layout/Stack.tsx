import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const stackStyles = cva(
  'flex',
  {
    variants: {
      direction: {
        column: 'flex-col',
        row: 'flex-row',
        'column-reverse': 'flex-col-reverse',
        'row-reverse': 'flex-row-reverse',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      spacing: {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
        '3xl': 'gap-16',
        '4xl': 'gap-20',
        '5xl': 'gap-24',
      },
      wrap: {
        true: 'flex-wrap',
        false: 'flex-nowrap',
        reverse: 'flex-wrap-reverse',
      },
    },
    defaultVariants: {
      direction: 'column',
      align: 'start',
      justify: 'start',
      spacing: 'md',
      wrap: false,
    },
  }
);

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackStyles> {
  as?: React.ElementType;
}

export function Stack({
  className,
  direction,
  align,
  justify,
  spacing,
  wrap,
  as: Component = 'div',
  children,
  ...props
}: StackProps) {
  return (
    <Component
      className={twMerge(stackStyles({ direction, align, justify, spacing, wrap }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Convenience components for common patterns
export interface VStackProps extends Omit<StackProps, 'direction'> {}

export function VStack({ ...props }: VStackProps) {
  return <Stack direction="column" {...props} />;
}

export interface HStackProps extends Omit<StackProps, 'direction'> {}

export function HStack({ ...props }: HStackProps) {
  return <Stack direction="row" {...props} />;
}

// Spacer component for flexible spacing
export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  axis?: 'x' | 'y' | 'both';
}

export function Spacer({ size = 'md', axis = 'y' }: SpacerProps) {
  const sizeMap = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '5rem',
    '5xl': '6rem',
  };

  const style = {
    width: axis === 'x' || axis === 'both' ? sizeMap[size] : undefined,
    height: axis === 'y' || axis === 'both' ? sizeMap[size] : undefined,
    flexShrink: 0,
  };

  return <div style={style} aria-hidden="true" />;
}

// Divider component
export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export function Divider({ 
  orientation = 'horizontal', 
  className, 
  label 
}: DividerProps) {
  if (label) {
    return (
      <div className={twMerge(
        'relative flex items-center',
        orientation === 'horizontal' ? 'w-full' : 'h-full flex-col',
        className
      )}>
        <div className={twMerge(
          'bg-primary-200',
          orientation === 'horizontal' ? 'flex-1 h-px' : 'w-px flex-1'
        )} />
        <span className={twMerge(
          'bg-white px-3 py-1 text-sm text-primary-500 font-medium',
          orientation === 'vertical' && 'writing-mode-vertical-rl py-3 px-1'
        )}>
          {label}
        </span>
        <div className={twMerge(
          'bg-primary-200',
          orientation === 'horizontal' ? 'flex-1 h-px' : 'w-px flex-1'
        )} />
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        'bg-primary-200',
        orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

// Center component for quick centering
export interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
  as?: React.ElementType;
}

export function Center({
  className,
  inline = false,
  as: Component = 'div',
  children,
  ...props
}: CenterProps) {
  return (
    <Component
      className={twMerge(
        inline ? 'inline-flex' : 'flex',
        'items-center justify-center',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Usage examples:
/*
<VStack spacing="lg" align="center">
  <h1>Vertical Stack</h1>
  <p>Items stacked vertically</p>
  <button>Action</button>
</VStack>

<HStack spacing="md" justify="between" align="center">
  <h2>Title</h2>
  <button>Action</button>
</HStack>

<Stack direction="row" spacing="xl" wrap="true">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Stack>

<VStack>
  <p>First item</p>
  <Spacer size="lg" />
  <p>Second item with large space above</p>
  <Divider label="Section Break" />
  <p>Third item after divider</p>
</VStack>

<Center>
  <p>This content is centered</p>
</Center>
*/