'use client';

import Link from 'next/link';

import type { BasePrimitive } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

import { UI_DEMOS } from './showcase-ui';

type CatalogCardProps = {
  primitive: BasePrimitive;
  className?: string;
  /** Live demo in card body (default). Disable for text-only index lists. */
  showPreview?: boolean;
};

/**
 * Registry catalog card — framed surface, quiet hover, optional live preview.
 * Uses a stretched title link (coss pattern) so demos never nest <a> inside <a>.
 */
export function CatalogCard({ primitive, className, showPreview = true }: CatalogCardProps) {
  const Demo = UI_DEMOS[primitive.name];
  const href = `/blocks/ui/${primitive.name}`;

  return (
    <div className={cn('catalog-frame h-full', className)}>
      <div
        className={cn(
          // rounded-xl = 12px; ghost frame inset 5px → outer radius 17px (see globals)
          'group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-card',
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'hover:border-border/80 hover:shadow-card-lg',
        )}
      >
        <div className={cn('flex flex-col gap-1', showPreview ? 'px-4 py-3' : 'p-4')}>
          <h3 className="text-sm font-semibold text-foreground">
            <Link
              href={href}
              className="outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {primitive.title}
            </Link>
          </h3>
          <p className="line-clamp-2 text-pretty text-sm leading-5 text-muted-foreground">{primitive.description}</p>
        </div>

        {showPreview ? (
          <div
            className={cn(
              'pointer-events-none relative flex min-h-44 flex-1 items-center justify-center overflow-hidden border-t border-border/50 px-4 py-6',
              'bg-[color-mix(in_oklch,var(--card),var(--muted)_35%)] dark:bg-background',
            )}
          >
            <div className="origin-center translate-y-0.5 scale-[0.86] transition-transform duration-200 ease-out group-hover/card:translate-y-0">
              <Demo />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
