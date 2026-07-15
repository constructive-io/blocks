import type { ElementType } from 'react';
import { memo } from 'react';

import { cn } from '@/lib/utils';

export interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({ children, as: Component = 'span', className }: ShimmerProps) => {
  return (
    <Component className={cn('inline-block text-muted-foreground', className)}>
      {children}
    </Component>
  );
};

export const Shimmer = memo(ShimmerComponent);
