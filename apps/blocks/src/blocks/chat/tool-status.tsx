'use client';

import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import { Shimmer } from './shimmer';

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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className='size-3 shrink-0 opacity-60' />
        </motion.div>
      )}
      {variant === 'done' && <Check className='size-3 shrink-0 text-emerald-600 dark:text-emerald-400' />}
      {variant === 'error' && <CircleAlert className='size-3 shrink-0' />}
      {variant === 'loading' && typeof children === 'string' ? (
        <Shimmer className='text-xs' duration={1.5}>
          {children}
        </Shimmer>
      ) : (
        <span className='leading-snug'>{children}</span>
      )}
    </div>
  );
}
