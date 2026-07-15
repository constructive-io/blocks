'use client';

import { Check, CircleAlert, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToolStatusVariant = 'loading' | 'done' | 'error';

export interface ToolStatusProps {
  variant: ToolStatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function ToolStatus({ variant, children, className }: ToolStatusProps) {
  return (
    <div
      className={cn(
        'my-1.5 flex items-center gap-2 py-0.5 text-xs',
        variant === 'loading' && 'text-muted-foreground',
        variant === 'done' && 'text-muted-foreground',
        variant === 'error' && 'text-destructive',
        className,
      )}
    >
      {variant === 'loading' && (
        <Loader2 className="size-3 shrink-0 opacity-60 motion-safe:animate-spin" />
      )}
      {variant === 'done' && <Check className='size-3 shrink-0 text-emerald-600 dark:text-emerald-400' />}
      {variant === 'error' && <CircleAlert className='size-3 shrink-0' />}
      {variant === 'loading' && typeof children === 'string' ? (
        <span className="text-xs leading-snug text-muted-foreground">{children}</span>
      ) : (
        <span className='leading-snug'>{children}</span>
      )}
    </div>
  );
}
