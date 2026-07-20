'use client';

/**
 * Shared visual primitives for billing blocks.
 *
 * Design language: one outer Card, flat rows, soft dividers —
 * avoid nested bordered panels and heavy chrome.
 * Long quantities must wrap mid-digit without clipping the card.
 */

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatBillingMoney,
  formatBillingQuantity,
  type BillingFormatOptions,
  type BillingMoney,
  type BillingQuality
} from '../billing-contracts/billing-contracts';

/** Classes for any long decimal / money string that must not clip. */
export const billingNumericClassName =
  'min-w-0 max-w-full tabular-nums [overflow-wrap:anywhere] [word-break:break-word]';

/**
 * Formatted quantity with optional unit. Unit stays attached with a
 * non-breaking space when short; the whole value still wraps mid-digit
 * when it exceeds the container (stress-test fixtures past MAX_SAFE_INTEGER).
 */
export function BillingQuantity({
  value,
  unit,
  formatOptions,
  className,
  unitClassName
}: {
  value: string;
  unit?: string;
  formatOptions: Pick<BillingFormatOptions, 'locale'>;
  className?: string;
  unitClassName?: string;
}) {
  const formatted = formatBillingQuantity(value, formatOptions);

  return (
    <span className={cn('inline', billingNumericClassName, className)}>
      {/* Number alone for precise queries; unit is sibling so long values wrap cleanly. */}
      <data value={value}>{formatted}</data>
      {unit ? (
        <span className={cn('font-normal text-muted-foreground', unitClassName)}>
          {' '}
          {unit}
        </span>
      ) : null}
    </span>
  );
}

/** Formatted money with the same overflow rules as quantities. */
export function BillingMoneyText({
  money,
  formatOptions,
  className
}: {
  money: BillingMoney;
  formatOptions: Pick<BillingFormatOptions, 'locale' | 'currencyDisplay'>;
  className?: string;
}) {
  return (
    <span className={cn(billingNumericClassName, className)}>
      {formatBillingMoney(money, formatOptions)}
    </span>
  );
}

/** Flat label + value pair for definition lists. */
export function BillingMetaItem({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 max-w-full text-sm font-medium', billingNumericClassName)}>
        {children}
      </dd>
    </div>
  );
}

/** Inline metric — no nested tile chrome. Always min-w-0 for grid overflow. */
export function BillingStat({
  label,
  children,
  className,
  emphasize = false
}: {
  label: string;
  children: ReactNode;
  className?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={cn('grid min-w-0 max-w-full gap-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'min-w-0 max-w-full text-sm font-semibold',
          billingNumericClassName,
          emphasize && 'text-destructive'
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Secondary technical identifier (meter slug, lot id). */
export function BillingSlug({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'break-words font-mono text-[0.6875rem] leading-snug text-muted-foreground/80',
        className
      )}
    >
      {children}
    </p>
  );
}

/** Soft icon tile for list rows (matches entitlements density). */
export function BillingIconTile({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground',
        className
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export function billingQualityVariant(
  quality: BillingQuality
): 'success' | 'warning' | 'info' | 'outline' {
  if (quality === 'authoritative') return 'success';
  if (quality === 'estimated') return 'info';
  if (quality === 'stale') return 'warning';
  return 'outline';
}

/** Short quality chip — full meaning in aria-label when ariaPrefix is set. */
export function BillingQualityBadge({
  quality,
  labels,
  ariaPrefix
}: {
  quality: BillingQuality;
  labels: Record<BillingQuality, string>;
  ariaPrefix?: string;
}) {
  const label = labels[quality];
  return (
    <Badge
      variant={billingQualityVariant(quality)}
      aria-label={ariaPrefix ? `${ariaPrefix}: ${label}` : label}
    >
      {label}
    </Badge>
  );
}

/** Flat filter row — no nested surface. */
export function BillingToolbar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:flex-wrap @min-[640px]:items-end',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Minimal table chrome. */
export const billingTableContainerClassName =
  'rounded-lg border border-border/40';

/** Pass-through surface — no nested chrome. Prefer not nesting extra boxes. */
export function BillingPanel({
  children,
  className,
  as: Comp = 'div',
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
} & ComponentPropsWithoutRef<'div'>) {
  const Tag = Comp as ElementType;
  return (
    <Tag className={cn('min-w-0', className)} {...props}>
      {children}
    </Tag>
  );
}

/** @deprecated Prefer plain muted text — kept for gradual migration. */
export function BillingNote({
  title,
  children,
  className
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        'max-w-2xl text-pretty text-sm text-muted-foreground',
        className
      )}
    >
      {title ? (
        <span className="font-medium text-foreground">{title}. </span>
      ) : null}
      {children}
    </p>
  );
}
