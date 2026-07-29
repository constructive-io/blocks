'use client';

import * as React from 'react';
import type { StepState } from '@constructive-io/command-palette';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: StepState[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <div
              className={cn(
                'h-px w-4',
                step.status === 'complete' || steps[i - 1].status === 'complete'
                  ? 'bg-foreground'
                  : 'bg-border'
              )}
            />
          )}
          <div
            className={cn(
              'size-2 rounded-full transition-all',
              step.status === 'complete'
                ? 'bg-foreground'
                : step.status === 'error'
                  ? 'bg-destructive ring-2 ring-destructive/30'
                  : step.status === 'active' || step.status === 'loading'
                    ? 'bg-foreground ring-2 ring-foreground/30'
                    : 'border border-border bg-transparent'
            )}
            aria-label={`Step ${i + 1}: ${step.status}`}
            aria-current={i === currentIndex ? 'step' : undefined}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
