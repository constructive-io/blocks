'use client';

import Link from 'next/link';

import type { BasePrimitive } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

import { UI_DEMOS } from './showcase-ui';

type CatalogCardProps = {
  primitive: BasePrimitive;
  className?: string;
  showPreview?: boolean;
};

export function CatalogCard({ primitive, className, showPreview = true }: CatalogCardProps) {
  const Demo = UI_DEMOS[primitive.name];
  const href = `/blocks/ui/${primitive.name}`;

  return (
    <div
      className={cn(
        'group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card',
        'hover:bg-accent/30',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-1 p-5', showPreview ? 'pb-4' : undefined)}>
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
          <Link
            href={href}
            className="outline-none before:absolute before:inset-0 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {primitive.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-pretty text-[12.5px] leading-5 text-muted-foreground">
          {primitive.description}
        </p>
      </div>

      {showPreview ? (
        <div
          className={cn(
            'pointer-events-none relative flex min-h-40 flex-1 items-center justify-center overflow-hidden border-t border-border px-3 py-5',
            'bg-[color-mix(in_oklch,var(--card),var(--muted)_30%)]',
          )}
        >
          <div className="origin-center translate-y-0.5 scale-[0.84] transition-transform duration-(--duration-slow) ease-out group-hover/card:translate-y-0">
            <Demo />
          </div>
        </div>
      ) : null}
    </div>
  );
}
