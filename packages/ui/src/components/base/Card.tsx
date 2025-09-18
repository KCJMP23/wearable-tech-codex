import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const cardStyles = cva(
  'relative overflow-hidden bg-white transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'border border-primary-200 shadow-soft',
        elevated: 'shadow-soft-lg',
        outlined: 'border-2 border-primary-300 shadow-none',
        filled: 'bg-primary-50 border border-primary-200 shadow-soft',
        gradient: 'bg-gradient-subtle border-0 shadow-soft',
        glass: 'glass border border-white/20 shadow-soft',
      },
      size: {
        sm: 'p-4 rounded-2xl',
        md: 'p-6 rounded-3xl',
        lg: 'p-8 rounded-3xl',
        xl: 'p-10 rounded-3xl',
      },
      hover: {
        none: '',
        lift: 'hover-lift cursor-pointer',
        glow: 'hover:shadow-glow transition-all duration-300',
        scale: 'hover:scale-[1.02] cursor-pointer',
      },
      interactive: {
        true: 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hover: 'none',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardStyles> {
  as?: React.ElementType;
}

export function Card({
  className,
  variant,
  size,
  hover,
  interactive,
  as: Component = 'div',
  onClick,
  children,
  ...props
}: CardProps) {
  const isInteractive = interactive || Boolean(onClick);

  return (
    <Component
      className={twMerge(
        cardStyles({ 
          variant, 
          size, 
          hover: onClick || interactive ? hover || 'lift' : hover,
          interactive: isInteractive 
        }),
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                e.preventDefault();
                onClick(e as any);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </Component>
  );
}

// Card composition components
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export function CardHeader({ 
  className, 
  as: Component = 'div',
  ...props 
}: CardHeaderProps) {
  return (
    <Component 
      className={twMerge('mb-4 flex items-start justify-between gap-4', className)} 
      {...props} 
    />
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ 
  className, 
  as: Component = 'h3',
  ...props 
}: CardTitleProps) {
  return (
    <Component 
      className={twMerge('text-lg font-semibold text-primary-900 leading-snug', className)} 
      {...props} 
    />
  );
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p 
      className={twMerge('text-sm text-primary-600 leading-relaxed', className)} 
      {...props} 
    />
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export function CardContent({ 
  className, 
  spacing = 'md',
  ...props 
}: CardContentProps) {
  const spacingClasses = {
    none: '',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
  };

  return (
    <div 
      className={twMerge(spacingClasses[spacing], className)} 
      {...props} 
    />
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

export function CardFooter({ 
  className, 
  justify = 'end',
  ...props 
}: CardFooterProps) {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div 
      className={twMerge(
        'mt-6 flex items-center gap-3',
        justifyClasses[justify],
        className
      )} 
      {...props} 
    />
  );
}

// Media card variant
export interface MediaCardProps extends CardProps {
  imageSrc?: string;
  imageAlt?: string;
  imageAspectRatio?: 'square' | 'video' | 'wide' | 'tall';
}

export function MediaCard({
  imageSrc,
  imageAlt,
  imageAspectRatio = 'video',
  children,
  size = 'md',
  ...props
}: MediaCardProps) {
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    tall: 'aspect-[3/4]',
  };

  return (
    <Card size="sm" {...props}>
      {imageSrc && (
        <div className={twMerge(
          'relative overflow-hidden rounded-2xl mb-4',
          aspectRatioClasses[imageAspectRatio]
        )}>
          <img
            src={imageSrc}
            alt={imageAlt || ''}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      <div className={size === 'sm' ? 'p-2' : size === 'lg' ? 'p-6' : 'p-4'}>
        {children}
      </div>
    </Card>
  );
}

// Stat card variant
export interface StatCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  ...props
}: StatCardProps) {
  return (
    <Card variant="filled" {...props}>
      <CardContent spacing="sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary-600">{label}</p>
          {icon && (
            <div className="p-2 rounded-xl bg-accent-100 text-accent-600">
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-primary-900">{value}</p>
        {change && (
          <div className="flex items-center gap-1">
            <span
              className={twMerge(
                'text-sm font-medium',
                change.type === 'positive' && 'text-green-600',
                change.type === 'negative' && 'text-red-600',
                change.type === 'neutral' && 'text-primary-600'
              )}
            >
              {change.type === 'positive' && '+'}
              {change.value}
            </span>
            <span className="text-sm text-primary-500">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { cardStyles };

// Usage examples:
/*
<Card variant="elevated" hover="lift" onClick={() => console.log('clicked')}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <Badge>New</Badge>
  </CardHeader>
  <CardContent>
    <CardDescription>
      This is a card description that provides context about the content.
    </CardDescription>
    <p>Additional card content goes here.</p>
  </CardContent>
  <CardFooter>
    <Button variant="ghost">Cancel</Button>
    <Button>Action</Button>
  </CardFooter>
</Card>

<MediaCard
  imageSrc="/product.jpg"
  imageAlt="Product image"
  imageAspectRatio="square"
  hover="scale"
>
  <CardTitle>Product Name</CardTitle>
  <CardDescription>Product description</CardDescription>
</MediaCard>

<StatCard
  label="Total Revenue"
  value="$24,500"
  change={{ value: "12%", type: "positive" }}
  icon={<DollarSignIcon />}
/>
*/