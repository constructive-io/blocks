import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  align?: 'start' | 'center';
};

/** Compact product-scale page header (fluid/coss density). */
export function PageHeader({ title, description, children, className, align = 'start' }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 py-10 sm:py-14',
        align === 'center' && 'items-center text-center',
        align === 'start' && 'items-start text-left',
        className,
      )}
    >
      <h1 className="max-w-2xl text-balance text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
        {title}
      </h1>
      {description ? (
        <p className="max-w-xl text-pretty text-[15px] leading-7 text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className={cn('mt-1 flex flex-wrap gap-2', align === 'center' && 'justify-center')}>{children}</div> : null}
    </header>
  );
}
