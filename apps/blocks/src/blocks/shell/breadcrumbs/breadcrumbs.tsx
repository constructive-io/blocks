'use client';

/**
 * shell-breadcrumbs  (registry: shell-breadcrumbs)
 *
 * Route-based breadcrumb trail for the app shell. Parses `usePathname()` and
 * maps path segments to human-readable labels via a consumer-provided
 * `resolveLabel` function. Supports an explicit `segments` override for
 * Pages Router consumers or static breadcrumb trees.
 *
 * PURE LAYOUT PRIMITIVE — no data hook, no @/generated import, no
 * requires.json. All label resolution is consumer-provided or falls back to
 * capitalizing the raw path segment.
 *
 * Spec: planning/blocks/shell/shell-breadcrumbs.md
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@constructive-io/ui/breadcrumb';

import { cn } from '@/lib/utils';

import { defaultShellBreadcrumbsMessages, type ShellBreadcrumbsMessages } from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export type ShellBreadcrumbsMessageOverrides = Partial<Omit<ShellBreadcrumbsMessages, 'errors'>> & {
  errors?: Partial<ShellBreadcrumbsMessages['errors']>;
};

export type ShellBreadcrumbsProps = {
  /**
   * Override automatic pathname parsing with explicit segments.
   * When provided, `resolveLabel` and `usePathname` are not used.
   */
  segments?: BreadcrumbSegment[];
  /**
   * Consumer-provided label resolver for dynamic path segments.
   * Called with each path segment string and the full pathname.
   * Return `null` to use the raw segment (capitalized) as-is.
   * May return a Promise for async resolution (e.g., entity name fetch).
   */
  resolveLabel?: (segment: string, fullPath: string) => string | null | Promise<string | null>;
  /** Max segments to show before collapsing with an ellipsis. Default: 4 */
  maxVisible?: number;
  /** Show home icon as the first crumb. Default: true */
  showHome?: boolean;
  /** Home crumb href. Default: '/' */
  homeHref?: string;
  messages?: ShellBreadcrumbsMessageOverrides;
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capitalize the first letter of a string; leaves the rest unchanged. */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Parse a pathname into raw segments (drops empty strings from leading `/`
 * and trailing `/`).
 */
function parsePathname(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/** Build breadcrumb segments from a raw pathname. */
function buildSegments(pathname: string): Array<{ raw: string; href: string }> {
  const parts = parsePathname(pathname);
  return parts.map((part, idx) => ({
    raw: part,
    href: '/' + parts.slice(0, idx + 1).join('/')
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShellBreadcrumbs({
  segments: segmentsOverride,
  resolveLabel,
  maxVisible = 4,
  showHome = true,
  homeHref = '/',
  messages: messageOverrides,
  onError,
  className
}: ShellBreadcrumbsProps) {
  // Deep merge messages
  const merged: ShellBreadcrumbsMessages = {
    ...defaultShellBreadcrumbsMessages,
    ...messageOverrides,
    errors: {
      ...defaultShellBreadcrumbsMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // When `segments` is provided explicitly, skip pathname parsing entirely.
  const pathname = usePathname();

  // Resolved labels — start synchronously with raw/fallback text, then update
  // once async resolveLabel calls settle. This prevents layout shift on fast
  // connections and shows something immediately on slow ones.
  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string>>({});

  // Determine the raw parsed segments from pathname (or use explicit override)
  const rawSegments: BreadcrumbSegment[] = segmentsOverride
    ? segmentsOverride
    : buildSegments(pathname).map((s) => ({ label: capitalize(s.raw), href: s.href }));

  // Run async resolution whenever the pathname or resolver changes.
  useEffect(() => {
    // If segments are explicitly provided, labels are already resolved — nothing to do.
    if (segmentsOverride || !resolveLabel) return;

    // Capture the narrowed resolver so the inner async function can call it
    // without TypeScript losing the non-undefined narrowing.
    const resolver = resolveLabel;
    let cancelled = false;
    const parts = parsePathname(pathname);

    async function resolve() {
      const next: Record<string, string> = {};
      for (let i = 0; i < parts.length; i++) {
        const raw = parts[i];
        try {
          const resolved = await resolver(raw, pathname);
          if (!cancelled) {
            next[raw] = resolved ?? capitalize(raw);
          }
        } catch (err) {
          onError?.(err);
          if (!cancelled) {
            next[raw] = capitalize(raw);
          }
        }
      }
      if (!cancelled) {
        setResolvedLabels(next);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [pathname, resolveLabel, segmentsOverride, onError]);

  // Apply resolved labels to the segments (override the placeholder capitalized text)
  const segments: BreadcrumbSegment[] = segmentsOverride
    ? segmentsOverride
    : buildSegments(pathname).map((s) => ({
        label: resolvedLabels[s.raw] ?? capitalize(s.raw),
        href: s.href
      }));

  // Build the full crumb list including the optional home crumb.
  const allCrumbs: BreadcrumbSegment[] = [
    ...(showHome ? [{ label: merged.homeAriaLabel, href: homeHref }] : []),
    ...segments
  ];

  // Determine whether to collapse middle crumbs.
  const needsEllipsis = allCrumbs.length > maxVisible;

  // When collapsing: always show first + last crumbs; replace the middle with ellipsis.
  // The first crumb is index 0; the last is allCrumbs.length-1.
  const [ellipsisExpanded, setEllipsisExpanded] = useState(false);

  // Reset ellipsis state when path changes.
  useEffect(() => {
    setEllipsisExpanded(false);
  }, [pathname]);

  let visibleCrumbs: BreadcrumbSegment[];
  if (!needsEllipsis || ellipsisExpanded) {
    visibleCrumbs = allCrumbs;
  } else {
    // Show first crumb + ellipsis placeholder + last crumb
    visibleCrumbs = [allCrumbs[0]];
    // ellipsis will be rendered between index 0 and last
    visibleCrumbs.push({ label: '…', href: undefined }); // sentinel
    visibleCrumbs.push(allCrumbs[allCrumbs.length - 1]);
  }

  const ellipsisSentinelLabel = '…';

  return (
    <nav
      data-slot="breadcrumbs"
      aria-label={merged.navAriaLabel}
      className={cn('flex items-center', className)}
    >
      <Breadcrumb>
        <BreadcrumbList>
          {visibleCrumbs.map((crumb, idx) => {
            const isLast = idx === visibleCrumbs.length - 1;
            const isEllipsis = crumb.label === ellipsisSentinelLabel && !crumb.href && needsEllipsis && !ellipsisExpanded;

            // Render home crumb as accessible icon link when showHome is on
            const isHome = showHome && idx === 0;

            return (
              <span key={`${crumb.href ?? crumb.label}-${idx}`} className="inline-flex items-center gap-1.5">
                <BreadcrumbItem>
                  {isEllipsis ? (
                    <button
                      type="button"
                      aria-label={merged.ellipsisAriaLabel}
                      className="inline-flex items-center justify-center"
                      onClick={() => setEllipsisExpanded(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEllipsisExpanded(true);
                        }
                      }}
                    >
                      <BreadcrumbEllipsis aria-hidden="true" />
                    </button>
                  ) : isLast ? (
                    <BreadcrumbPage>{isHome ? <HomeIcon aria-hidden="true" /> : null}{isHome ? <span className="sr-only">{crumb.label}</span> : crumb.label}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <BreadcrumbLink href={crumb.href} aria-label={isHome ? crumb.label : undefined}>
                      {isHome ? <HomeIcon aria-hidden="true" /> : crumb.label}
                      {isHome && <span className="sr-only">{crumb.label}</span>}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast && !isEllipsis && <BreadcrumbSeparator />}
                {isEllipsis && <BreadcrumbSeparator />}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Home icon (inline SVG — no extra dependency)
// ---------------------------------------------------------------------------

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
