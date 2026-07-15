'use client';

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * SiteButton — the docs-chrome button (DESIGN.md §3.3). FF's two-layer recipe:
 * the element carries text/border + a 1px Constructive-blue focus ring; an inset
 * `aria-hidden` span carries the fill while the outer control provides a subtle
 * .96 press response. Replaces the old registry-theme button classes and all ad-hoc chrome buttons.
 *
 * `primary` is monochrome-inverted (fill `bg-foreground`) — Constructive blue is
 * NOT a button fill in chrome. Pass `href` to render a next/link cleanly.
 */

type SiteButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type SiteButtonSize = 'sm' | 'md' | 'icon';

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap outline-none select-none ' +
  'transition-[color,scale] duration-150 ease-out focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  '[&_svg]:relative [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-[stroke-width,scale] [&_svg]:duration-[var(--dur-fast)] ' +
  '[&_svg]:[stroke-width:1.5] group-hover:[&_svg]:[stroke-width:2]';

const sizes: Record<SiteButtonSize, string> = {
  sm: 'h-11 px-3 text-[12px] sm:h-10',
  md: 'h-11 px-4 text-[13px] sm:h-10',
  icon: 'size-11 sm:size-10 [&_svg]:size-4',
};

// Root carries text/border and press feedback; fill carries background only.
const variants: Record<SiteButtonVariant, { root: string; fill: string }> = {
  primary: { root: 'text-background', fill: 'bg-foreground group-hover:opacity-90' },
  secondary: { root: 'text-secondary-foreground', fill: 'bg-secondary group-hover:opacity-90' },
  tertiary: { root: 'border border-border text-foreground', fill: 'bg-transparent group-hover:bg-hover' },
  ghost: {
    root: 'text-muted-foreground hover:text-foreground',
    fill: 'bg-transparent group-hover:bg-hover group-active:bg-active',
  },
};

interface SiteButtonOwnProps {
  variant?: SiteButtonVariant;
  size?: SiteButtonSize;
  /** Disable tactile press motion when movement would distract from the action. */
  static?: boolean;
  className?: string;
  children?: ReactNode;
  href?: string;
}

type SiteButtonProps = SiteButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>, keyof SiteButtonOwnProps>;

export const SiteButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, SiteButtonProps>(function SiteButton(
  { variant = 'tertiary', size = 'md', static: isStatic = false, className, children, href, ...rest },
  ref
) {
  const v = variants[variant];
  const classes = cn(base, !isStatic && 'motion-safe:active:scale-[0.96]', v.root, sizes[size], className);
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-[inherit] pointer-events-none transition-[background-color,opacity] duration-[var(--dur-fast)]',
          v.fill
        )}
      />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </Link>
    );
  }

  const { type, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type ?? 'button'} className={classes} {...buttonRest}>
      {inner}
    </button>
  );
});

export type { SiteButtonProps, SiteButtonVariant, SiteButtonSize };
export default SiteButton;
