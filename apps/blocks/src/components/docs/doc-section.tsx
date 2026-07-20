import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function DocSection({
  children,
  description,
  id,
  title,
  className,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  id: string;
  title: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={cn('scroll-mt-20 pt-10', className)}>
      <div className="mb-4 max-w-2xl">
        <h2 id={`${id}-heading`} className="text-balance text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
