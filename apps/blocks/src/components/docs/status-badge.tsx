/**
 * StatusBadge — FF dot badge (DESIGN.md §7.4).
 *
 * A hairline-bordered pill with a small status-colored dot + an 11px label. The
 * dot carries the only color; the label stays foreground (no colored text, no
 * saturated fills). Colors: ready → success green, backend-pending → warning
 * amber, api-config-pending → primary blue (info), planned → muted-foreground.
 *
 * Docs harness only — never imported by block source.
 */

import type { ReactNode } from 'react';

import { STATUS_META, type BlockStatus } from '@/lib/blocks';
import { cn } from '@/lib/utils';

const DOT: Record<BlockStatus, string> = {
  ready: 'bg-success',
  'backend-pending': 'bg-warning',
  'api-config-pending': 'bg-primary',
  planned: 'bg-muted-foreground',
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: BlockStatus;
  /** Override the label (defaults to the shared STATUS_META label). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground',
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT[status])} aria-hidden />
      {children ?? STATUS_META[status].label}
    </span>
  );
}

export default StatusBadge;
