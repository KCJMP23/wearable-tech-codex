import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const gridStyles = cva(
  'grid',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
        12: 'grid-cols-12',
        none: 'grid-cols-none',
        subgrid: 'grid-cols-subgrid',
        'auto-fit': 'grid-cols-auto-fit-250',
        'auto-fill': 'grid-cols-auto-fill-250',
      },
      rows: {
        1: 'grid-rows-1',
        2: 'grid-rows-2',
        3: 'grid-rows-3',
        4: 'grid-rows-4',
        5: 'grid-rows-5',
        6: 'grid-rows-6',
        none: 'grid-rows-none',
        subgrid: 'grid-rows-subgrid',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
        '3xl': 'gap-16',
      },
      gapX: {
        none: 'gap-x-0',
        xs: 'gap-x-1',
        sm: 'gap-x-2',
        md: 'gap-x-4',
        lg: 'gap-x-6',
        xl: 'gap-x-8',
        '2xl': 'gap-x-12',
        '3xl': 'gap-x-16',
      },
      gapY: {
        none: 'gap-y-0',
        xs: 'gap-y-1',
        sm: 'gap-y-2',
        md: 'gap-y-4',
        lg: 'gap-y-6',
        xl: 'gap-y-8',
        '2xl': 'gap-y-12',
        '3xl': 'gap-y-16',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-items-start',
        center: 'justify-items-center',
        end: 'justify-items-end',
        stretch: 'justify-items-stretch',
      },
      flow: {
        row: 'grid-flow-row',
        col: 'grid-flow-col',
        'row-dense': 'grid-flow-row-dense',
        'col-dense': 'grid-flow-col-dense',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 'md',
      align: 'start',
      justify: 'stretch',
      flow: 'row',
    },
  }
);

// Responsive grid columns
const responsiveGridStyles = cva(
  'grid',
  {
    variants: {
      responsive: {
        '1-2': 'grid-cols-1 sm:grid-cols-2',
        '1-2-3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        '1-2-4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        '1-3': 'grid-cols-1 lg:grid-cols-3',
        '2-4': 'grid-cols-2 lg:grid-cols-4',
        '2-3-6': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
        'auto-fit-sm': 'grid-cols-auto-fit-250',
        'auto-fit-md': 'grid-cols-auto-fit-300',
        'auto-fill-sm': 'grid-cols-auto-fill-250',
        'auto-fill-md': 'grid-cols-auto-fill-300',
      },
    },
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridStyles> {
  as?: React.ElementType;
  responsive?: VariantProps<typeof responsiveGridStyles>['responsive'];
}

export function Grid({
  className,
  cols,
  rows,
  gap,
  gapX,
  gapY,
  align,
  justify,
  flow,
  responsive,
  as: Component = 'div',
  children,
  ...props
}: GridProps) {
  const gridClasses = responsive
    ? responsiveGridStyles({ responsive })
    : gridStyles({ cols, rows, flow });

  return (
    <Component
      className={twMerge(
        gridClasses,
        gap && `gap-${gap}`,
        gapX && `gap-x-${gapX}`,
        gapY && `gap-y-${gapY}`,
        align && `items-${align}`,
        justify && `justify-items-${justify}`,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Grid item component
const gridItemStyles = cva(
  '',
  {
    variants: {
      colSpan: {
        auto: 'col-auto',
        1: 'col-span-1',
        2: 'col-span-2',
        3: 'col-span-3',
        4: 'col-span-4',
        5: 'col-span-5',
        6: 'col-span-6',
        7: 'col-span-7',
        8: 'col-span-8',
        9: 'col-span-9',
        10: 'col-span-10',
        11: 'col-span-11',
        12: 'col-span-12',
        full: 'col-span-full',
      },
      rowSpan: {
        auto: 'row-auto',
        1: 'row-span-1',
        2: 'row-span-2',
        3: 'row-span-3',
        4: 'row-span-4',
        5: 'row-span-5',
        6: 'row-span-6',
        full: 'row-span-full',
      },
      colStart: {
        auto: 'col-start-auto',
        1: 'col-start-1',
        2: 'col-start-2',
        3: 'col-start-3',
        4: 'col-start-4',
        5: 'col-start-5',
        6: 'col-start-6',
        7: 'col-start-7',
        8: 'col-start-8',
        9: 'col-start-9',
        10: 'col-start-10',
        11: 'col-start-11',
        12: 'col-start-12',
        13: 'col-start-13',
      },
      rowStart: {
        auto: 'row-start-auto',
        1: 'row-start-1',
        2: 'row-start-2',
        3: 'row-start-3',
        4: 'row-start-4',
        5: 'row-start-5',
        6: 'row-start-6',
        7: 'row-start-7',
      },
      justifySelf: {
        auto: 'justify-self-auto',
        start: 'justify-self-start',
        center: 'justify-self-center',
        end: 'justify-self-end',
        stretch: 'justify-self-stretch',
      },
      alignSelf: {
        auto: 'self-auto',
        start: 'self-start',
        center: 'self-center',
        end: 'self-end',
        stretch: 'self-stretch',
      },
    },
  }
);

export interface GridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridItemStyles> {
  as?: React.ElementType;
}

export function GridItem({
  className,
  colSpan,
  rowSpan,
  colStart,
  rowStart,
  justifySelf,
  alignSelf,
  as: Component = 'div',
  children,
  ...props
}: GridItemProps) {
  return (
    <Component
      className={twMerge(
        gridItemStyles({
          colSpan,
          rowSpan,
          colStart,
          rowStart,
          justifySelf,
          alignSelf,
        }),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Preset grid layouts
export interface CardGridProps extends Omit<GridProps, 'responsive'> {
  minCardWidth?: 250 | 300 | 350;
}

export function CardGrid({ 
  minCardWidth = 250, 
  gap = 'lg', 
  ...props 
}: CardGridProps) {
  const responsive = minCardWidth === 300 ? 'auto-fit-md' : 'auto-fit-sm';
  
  return (
    <Grid
      responsive={responsive}
      gap={gap}
      {...props}
    />
  );
}

export interface ArticleGridProps extends Omit<GridProps, 'responsive'> {}

export function ArticleGrid({ gap = 'xl', ...props }: ArticleGridProps) {
  return (
    <Grid
      responsive="1-2-3"
      gap={gap}
      {...props}
    />
  );
}

export interface DashboardGridProps extends Omit<GridProps, 'cols' | 'responsive'> {}

export function DashboardGrid({ gap = 'lg', ...props }: DashboardGridProps) {
  return (
    <Grid
      cols={12}
      gap={gap}
      {...props}
    />
  );
}

// Usage examples:
/*
<Grid cols={3} gap="lg">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Grid>

<Grid responsive="1-2-4" gap="md">
  <div>Responsive item 1</div>
  <div>Responsive item 2</div>
  <div>Responsive item 3</div>
  <div>Responsive item 4</div>
</Grid>

<DashboardGrid>
  <GridItem colSpan={8}>
    <h2>Main Content</h2>
  </GridItem>
  <GridItem colSpan={4}>
    <aside>Sidebar</aside>
  </GridItem>
</DashboardGrid>

<CardGrid minCardWidth={300}>
  <Card>Product 1</Card>
  <Card>Product 2</Card>
  <Card>Product 3</Card>
</CardGrid>

<ArticleGrid>
  <article>Article 1</article>
  <article>Article 2</article>
  <article>Article 3</article>
</ArticleGrid>
*/