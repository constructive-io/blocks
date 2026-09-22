import type { ReactNode } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@constructive-io/ui/card';

import { cn } from '@/lib/utils';

/**
 * Compact card shell for the kitchen-sink wall. `size="sm"` supplies the
 * 1rem padding rhythm; the hairline header renders only when a title exists.
 * `--stagger` is inherited from the column wrapper, so every card shares the
 * `animate-fade-up` entrance keyed to its column index.
 */
export function SinkCard({
  title,
  description,
  action,
  children,
  footer,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        'animate-fade-up gap-0 py-0 transition-shadow duration-(--duration-fast) hover:shadow-card-lg',
        className,
      )}
    >
      {title ? (
        <CardHeader
          className={cn(
            'border-b border-border/60 px-4 pt-4 pb-3 [.border-b]:pb-3',
            // Title-only headers collapse to one centred row so an action button sits on the title's axis.
            !description && 'grid-rows-[auto] items-center',
          )}
        >
          <CardTitle className="text-[13px] font-medium tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="text-[12.5px]">{description}</CardDescription> : null}
          {action ? (
            <CardAction className={description ? undefined : 'row-span-1 self-center'}>{action}</CardAction>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('px-4 pt-4 pb-4', contentClassName)}>{children}</CardContent>
      {footer ? (
        <CardFooter className="border-t border-border/60 px-4 py-3 [.border-t]:pt-3">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}
