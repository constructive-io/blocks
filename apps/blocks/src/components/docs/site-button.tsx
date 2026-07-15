'use client';

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * SiteButton — the docs-chrome button (DESIGN.md §3.3). FF's two-layer recipe:
 * the element carries text/border + a 1px Constructive-blue focus ring; an inset
 * `aria-hidden` span carries the FILL, so a press squishes the fill (scale 0.98),
 * never the label. Replaces the old registry-theme button classes and all ad-hoc chrome buttons.
 *
 * `primary` is monochrome-inverted (fill `bg-foreground`) — Constructive blue is
 * NOT a button fill in chrome. Pass `href` to render a next/link cleanly.
 */

type SiteButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type SiteButtonSize = 'sm' | 'md' | 'icon';

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap outline-none select-none ' +
  'transition-[color] duration-[var(--dur-fast)] focus-visible:ring-1 focus-visible:ring-ring ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  '[&_svg]:relative [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-[stroke-width,scale] [&_svg]:duration-[var(--dur-fast)] ' +
  '[&_svg]:[stroke-width:1.5] group-hover:[&_svg]:[stroke-width:2] motion-safe:group-active:[&_svg]:scale-90';

const sizes: Record<SiteButtonSize, string> = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  icon: 'h-9 w-9 [&_svg]:size-4',
};

// Root carries text/border; fill carries background + the press squish.
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
  className?: string;
  children?: ReactNode;
  href?: string;
}

type SiteButtonProps = SiteButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>, keyof SiteButtonOwnProps>;

export const SiteButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, SiteButtonProps>(function SiteButton(
  { variant = 'tertiary', size = 'md', className, children, href, ...rest },
  ref
) {
  const v = variants[variant];
  const classes = cn(base, v.root, sizes[size], className);
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-[inherit] pointer-events-none transition-[background-color,opacity,scale] duration-[var(--dur-fast)] motion-safe:group-active:scale-[0.98]',
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
