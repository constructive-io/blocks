'use client';

import Link from 'next/link';

import { fontWeights } from '@/lib/motion/font-weight';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  title: string;
  active: boolean;
  isNew?: boolean;
  isUpdated?: boolean;
  /** Nested under a domain sub-group caption — deepens the left inset. */
  indent?: boolean;
  /** Close the mobile drawer on navigation (no-op on desktop). */
  onNavigate?: () => void;
}

/**
 * A single sidebar row (DESIGN.md §4.5). Route-driven: the active row carries a
 * `bg-active` fill and a ghost-span weight shift (400 → 550); others get a quiet
 * `bg-hover` on pointer-over. All state is pure CSS keyed off `active`, so the
 * highlight can never drift off the current row (no measured overlay to fall out
 * of sync). The status dot sits inside the label span, after the text.
 */
export function NavItem({ href, title, active, isNew, isUpdated, indent, onNavigate }: NavItemProps) {
  const dot = isUpdated || isNew;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex h-11 items-center rounded-lg text-[13px] text-muted-foreground outline-none sm:h-10',
        indent ? 'pl-6 pr-3' : 'px-3',
        'transition-[color,background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none',
        'hover:bg-hover hover:text-foreground active:bg-active active:text-foreground focus-visible:ring-1 focus-visible:ring-ring',
        active && 'bg-active text-foreground',
      )}
    >
      {/* Ghost-span: an invisible semibold sizer reserves the active width so the
          weight shift never reflows the row. */}
      <span className="inline-grid min-w-0 flex-1">
        <span
          className="invisible col-start-1 row-start-1 truncate"
          style={{ fontVariationSettings: fontWeights.semibold }}
          aria-hidden="true"
        >
          {title}
        </span>
        <span
          className="col-start-1 row-start-1 truncate transition-[font-variation-settings] duration-[var(--dur-fast)]"
          style={{ fontVariationSettings: active ? fontWeights.semibold : fontWeights.normal }}
        >
          {title}
          {dot ? (
            <span className="ml-2 inline-block size-1.5 rounded-full bg-primary align-middle" aria-hidden />
          ) : null}
        </span>
      </span>
      {dot ? <span className="sr-only">{isUpdated ? '(updated)' : '(new)'}</span> : null}
    </Link>
  );
}

export default NavItem;
